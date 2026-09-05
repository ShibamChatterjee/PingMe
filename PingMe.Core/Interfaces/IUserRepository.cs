using System.Linq.Expressions;
using PingMe.Core.Models;

namespace PingMe.Core.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByIdAsync(string id);
    Task<List<User>> GetByIdsAsync(IEnumerable<string> ids);
    Task<User?> GetByGoogleIdAsync(string googleId);
    Task<bool> EmailExistsAsync(string email);
    Task CreateAsync(User user);
    Task UpdateFieldAsync<TField>(string userId, Expression<Func<User, TField>> field, TField value);
    Task<List<User>> SearchUsersAsync(string query);
}