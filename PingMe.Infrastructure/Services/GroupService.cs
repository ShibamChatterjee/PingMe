using MongoDB.Bson;
using PingMe.Core.DTOs;
using PingMe.Core.Enums;
using PingMe.Core.Interfaces;
using PingMe.Core.Models;

namespace PingMe.Infrastructure.Services;

public class GroupService : IGroupService
{
    private readonly IGroupRepository _groupRepo;
    private readonly IGroupMemberRepository _groupMemberRepo;
    private readonly IOrganizationMemberRepository _orgMemberRepo;
    private readonly IOrganizationRepository _orgRepo;
    private readonly IUserRepository _userRepo;
    private readonly INoteService _noteService;

    public GroupService(
        IGroupRepository groupRepo,
        IGroupMemberRepository groupMemberRepo,
        IOrganizationMemberRepository orgMemberRepo,
        IOrganizationRepository orgRepo,
        IUserRepository userRepo,
        INoteService noteService)
    {
        _groupRepo = groupRepo;
        _groupMemberRepo = groupMemberRepo;
        _orgMemberRepo = orgMemberRepo;
        _orgRepo = orgRepo;
        _userRepo = userRepo;
        _noteService = noteService;
    }

    public async Task<GroupDto> CreateAsync(string orgId, string creatorId, CreateGroupDto dto)
    {
        // 1. Validate creator belongs to org
        var creatorMembership = await _orgMemberRepo.GetAsync(orgId, creatorId)
            ?? throw new UnauthorizedAccessException("You are not a member of this organization.");

        if (creatorMembership.IsSuspended)
            throw new UnauthorizedAccessException("Your account is currently suspended.");

        var org = await _orgRepo.GetByIdAsync(orgId)
            ?? throw new InvalidOperationException("Organization not found.");

        // Check policy if creator is normal member
        if (creatorMembership.Role == OrgRole.Member && !org.Policies.AllowMemberGroupCreation)
            throw new UnauthorizedAccessException("Workspace policy does not permit members to create channels.");

        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new InvalidOperationException("Group name is required.");

        var groupManagerId = !string.IsNullOrWhiteSpace(dto.GroupManagerId)
            ? dto.GroupManagerId
            : creatorId;

        // 2. Validate all specified members belong to org
        var allMemberIds = dto.MemberUserIds
            .Where(id => id != creatorId && id != groupManagerId)
            .Distinct()
            .ToList();

        foreach (var memberId in allMemberIds)
        {
            if (!await _orgMemberRepo.IsMemberAsync(orgId, memberId))
                throw new InvalidOperationException($"User {memberId} is not a member of this organization.");
        }

        var creator = await _userRepo.GetByIdAsync(creatorId);

        // 3. Create group
        var group = await _groupRepo.CreateAsync(new Group
        {
            OrganizationId = orgId,
            Name = dto.Name.Trim().ToLowerInvariant().Replace(" ", "-"),
            Description = dto.Description?.Trim(),
            Topic = dto.Topic?.Trim() ?? dto.Description?.Trim(),
            Visibility = dto.Visibility == "private" ? "private" : "public",
            CreatedBy = creatorId,
            GroupManagerId = groupManagerId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        // 4. Add creator + manager + specified members
        var membersToAdd = allMemberIds
            .Prepend(groupManagerId)
            .Prepend(creatorId)
            .Distinct()
            .ToList();

        foreach (var userId in membersToAdd)
        {
            await _groupMemberRepo.AddAsync(new GroupMember
            {
                GroupId = group.Id,
                OrganizationId = orgId,
                UserId = userId,
                JoinedAt = DateTime.UtcNow
            });
        }

        // Audit log
        await _noteService.SaveNoteAsync(
            orgId,
            NoteType.Group,
            $"Channel #{group.Name} was created by {creator?.Username ?? "Owner"}");

        return await ToDtoAsync(group);
    }

    public async Task<List<GroupDto>> GetUserGroupsAsync(string orgId, string userId)
    {
        var membership = await _orgMemberRepo.GetAsync(orgId, userId)
            ?? throw new UnauthorizedAccessException("User is not a member of this organization.");

        if (membership.IsSuspended)
            throw new UnauthorizedAccessException("Account is suspended.");

        var allOrgGroups = await _groupRepo.GetAllForOrgAsync(orgId);
        var userMemberships = await _groupMemberRepo.GetUserGroupMembershipsAsync(userId);
        var userJoinedGroupIds = userMemberships.Where(m => m.OrganizationId == orgId).Select(m => m.GroupId).ToHashSet();

        var visibleGroups = new List<Group>();

        foreach (var g in allOrgGroups)
        {
            // Owner can view all groups
            if (membership.Role == OrgRole.Owner)
            {
                visibleGroups.Add(g);
                continue;
            }

            // Members / Managers see public groups and private groups they are members of or managing
            if (g.Visibility == "public" || userJoinedGroupIds.Contains(g.Id) || g.GroupManagerId == userId)
            {
                visibleGroups.Add(g);
            }
        }

        var dtos = new List<GroupDto>();
        foreach (var g in visibleGroups)
            dtos.Add(await ToDtoAsync(g));

        return dtos;
    }

    public async Task<GroupDto?> GetByIdAsync(string groupId, string orgId, string userId)
    {
        var group = await _groupRepo.GetByIdAsync(groupId, orgId);
        if (group is null) return null;

        var membership = await _orgMemberRepo.GetAsync(orgId, userId);
        if (membership is null || membership.IsSuspended) return null;

        var isGroupMember = await _groupMemberRepo.IsMemberAsync(groupId, userId);

        if (membership.Role == OrgRole.Owner)
            return await ToDtoAsync(group);

        if (group.Visibility == "private" && !isGroupMember && group.GroupManagerId != userId)
            return null;

        return await ToDtoAsync(group);
    }

    public async Task AddMemberAsync(string groupId, string orgId, string requesterId, string targetUserId)
    {
        var group = await _groupRepo.GetByIdAsync(groupId, orgId)
            ?? throw new InvalidOperationException("Group not found.");

        var requesterMembership = await _orgMemberRepo.GetAsync(orgId, requesterId)
            ?? throw new UnauthorizedAccessException("Requester is not an org member.");

        if (requesterMembership.IsSuspended)
            throw new UnauthorizedAccessException("Account is suspended.");

        if (!await _orgMemberRepo.IsMemberAsync(orgId, targetUserId))
            throw new InvalidOperationException("Target user is not an org member.");

        // Permission check: Owner, Group Manager of group, or group creator, or any group member in public group
        var isManagerOrOwner = requesterMembership.Role == OrgRole.Owner ||
                               group.GroupManagerId == requesterId ||
                               group.CreatedBy == requesterId;

        if (!isManagerOrOwner && !await _groupMemberRepo.IsMemberAsync(groupId, requesterId))
            throw new UnauthorizedAccessException("You do not have permission to add members to this channel.");

        if (!await _groupMemberRepo.IsMemberAsync(groupId, targetUserId))
        {
            await _groupMemberRepo.AddAsync(new GroupMember
            {
                GroupId = groupId,
                OrganizationId = orgId,
                UserId = targetUserId,
                JoinedAt = DateTime.UtcNow
            });

            var actor = await _userRepo.GetByIdAsync(requesterId);
            var targetUser = await _userRepo.GetByIdAsync(targetUserId);

            await _noteService.SaveNoteAsync(
                orgId,
                NoteType.Group,
                $"{targetUser?.Username ?? "Member"} was added to #{group.Name} by {actor?.Username ?? "Member"}");
        }
    }

    public async Task RemoveMemberAsync(string groupId, string orgId, string requesterId, string targetUserId)
    {
        var group = await _groupRepo.GetByIdAsync(groupId, orgId)
            ?? throw new InvalidOperationException("Group not found.");

        var requesterMembership = await _orgMemberRepo.GetAsync(orgId, requesterId)
            ?? throw new UnauthorizedAccessException("Requester is not an org member.");

        var isAuthorized = requesterMembership.Role == OrgRole.Owner ||
                           group.GroupManagerId == requesterId ||
                           group.CreatedBy == requesterId ||
                           requesterId == targetUserId; // Self leave

        if (!isAuthorized)
            throw new UnauthorizedAccessException("Only Group Managers or the Workspace Owner can remove members.");

        if (targetUserId == group.CreatedBy && requesterId != targetUserId && requesterMembership.Role != OrgRole.Owner)
            throw new InvalidOperationException("The group creator cannot be removed by others.");

        await _groupMemberRepo.RemoveAsync(groupId, targetUserId);

        var actor = await _userRepo.GetByIdAsync(requesterId);
        var targetUser = await _userRepo.GetByIdAsync(targetUserId);

        await _noteService.SaveNoteAsync(
            orgId,
            NoteType.Group,
            $"{targetUser?.Username ?? "Member"} was removed from #{group.Name} by {actor?.Username ?? "Manager"}");
    }

    public async Task<bool> IsGroupMemberAsync(string groupId, string userId)
        => await _groupMemberRepo.IsMemberAsync(groupId, userId);

    private async Task<GroupDto> ToDtoAsync(Group group)
    {
        var members = await _groupMemberRepo.GetGroupMembersAsync(group.Id);
        var memberDtos = new List<GroupMemberDto>();

        foreach (var m in members)
        {
            var user = await _userRepo.GetByIdAsync(m.UserId);
            if (user is null) continue;
            memberDtos.Add(new GroupMemberDto
            {
                UserId = user.Id,
                Username = user.Username,
                AvatarUrl = user.AvatarUrl,
                JoinedAt = m.JoinedAt
            });
        }

        string managerName = "Unassigned";
        if (!string.IsNullOrEmpty(group.GroupManagerId))
        {
            var mgrUser = await _userRepo.GetByIdAsync(group.GroupManagerId);
            if (mgrUser != null) managerName = mgrUser.Username;
        }

        return new GroupDto
        {
            Id = group.Id,
            OrganizationId = group.OrganizationId,
            Name = group.Name,
            Description = group.Description,
            Topic = group.Topic,
            Visibility = group.Visibility ?? "public",
            CreatedBy = group.CreatedBy,
            GroupManagerId = group.GroupManagerId ?? group.CreatedBy,
            GroupManagerName = managerName,
            Members = memberDtos,
            UpdatedAt = group.UpdatedAt,
            CreatedAt = group.CreatedAt
        };
    }
}
