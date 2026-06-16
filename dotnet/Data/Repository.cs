using System.Data;
using System.Security.Cryptography;
using System.Text.Json.Nodes;
using Dapper;
using Molizhishu.ApiPub.Config;
using Molizhishu.ApiPub.Support;
using MySqlConnector;

namespace Molizhishu.ApiPub.Data;

/// <summary>
/// MySQL persistence layer for tasks, subtasks, callbacks, and local admin auth.
/// </summary>
public sealed class Repository
{
    private readonly AppSettings _settings;

    public Repository(AppSettings settings) => _settings = settings;

    private IDbConnection Connection() => new MySqlConnection(_settings.ConnectionString);

    public async Task SaveSubmittedTaskAsync(JsonObject request, JsonObject response)
    {
        var now = DateTime.Now;
        using var db = Connection();
        db.Open();
        using var tx = db.BeginTransaction();
        var taskId = response.StringValue("taskId")!;
        await db.ExecuteAsync("""
            INSERT INTO geo_tasks (task_id,status,prompts_json,platforms_json,region_code_json,callback_url,total_items,completed_items,failed_items,poll_url,raw_request_json,raw_response_json,created_local_at,updated_at)
            VALUES (@taskId,@status,@prompts,@platforms,@regionCode,@callbackUrl,@totalItems,0,0,@pollUrl,@rawRequest,@rawResponse,@now,@now)
            ON DUPLICATE KEY UPDATE status=VALUES(status), prompts_json=VALUES(prompts_json), platforms_json=VALUES(platforms_json), region_code_json=VALUES(region_code_json),
              callback_url=VALUES(callback_url), total_items=VALUES(total_items), poll_url=VALUES(poll_url), raw_request_json=VALUES(raw_request_json), raw_response_json=VALUES(raw_response_json), updated_at=VALUES(updated_at)
            """, new
        {
            taskId,
            status = response.StringValue("status") ?? "pending",
            prompts = Util.JsonText(request["prompts"]),
            platforms = Util.JsonText(request["platforms"]),
            regionCode = Util.JsonText(request["regionCode"] ?? new JsonArray()),
            callbackUrl = response.StringValue("callbackUrl", true) ?? request.StringValue("callbackUrl", true),
            totalItems = response.IntValue("totalTask") ?? response.IntValue("totalItems") ?? 0,
            pollUrl = response.StringValue("pollUrl", true),
            rawRequest = Util.JsonText(request),
            rawResponse = Util.JsonText(response),
            now
        }, tx);
        await UpsertSubtasksAsync(db, tx, taskId, response["subTaskList"] as JsonArray ?? new JsonArray(), now);
        tx.Commit();
    }

    public async Task SaveRemoteResultAsync(JsonObject payload)
    {
        var now = DateTime.Now;
        var taskId = payload.StringValue("taskId")!;
        using var db = Connection();
        db.Open();
        using var tx = db.BeginTransaction();
        await db.ExecuteAsync("""
            INSERT INTO geo_tasks (task_id,status,prompts_json,platforms_json,region_code_json,total_items,completed_items,failed_items,created_at,completed_at,raw_request_json,raw_response_json,created_local_at,updated_at)
            VALUES (@taskId,@status,'[]','[]','[]',@totalItems,@completedItems,@failedItems,@createdAt,@completedAt,'{}',@rawResponse,@now,@now)
            ON DUPLICATE KEY UPDATE status=VALUES(status), total_items=VALUES(total_items), completed_items=VALUES(completed_items), failed_items=VALUES(failed_items),
              created_at=VALUES(created_at), completed_at=VALUES(completed_at), raw_response_json=VALUES(raw_response_json), updated_at=VALUES(updated_at)
            """, new
        {
            taskId,
            status = payload.StringValue("status") ?? "processing",
            totalItems = payload.IntValue("totalItems") ?? 0,
            completedItems = payload.IntValue("completedItems") ?? 0,
            failedItems = payload.IntValue("failedItems") ?? 0,
            createdAt = payload.LongValue("createdAt"),
            completedAt = payload.LongValue("completedAt") ?? payload.LongValue("timestamp"),
            rawResponse = Util.JsonText(payload),
            now
        }, tx);
        await UpsertSubtasksAsync(db, tx, taskId, payload["subTaskList"] as JsonArray ?? new JsonArray(), now);
        tx.Commit();
    }

