# ⚡ QUICK COMMANDS - Admin Dashboard

## 🚀 Startup Commands

### Terminal 1 - Backend
```powershell
cd c:\Users\Benyamin\OneDrive\Desktop\copilot-sdk-main\dotnet
dotnet run
```
**Expected Output:**
```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5071
Application started. Press Ctrl+C to shut down.
```

### Terminal 2 - Frontend
```powershell
cd c:\Users\Benyamin\OneDrive\Desktop\copilot-sdk-main\admin-frontend
npm run dev
```
**Expected Output:**
```
> admin-frontend@0.1.0 dev
> next dev

  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
  - Ready in 2.5s
```

### Open Browser
```
http://localhost:3000
```

---

## 📖 Documentation

### View Design System
```bash
cat admin-frontend/DESIGN_SYSTEM.md
```

### View Visual Guide
```bash
cat admin-frontend/VISUAL_GUIDE.md
```

### View Modernization Status
```bash
cat admin-frontend/MODERNIZATION_SUMMARY.md
```

### View Quick Start
```bash
cat admin-frontend/QUICK_START_UI.md
```

### View Project Complete
```bash
cat admin-frontend/PROJECT_COMPLETE.txt
```

---

## 🔧 Development Commands

### Frontend Development
```bash
cd admin-frontend

# Run dev server
npm run dev

# Build for production
npm run build

# Check TypeScript
npm run type-check

# Lint code
npm run lint

# Format code (if available)
npm run format
```

### Backend Development
```bash
cd dotnet

# Run development
dotnet run

# Build
dotnet build

# Run tests (if available)
dotnet test

# Clean
dotnet clean
```

---

## 🎨 Component Files

### Sidebar
```
admin-frontend/components/Sidebar.tsx
```

### Dashboard
```
admin-frontend/components/Dashboard.tsx
```

### Products Table
```
admin-frontend/components/ProductsTable.tsx
```

### Orders Table
```
admin-frontend/components/OrdersTable.tsx
```

### Users Table
```
admin-frontend/components/UsersTable.tsx
```

### Product Modal
```
admin-frontend/components/ProductModal.tsx
```

### Charts
```
admin-frontend/components/Charts.tsx
```

---

## 🎯 Testing URLs

### Backend Health
```
http://localhost:5071/api/admin/statistics/dashboard
```

### Swagger API Docs
```
http://localhost:5071/swagger
```

### Frontend Dashboard
```
http://localhost:3000
```

### Frontend - Products Tab
```
http://localhost:3000?tab=products
```

---

## 📊 API Endpoints (for reference)

### Admin Statistics
```
GET /api/admin/statistics/dashboard
GET /api/admin/statistics/top-products
GET /api/admin/statistics/top-categories
GET /api/admin/statistics/revenue
```

### Products
```
GET /api/products
POST /api/products
PUT /api/products/{id}
DELETE /api/products/{id}
```

### Orders
```
GET /api/orders
GET /api/orders/{id}
POST /api/orders
```

### Users
```
GET /api/users
GET /api/users/{id}
```

---

## 🐛 Troubleshooting Commands

### Check if Backend is Running
```powershell
curl http://localhost:5071/api/admin/statistics/dashboard
```

### Check if Frontend is Running
```powershell
curl http://localhost:3000
```

### Clear npm Cache
```bash
npm cache clean --force
cd admin-frontend
rm -r node_modules
npm install
```

### Clear Next.js Cache
```bash
cd admin-frontend
rm -r .next
npm run dev
```

### Kill Port 5071 (if stuck)
```powershell
netstat -ano | findstr :5071
taskkill /PID <PID> /F
```

### Kill Port 3000 (if stuck)
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 📁 Project Structure Commands

### List Components
```bash
ls admin-frontend/components/
```

### List API Files
```bash
ls admin-frontend/lib/
```

### List Styles
```bash
cat admin-frontend/app/globals.css
```

### View Project Structure
```bash
tree admin-frontend/ -L 2
```

