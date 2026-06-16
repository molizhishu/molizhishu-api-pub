namespace Molizhishu.ApiPub.Support;

/// <summary>
/// Exception translated by the global exception handler into the local API envelope.
/// </summary>
public sealed class ApiException(string message, int? code, int status) : Exception(message)
{
    public int? Code { get; } = code;
    public int Status { get; } = status;
}
