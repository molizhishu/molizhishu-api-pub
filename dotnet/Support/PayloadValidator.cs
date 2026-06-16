using System.Text.Json.Nodes;

namespace Molizhishu.ApiPub.Support;

/// <summary>
/// Validates loose JSON request bodies accepted by the demo API.
/// </summary>
public static class PayloadValidator
{
    public static string? ValidateSubmitPayload(JsonObject payload)
    {
        if (payload["prompts"] is not JsonArray prompts || prompts.Count == 0)
        {
            return "prompts 必须是非空数组";
        }
        if (prompts.Count > 50)
        {
            return "prompts 最多 50 个";
        }
        if (payload["platforms"] is not JsonArray platforms || platforms.Count == 0)
        {
            return "platforms 必须是非空数组";
        }
        foreach (var item in platforms)
        {
            if (item is not JsonObject row || string.IsNullOrWhiteSpace(row.StringValue("platform")) || string.IsNullOrWhiteSpace(row.StringValue("mode")))
            {
                return "platforms 每一项必须包含 platform 和 mode";
            }
        }

        return null;
    }
}
