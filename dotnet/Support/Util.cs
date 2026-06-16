using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;

namespace Molizhishu.ApiPub.Support;

/// <summary>
/// Shared utility methods used by persistence and authentication code.
/// </summary>
public static class Util
{
    public static string JsonText(JsonNode? node) => node?.ToJsonString() ?? "null";
    public static string Sha256(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();
}
