using PingMe.Core.DTOs;
using PingMe.Core.Enums;
using PingMe.Core.Models;

namespace PingMe.Core.Interfaces;

public interface INoteService
{
    Task<Note> SaveNoteAsync(string orgId, NoteType type, string description);
    Task<NotesPagedResultDto> GetNotesAsync(
        string orgId,
        string requesterUserId,
        int page = 1,
        int pageSize = 20,
        NoteType? type = null,
        string? search = null);
    Task<NoteDto?> GetNoteByIdAsync(string id, string orgId, string requesterUserId);
}
