using System.Security.Cryptography;
using PingMe.Core.DTOs;
using PingMe.Core.Enums;
using PingMe.Core.Interfaces;
using PingMe.Core.Models;
using MongoDB.Bson;
using MongoDB.Driver;
using PingMe.Infrastructure.Data;

namespace PingMe.Infrastructure.Services;

public class OrganizationService : IOrganizationService
{
    private readonly IOrganizationRepository _orgRepo;
    private readonly IOrganizationMemberRepository _memberRepo;
    private readonly IOrganizationInviteRepository _inviteRepo;
    private readonly IGroupRepository _groupRepo;
    private readonly IGroupMemberRepository _groupMemberRepo;
    private readonly IDirectChatRepository _directChatRepo;
    private readonly IUserRepository _userRepo;
    private readonly INoteService _noteService;
    private readonly IMongoCollection<Message> _messages;

    public OrganizationService(
        IOrganizationRepository orgRepo,
        IOrganizationMemberRepository memberRepo,
        IOrganizationInviteRepository inviteRepo,
        IGroupRepository groupRepo,
        IGroupMemberRepository groupMemberRepo,
        IDirectChatRepository directChatRepo,
        IUserRepository userRepo,
        INoteService noteService,
        MongoDbContext context)
    {
        _orgRepo = orgRepo;
        _memberRepo = memberRepo;
        _inviteRepo = inviteRepo;
        _groupRepo = groupRepo;
        _groupMemberRepo = groupMemberRepo;
        _directChatRepo = directChatRepo;
        _userRepo = userRepo;
        _noteService = noteService;
        _messages = context.GetCollection<Message>("messages");
    }

