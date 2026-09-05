using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Configuration;
using PingMe.Core.DTOs;
using PingMe.Core.Interfaces;

namespace PingMe.Infrastructure.Services;

public class CloudinaryFileUploadService : IFileUploadService
{
    private readonly Cloudinary _cloudinary;

    public CloudinaryFileUploadService(IConfiguration config)
    {
        var account = new Account(
            config["Cloudinary:CloudName"],
            config["Cloudinary:ApiKey"],
            config["Cloudinary:ApiSecret"]);

        _cloudinary = new Cloudinary(account);
    }

    public async Task<FileUploadResultDto> UploadAsync(Stream fileStream, string fileName, string contentType)
    {
        RawUploadResult result;

        if (contentType.StartsWith("image/"))
        {
            // Cloudinary treats PDFs as "image" resource type too — enables
            // page-thumbnail generation, which "raw" doesn't support.
            var isPdf = contentType == "application/pdf";
            result = await _cloudinary.UploadAsync(new ImageUploadParams
            {
                File = new FileDescription(fileName, fileStream),
                Folder = "pingme/messages"
            });
        }
        else if (contentType.StartsWith("video/"))
        {
            result = await _cloudinary.UploadAsync(new VideoUploadParams
            {
                File = new FileDescription(fileName, fileStream),
                Folder = "pingme/messages"
            });
        }
        else if (contentType == "application/pdf")
        {
            result = await _cloudinary.UploadAsync(new ImageUploadParams
            {
                File = new FileDescription(fileName, fileStream),
                Folder = "pingme/messages"
            });
        }
        else
        {
            result = await _cloudinary.UploadAsync(new RawUploadParams
            {
                File = new FileDescription(fileName, fileStream),
                Folder = "pingme/messages"
            });
        }

        if (result.Error is not null)
            throw new InvalidOperationException($"Cloudinary upload failed: {result.Error.Message}");

        return new FileUploadResultDto
        {
            Url          = result.SecureUrl.ToString(),
            PublicId     = result.PublicId,
            ResourceType = result.ResourceType,
            Format       = result.Format,
            Bytes        = result.Bytes
        };
    }
}