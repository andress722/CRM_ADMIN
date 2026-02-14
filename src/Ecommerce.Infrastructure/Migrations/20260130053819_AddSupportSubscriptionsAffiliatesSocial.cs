using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ecommerce.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSupportSubscriptionsAffiliatesSocial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AffiliateConversions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PartnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CommissionAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AffiliateConversions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AffiliatePartners",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CommissionRate = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AffiliatePartners", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ExternalIdentities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ProviderUserId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExternalIdentities", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Subscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Plan = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastBilledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NextBillingAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Subscriptions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SupportTickets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Subject = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Message = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupportTickets", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AffiliateConversions_OrderId",
                table: "AffiliateConversions",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_AffiliateConversions_PartnerId",
                table: "AffiliateConversions",
                column: "PartnerId");

            migrationBuilder.CreateIndex(
                name: "IX_AffiliatePartners_Code",
                table: "AffiliatePartners",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AffiliatePartners_Email",
                table: "AffiliatePartners",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_ExternalIdentities_Provider_ProviderUserId",
                table: "ExternalIdentities",
                columns: new[] { "Provider", "ProviderUserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExternalIdentities_UserId",
                table: "ExternalIdentities",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_Email",
                table: "Subscriptions",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_Status",
                table: "Subscriptions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_SupportTickets_CreatedAt",
                table: "SupportTickets",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SupportTickets_Status",
                table: "SupportTickets",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AffiliateConversions");

            migrationBuilder.DropTable(
                name: "AffiliatePartners");

            migrationBuilder.DropTable(
                name: "ExternalIdentities");

            migrationBuilder.DropTable(
                name: "Subscriptions");

            migrationBuilder.DropTable(
                name: "SupportTickets");
        }
    }
}