    public async Task<OrganizationResponseDto> CreateAsync(string ownerId, CreateOrganizationDto dto)
    {
        var slug = !string.IsNullOrWhiteSpace(dto.Slug)
            ? await GenerateUniqueSlugAsync(dto.Slug)
            : await GenerateUniqueSlugAsync(dto.Name);

        var owner = await _userRepo.GetByIdAsync(ownerId);

        var org = new Organization
        {
            Id = ObjectId.GenerateNewId().ToString(),
            Name = dto.Name.Trim(),
            Slug = slug,
            Description = dto.Description?.Trim(),
            Industry = dto.Industry?.Trim(),
            LogoUrl = dto.LogoUrl,
            OwnerId = ownerId,
            JoinCode = GenerateRandomCode(8),
            JoinCodeEnabled = true,
            Policies = new WorkspacePolicies(),
            CreatedAt = DateTime.UtcNow
        };

        await _orgRepo.CreateAsync(org);

        // Add creator as Organization Owner
        await _memberRepo.CreateAsync(new OrganizationMember
        {
            Id = ObjectId.GenerateNewId().ToString(),
            OrganizationId = org.Id,
            UserId = ownerId,
            Role = OrgRole.Owner,
            Department = "Executive Leadership",
            Title = "Workspace Owner",
            JoinedAt = DateTime.UtcNow
        });

        // Log audit note
        await _noteService.SaveNoteAsync(
            org.Id,
            NoteType.Org,
            $"Organization \"{org.Name}\" was created by {owner?.Username ?? "Owner"}");

        // Create starter channels
        var starterList = (dto.StarterChannels != null && dto.StarterChannels.Count > 0)
            ? dto.StarterChannels
            : new List<string> { "general", "announcements", "engineering", "random" };

        foreach (var channelName in starterList)
        {
            var cleanName = channelName.Trim().ToLowerInvariant().Replace(" ", "-");
            var group = await _groupRepo.CreateAsync(new Group
            {
                OrganizationId = org.Id,
                Name = cleanName,
                Description = $"Default {cleanName} channel",
                Topic = $"Discussion in #{cleanName}",
                Visibility = "public",
                CreatedBy = ownerId,
                GroupManagerId = ownerId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            await _groupMemberRepo.AddAsync(new GroupMember
            {
                GroupId = group.Id,
                OrganizationId = org.Id,
                UserId = ownerId,
                JoinedAt = DateTime.UtcNow
            });
        }

        return new OrganizationResponseDto
        {
            Id = org.Id,
            Name = org.Name,
            Slug = org.Slug,
            Description = org.Description,
            Industry = org.Industry,
            LogoUrl = org.LogoUrl,
            OwnerId = org.OwnerId,
            OwnerName = owner?.Username ?? "Owner",
            JoinCode = org.JoinCode,
            JoinCodeEnabled = org.JoinCodeEnabled,
            TicketSystemEnabled = org.TicketSystemEnabled,
            Policies = org.Policies,
            MyRole = OrgRole.Owner,
            CreatedAt = org.CreatedAt
        };
    }

    public async Task<OrganizationResponseDto?> GetByIdAsync(string orgId, string userId)
    {
        var org = await _orgRepo.GetByIdAsync(orgId);
        if (org == null) return null;

        var member = await _memberRepo.GetAsync(orgId, userId);
        if (member == null) return null;

        var owner = await _userRepo.GetByIdAsync(org.OwnerId);

        return new OrganizationResponseDto
        {
            Id = org.Id,
            Name = org.Name,
            Slug = org.Slug,
            Description = org.Description,
            Industry = org.Industry,
            LogoUrl = org.LogoUrl,
            OwnerId = org.OwnerId,
            OwnerName = owner?.Username ?? "Owner",
            JoinCode = org.JoinCode,
            JoinCodeEnabled = org.JoinCodeEnabled,
            TicketSystemEnabled = org.TicketSystemEnabled,
            Policies = org.Policies ?? new WorkspacePolicies(),
            MyRole = member.Role,
            CreatedAt = org.CreatedAt
        };
    }

    public async Task<OrganizationResponseDto> UpdateAsync(string orgId, string requestingUserId, UpdateOrganizationDto dto)
    {
        await RequireRoleAsync(orgId, requestingUserId, OrgRole.Owner);

        var org = await _orgRepo.GetByIdAsync(orgId)
            ?? throw new InvalidOperationException("Organization not found.");

        var actor = await _userRepo.GetByIdAsync(requestingUserId);
        var changes = new List<string>();

        if (!string.IsNullOrWhiteSpace(dto.Name) && dto.Name.Trim() != org.Name)
        {
            changes.Add($"name changed from \"{org.Name}\" to \"{dto.Name.Trim()}\"");
            org.Name = dto.Name.Trim();
        }
        if (dto.Description != null && dto.Description.Trim() != (org.Description ?? ""))
        {
            var oldDesc = string.IsNullOrWhiteSpace(org.Description) ? "empty" : $"\"{org.Description}\"";
            var newDesc = string.IsNullOrWhiteSpace(dto.Description) ? "empty" : $"\"{dto.Description.Trim()}\"";
            changes.Add($"description changed from {oldDesc} to {newDesc}");
            org.Description = dto.Description.Trim();
        }
        if (dto.Industry != null && dto.Industry.Trim() != (org.Industry ?? ""))
        {
            var oldInd = string.IsNullOrWhiteSpace(org.Industry) ? "empty" : $"\"{org.Industry}\"";
            var newInd = string.IsNullOrWhiteSpace(dto.Industry) ? "empty" : $"\"{dto.Industry.Trim()}\"";
            changes.Add($"industry changed from {oldInd} to {newInd}");
            org.Industry = dto.Industry.Trim();
        }
        if (dto.LogoUrl != null && dto.LogoUrl != org.LogoUrl)
        {
            changes.Add("organization logo image was updated");
            org.LogoUrl = dto.LogoUrl;
        }
        if (!string.IsNullOrWhiteSpace(dto.Slug) && dto.Slug != org.Slug)
        {
            var oldSlug = org.Slug;
            org.Slug = await GenerateUniqueSlugAsync(dto.Slug);
            changes.Add($"workspace URL slug changed from \"{oldSlug}\" to \"{org.Slug}\"");
        }
        if (dto.Policies != null)
        {
            changes.Add("workspace security policies were updated");
            org.Policies = dto.Policies;
        }

        await _orgRepo.UpdateAsync(org);

        var detailsText = changes.Count > 0 ? string.Join("; ", changes) : "general settings were re-saved";

        // Audit log
        await _noteService.SaveNoteAsync(
            orgId,
            NoteType.Org,
            $"Organization settings updated by {actor?.Username ?? "Owner"}: {detailsText}");

        var member = await _memberRepo.GetAsync(orgId, requestingUserId);
        var owner = await _userRepo.GetByIdAsync(org.OwnerId);

        return new OrganizationResponseDto
        {
            Id = org.Id,
            Name = org.Name,
            Slug = org.Slug,
            Description = org.Description,
            Industry = org.Industry,
            LogoUrl = org.LogoUrl,
            OwnerId = org.OwnerId,
            OwnerName = owner?.Username ?? "Owner",
            JoinCode = org.JoinCode,
            JoinCodeEnabled = org.JoinCodeEnabled,
            TicketSystemEnabled = org.TicketSystemEnabled,
            Policies = org.Policies,
            MyRole = member?.Role ?? OrgRole.Owner,
            CreatedAt = org.CreatedAt
        };
    }

    public async Task DeleteAsync(string orgId, string requestingUserId)
    {
        var org = await _orgRepo.GetByIdAsync(orgId)
            ?? throw new InvalidOperationException("Organization not found.");

        if (org.OwnerId != requestingUserId)
            throw new UnauthorizedAccessException("Only the organization owner can delete the organization.");

        var owner = await _userRepo.GetByIdAsync(requestingUserId);

        await _noteService.SaveNoteAsync(
            orgId,
            NoteType.Org,
            $"Organization \"{org.Name}\" was permanently deleted by {owner?.Username ?? "Owner"}");

        await _orgRepo.DeleteAsync(orgId);
        await _memberRepo.DeleteAllForOrgAsync(orgId);
    }

    public async Task TransferOwnershipAsync(string orgId, string requestingUserId, string newOwnerUserId)
    {
        var org = await _orgRepo.GetByIdAsync(orgId)
            ?? throw new InvalidOperationException("Organization not found.");

        if (org.OwnerId != requestingUserId)
            throw new UnauthorizedAccessException("Only the organization owner can transfer ownership.");

        var currentOwner = await _userRepo.GetByIdAsync(requestingUserId);
        var targetUser = await _userRepo.GetByIdAsync(newOwnerUserId);

        var newOwner = await _memberRepo.GetAsync(orgId, newOwnerUserId)
            ?? throw new InvalidOperationException("Target user is not a member of this organization.");

        // Old owner becomes Manager
        await _memberRepo.UpdateRoleAsync(orgId, requestingUserId, OrgRole.Manager);

        // New owner gets Owner role
        await _memberRepo.UpdateRoleAsync(orgId, newOwnerUserId, OrgRole.Owner);

        org.OwnerId = newOwnerUserId;
        await _orgRepo.UpdateAsync(org);

        // Audit log
        await _noteService.SaveNoteAsync(
            orgId,
            NoteType.Role,
            $"Workspace ownership was transferred from {currentOwner?.Username ?? "Owner"} to {targetUser?.Username ?? "New Owner"}");
    }

    public async Task<List<OrganizationResponseDto>> GetMyOrganizationsAsync(string userId)
    {
        var memberships = await _memberRepo.GetOrgsForUserAsync(userId);
        var result = new List<OrganizationResponseDto>();

        foreach (var m in memberships)
        {
            var org = await _orgRepo.GetByIdAsync(m.OrganizationId);
            if (org is null) continue;

            var owner = await _userRepo.GetByIdAsync(org.OwnerId);

            result.Add(new OrganizationResponseDto
            {
                Id = org.Id,
                Name = org.Name,
                Slug = org.Slug,
                Description = org.Description,
                Industry = org.Industry,
                LogoUrl = org.LogoUrl,
                OwnerId = org.OwnerId,
                OwnerName = owner?.Username ?? "Owner",
                JoinCode = org.JoinCode,
                JoinCodeEnabled = org.JoinCodeEnabled,
                TicketSystemEnabled = org.TicketSystemEnabled,
                Policies = org.Policies ?? new WorkspacePolicies(),
                MyRole = m.Role,
                CreatedAt = org.CreatedAt
            });
        }

        return result;
    }

    public async Task<bool> IsMemberAsync(string orgId, string userId)
        => await _memberRepo.IsMemberAsync(orgId, userId);

    public async Task<OrgRole?> GetRoleAsync(string orgId, string userId)
    {
        var member = await _memberRepo.GetAsync(orgId, userId);
        return member?.Role;
    }

    public async Task<string> GenerateJoinCodeAsync(string orgId, string requestingUserId)
    {
        await RequireRoleAsync(orgId, requestingUserId, OrgRole.Owner);

        var code = GenerateRandomCode(10);
        await _orgRepo.UpdateJoinCodeAsync(orgId, code, true);

        var actor = await _userRepo.GetByIdAsync(requestingUserId);
        await _noteService.SaveNoteAsync(
            orgId,
            NoteType.Security,
            $"Workspace join code was regenerated by {actor?.Username ?? "Owner"}");

        return code;
    }

    public async Task DisableJoinCodeAsync(string orgId, string requestingUserId)
    {
        await RequireRoleAsync(orgId, requestingUserId, OrgRole.Owner);
        await _orgRepo.UpdateJoinCodeAsync(orgId, null, false);

        var actor = await _userRepo.GetByIdAsync(requestingUserId);
        await _noteService.SaveNoteAsync(
            orgId,
            NoteType.Security,
            $"Workspace join code was disabled by {actor?.Username ?? "Owner"}");
    }

    public async Task<OrganizationResponseDto> JoinByCodeAsync(string joinCode, string userId)
    {
        var org = await _orgRepo.GetByJoinCodeAsync(joinCode)
            ?? throw new InvalidOperationException("Invalid or expired join code.");

        var user = await _userRepo.GetByIdAsync(userId);
        var alreadyMember = await _memberRepo.IsMemberAsync(org.Id, userId);
        if (!alreadyMember)
        {
            await _memberRepo.CreateAsync(new OrganizationMember
            {
                Id = ObjectId.GenerateNewId().ToString(),
                OrganizationId = org.Id,
                UserId = userId,
                Role = OrgRole.Member,
                JoinedAt = DateTime.UtcNow
            });

            // Add to public channels
            var publicGroups = (await _groupRepo.GetAllForOrgAsync(org.Id))
                .Where(g => g.Visibility == "public");

            foreach (var g in publicGroups)
            {
                await _groupMemberRepo.AddAsync(new GroupMember
                {
                    GroupId = g.Id,
                    OrganizationId = org.Id,
                    UserId = userId,
                    JoinedAt = DateTime.UtcNow
                });
            }

            // Audit log
            await _noteService.SaveNoteAsync(
                org.Id,
                NoteType.Member,
                $"{user?.Username ?? "A user"} joined the organization via workspace join code");
        }

        var member = await _memberRepo.GetAsync(org.Id, userId);
        var owner = await _userRepo.GetByIdAsync(org.OwnerId);

        return new OrganizationResponseDto
        {
            Id = org.Id,
            Name = org.Name,
            Slug = org.Slug,
            Description = org.Description,
            Industry = org.Industry,
            LogoUrl = org.LogoUrl,
            OwnerId = org.OwnerId,
            OwnerName = owner?.Username ?? "Owner",
            JoinCode = org.JoinCode,
            JoinCodeEnabled = org.JoinCodeEnabled,
            TicketSystemEnabled = org.TicketSystemEnabled,
            Policies = org.Policies ?? new WorkspacePolicies(),
            MyRole = member?.Role ?? OrgRole.Member,
            CreatedAt = org.CreatedAt
        };
    }

    public async Task InviteByEmailAsync(string orgId, string invitedByUserId, InviteByEmailDto dto)
    {
        var requester = await _memberRepo.GetAsync(orgId, invitedByUserId)
            ?? throw new UnauthorizedAccessException("Not a member of this organization.");

        var org = await _orgRepo.GetByIdAsync(orgId)
            ?? throw new InvalidOperationException("Organization not found.");

        if (requester.Role != OrgRole.Owner && !org.Policies.AllowMemberInvites)
            throw new UnauthorizedAccessException("Only workspace owner or authorized members can send invitations.");

        var inviter = await _userRepo.GetByIdAsync(invitedByUserId);

        var invite = new OrganizationInvite
        {
            Id = ObjectId.GenerateNewId().ToString(),
            OrganizationId = orgId,
            Email = dto.Email.ToLowerInvariant().Trim(),
            Token = GenerateRandomCode(32),
            Role = dto.Role == OrgRole.Owner ? OrgRole.Member : dto.Role,
            InvitedByUserId = invitedByUserId,
            InitialGroupIds = dto.InitialGroupIds ?? new List<string>(),
            Status = InviteStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        await _inviteRepo.CreateAsync(invite);

        await _noteService.SaveNoteAsync(
            orgId,
            NoteType.Invitation,
            $"Invitation sent to {dto.Email} with role {invite.Role} by {inviter?.Username ?? "Owner"}");
    }

    public async Task<List<InviteResponseDto>> BatchInviteAsync(string orgId, string invitedByUserId, BatchInviteDto dto)
    {
        var requester = await _memberRepo.GetAsync(orgId, invitedByUserId)
            ?? throw new UnauthorizedAccessException("Not a member of this organization.");

        var org = await _orgRepo.GetByIdAsync(orgId)
            ?? throw new InvalidOperationException("Organization not found.");

        if (requester.Role != OrgRole.Owner && !org.Policies.AllowMemberInvites)
            throw new UnauthorizedAccessException("Only workspace owner or authorized members can send invitations.");

        var inviter = await _userRepo.GetByIdAsync(invitedByUserId);
        var responses = new List<InviteResponseDto>();

        foreach (var item in dto.Invites)
        {
            var invite = new OrganizationInvite
            {
                Id = ObjectId.GenerateNewId().ToString(),
                OrganizationId = orgId,
                Email = item.Email.ToLowerInvariant().Trim(),
                Token = GenerateRandomCode(32),
                Role = item.Role == OrgRole.Owner ? OrgRole.Member : item.Role,
                InvitedByUserId = invitedByUserId,
                InitialGroupIds = item.InitialGroupIds ?? new List<string>(),
                Status = InviteStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };

            await _inviteRepo.CreateAsync(invite);

            await _noteService.SaveNoteAsync(
                orgId,
                NoteType.Invitation,
                $"Invitation sent to {item.Email} with role {invite.Role} by {inviter?.Username ?? "Owner"}");

            responses.Add(new InviteResponseDto
            {
                Id = invite.Id,
                OrganizationId = invite.OrganizationId,
                Email = invite.Email,
                Role = invite.Role,
                InvitedByUserId = invite.InvitedByUserId,
                InvitedByUsername = inviter?.Username ?? "Owner",
                InitialGroupIds = invite.InitialGroupIds,
                Status = invite.Status,
                Token = invite.Token,
                CreatedAt = invite.CreatedAt,
                ExpiresAt = invite.ExpiresAt
            });
        }

        return responses;
    }

    public async Task<List<InviteResponseDto>> GetInvitesAsync(string orgId, string requestingUserId)
    {
        await RequireRoleAsync(orgId, requestingUserId, OrgRole.Owner);

        var invites = await _inviteRepo.GetAllForOrgAsync(orgId);
        var result = new List<InviteResponseDto>();

        foreach (var inv in invites)
        {
            var inviter = await _userRepo.GetByIdAsync(inv.InvitedByUserId);
            result.Add(new InviteResponseDto
            {
                Id = inv.Id,
                OrganizationId = inv.OrganizationId,
                Email = inv.Email,
                Role = inv.Role,
                InvitedByUserId = inv.InvitedByUserId,
                InvitedByUsername = inviter?.Username ?? "Owner",
                InitialGroupIds = inv.InitialGroupIds,
                Status = inv.Status,
                Token = inv.Token,
                CreatedAt = inv.CreatedAt,
                ExpiresAt = inv.ExpiresAt
            });
        }

        return result;
    }

    public async Task ResendInviteAsync(string orgId, string requestingUserId, string inviteId)
    {
        await RequireRoleAsync(orgId, requestingUserId, OrgRole.Owner);

        var invite = await _inviteRepo.GetByIdAsync(inviteId)
            ?? throw new InvalidOperationException("Invite not found.");

        var actor = await _userRepo.GetByIdAsync(requestingUserId);

        invite.Status = InviteStatus.Pending;
        invite.ExpiresAt = DateTime.UtcNow.AddDays(7);
        await _inviteRepo.UpdateAsync(invite);

        await _noteService.SaveNoteAsync(
            orgId,
            NoteType.Invitation,
            $"Invitation to {invite.Email} was resent by {actor?.Username ?? "Owner"}");
    }

    public async Task RevokeInviteAsync(string orgId, string requestingUserId, string inviteId)
    {
        await RequireRoleAsync(orgId, requestingUserId, OrgRole.Owner);

        var invite = await _inviteRepo.GetByIdAsync(inviteId);
        var actor = await _userRepo.GetByIdAsync(requestingUserId);

        await _inviteRepo.UpdateStatusAsync(inviteId, InviteStatus.Revoked);

        if (invite != null)
        {
            await _noteService.SaveNoteAsync(
                orgId,
                NoteType.Invitation,
                $"Invitation to {invite.Email} was revoked by {actor?.Username ?? "Owner"}");
        }
    }

    public async Task<InvitePreviewDto> GetInvitePreviewAsync(string token)
    {
        var invite = await _inviteRepo.GetByTokenAsync(token)
            ?? throw new InvalidOperationException("Invalid invitation link.");

        if (invite.Status != InviteStatus.Pending)
            throw new InvalidOperationException("This invitation is no longer active.");

        if (invite.ExpiresAt < DateTime.UtcNow)
            throw new InvalidOperationException("This invitation has expired.");

        var org = await _orgRepo.GetByIdAsync(invite.OrganizationId)
            ?? throw new InvalidOperationException("Organization not found.");

        var inviter = await _userRepo.GetByIdAsync(invite.InvitedByUserId);
        var memberCount = await _memberRepo.GetMemberCountAsync(org.Id);
        var groups = await _groupRepo.GetAllForOrgAsync(org.Id);

        var initialGroupNames = groups
            .Where(g => invite.InitialGroupIds.Contains(g.Id))
            .Select(g => g.Name)
            .ToList();

        return new InvitePreviewDto
        {
            OrganizationId = org.Id,
            OrganizationName = org.Name,
            Description = org.Description,
            LogoUrl = org.LogoUrl,
            InviterName = inviter?.Username ?? "An administrator",
            Role = invite.Role,
            InitialGroupNames = initialGroupNames,
            MemberCount = memberCount,
            GroupCount = groups.Count
        };
    }

    public async Task<OrganizationResponseDto> AcceptInviteAsync(string token, string userId)
    {
        var invite = await _inviteRepo.GetByTokenAsync(token)
            ?? throw new InvalidOperationException("Invalid invitation link.");

        if (invite.Status != InviteStatus.Pending)
            throw new InvalidOperationException("This invitation is no longer active.");

        if (invite.ExpiresAt < DateTime.UtcNow)
            throw new InvalidOperationException("This invitation has expired.");

        var org = await _orgRepo.GetByIdAsync(invite.OrganizationId)
            ?? throw new InvalidOperationException("Organization not found.");

        var user = await _userRepo.GetByIdAsync(userId);
        var alreadyMember = await _memberRepo.IsMemberAsync(org.Id, userId);

        if (!alreadyMember)
        {
            await _memberRepo.CreateAsync(new OrganizationMember
            {
                Id = ObjectId.GenerateNewId().ToString(),
                OrganizationId = org.Id,
                UserId = userId,
                Role = invite.Role,
                JoinedAt = DateTime.UtcNow
            });

            // Add user to the specified initial groups
            foreach (var groupId in invite.InitialGroupIds)
            {
                var groupExists = await _groupRepo.GetByIdAsync(groupId, org.Id);
                if (groupExists != null && !await _groupMemberRepo.IsMemberAsync(groupId, userId))
                {
                    await _groupMemberRepo.AddAsync(new GroupMember
                    {
                        GroupId = groupId,
                        OrganizationId = org.Id,
                        UserId = userId,
                        JoinedAt = DateTime.UtcNow
                    });
                }
            }

            // Also add user to all public groups
            var publicGroups = (await _groupRepo.GetAllForOrgAsync(org.Id))
                .Where(g => g.Visibility == "public" && !invite.InitialGroupIds.Contains(g.Id));

            foreach (var g in publicGroups)
            {
                await _groupMemberRepo.AddAsync(new GroupMember
                {
                    GroupId = g.Id,
                    OrganizationId = org.Id,
                    UserId = userId,
                    JoinedAt = DateTime.UtcNow
                });
            }

            // Update invite status
            await _inviteRepo.UpdateStatusAsync(invite.Id, InviteStatus.Accepted);

            // Audit log
            await _noteService.SaveNoteAsync(
                org.Id,
                NoteType.Invitation,
                $"{user?.Username ?? "User"} accepted invitation to join the organization as {invite.Role}");
        }

        var owner = await _userRepo.GetByIdAsync(org.OwnerId);

        return new OrganizationResponseDto
        {
            Id = org.Id,
            Name = org.Name,
            Slug = org.Slug,
            Description = org.Description,
            Industry = org.Industry,
            LogoUrl = org.LogoUrl,
            OwnerId = org.OwnerId,
            OwnerName = owner?.Username ?? "Owner",
            JoinCode = org.JoinCode,
            JoinCodeEnabled = org.JoinCodeEnabled,
            TicketSystemEnabled = org.TicketSystemEnabled,
            Policies = org.Policies ?? new WorkspacePolicies(),
            MyRole = invite.Role,
            CreatedAt = org.CreatedAt
        };
    }

    public async Task DeclineInviteAsync(string token, string userId)
    {
        var invite = await _inviteRepo.GetByTokenAsync(token)
            ?? throw new InvalidOperationException("Invalid invitation link.");

        var user = await _userRepo.GetByIdAsync(userId);
        await _inviteRepo.UpdateStatusAsync(invite.Id, InviteStatus.Declined);

        await _noteService.SaveNoteAsync(
            invite.OrganizationId,
            NoteType.Invitation,
            $"Invitation for {invite.Email} was declined by {user?.Username ?? "User"}");
    }

    public async Task<List<MemberResponseDto>> GetMembersAsync(string orgId)
    {
        var members = await _memberRepo.GetMembersForOrgAsync(orgId);
        var result = new List<MemberResponseDto>();

        var allGroups = await _groupRepo.GetAllForOrgAsync(orgId);

        foreach (var m in members)
        {
            var user = await _userRepo.GetByIdAsync(m.UserId);
            var managedGroupIds = allGroups
                .Where(g => g.GroupManagerId == m.UserId)
                .Select(g => g.Id)
                .ToList();

            result.Add(new MemberResponseDto
            {
                UserId = m.UserId,
                Username = user?.Username ?? "Unknown",
                Email = user?.Email,
                AvatarUrl = user?.AvatarUrl,
                Role = m.Role,
                Department = m.Department,
                Title = m.Title,
                IsSuspended = m.IsSuspended,
                ManagedGroupIds = managedGroupIds,
                JoinedAt = m.JoinedAt
            });
        }

        return result;
    }

    public async Task UpdateMemberRoleAsync(string orgId, string requestingUserId, string targetUserId, OrgRole role)
    {
        var requester = await _memberRepo.GetAsync(orgId, requestingUserId)
            ?? throw new UnauthorizedAccessException("Not a member of this organization.");

        var target = await _memberRepo.GetAsync(orgId, targetUserId)
            ?? throw new InvalidOperationException("Member not found.");

        if (target.Role == OrgRole.Owner)
            throw new InvalidOperationException("Cannot change the role of the workspace owner.");

        if (requester.Role != OrgRole.Owner)
            throw new UnauthorizedAccessException("Only the workspace owner can change member roles.");

        if (role == OrgRole.Owner)
            throw new InvalidOperationException("To designate a new owner, please use Transfer Ownership.");

        var actor = await _userRepo.GetByIdAsync(requestingUserId);
        var targetUser = await _userRepo.GetByIdAsync(targetUserId);

        var oldRole = target.Role;

        await _memberRepo.UpdateRoleAsync(orgId, targetUserId, role);

        await _noteService.SaveNoteAsync(
            orgId,
            NoteType.Role,
            $"{targetUser?.Username ?? "Member"}'s role was changed from {oldRole} to {role} by {actor?.Username ?? "Owner"}");
    }

    public async Task ToggleMemberSuspensionAsync(string orgId, string requestingUserId, string targetUserId)
    {
        await RequireRoleAsync(orgId, requestingUserId, OrgRole.Owner);

        var target = await _memberRepo.GetAsync(orgId, targetUserId)
            ?? throw new InvalidOperationException("Member not found.");

        if (target.Role == OrgRole.Owner)
            throw new InvalidOperationException("Cannot suspend the organization owner.");

        var actor = await _userRepo.GetByIdAsync(requestingUserId);
        var targetUser = await _userRepo.GetByIdAsync(targetUserId);

        var newSuspensionState = !target.IsSuspended;
        await _memberRepo.UpdateSuspensionAsync(orgId, targetUserId, newSuspensionState);

        await _noteService.SaveNoteAsync(
            orgId,
            NoteType.Member,
            $"{targetUser?.Username ?? "Member"} was {(newSuspensionState ? "suspended" : "reactivated")} by {actor?.Username ?? "Owner"}");
    }

    public async Task RemoveMemberAsync(string orgId, string requestingUserId, string targetUserId)
    {
        await RequireRoleAsync(orgId, requestingUserId, OrgRole.Owner);

        var target = await _memberRepo.GetAsync(orgId, targetUserId)
            ?? throw new InvalidOperationException("Member not found.");

        if (target.Role == OrgRole.Owner)
            throw new InvalidOperationException("Cannot remove the organization owner.");

        var actor = await _userRepo.GetByIdAsync(requestingUserId);
        var targetUser = await _userRepo.GetByIdAsync(targetUserId);

        await _memberRepo.RemoveAsync(orgId, targetUserId);

        await _noteService.SaveNoteAsync(
            orgId,
            NoteType.Member,
            $"{targetUser?.Username ?? "Member"} was removed from the organization by {actor?.Username ?? "Owner"}");
    }

    // ---- helpers ----

    private async Task RequireRoleAsync(string orgId, string userId, OrgRole minimumRole)
    {
        var member = await _memberRepo.GetAsync(orgId, userId)
            ?? throw new UnauthorizedAccessException("Not a member of this organization.");

        if (member.IsSuspended)
            throw new UnauthorizedAccessException("Account is currently suspended.");

        if ((int)member.Role > (int)minimumRole)
            throw new UnauthorizedAccessException("Insufficient permissions.");
    }

    private async Task<string> GenerateUniqueSlugAsync(string name)
    {
        var baseSlug = name.ToLowerInvariant()
            .Replace(" ", "-")
            .Where(c => char.IsLetterOrDigit(c) || c == '-')
            .Aggregate("", (acc, c) => acc + c);

        if (string.IsNullOrEmpty(baseSlug)) baseSlug = "workspace";

        var slug = baseSlug;
        var suffix = 1;
        while (await _orgRepo.SlugExistsAsync(slug))
        {
            slug = $"{baseSlug}-{suffix}";
            suffix++;
        }
        return slug;
    }

    private static string GenerateRandomCode(int length)
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var bytes = RandomNumberGenerator.GetBytes(length);
        return new string(bytes.Select(b => chars[b % chars.Length]).ToArray());
    }

    public async Task<List<WorkspaceFileDto>> GetWorkspaceFilesAsync(
        string orgId,
        string requestingUserId,
        string? filterUserId = null,
        string? fileType = null)
    {
        // 1. Security check: User must belong to the workspace
        if (!await _memberRepo.IsMemberAsync(orgId, requestingUserId))
            throw new UnauthorizedAccessException("You are not a member of this workspace.");

        // 2. Fetch only chats the requesting user is a member/participant of
        var userGroups = await _groupRepo.GetUserGroupsAsync(orgId, requestingUserId);
        var userGroupIds = userGroups.Select(g => g.Id).ToList();

        var userDirectChats = await _directChatRepo.GetUserChatsAsync(orgId, requestingUserId);
        var userDirectChatIds = userDirectChats.Select(c => c.Id).ToList();

        var accessibleChatIds = userGroupIds.Concat(userDirectChatIds).Distinct().ToList();
        if (accessibleChatIds.Count == 0)
            return new List<WorkspaceFileDto>();

        var filterBuilder = Builders<Message>.Filter;
        var filter = filterBuilder.Eq(m => m.OrganizationId, orgId)
                   & filterBuilder.In(m => m.ChatId, accessibleChatIds)
                   & filterBuilder.Ne(m => m.FileUrl, null)
                   & filterBuilder.Ne(m => m.FileUrl, "")
                   & filterBuilder.Ne(m => m.IsDeleted, true);

        if (!string.IsNullOrWhiteSpace(filterUserId) && filterUserId != "all")
        {
            filter &= filterBuilder.Eq(m => m.SenderId, filterUserId);
        }

        if (!string.IsNullOrWhiteSpace(fileType) && fileType != "all")
        {
            if (fileType == "image")
                filter &= (filterBuilder.Eq(m => m.Type, "image") | filterBuilder.Eq(m => m.FileType, "image"));
            else if (fileType == "pdf")
                filter &= (filterBuilder.Eq(m => m.Type, "pdf") | filterBuilder.Eq(m => m.FileType, "pdf"));
            else if (fileType == "video")
                filter &= (filterBuilder.Eq(m => m.Type, "video") | filterBuilder.Eq(m => m.FileType, "video"));
            else if (fileType == "doc")
                filter &= (filterBuilder.Eq(m => m.Type, "doc") | filterBuilder.Eq(m => m.FileType, "doc") | (filterBuilder.Ne(m => m.Type, "image") & filterBuilder.Ne(m => m.Type, "pdf") & filterBuilder.Ne(m => m.Type, "video")));
        }

        var messages = await _messages
            .Find(filter)
            .SortByDescending(m => m.SentAt)
            .Limit(300)
            .ToListAsync();

        if (messages.Count == 0)
            return new List<WorkspaceFileDto>();

        // Load all workspace members to populate sender metadata
        var members = await _memberRepo.GetMembersForOrgAsync(orgId);
        var memberUserIds = members.Select(m => m.UserId).Distinct().ToList();
        var allUsers = await _userRepo.GetByIdsAsync(memberUserIds);
        var userMap = allUsers.ToDictionary(u => u.Id);

        // Load groups to name channels
        var orgGroups = await _groupRepo.GetAllForOrgAsync(orgId);
        var groupMap = orgGroups.ToDictionary(g => g.Id);

        var result = new List<WorkspaceFileDto>();
        foreach (var m in messages)
        {
            userMap.TryGetValue(m.SenderId, out var sender);
            string? chatName = null;
            if (m.ChatType == "group" && groupMap.TryGetValue(m.ChatId, out var g))
            {
                chatName = $"#{g.Name}";
            }
            else if (m.ChatType == "dm")
            {
                var directChat = await _directChatRepo.GetByIdAsync(m.ChatId, orgId);
                if (directChat != null)
                {
                    var otherUserId = directChat.User1Id == requestingUserId ? directChat.User2Id : directChat.User1Id;
                    if (userMap.TryGetValue(otherUserId, out var otherUser))
                        chatName = $"@{otherUser.Username}";
                }
                chatName ??= "Direct Message";
            }

            result.Add(new WorkspaceFileDto
            {
                Id = m.Id,
                OrganizationId = m.OrganizationId,
                ChatId = m.ChatId,
                ChatType = m.ChatType,
                ChatName = chatName ?? (m.ChatType == "group" ? "Channel" : "Direct Message"),
                SenderId = m.SenderId,
                SenderUsername = sender?.Username ?? "Member",
                SenderAvatarUrl = sender?.AvatarUrl,
                FileName = !string.IsNullOrWhiteSpace(m.FileName) ? m.FileName : "Attachment",
                FileUrl = m.FileUrl!,
                FileType = m.Type ?? m.FileType ?? "file",
                FileSize = m.FileSize,
                SentAt = m.SentAt,
                IsMe = m.SenderId == requestingUserId
            });
        }

        return result;
    }
}