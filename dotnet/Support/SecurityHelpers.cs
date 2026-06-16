using Molizhishu.ApiPub.Data;

namespace Molizhishu.ApiPub.Support;

/// <summary>
/// Authentication helpers shared by Minimal API handlers and middleware.
/// </summary>
public static class SecurityHelpers
{
    public static string BearerToken(HttpRequest request)
    {
        var header = request.Headers.Authorization.ToString();
        return header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) ? header[7..].Trim() : "";
    }

    public static bool VerifyPassword(string hash, string password)
    {
        var normalized = hash.StartsWith("$2y$", StringComparison.Ordinal) ? "$2a$" + hash[4..] : hash;
        return BCrypt.Net.BCrypt.Verify(password, normalized);
    }

    public static object PublicUser(AdminUser user)
    {
        return new { id = user.Id, username = user.Username, displayName = user.DisplayName, role = user.Role };
    }

    public static object Mask(string? token)
    {
        token = token?.Trim() ?? "";
        if (token.Length == 0)
        {
            return new { configured = false, masked = (string?)null, last4 = (string?)null };
        }

        var last4 = token.Length <= 4 ? token : token[^4..];
        return new { configured = true, masked = new string('*', Math.Max(8, token.Length - 4)) + last4, last4 };
    }
}
