import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';

export function useNotifications() {
  const [status, setStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    const register = async () => {
      const settings = await Notifications.getPermissionsAsync();
      let finalStatus = settings.status;
      if (finalStatus !== 'granted') {
        const request = await Notifications.requestPermissionsAsync();
        finalStatus = request.status;
      }
      setStatus(finalStatus === 'granted' ? 'granted' : 'denied');
      if (finalStatus === 'granted') {
        const token = await Notifications.getExpoPushTokenAsync();
        setPushToken(token.data);
      }
    };

    register();
  }, []);

  return { status, pushToken };
}
