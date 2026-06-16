using Molizhishu.ApiPub.Config;
using Molizhishu.ApiPub.Services;

namespace Molizhishu.ApiPub.Hosting;

/// <summary>
/// ASP.NET Core hosted service that runs the in-process compensation loop.
/// </summary>
public sealed class BackgroundTaskSyncService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly AppSettings _settings;
    private readonly ILogger<BackgroundTaskSyncService> _logger;

    public BackgroundTaskSyncService(IServiceScopeFactory scopeFactory, AppSettings settings, ILogger<BackgroundTaskSyncService> logger)
    {
        _scopeFactory = scopeFactory;
        _settings = settings;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_settings.SyncEnabled)
        {
            _logger.LogInformation("[sync] background sync disabled");
            return;
        }

        _logger.LogInformation("[sync] background sync started interval={Interval}s limit={Limit}", _settings.SyncIntervalSeconds, _settings.SyncLimit);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var sync = scope.ServiceProvider.GetRequiredService<TaskSyncService>();
                await sync.SyncUnfinishedAsync(_settings.SyncLimit, "dotnet-sync-loop");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[sync] source=dotnet-sync-loop failed=true");
            }
            await Task.Delay(TimeSpan.FromSeconds(_settings.SyncIntervalSeconds), stoppingToken);
        }
    }
}
