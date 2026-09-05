using PingMe.Core.Enums;
using PingMe.Core.Models;

namespace PingMe.Core.Interfaces;

public interface INoteRepository
{
    Task<Note> CreateAsync(Note note);
    Task<Note?> GetByIdAsync(string id, string orgId);
    Task<(List<Note> Items, long TotalCount)> GetByOrgIdAsync(
        string orgId,
        int page = 1,
        int pageSize = 20,
        NoteType? type = null,
        string? search = null);
}
