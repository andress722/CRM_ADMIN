// components/Header.tsx

'use client';

import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/contexts/NotificationContext';
import {
  LogOut,
  Search,
  Settings,
  User,
  ChevronDown,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function Header() {
  const { logout, user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getUserString = (value: unknown, fallback: string) =>
    typeof value === 'string' && value.trim().length > 0 ? value : fallback;

  const userName = getUserString(user?.name, getUserString(user?.email, 'Admin'));
  const userEmail = getUserString(user?.email, 'No email');

  return (
    <header className="border-b border-white/10 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search orders, products..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-6 ml-6">
          {/* Notifications */}
          <NotificationBell />

          {/* Divider */}
          <div className="w-px h-6 bg-white/10" />

          {/* Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              type="button"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-slate-200">{userName}</p>
                <p className="text-xs text-slate-500">{userEmail}</p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform ${
                  isProfileOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg bg-slate-800 border border-white/10 shadow-lg overflow-hidden z-50">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-white/10 bg-slate-700/50">
                  <p className="text-sm font-medium text-slate-200">{userName}</p>
                  <p className="text-xs text-slate-500">{userEmail}</p>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <button
                    type="button"
                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    Profile Settings
                  </button>
                  <button
                    type="button"
                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    Preferences
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-white/10">
                  <button
                    onClick={logout}
                    type="button"
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

