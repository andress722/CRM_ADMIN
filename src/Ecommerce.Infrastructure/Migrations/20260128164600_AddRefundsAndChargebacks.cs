using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ecommerce.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRefundsAndChargebacks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ChargebackDisputes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChargebackId = table.Column<Guid>(type: "uuid", nullable: false),
                    Payload = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChargebackDisputes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Refunds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Refunds", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChargebackDisputes_ChargebackId",
                table: "ChargebackDisputes",
                column: "ChargebackId");

            migrationBuilder.CreateIndex(
                name: "IX_ChargebackDisputes_CreatedAt",
                table: "ChargebackDisputes",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Refunds_CreatedAt",
                table: "Refunds",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Refunds_OrderId",
                table: "Refunds",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Refunds_Status",
                table: "Refunds",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChargebackDisputes");

            migrationBuilder.DropTable(
                name: "Refunds");
        }
    }
}