    public async Task<bool> SaveCallbackAsync(JsonObject payload)
    {
        var raw = Util.JsonText(payload);
        var hash = Util.Sha256(raw);
        var taskId = payload.StringValue("taskId")!;
        var now = DateTime.Now;
        using var db = Connection();
        db.Open();
        using var tx = db.BeginTransaction();
        var exists = await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM geo_callback_events WHERE task_id=@taskId AND payload_hash=@hash AND process_status='processed'", new { taskId, hash }, tx);
        if (exists > 0)
        {
            await db.ExecuteAsync("INSERT INTO geo_callback_events (task_id,payload_json,payload_hash,process_status,received_at,processed_at) VALUES (@taskId,@raw,@hash,'duplicate',@now,@now)", new { taskId, raw, hash, now }, tx);
            tx.Commit();
            return true;
        }
        await db.ExecuteAsync("INSERT INTO geo_callback_events (task_id,payload_json,payload_hash,process_status,received_at,processed_at) VALUES (@taskId,@raw,@hash,'processed',@now,@now)", new { taskId, raw, hash, now }, tx);
        tx.Commit();
        await SaveRemoteResultAsync(payload);
        return false;
    }

    public async Task<object> ListTasksAsync(int page, int size, string? status)
    {
        using var db = Connection();
        var where = string.IsNullOrWhiteSpace(status) ? "" : "WHERE status=@status";
        var total = await db.ExecuteScalarAsync<long>($"SELECT COUNT(*) total FROM geo_tasks {where}", new { status });
        var items = await db.QueryAsync($"SELECT * FROM geo_tasks {where} ORDER BY created_local_at DESC LIMIT @size OFFSET @offset", new { status, size, offset = (page - 1) * size });
        return new { page, size, total, items = items.Select(RowToDictionary).ToList() };
    }

    public async Task<Dictionary<string, object?>?> GetTaskDetailAsync(string taskId)
    {
        using var db = Connection();
        var row = await db.QueryFirstOrDefaultAsync("SELECT * FROM geo_tasks WHERE task_id=@taskId", new { taskId });
        if (row is null) return null;
        var task = RowToDictionary(row);
        task["subTaskList"] = (await db.QueryAsync("SELECT * FROM geo_subtasks WHERE task_id=@taskId ORDER BY updated_at DESC", new { taskId })).Select(RowToDictionary).ToList();
        task["callbackEvents"] = (await db.QueryAsync("SELECT * FROM geo_callback_events WHERE task_id=@taskId ORDER BY received_at DESC LIMIT 20", new { taskId })).Select(RowToDictionary).ToList();
        return task;
    }

    public async Task<List<string>> UnfinishedTaskIdsAsync(int limit)
    {
        using var db = Connection();
        var rows = await db.QueryAsync<string>("""
            SELECT t.task_id
            FROM geo_tasks t
            LEFT JOIN geo_subtasks s ON s.task_id = t.task_id
            WHERE t.status NOT IN ('completed', 'partial_completed', 'failed', 'stopped')
               OR s.subtask_id IS NULL
               OR s.status IS NULL
               OR s.status NOT IN ('completed', 'partial_completed', 'failed', 'stopped')
               OR (
                   t.status IN ('completed', 'partial_completed')
                   AND s.status = 'completed'
                   AND (s.answer_content IS NULL OR s.answer_content = '')
               )
            GROUP BY t.task_id
            ORDER BY MIN(t.created_local_at) ASC
            LIMIT @limit
            """, new { limit = Math.Max(limit, 1) });
        return rows.ToList();
    }

    public async Task<AdminUser?> FindAdminByUsernameAsync(string? username)
    {
        using var db = Connection();
        return await db.QueryFirstOrDefaultAsync<AdminUser>("SELECT id,username,password_hash PasswordHash,display_name DisplayName,role FROM geo_admin_users WHERE username=@username AND status=1", new { username = username?.Trim() ?? "" });
    }

