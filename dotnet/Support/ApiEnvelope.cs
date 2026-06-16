namespace Molizhishu.ApiPub.Support;

/// <summary>
/// Builds the local API response envelope consumed by the shared frontend.
/// </summary>
public static class ApiEnvelope
{
    public static IResult Ok(object? data) => Results.Json(new { success = true, data });

    public static IResult Error(string message, int status, int? code = null)
    {
        return Results.Json(new { success = false, code, message }, statusCode: status);
    }
}
