using PingMe.Core.Enums;

namespace PingMe.Core.DTOs;

public class NoteDto
{
    public string Id { get; set; } = default!;
    public string Description { get; set; } = default!;
    public string OrgId { get; set; } = default!;
    public NoteType Type { get; set; }
    public string TypeName => Type.ToString();
    public DateTime Date { get; set; }
}

public class NotesPagedResultDto
{
    public List<NoteDto> Items { get; set; } = new();
    public long TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / (PageSize > 0 ? PageSize : 1));
}
