using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ecommerce.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTwoFactorPersistence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AnalyticsEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Label = table.Column<string>(type: "text", nullable: true),
                    Value = table.Column<decimal>(type: "numeric", nullable: true),
                    Url = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnalyticsEvents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DailyKpis",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    TotalEvents = table.Column<int>(type: "integer", nullable: false),
                    Signups = table.Column<int>(type: "integer", nullable: false),
                    Logins = table.Column<int>(type: "integer", nullable: false),
                    Purchases = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyKpis", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EmailLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    To = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Subject = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Body = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Error = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TwoFactorChallenges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    VerifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TwoFactorChallenges", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TwoFactorProfiles",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Secret = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    RecoveryCodes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TwoFactorProfiles", x => x.UserId);
                });

            migrationBuilder.CreateTable(
                name: "TwoFactorSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Secret = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TwoFactorSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Webhooks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Secret = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    EventTypes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Webhooks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WebhookDeliveries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WebhookId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Payload = table.Column<string>(type: "text", nullable: false),
                    Attempt = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    NextRetryAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ResponseCode = table.Column<int>(type: "integer", nullable: true),
                    ResponseBody = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WebhookDeliveries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WebhookDeliveries_Webhooks_WebhookId",
                        column: x => x.WebhookId,
                        principalTable: "Webhooks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AnalyticsEvents_CreatedAt",
                table: "AnalyticsEvents",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_DailyKpis_Date",
                table: "DailyKpis",
                column: "Date",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmailLogs_CreatedAt",
                table: "EmailLogs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_TwoFactorChallenges_ExpiresAt",
                table: "TwoFactorChallenges",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_TwoFactorChallenges_UserId",
                table: "TwoFactorChallenges",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TwoFactorChallenges_VerifiedAt",
                table: "TwoFactorChallenges",
                column: "VerifiedAt");

            migrationBuilder.CreateIndex(
                name: "IX_TwoFactorProfiles_Enabled",
                table: "TwoFactorProfiles",
                column: "Enabled");

            migrationBuilder.CreateIndex(
                name: "IX_TwoFactorSessions_ExpiresAt",
                table: "TwoFactorSessions",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_TwoFactorSessions_UserId",
                table: "TwoFactorSessions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_WebhookDeliveries_NextRetryAt",
                table: "WebhookDeliveries",
                column: "NextRetryAt");

            migrationBuilder.CreateIndex(
                name: "IX_WebhookDeliveries_Status",
                table: "WebhookDeliveries",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_WebhookDeliveries_WebhookId",
                table: "WebhookDeliveries",
                column: "WebhookId");

            migrationBuilder.CreateIndex(
                name: "IX_Webhooks_IsActive",
                table: "Webhooks",
                column: "IsActive");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AnalyticsEvents");

            migrationBuilder.DropTable(
                name: "DailyKpis");

            migrationBuilder.DropTable(
                name: "EmailLogs");

            migrationBuilder.DropTable(
                name: "TwoFactorChallenges");

            migrationBuilder.DropTable(
                name: "TwoFactorProfiles");

            migrationBuilder.DropTable(
                name: "TwoFactorSessions");

            migrationBuilder.DropTable(
                name: "WebhookDeliveries");

            migrationBuilder.DropTable(
                name: "Webhooks");
        }
    }
}
