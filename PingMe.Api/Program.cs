using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using PingMe.Core.Interfaces;
using PingMe.Infrastructure.Data;
using PingMe.Infrastructure.Repositories;
using PingMe.Infrastructure.Services;
using StackExchange.Redis;
using System.Text;
using PingMe.Api.BackgroundServices;
using PingMe.Api.Hubs;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── Infrastructure ──────────────────────────────────────────────────────────

builder.Services.AddSingleton<MongoDbContext>();

builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect(
        builder.Configuration["Redis:ConnectionString"]!));

// ── Repositories ────────────────────────────────────────────────────────────

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IOrganizationRepository, OrganizationRepository>();
builder.Services.AddScoped<IOrganizationMemberRepository, OrganizationMemberRepository>();
builder.Services.AddScoped<IOrganizationInviteRepository, OrganizationInviteRepository>();
builder.Services.AddScoped<IDirectChatRepository, DirectChatRepository>();
builder.Services.AddScoped<IGroupRepository, GroupRepository>();
builder.Services.AddScoped<IGroupMemberRepository, GroupMemberRepository>();
builder.Services.AddScoped<INoteRepository, NoteRepository>();
builder.Services.AddScoped<ITicketRepository, TicketRepository>();

// ── Services ─────────────────────────────────────────────────────────────────

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IMessageService, MessageService>();
builder.Services.AddScoped<IOrganizationService, OrganizationService>();
builder.Services.AddScoped<IDirectChatService, DirectChatService>();
builder.Services.AddScoped<IGroupService, GroupService>();
builder.Services.AddScoped<INoteService, NoteService>();
builder.Services.AddScoped<ITicketService, TicketService>();
builder.Services.AddSingleton<IPresenceService, PresenceService>();
builder.Services.AddSingleton<INotificationService, NotificationService>();
builder.Services.AddSingleton<IFileUploadService, CloudinaryFileUploadService>();

// ── Background Services ──────────────────────────────────────────────────────

builder.Services.AddHostedService<NotificationSubscriberService>();

// ── File Upload ──────────────────────────────────────────────────────────────

builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = 25 * 1024 * 1024;
});

// ── SignalR + Redis backplane ────────────────────────────────────────────────

builder.Services.AddSignalR()
    .AddStackExchangeRedis(
        builder.Configuration["Redis:ConnectionString"]!);

// ── Authentication ───────────────────────────────────────────────────────────

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(
                    builder.Configuration["Jwt:Secret"]!)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"]
        };
        opts.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(token))
                    ctx.Token = token;
                return Task.CompletedTask;
            }
        };
    });

// ── Swagger ──────────────────────────────────────────────────────────────────

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "PingMe API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter your JWT token here"
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddAuthorization();

builder.Services.AddCors(opts => opts.AddDefaultPolicy(p =>
    p.SetIsOriginAllowed(_ => true)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()));

// ── App pipeline ─────────────────────────────────────────────────────────────

var app = builder.Build();

app.MapHub<ChatHub>("/hubs/chat");
app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();