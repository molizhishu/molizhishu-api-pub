using System.Text;
using System.Text.Json.Nodes;
using Molizhishu.ApiPub.Config;
using Molizhishu.ApiPub.Support;

namespace Molizhishu.ApiPub.Client;

/// <summary>
/// Typed HTTP client for Molizhishu monitor APIs.
/// </summary>
public sealed class MolizhishuClient
{
    private readonly HttpClient _http;
    private readonly AppSettings _settings;
    private readonly ILogger<MolizhishuClient> _logger;

    public MolizhishuClient(HttpClient http, AppSettings settings, ILogger<MolizhishuClient> logger)
    {
        _http = http;
        _settings = settings;
        _logger = logger;
        _http.Timeout = TimeSpan.FromSeconds(settings.TimeoutSeconds);
    }

    public Task<JsonObject> SubmitTaskAsync(JsonObject payload) => RequestAsync(HttpMethod.Post, $"{_settings.BaseUrl}/task/batch/shared", payload, "local-api:submit-task");
    public Task<JsonObject> GetTaskStatusAsync(string taskId, string source) => RequestAsync(HttpMethod.Get, $"{_settings.BaseUrl}/task/status/{Uri.EscapeDataString(taskId)}", null, source);
    public Task<JsonObject> GetTaskResultAsync(string taskId, string source) => RequestAsync(HttpMethod.Get, $"{_settings.BaseUrl}/task/result/{Uri.EscapeDataString(taskId)}", null, source);
    public async Task<JsonNode?> StopTaskAsync(string taskId) => (await RequestAsync(HttpMethod.Put, $"{_settings.BaseUrl}/task/{Uri.EscapeDataString(taskId)}/stop", null, "local-api:stop-task"))["value"];
    public async Task<JsonNode?> GetCallbackUrlAsync() => (await RequestAsync(HttpMethod.Get, $"{_settings.BaseUrl}/task/callback-url", null, "local-api:callback-url:get"))["value"];
    public async Task<JsonNode?> UpdateCallbackUrlAsync(string? callbackUrl) => (await RequestAsync(HttpMethod.Put, $"{_settings.BaseUrl}/task/callback-url", new JsonObject { ["callbackUrl"] = callbackUrl }, "local-api:callback-url:update"))["value"];
    public async Task<JsonNode?> GetCitiesAsync() => (await RequestAsync(HttpMethod.Get, _settings.CityUrl, null, "local-api:cities"))["value"];

    private async Task<JsonObject> RequestAsync(HttpMethod method, string url, JsonObject? payload, string source)
    {
        if (string.IsNullOrWhiteSpace(_settings.Token)) throw new ApiException("MOLIZHISHU_TOKEN 未配置", null, 502);

        using var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _settings.Token);
        request.Headers.Accept.ParseAdd("application/json");
        if (payload is not null) request.Content = new StringContent(payload.ToJsonString(), Encoding.UTF8, "application/json");

        var started = DateTimeOffset.UtcNow;
        using var response = await _http.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        var envelope = JsonNode.Parse(body)?.AsObject() ?? throw new ApiException("模力指数接口返回非 JSON", null, (int)response.StatusCode);
        var success = envelope.BoolValue("success");
        var code = envelope.IntValue("code");
        var message = envelope.StringValue("message");

        _logger.LogInformation("[molizhishu] source={Source} method={Method} url={Url} http_status={Status} success={Success} code={Code} message=\"{Message}\" duration={Duration}ms",
            source, method.Method, url, (int)response.StatusCode, success, code, message, (DateTimeOffset.UtcNow - started).TotalMilliseconds);

        if (!response.IsSuccessStatusCode) throw new ApiException($"模力指数 HTTP 异常：{(int)response.StatusCode}", code, (int)response.StatusCode);
        if (!success) throw new ApiException(string.IsNullOrWhiteSpace(message) ? "模力指数业务处理失败" : message, code, 502);

        var data = envelope["data"];
        return data is JsonObject obj ? obj.DeepClone().AsObject() : new JsonObject { ["value"] = data?.DeepClone() };
    }
}
