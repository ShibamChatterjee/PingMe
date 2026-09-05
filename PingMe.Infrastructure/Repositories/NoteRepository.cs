using MongoDB.Bson;
using MongoDB.Driver;
using PingMe.Core.Enums;
using PingMe.Core.Interfaces;
using PingMe.Core.Models;
using PingMe.Infrastructure.Data;

namespace PingMe.Infrastructure.Repositories;

public class NoteRepository : INoteRepository
{
    private readonly IMongoCollection<Note> _notes;

    public NoteRepository(MongoDbContext context)
    {
        _notes = context.GetCollection<Note>("notes");
    }

    public async Task<Note> CreateAsync(Note note)
    {
        if (string.IsNullOrEmpty(note.Id))
        {
            note.Id = ObjectId.GenerateNewId().ToString();
        }
        await _notes.InsertOneAsync(note);
        return note;
    }

    public async Task<Note?> GetByIdAsync(string id, string orgId)
    {
        return await _notes
            .Find(n => n.Id == id && n.OrgId == orgId)
            .FirstOrDefaultAsync();
    }

    public async Task<(List<Note> Items, long TotalCount)> GetByOrgIdAsync(
        string orgId,
        int page = 1,
        int pageSize = 20,
        NoteType? type = null,
        string? search = null)
    {
        var builder = Builders<Note>.Filter;
        var filter = builder.Eq(n => n.OrgId, orgId);

        if (type.HasValue)
        {
            filter &= builder.Eq(n => n.Type, type.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            filter &= builder.Regex(n => n.Description, new BsonRegularExpression(search, "i"));
        }

        var totalCount = await _notes.CountDocumentsAsync(filter);

        var skip = Math.Max(0, (page - 1) * pageSize);
        var items = await _notes
            .Find(filter)
            .SortByDescending(n => n.Date)
            .Skip(skip)
            .Limit(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }
}
