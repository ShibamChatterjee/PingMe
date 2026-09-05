using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using PingMe.Core.Interfaces;

namespace PingMe.Api.Filters;

/// <summary>
/// Action filter that validates the authenticated user is a member of the
/// organization specified in the {orgId} route parameter.
/// Stores the validated orgId in HttpContext.Items["OrgId"].
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequireOrgMembershipAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var orgService = context.HttpContext.RequestServices
            .GetRequiredService<IOrganizationService>();

        // Prefer {orgId} route param, fall back to X-Org-Id header for backwards compat
        if (!context.ActionArguments.TryGetValue("orgId", out var orgIdObj) ||
            orgIdObj is not string orgId || string.IsNullOrWhiteSpace(orgId))
        {
            if (!context.HttpContext.Request.Headers.TryGetValue("X-Org-Id", out var headerVal) ||
                string.IsNullOrWhiteSpace(headerVal))
            {
                context.Result = new BadRequestObjectResult("Organization ID is required.");
                return;
            }
            orgId = headerVal.ToString();
        }

        var userId = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId is null || !await orgService.IsMemberAsync(orgId, userId))
        {
            context.Result = new ObjectResult("Not a member of this organization.")
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
            return;
        }

        context.HttpContext.Items["OrgId"] = orgId;
        context.HttpContext.Items["UserId"] = userId;

        await next();
    }
}