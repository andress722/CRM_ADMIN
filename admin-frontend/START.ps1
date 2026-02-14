#!/usr/bin/env pwsh
# 🚀 QUICK START - Admin Dashboard Modernization

Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║                                                               ║" -ForegroundColor Magenta
Write-Host "║        🎉 E-COMMERCE ADMIN DASHBOARD MODERNIZATION 🎉       ║" -ForegroundColor Magenta
Write-Host "║                                                               ║" -ForegroundColor Magenta
Write-Host "║              Transformed: Simple → Premium Design            ║" -ForegroundColor Magenta
Write-Host "║                                                               ║" -ForegroundColor Magenta
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host "`n"

# Menu
Write-Host "Choose an action:" -ForegroundColor Yellow
Write-Host "1. Start Backend (ASP.NET Core)" -ForegroundColor Cyan
Write-Host "2. Start Frontend (Next.js)" -ForegroundColor Cyan
Write-Host "3. View Documentation" -ForegroundColor Cyan
Write-Host "4. Open Dashboard Browser" -ForegroundColor Cyan
Write-Host "5. Run Both Services" -ForegroundColor Cyan
Write-Host "6. View Quick Commands" -ForegroundColor Cyan
Write-Host "`n"

$choice = Read-Host "Enter your choice (1-6)"

$baseDir = "c:\Users\Benyamin\OneDrive\Desktop\copilot-sdk-main"

switch($choice) {
    "1" {
        Write-Host "`n🚀 Starting Backend (ASP.NET Core)..." -ForegroundColor Green
        Write-Host "📍 Directory: $baseDir\dotnet`n" -ForegroundColor Gray
        Set-Location "$baseDir\dotnet"
        dotnet run
    }
    
    "2" {
        Write-Host "`n🚀 Starting Frontend (Next.js)..." -ForegroundColor Green
        Write-Host "📍 Directory: $baseDir\admin-frontend`n" -ForegroundColor Gray
        Set-Location "$baseDir\admin-frontend"
        npm run dev
    }
    
    "3" {
        Write-Host "`n📚 Documentation Files:" -ForegroundColor Yellow
        Write-Host "1. QUICK_START_UI.md - Quick start guide (5 min)" -ForegroundColor Cyan
        Write-Host "2. DESIGN_SYSTEM.md - Design tokens (15 min)" -ForegroundColor Cyan
        Write-Host "3. VISUAL_GUIDE.md - Visual examples (20 min)" -ForegroundColor Cyan
        Write-Host "4. QUICK_COMMANDS.md - All commands" -ForegroundColor Cyan
        Write-Host "5. PROJECT_COMPLETE.txt - ASCII summary (3 min)" -ForegroundColor Cyan
        Write-Host "6. DOCUMENTATION_INDEX.md - Navigation guide" -ForegroundColor Cyan
        Write-Host "7. MODERNIZATION_SUMMARY.md - Executive summary" -ForegroundColor Cyan
        Write-Host "8. README_MODERNIZATION.md - Final summary" -ForegroundColor Cyan
        
        Write-Host "`n📂 Opening documentation folder..." -ForegroundColor Green
        Invoke-Item "$baseDir\admin-frontend"
    }
    
    "4" {
        Write-Host "`n🌐 Opening Dashboard in Browser..." -ForegroundColor Green
        Write-Host "URL: http://localhost:3000`n" -ForegroundColor Gray
        Start-Process "http://localhost:3000"
    }
    
    "5" {
        Write-Host "`n🚀 Starting Both Services..." -ForegroundColor Green
        
        # Backend in new window
        Write-Host "📍 Starting Backend..." -ForegroundColor Cyan
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\dotnet'; dotnet run"
        
        Start-Sleep -Seconds 3
        
        # Frontend in new window
        Write-Host "📍 Starting Frontend..." -ForegroundColor Cyan
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\admin-frontend'; npm run dev"
        
        Start-Sleep -Seconds 5
        
        Write-Host "✅ Both services started!" -ForegroundColor Green
        Write-Host "Backend: http://localhost:5071" -ForegroundColor Gray
        Write-Host "Frontend: http://localhost:3000" -ForegroundColor Gray
        Write-Host "Opening dashboard..." -ForegroundColor Green
        
        Start-Process "http://localhost:3000"
    }
    
    "6" {
        Write-Host "`n⚡ Quick Commands Reference:" -ForegroundColor Yellow
        Write-Host "`nBackend Startup:" -ForegroundColor Cyan
        Write-Host "cd c:\Users\Benyamin\OneDrive\Desktop\copilot-sdk-main\dotnet`n" -ForegroundColor Gray
        Write-Host "dotnet run`n" -ForegroundColor Gray
        
        Write-Host "Frontend Startup:" -ForegroundColor Cyan
        Write-Host "cd c:\Users\Benyamin\OneDrive\Desktop\copilot-sdk-main\admin-frontend`n" -ForegroundColor Gray
        Write-Host "npm run dev`n" -ForegroundColor Gray
        
        Write-Host "Dashboard URL:" -ForegroundColor Cyan
        Write-Host "http://localhost:3000`n" -ForegroundColor Gray
        
        Write-Host "API Swagger:" -ForegroundColor Cyan
        Write-Host "http://localhost:5071/swagger`n" -ForegroundColor Gray
        
        Write-Host "See QUICK_COMMANDS.md for more!" -ForegroundColor Yellow
    }
    
    default {
        Write-Host "`n❌ Invalid choice. Please run again and enter 1-6." -ForegroundColor Red
    }
}

Write-Host "`n✨ Done! Enjoy your modernized dashboard! ✨`n" -ForegroundColor Magenta
