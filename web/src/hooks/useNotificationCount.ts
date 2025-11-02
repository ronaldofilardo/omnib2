import { useEffect, useState, useCallback } from 'react';

export function useNotificationCount(userId: string) {
  const [count, setCount] = useState(0);

  const fetchNotifications = useCallback(() => {
    if (!userId) return;
    fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCount(data.length);
        else if (data.notifications) setCount(data.notifications.length);
        else setCount(0);
      })
      .catch(() => setCount(0));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    // Busca inicial
    fetchNotifications();

    // Polling a cada 30 segundos para atualizar notificações em tempo real
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, [userId, fetchNotifications]);

  return count;
}
