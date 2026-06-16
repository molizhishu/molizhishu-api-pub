using System.Text.Json.Nodes;
using Molizhishu.ApiPub.Client;
using Molizhishu.ApiPub.Config;
using Molizhishu.ApiPub.Data;
using Molizhishu.ApiPub.Hosting;
using Molizhishu.ApiPub.Services;
using Molizhishu.ApiPub.Support;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient<MolizhishuClient>();
builder.Services.AddSingleton<AppSettings>();
builder.Services.AddScoped<Repository>();
builder.Services.AddScoped<TaskSyncService>();
builder.Services.AddHostedService<BackgroundTaskSyncService>();

var app = builder.Build();

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
        if (exception is ApiException apiException)
        {
            context.Response.StatusCode = apiException.Status;
            await Results.Json(new { success = false, code = apiException.Code, message = apiException.Message }).ExecuteAsync(context);
            return;
        }

        context.Response.StatusCode = 500;
        await Results.Json(new { success = false, message = exception?.Message ?? "服务器内部错误" }).ExecuteAsync(context);
    });
});

app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "";
    var publicApi = path is "/api/health" or "/api/auth/login" || path.StartsWith("/webhooks/molizhishu");
    if (path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase) && !publicApi)
    {
        var repo = context.RequestServices.GetRequiredService<Repository>();
        var user = await repo.AuthenticateAsync(SecurityHelpers.BearerToken(context.Request));
        if (user is null)
        {
            await Results.Json(new { success = false, message = "请先登录" }, statusCode: 401).ExecuteAsync(context);
            return;
        }
        context.Items["user"] = user;
    }

    await next();
});

app.MapGet("/api/health", () => ApiEnvelope.Ok(new { service = "molizhishu-api-pub-dotnet", status = "ok" }));

app.MapPost("/api/auth/login", async (JsonObject payload, HttpContext context, Repository repo) =>
{
    var username = payload.StringValue("username");
    var password = payload.StringValue("password");
    var user = await repo.FindAdminByUsernameAsync(username);
    if (user is null || string.IsNullOrWhiteSpace(password) || !SecurityHelpers.VerifyPassword(user.PasswordHash, password))
    {
        return ApiEnvelope.Error("账号或密码不正确", 401);
    }

    var issued = await repo.IssueTokenAsync(user, context.Connection.RemoteIpAddress?.ToString());
    return ApiEnvelope.Ok(new { token = issued.Token, expiresAt = issued.ExpiresAt.ToString("yyyy-MM-dd HH:mm:ss"), user = SecurityHelpers.PublicUser(user) });
});

app.MapGet("/api/auth/me", (HttpContext context) => ApiEnvelope.Ok(SecurityHelpers.PublicUser((AdminUser)context.Items["user"]!)));

app.MapPost("/api/auth/logout", async (HttpContext context, Repository repo) =>
{
    await repo.LogoutAsync(SecurityHelpers.BearerToken(context.Request));
    return ApiEnvelope.Ok(true);
});

app.MapPost("/api/tasks", async (JsonObject payload, AppSettings settings, MolizhishuClient client, Repository repo) =>
{
    var validation = PayloadValidator.ValidateSubmitPayload(payload);
    if (validation is not null)
    {
        return ApiEnvelope.Error(validation, 422);
    }
    if (payload["callbackUrl"] is null && !string.IsNullOrWhiteSpace(settings.CallbackUrl))
    {
        payload["callbackUrl"] = settings.CallbackUrl;
    }

    var data = await client.SubmitTaskAsync(payload);
    await repo.SaveSubmittedTaskAsync(payload, data);
    return ApiEnvelope.Ok(data);
});

app.MapGet("/api/tasks", async (int? page, int? size, string? status, Repository repo) =>
{
    var pageValue = Math.Max(1, page ?? 1);
    var sizeValue = Math.Min(100, Math.Max(1, size ?? 20));
    return ApiEnvelope.Ok(await repo.ListTasksAsync(pageValue, sizeValue, status));
});

app.MapGet("/api/tasks/{taskId}", async (string taskId, Repository repo) =>
{
    var task = await repo.GetTaskDetailAsync(taskId);
    return task is null ? ApiEnvelope.Error("任务不存在", 404) : ApiEnvelope.Ok(task);
});

app.MapPost("/api/tasks/{taskId}/sync", async (string taskId, TaskSyncService syncService) =>
{
    return ApiEnvelope.Ok(await syncService.SyncOneAsync(taskId, "local-api:manual-compensation"));
});

app.MapPut("/api/tasks/{taskId}/stop", async (string taskId, MolizhishuClient client) =>
{
    return ApiEnvelope.Ok(new { message = await client.StopTaskAsync(taskId) });
});

app.MapPost("/webhooks/molizhishu", async (JsonObject payload, Repository repo) =>
{
    if (string.IsNullOrWhiteSpace(payload.StringValue("taskId")) || string.IsNullOrWhiteSpace(payload.StringValue("status")))
    {
        return ApiEnvelope.Error("taskId 和 status 必填", 400);
    }
    var duplicate = await repo.SaveCallbackAsync(payload);
    return ApiEnvelope.Ok(new { duplicate });
});

app.MapGet("/api/callback-url", async (MolizhishuClient client) => ApiEnvelope.Ok(await client.GetCallbackUrlAsync()));

app.MapPut("/api/callback-url", async (JsonObject payload, MolizhishuClient client) =>
{
    return ApiEnvelope.Ok(await client.UpdateCallbackUrlAsync(payload.StringValue("callbackUrl", true)));
});

app.MapGet("/api/cities", async (MolizhishuClient client) => ApiEnvelope.Ok(await client.GetCitiesAsync()));

app.MapGet("/api/settings", (AppSettings settings) => ApiEnvelope.Ok(new
{
    apiKey = SecurityHelpers.Mask(settings.Token),
    security = new { apiKeyUpdateAllowed = settings.AllowApiKeyUpdate }
}));

app.MapPut("/api/settings/api-key", (JsonObject payload, AppSettings settings) =>
{
    if (!settings.AllowApiKeyUpdate)
    {
        return ApiEnvelope.Error("当前环境禁止在页面修改 API Key", 403);
    }

    var apiKey = payload.StringValue("apiKey", true)?.Trim();
    if (string.IsNullOrWhiteSpace(apiKey))
    {
        return ApiEnvelope.Error("API Key 不能为空", 422);
    }

    settings.UpdateToken(apiKey);
    return ApiEnvelope.Ok(new
    {
        apiKey = SecurityHelpers.Mask(settings.Token),
        security = new { apiKeyUpdateAllowed = settings.AllowApiKeyUpdate }
    });
});

app.Run();
