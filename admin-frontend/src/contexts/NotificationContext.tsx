'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Bell, X } from 'lucide-react';

interface Notification {
  id: string;
  type: 'order' | 'product' | 'alert';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
let notificationCounter = 0;

const nextNotificationId = () => {
  notificationCounter += 1;
  return `notification-${notificationCounter}`;
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: nextNotificationId(),
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep last 50

    // Auto-dismiss after 5 seconds if it's an order notification
    if (notification.type === 'order') {
      setTimeout(() => {
        markAsRead(newNotification.id);
      }, 5000);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

// Notification Bell Component
export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return '📦';
      case 'product':
        return '📊';
      case 'alert':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order':
        return 'text-blue-400';
      case 'product':
        return 'text-green-400';
      case 'alert':
        return 'text-yellow-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
            <h3 className="font-semibold text-white">Notifications</h3>
            <div className="flex gap-2">
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-700 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div>
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-3 border-b border-slate-700 cursor-pointer transition-colors hover:bg-slate-700/50 ${
                    !notification.read ? 'bg-slate-700/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-1">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${getNotificationColor(notification.type)}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{notification.message}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {notification.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
