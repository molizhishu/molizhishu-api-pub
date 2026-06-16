using System.Text.Json.Nodes;
using Molizhishu.ApiPub.Client;
using Molizhishu.ApiPub.Data;
using Molizhishu.ApiPub.Support;

namespace Molizhishu.ApiPub.Services;

/// <summary>
/// Synchronizes local task records with Molizhishu remote status/result APIs.
/// Manual compensation endpoints and the hosted background service share this
/// class so persistence behavior stays identical.
/// </summary>
public sealed class TaskSyncService
{
    private readonly MolizhishuClient _client;
    private readonly Repository _repo;
    private readonly ILogger<TaskSyncService> _logger;

    public TaskSyncService(MolizhishuClient client, Repository repo, ILogger<TaskSyncService> logger)
    {
        _client = client;
        _repo = repo;
        _logger = logger;
    }

    /// <summary>
    /// Synchronizes one task and stores partial results as soon as any subtask
    /// reaches a terminal state.
    /// </summary>
    public async Task<JsonObject> SyncOneAsync(string taskId, string source)
    {
        var started = DateTimeOffset.UtcNow;
        var status = await _client.GetTaskStatusAsync(taskId, $"{source}:status");
        await _repo.SaveRemoteResultAsync(status);

        var fetchResult = TerminalStatus(status.StringValue("status")) || HasCompletedItems(status);
        var data = status;
        if (fetchResult)
        {
            data = await _client.GetTaskResultAsync(taskId, $"{source}:result");
            await _repo.SaveRemoteResultAsync(data);
        }

        _logger.LogInformation("[sync] source={Source} task_id={TaskId} status={Status} fetch_result={FetchResult} duration={Duration}ms",
            source, taskId, status.StringValue("status") ?? "unknown", fetchResult, (DateTimeOffset.UtcNow - started).TotalMilliseconds);
        return data;
    }

    /// <summary>
    /// Synchronizes a bounded batch of unfinished or incomplete local tasks.
    /// </summary>
    public async Task SyncUnfinishedAsync(int limit, string source)
    {
        var taskIds = await _repo.UnfinishedTaskIdsAsync(limit);
        var synced = 0;
        var failed = 0;
        foreach (var taskId in taskIds)
        {
            try
            {
                await SyncOneAsync(taskId, source);
                synced++;
            }
            catch (Exception ex)
            {
                failed++;
                _logger.LogError(ex, "[sync] source={Source} task_id={TaskId} failed=true", source, taskId);
            }
        }
        _logger.LogInformation("[sync] source={Source} total={Total} synced={Synced} failed={Failed}", source, taskIds.Count, synced, failed);
    }

    private static bool TerminalStatus(string? status) => status is "completed" or "partial_completed" or "failed" or "stopped";

    private static bool HasCompletedItems(JsonObject status)
    {
        if ((status.IntValue("completedItems") ?? 0) > 0) return true;
        if (status["subTaskList"] is not JsonArray rows) return false;
        return rows.OfType<JsonObject>().Any(item => TerminalStatus(item.StringValue("status")));
    }
}
