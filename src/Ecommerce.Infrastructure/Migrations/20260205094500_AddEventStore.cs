using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ecommerce.Infrastructure.Migrations
{
    public partial class AddEventStore : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EventStore",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<string>(type: "text", nullable: false),
                    Payload = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Attempts = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    Status = table.Column<string>(type: "text", nullable: false, defaultValue: "pending")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventStore", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EventStore_Status",
                table: "EventStore",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_EventStore_CreatedAt",
                table: "EventStore",
                column: "CreatedAt");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EventStore");
        }
    }
}
