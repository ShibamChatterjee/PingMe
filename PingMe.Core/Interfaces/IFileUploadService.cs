using PingMe.Core.DTOs;

namespace PingMe.Core.Interfaces;

public interface IFileUploadService
{
    Task<FileUploadResultDto> UploadAsync(Stream fileStream, string fileName, string contentType);
}