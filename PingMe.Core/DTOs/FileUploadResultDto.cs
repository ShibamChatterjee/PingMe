namespace PingMe.Core.DTOs;

public class FileUploadResultDto
{
    public string Url { get; set; } = default!;
    public string PublicId { get; set; } = default!;
    public string ResourceType { get; set; } = default!; // "image" | "video" | "raw"
    public string? Format { get; set; }
    public long Bytes { get; set; }
}