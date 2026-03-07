using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ecommerce.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSubscriptionRecurringFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BillingRetryCount",
                table: "Subscriptions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "CurrentPeriodEndAt",
                table: "Subscriptions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CurrentPeriodStartAt",
                table: "Subscriptions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastBillingError",
                table: "Subscriptions",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastTransactionId",
                table: "Subscriptions",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_NextBillingAt",
                table: "Subscriptions",
                column: "NextBillingAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Subscriptions_NextBillingAt",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "BillingRetryCount",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "CurrentPeriodEndAt",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "CurrentPeriodStartAt",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "LastBillingError",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "LastTransactionId",
                table: "Subscriptions");
        }
    }
}
