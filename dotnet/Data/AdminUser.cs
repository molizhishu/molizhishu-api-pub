namespace Molizhishu.ApiPub.Data;

/// <summary>
/// Minimal admin user projection used by local token authentication.
/// </summary>
public sealed class AdminUser
{
    public ulong Id { get; init; }
    public string Username { get; init; } = "";
    public string PasswordHash { get; init; } = "";
    public string DisplayName { get; init; } = "";
    public string Role { get; init; } = "";
}