    public async Task<(string Token, DateTime ExpiresAt)> IssueTokenAsync(AdminUser user, string? ip)
    {
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        var expiresAt = DateTime.Now.AddDays(7);
        using var db = Connection();
        await db.ExecuteAsync("UPDATE geo_admin_users SET auth_token_hash=@hash, token_expires_at=@expiresAt, last_login_at=NOW(), last_login_ip=@ip, updated_at=NOW() WHERE id=@id",
            new { hash = Util.Sha256(token), expiresAt, ip, id = user.Id });
        return (token, expiresAt);
    }

    public async Task<AdminUser?> AuthenticateAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;
        using var db = Connection();
        return await db.QueryFirstOrDefaultAsync<AdminUser>("SELECT id,username,password_hash PasswordHash,display_name DisplayName,role FROM geo_admin_users WHERE auth_token_hash=@hash AND status=1 AND token_expires_at > NOW()", new { hash = Util.Sha256(token) });
    }

    public async Task LogoutAsync(string token)
    {
        var user = await AuthenticateAsync(token);
        if (user is null) return;
        using var db = Connection();
        await db.ExecuteAsync("UPDATE geo_admin_users SET auth_token_hash=NULL, token_expires_at=NULL, updated_at=NOW() WHERE id=@id", new { id = user.Id });
    }

    private static async Task UpsertSubtasksAsync(IDbConnection db, IDbTransaction tx, string taskId, JsonArray rows, DateTime now)
    {
        foreach (var item in rows.OfType<JsonObject>())
        {
            var subTaskId = item.StringValue("subTaskId");
            if (string.IsNullOrWhiteSpace(subTaskId)) continue;
            await db.ExecuteAsync("""
                INSERT INTO geo_subtasks (subtask_id,task_id,platform,mode,prompt,status,time,page_screenshot,answer_content,reference_list_json,citation_list_json,reasoning_process_json,recommended_questions_json,media_content_json,error_message,proxy_ip,raw_result_json,updated_at)
                VALUES (@subTaskId,@taskId,@platform,@mode,@prompt,@status,@time,@pageScreenshot,@answerContent,@referenceList,@citationList,@reasoningProcess,@recommendedQuestions,@mediaContent,@errorMessage,@proxyIp,@rawResult,@now)
                ON DUPLICATE KEY UPDATE platform=VALUES(platform), mode=VALUES(mode), prompt=VALUES(prompt), status=VALUES(status), time=VALUES(time),
                  page_screenshot=VALUES(page_screenshot), answer_content=VALUES(answer_content), reference_list_json=VALUES(reference_list_json),
                  citation_list_json=VALUES(citation_list_json), reasoning_process_json=VALUES(reasoning_process_json), recommended_questions_json=VALUES(recommended_questions_json),
                  media_content_json=VALUES(media_content_json), error_message=VALUES(error_message), proxy_ip=VALUES(proxy_ip), raw_result_json=VALUES(raw_result_json), updated_at=VALUES(updated_at)
                """, new
            {
                subTaskId,
                taskId,
                platform = item.StringValue("platform", true),
                mode = item.StringValue("mode", true),
                prompt = item.StringValue("prompt", true),
                status = item.StringValue("status", true),
                time = item.LongValue("time"),
                pageScreenshot = item.StringValue("pageScreenshot", true),
                answerContent = item.StringValue("answerContent", true),
                referenceList = Util.JsonText(item["referenceList"] ?? new JsonArray()),
                citationList = Util.JsonText(item["citationList"] ?? new JsonArray()),
                reasoningProcess = Util.JsonText(item["reasoningProcess"]),
                recommendedQuestions = Util.JsonText(item["recommendedQuestions"] ?? new JsonArray()),
                mediaContent = Util.JsonText(item["mediaContent"] ?? new JsonArray()),
                errorMessage = item.StringValue("errorMessage", true),
                proxyIp = item.StringValue("proxyIp", true),
                rawResult = Util.JsonText(item),
                now
            }, tx);
        }
    }

    private static Dictionary<string, object?> RowToDictionary(object row)
    {
        return ((IDictionary<string, object?>)row).ToDictionary(kv => kv.Key, kv => kv.Value);
    }
}
