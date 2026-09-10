namespace PingMe.Core.DTOs;

// ---- Direct Chat DTOs ----

public class DirectChatDto
{
    public string Id { get; set; } = default!;
    public string OrganizationId { get; set; } = default!;
    public string OtherUserId { get; set; } = default!;
    public string OtherUsername { get; set; } = default!;
    public string? OtherAvatarUrl { get; set; }
    public string? LastPreview { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

// ---- Group DTOs ----

public class GroupDto
{
    public string Id { get; set; } = default!;
    public string OrganizationId { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
    public string? Topic { get; set; }
    public string Visibility { get; set; } = "public";
    public string CreatedBy { get; set; } = default!;
    public string GroupManagerId { get; set; } = default!;
    public string GroupManagerName { get; set; } = default!;
    public List<GroupMemberDto> Members { get; set; } = new();
    public string? LastPreview { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class GroupMemberDto
{
    public string UserId { get; set; } = default!;
    public string Username { get; set; } = default!;
    public string? AvatarUrl { get; set; }
    public DateTime JoinedAt { get; set; }
}

public class CreateGroupDto
{
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
    public string? Topic { get; set; }
    public string Visibility { get; set; } = "public"; // "public" or "private"
    public string? GroupManagerId { get; set; }
    public List<string> MemberUserIds { get; set; } = new();
}

public class AddGroupMemberDto
{
    public string UserId { get; set; } = default!;
}

// ---- Message DTOs ----

public class MessageDto
{
    public string Id { get; set; } = default!;
    public string OrganizationId { get; set; } = default!;
    public string ChatId { get; set; } = default!;
    public string ChatType { get; set; } = default!;
    public string SenderId { get; set; } = default!;
    public string? SenderName { get; set; }
    public string Ciphertext { get; set; } = default!;
    public string Nonce { get; set; } = default!;
    public string? SelfCiphertext { get; set; }
    public string? SelfNonce { get; set; }
    public string Type { get; set; } = "text";
    public string Status { get; set; } = "sent";
    public bool IsDeleted { get; set; }
    public bool IsEdited { get; set; }
    public DateTime? EditedAt { get; set; }
    public Dictionary<string, List<string>> Reactions { get; set; } = new();
    public string? FileUrl { get; set; }
    public string? FileName { get; set; }
    public string? FileType { get; set; }
    public long? FileSize { get; set; }
    public DateTime SentAt { get; set; }
}

public class SendOrgMessageDto
{
    public string OrganizationId { get; set; } = default!;
    public string ChatId { get; set; } = default!;
    public string ChatType { get; set; } = "dm"; // "dm" or "group"
    public string Ciphertext { get; set; } = default!;
    public string Nonce { get; set; } = default!;
    public string? SelfCiphertext { get; set; }
    public string? SelfNonce { get; set; }
    public string? Type { get; set; }
    public string? FileUrl { get; set; }
    public string? FileName { get; set; }
    public string? FileType { get; set; }
    public long? FileSize { get; set; }
}

public class EditOrgMessageDto
{
    public string OrganizationId { get; set; } = default!;
    public string ChatId { get; set; } = default!;
    public string MessageId { get; set; } = default!;
    public string Ciphertext { get; set; } = default!;
    public string Nonce { get; set; } = default!;
    public string? SelfCiphertext { get; set; }
    public string? SelfNonce { get; set; }
}

public class ReactMessageDto
{
    public string OrganizationId { get; set; } = default!;
    public string ChatId { get; set; } = default!;
    public string MessageId { get; set; } = default!;
    public string Emoji { get; set; } = default!;
}

public class DeleteMessageDto
{
    public string OrganizationId { get; set; } = default!;
    public string ChatId { get; set; } = default!;
    public string MessageId { get; set; } = default!;
    public bool DeleteForEveryone { get; set; }
}
