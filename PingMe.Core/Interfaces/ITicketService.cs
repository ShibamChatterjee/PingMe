using PingMe.Core.DTOs;

namespace PingMe.Core.Interfaces;

public interface ITicketService
{
    Task<TicketDetailDto> CreateAsync(string workspaceId, string userId, CreateTicketDto dto);
    Task<TicketDetailDto?> GetByIdAsync(string workspaceId, string ticketId, string userId);
    Task<TicketDetailDto?> GetByTicketNumberAsync(string workspaceId, string ticketNumber, string userId);
    Task<PagedTicketsResult> ListAsync(string workspaceId, string userId, TicketQueryParams query);
    Task<TicketDetailDto> UpdateAsync(string workspaceId, string ticketId, string userId, UpdateTicketDto dto);
    Task DeleteAsync(string workspaceId, string ticketId, string userId);
    Task<TicketDetailDto> AddCommentAsync(string workspaceId, string ticketId, string userId, AddTicketCommentDto dto);
    Task<TicketDetailDto> AddAttachmentAsync(string workspaceId, string ticketId, string userId, TicketAttachmentDto attachment);
    Task<bool> GetTicketSystemEnabledAsync(string workspaceId);
    Task SetTicketSystemEnabledAsync(string workspaceId, string userId, bool enabled);
}
