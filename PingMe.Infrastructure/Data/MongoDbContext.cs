using System.Security.Authentication;
using Microsoft.Extensions.Configuration;
using PingMe.Core.Models;
using MongoDB.Driver;
using MongoDB.Bson;

namespace PingMe.Infrastructure.Data;

public class MongoDbContext
{
    private readonly IMongoDatabase _db;

    public MongoDbContext(IConfiguration config)
    {
        string connectionString = config["MongoDB:ConnectionString"]!;
        string databaseName = config["MongoDB:Database"]!;

        var settings = MongoClientSettings.FromConnectionString(connectionString);

        if (connectionString.Contains("mongodb+srv://") || connectionString.Contains("ssl=true") || connectionString.Contains("tls=true"))
        {
            settings.SslSettings = new SslSettings
            {
                EnabledSslProtocols = SslProtocols.Tls12,
                ServerCertificateValidationCallback = (sender, certificate, chain, sslPolicyErrors) => true
            };
        }

        var client = new MongoClient(settings);
        _db = client.GetDatabase(databaseName);
        _ = Task.Run(() =>
        {
            try
            {
                CreateIndexes();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MongoDbContext] Index initialization deferred: {ex.Message}");
            }
        });
    }

    public IMongoCollection<T> GetCollection<T>(string name)
        => _db.GetCollection<T>(name);

    private void CreateIndexes()
    {
        // messages — fast history queries, scoped to org for security
        var msgs = GetCollection<Message>("messages");
        msgs.Indexes.CreateOne(new CreateIndexModel<Message>(
            Builders<Message>.IndexKeys
                .Ascending(m => m.OrganizationId)
                .Ascending(m => m.ChatId)
                .Descending(m => m.SentAt)));

        // direct_chats — fast lookup by org + participants
        var directChats = GetCollection<DirectChat>("direct_chats");
        directChats.Indexes.CreateOne(new CreateIndexModel<DirectChat>(
            Builders<DirectChat>.IndexKeys
                .Ascending(c => c.OrganizationId)
                .Ascending(c => c.User1Id)
                .Ascending(c => c.User2Id),
            new CreateIndexOptions { Unique = true }));

        // groups — fast lookup by org
        var groups = GetCollection<Group>("groups");
        groups.Indexes.CreateOne(new CreateIndexModel<Group>(
            Builders<Group>.IndexKeys
                .Ascending(g => g.OrganizationId)
                .Descending(g => g.UpdatedAt)));

        // group_members — fast membership checks
        var groupMembers = GetCollection<GroupMember>("group_members");
        groupMembers.Indexes.CreateOne(new CreateIndexModel<GroupMember>(
            Builders<GroupMember>.IndexKeys
                .Ascending(m => m.GroupId)
                .Ascending(m => m.UserId),
            new CreateIndexOptions { Unique = true }));

        groupMembers.Indexes.CreateOne(new CreateIndexModel<GroupMember>(
            Builders<GroupMember>.IndexKeys
                .Ascending(m => m.OrganizationId)
                .Ascending(m => m.UserId)));

        // tickets — scoped to workspace, filtered by status/priority/assignee
        var tickets = GetCollection<Ticket>("tickets");
        tickets.Indexes.CreateMany(new[]
        {
            new CreateIndexModel<Ticket>(
                Builders<Ticket>.IndexKeys
                    .Ascending(t => t.WorkspaceId)
                    .Descending(t => t.CreatedAt)),
            new CreateIndexModel<Ticket>(
                Builders<Ticket>.IndexKeys
                    .Ascending(t => t.WorkspaceId)
                    .Ascending(t => t.TicketNumber),
                new CreateIndexOptions { Unique = true }),
            new CreateIndexModel<Ticket>(
                Builders<Ticket>.IndexKeys
                    .Ascending(t => t.WorkspaceId)
                    .Ascending(t => t.Status)),
            new CreateIndexModel<Ticket>(
                Builders<Ticket>.IndexKeys
                    .Ascending(t => t.WorkspaceId)
                    .Ascending(t => t.Priority)),
            new CreateIndexModel<Ticket>(
                Builders<Ticket>.IndexKeys
                    .Ascending(t => t.WorkspaceId)
                    .Ascending(t => t.AssignedTo)),
            new CreateIndexModel<Ticket>(
                Builders<Ticket>.IndexKeys
                    .Ascending(t => t.WorkspaceId)
                    .Ascending(t => t.CreatedBy)),
        });
    }
}