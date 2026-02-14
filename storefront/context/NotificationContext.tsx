import React, { createContext, useContext, useState, ReactNode } from 'react';
import { NotificationType } from '../components/Notification';

interface NotificationState {
  message: string;
  type: NotificationType;
  show: boolean;
}

interface NotificationContextProps {
  notify: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NotificationState>({ message: '', type: 'info', show: false });

  function notify(message: string, type: NotificationType = 'info') {
    setState({ message, type, show: true });
  }

  function handleClose() {
    setState(s => ({ ...s, show: false }));
  }

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <Notification message={state.message} type={state.type} show={state.show} onClose={handleClose} />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}

import Notification from '../components/Notification';
