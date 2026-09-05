using PingMe.Core.DTOs;
using PingMe.Core.Models;

namespace PingMe.Core.Interfaces;

public interface ITicketRepository
{
    Task<Ticket?> GetByIdAsync(string id, string workspaceId);
    Task<Ticket?> GetByTicketNumberAsync(string ticketNumber, string workspaceId);
    Task<(List<Ticket> items, long total)> ListAsync(string workspaceId, TicketQueryParams query);
    Task<string> CreateAsync(Ticket ticket);
    Task UpdateAsync(Ticket ticket);
    Task SoftDeleteAsync(string id, string workspaceId);
    /// <summary>Atomically increments the workspace ticket counter and returns the new value.</summary>
    Task<int> IncrementCounterAsync(string workspaceId);
}
