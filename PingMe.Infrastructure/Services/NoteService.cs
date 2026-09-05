using PingMe.Core.DTOs;
using PingMe.Core.Enums;
using PingMe.Core.Interfaces;
using PingMe.Core.Models;

namespace PingMe.Infrastructure.Services;

public class NoteService : INoteService
{
    private readonly INoteRepository _noteRepo;
    private readonly IOrganizationMemberRepository _memberRepo;

    public NoteService(INoteRepository noteRepo, IOrganizationMemberRepository memberRepo)
    {
        _noteRepo = noteRepo;
        _memberRepo = memberRepo;
    }

    public async Task<Note> SaveNoteAsync(string orgId, NoteType type, string description)
    {
        var note = new Note
        {
            OrgId = orgId,
            Type = type,
            Description = description,
            Date = DateTime.UtcNow
        };
        return await _noteRepo.CreateAsync(note);
    }

    public async Task<NotesPagedResultDto> GetNotesAsync(
        string orgId,
        string requesterUserId,
        int page = 1,
        int pageSize = 20,
        NoteType? type = null,
        string? search = null)
    {
        var member = await _memberRepo.GetAsync(orgId, requesterUserId);
        if (member is null || member.Role != OrgRole.Owner)
        {
            throw new UnauthorizedAccessException("Only the Organization Owner can access the audit trail.");
        }

        var (items, totalCount) = await _noteRepo.GetByOrgIdAsync(orgId, page, pageSize, type, search);

        return new NotesPagedResultDto
        {
            Items = items.Select(n => new NoteDto
            {
                Id = n.Id,
                Description = n.Description,
                OrgId = n.OrgId,
                Type = n.Type,
                Date = n.Date
            }).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<NoteDto?> GetNoteByIdAsync(string id, string orgId, string requesterUserId)
    {
        var member = await _memberRepo.GetAsync(orgId, requesterUserId);
        if (member is null || member.Role != OrgRole.Owner)
        {
            throw new UnauthorizedAccessException("Only the Organization Owner can access audit records.");
        }

        var note = await _noteRepo.GetByIdAsync(id, orgId);
        if (note is null) return null;

        return new NoteDto
        {
            Id = note.Id,
            Description = note.Description,
            OrgId = note.OrgId,
            Type = note.Type,
            Date = note.Date
        };
    }
}
