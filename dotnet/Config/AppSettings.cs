namespace Molizhishu.ApiPub.Config;

/// <summary>
/// Environment-backed configuration for the ASP.NET Core demo.
/// </summary>
public sealed class AppSettings
{
    private readonly object _tokenLock = new();
    private string _token = Env("MOLIZHISHU_TOKEN", "");

    public string ConnectionString { get; } = Env("DATABASE_CONNECTION", "Server=127.0.0.1;Port=3306;Database=molizhishu;User ID=root;Password=;CharSet=utf8mb4;");
    public string Token
    {
        get
        {
            lock (_tokenLock)
            {
                return _token;
            }
        }
    }

    public string BaseUrl { get; } = Env("MOLIZHISHU_BASE_URL", "https://business-api.molizhishu.com/api/business/monitor").TrimEnd('/');
    public string CityUrl { get; } = Env("MOLIZHISHU_CITY_URL", "https://business-api.molizhishu.com/api/business/eip-edge/ports/city-info");
    public string CallbackUrl { get; } = Env("MOLIZHISHU_CALLBACK_URL", "");
    public bool AllowApiKeyUpdate { get; } = Env("MOLIZHISHU_ALLOW_API_KEY_UPDATE", "true").Equals("true", StringComparison.OrdinalIgnoreCase);
    public int TimeoutSeconds { get; } = int.TryParse(Env("MOLIZHISHU_TIMEOUT_SECONDS", "30"), out var value) ? value : 30;
    public bool SyncEnabled { get; } = !Env("MOLIZHISHU_SYNC_ENABLED", "true").Equals("false", StringComparison.OrdinalIgnoreCase);
    public int SyncIntervalSeconds { get; } = int.TryParse(Env("MOLIZHISHU_SYNC_INTERVAL_SECONDS", "60"), out var value) ? Math.Max(value, 1) : 60;
    public int SyncLimit { get; } = int.TryParse(Env("MOLIZHISHU_SYNC_LIMIT", "20"), out var value) ? Math.Max(value, 1) : 20;

    public void UpdateToken(string token)
    {
        lock (_tokenLock)
        {
            _token = token.Trim();
        }
    }

    private static string Env(string key, string fallback) => Environment.GetEnvironmentVariable(key) is { Length: > 0 } value ? value : fallback;
}
