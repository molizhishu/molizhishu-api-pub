using System.Text.Json;
using System.Text.Json.Nodes;

namespace Molizhishu.ApiPub.Support;

/// <summary>
/// Small helpers for reading loose JSON returned by Molizhishu APIs.
/// </summary>
public static class JsonExtensions
{
    public static string? StringValue(this JsonObject obj, string key, bool allowNull = false)
    {
        var node = obj[key];
        if (node is null) return allowNull ? null : "";
        return node.GetValueKind() == JsonValueKind.Null ? null : node.GetValue<string>();
    }

    public static int? IntValue(this JsonObject obj, string key) => obj[key] is JsonValue value && value.TryGetValue<int>(out var result) ? result : null;
    public static long? LongValue(this JsonObject obj, string key) => obj[key] is JsonValue value && value.TryGetValue<long>(out var result) ? result : null;
    public static bool BoolValue(this JsonObject obj, string key) => obj[key] is JsonValue value && value.TryGetValue<bool>(out var result) && result;
}
