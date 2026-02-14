using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ecommerce.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCrmEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CrmActivities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Subject = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Owner = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Contact = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CrmActivities", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CrmContacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Company = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Owner = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Segment = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Lifecycle = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LastTouch = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CrmContacts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CrmDeals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Company = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Owner = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Value = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Stage = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Probability = table.Column<int>(type: "integer", nullable: false),
                    ExpectedClose = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CrmDeals", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CrmLeads",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Company = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Value = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Owner = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Source = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CrmLeads", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CrmActivities_DueDate",
                table: "CrmActivities",
                column: "DueDate");

            migrationBuilder.CreateIndex(
                name: "IX_CrmActivities_Status",
                table: "CrmActivities",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_CrmActivities_Type",
                table: "CrmActivities",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_CrmContacts_CreatedAt",
                table: "CrmContacts",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CrmContacts_Email",
                table: "CrmContacts",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_CrmContacts_Owner",
                table: "CrmContacts",
                column: "Owner");

            migrationBuilder.CreateIndex(
                name: "IX_CrmDeals_CreatedAt",
                table: "CrmDeals",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CrmDeals_Owner",
                table: "CrmDeals",
                column: "Owner");

            migrationBuilder.CreateIndex(
                name: "IX_CrmDeals_Stage",
                table: "CrmDeals",
                column: "Stage");

            migrationBuilder.CreateIndex(
                name: "IX_CrmLeads_CreatedAt",
                table: "CrmLeads",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CrmLeads_Email",
                table: "CrmLeads",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_CrmLeads_Status",
                table: "CrmLeads",
                column: "Status");

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CrmActivities");

            migrationBuilder.DropTable(
                name: "CrmContacts");

            migrationBuilder.DropTable(
                name: "CrmDeals");

            migrationBuilder.DropTable(
                name: "CrmLeads");

        }
    }
}