---

## 💾 Build & Deploy

### Build Frontend
```bash
cd admin-frontend
npm run build
```

### Build Backend
```bash
cd dotnet
dotnet publish -c Release
```

### Production Start Frontend
```bash
cd admin-frontend
npm start
```

---

## 📝 File Editing

### Edit Sidebar Colors
```bash
# Open component
code admin-frontend/components/Sidebar.tsx

# Find: from-blue-600
# Replace: from-purple-600
```

### Edit Dashboard Gradients
```bash
# Open component
code admin-frontend/components/Dashboard.tsx

# Modify gradient colors in Tailwind classes
```

### Edit Global Theme
```bash
# Open styles
code admin-frontend/app/globals.css

# Modify: background, .glass, scrollbar
```

---

## 🎨 Color Change Quick Guide

### Change Primary Color

1. Find all instances:
```bash
grep -r "from-blue-600" admin-frontend/
```

2. Replace with new color:
```bash
# Replace in all files
sed -i 's/from-blue-600/from-purple-600/g' admin-frontend/components/*.tsx
sed -i 's/to-blue-700/to-purple-700/g' admin-frontend/components/*.tsx
```

---

## 📊 Performance Testing

### Check Lighthouse Score
```bash
# Build production
npm run build

# Use Chrome DevTools → Lighthouse tab
# Or use CLI tools like: npm install -g @lighthouse-ci/cli
```

### Check TypeScript Errors
```bash
npm run type-check
```

### Lint Check
```bash
npm run lint
```

---

## 🔄 Git Commands (if version controlled)

### Status
```bash
git status
```

### Add All Changes
```bash
git add .
```

### Commit
```bash
git commit -m "feat: UI modernization complete"
```

### Push
```bash
git push origin main
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `DESIGN_SYSTEM.md` | Complete design documentation |
| `VISUAL_GUIDE.md` | Visual design guide |
| `UI_MODERNIZATION_COMPLETE.md` | Project status |
| `MODERNIZATION_SUMMARY.md` | Executive summary |
| `QUICK_START_UI.md` | Quick start guide |
| `PROJECT_COMPLETE.txt` | ASCII art summary |
| `QUICK_COMMANDS.md` | This file |

---

## ⚡ Super Quick Start (Copy-Paste)

### Windows PowerShell
```powershell
# Terminal 1
cd c:\Users\Benyamin\OneDrive\Desktop\copilot-sdk-main\dotnet; dotnet run

# Terminal 2 (New Window)
cd c:\Users\Benyamin\OneDrive\Desktop\copilot-sdk-main\admin-frontend; npm run dev

# Browser
Start-Process http://localhost:3000
```

### macOS/Linux
```bash
# Terminal 1
cd ~/copilot-sdk-main/dotnet && dotnet run

# Terminal 2
cd ~/copilot-sdk-main/admin-frontend && npm run dev

# Browser
open http://localhost:3000
```

---

## 🎯 Daily Workflow

### Morning Startup
```bash
# Check if running
curl http://localhost:5071/api/admin/statistics/dashboard
curl http://localhost:3000

# If not running, start both services
```

### Development Session
```bash
# Make changes to components
code admin-frontend/components/Dashboard.tsx

# Changes auto-reload in dev server
# Check browser at http://localhost:3000
```

### End of Day
```bash
# Ctrl+C to stop both services
# Optional: Commit changes
git add .
git commit -m "daily progress"
git push
```

---

## 🆘 Emergency Commands

### Reset Everything
```bash
# Stop all processes
# (Ctrl+C in terminals)

# Clear all caches
cd admin-frontend
rm -r .next node_modules
npm install
npm run dev
```

### View Logs
```bash
# Backend logs (visible in terminal)
# Frontend logs (visible in terminal and browser console F12)
```

### Debug Mode
```bash
# Add debug output to env
export DEBUG=*
npm run dev
```

---

**Last Updated:** 2024
**Version:** 1.0
**Status:** 🟡 Em consolidacao
