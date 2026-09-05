using MongoDB.Bson;
using MongoDB.Driver;
using PingMe.Core.DTOs;
using PingMe.Core.Interfaces;
using PingMe.Core.Models;
using PingMe.Infrastructure.Data;

namespace PingMe.Infrastructure.Repositories;

public class TicketRepository : ITicketRepository
{
    private readonly IMongoCollection<Ticket> _tickets;
    private readonly IMongoCollection<Organization> _orgs;

    public TicketRepository(MongoDbContext context)
    {
        _tickets = context.GetCollection<Ticket>("tickets");
        _orgs = context.GetCollection<Organization>("organizations");
    }

    public async Task<Ticket?> GetByIdAsync(string id, string workspaceId)
        => await _tickets.Find(t => t.Id == id && t.WorkspaceId == workspaceId && !t.IsDeleted)
                         .FirstOrDefaultAsync();

    public async Task<Ticket?> GetByTicketNumberAsync(string ticketNumber, string workspaceId)
        => await _tickets.Find(t => t.TicketNumber == ticketNumber && t.WorkspaceId == workspaceId && !t.IsDeleted)
                         .FirstOrDefaultAsync();

    public async Task<(List<Ticket> items, long total)> ListAsync(string workspaceId, TicketQueryParams query)
    {
        var builder = Builders<Ticket>.Filter;
        var filter = builder.Eq(t => t.WorkspaceId, workspaceId)
                   & builder.Eq(t => t.IsDeleted, false);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var searchRegex = new BsonRegularExpression(query.Search, "i");
            filter &= builder.Or(
                builder.Regex(t => t.Title, searchRegex),
                builder.Regex(t => t.Description, searchRegex),
                builder.Regex(t => t.TicketNumber, searchRegex)
            );
        }

        if (!string.IsNullOrWhiteSpace(query.Status) && Enum.TryParse<TicketStatus>(query.Status, true, out var parsedStatus))
            filter &= builder.Eq(t => t.Status, parsedStatus);

        if (!string.IsNullOrWhiteSpace(query.Priority) && Enum.TryParse<TicketPriority>(query.Priority, true, out var parsedPriority))
            filter &= builder.Eq(t => t.Priority, parsedPriority);

        if (!string.IsNullOrWhiteSpace(query.Category) && Enum.TryParse<TicketCategory>(query.Category, true, out var parsedCategory))
            filter &= builder.Eq(t => t.Category, parsedCategory);

        if (!string.IsNullOrWhiteSpace(query.AssignedTo))
            filter &= builder.Eq(t => t.AssignedTo, query.AssignedTo);

        if (!string.IsNullOrWhiteSpace(query.CreatedBy))
            filter &= builder.Eq(t => t.CreatedBy, query.CreatedBy);

        var sort = query.SortBy == "oldest"
            ? Builders<Ticket>.Sort.Ascending(t => t.CreatedAt)
            : Builders<Ticket>.Sort.Descending(t => t.CreatedAt);

        var total = await _tickets.CountDocumentsAsync(filter);
        var skip = (query.Page - 1) * query.PageSize;

        var items = await _tickets.Find(filter)
                                  .Sort(sort)
                                  .Skip(skip)
                                  .Limit(query.PageSize)
                                  .ToListAsync();

        return (items, total);
    }

    public async Task<string> CreateAsync(Ticket ticket)
    {
        await _tickets.InsertOneAsync(ticket);
        return ticket.Id;
    }

    public async Task UpdateAsync(Ticket ticket)
    {
        ticket.UpdatedAt = DateTime.UtcNow;
        await _tickets.ReplaceOneAsync(t => t.Id == ticket.Id, ticket);
    }

    public async Task SoftDeleteAsync(string id, string workspaceId)
    {
        var update = Builders<Ticket>.Update
            .Set(t => t.IsDeleted, true)
            .Set(t => t.UpdatedAt, DateTime.UtcNow);
        await _tickets.UpdateOneAsync(t => t.Id == id && t.WorkspaceId == workspaceId, update);
    }

    public async Task<int> IncrementCounterAsync(string workspaceId)
    {
        // Atomically increment and return the NEW counter value
        var update = Builders<Organization>.Update.Inc(o => o.TicketCounter, 1);
        var options = new FindOneAndUpdateOptions<Organization>
        {
            ReturnDocument = ReturnDocument.After
        };
        var org = await _orgs.FindOneAndUpdateAsync(o => o.Id == workspaceId, update, options);
        return org?.TicketCounter ?? 1;
    }
}
