using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ecommerce.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPushDevicesSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PushDevices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DeviceName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastSeenAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PushDevices", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PushDevices_LastSeenAt",
                table: "PushDevices",
                column: "LastSeenAt");

            migrationBuilder.CreateIndex(
                name: "IX_PushDevices_UserId",
                table: "PushDevices",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PushDevices_UserId_Token",
                table: "PushDevices",
                columns: new[] { "UserId", "Token" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PushDevices");
        }
    }
}
