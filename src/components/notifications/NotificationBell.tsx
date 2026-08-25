import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getUnreadNotificationCount, NOTIFICATIONS_CHANGED_EVENT } from '../../services/notifications/notificationService';

const NotificationBell = ({ className = '' }: { className?: string }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    let currentUserId: string | null = null;
    let notificationChannel: ReturnType<typeof supabase.channel> | null = null;

    const load = () => {
      if (!currentUserId) return;
      void getUnreadNotificationCount().then((count) => {
        if (mounted) setUnreadCount(count);
      }).catch(() => {
        if (mounted) setUnreadCount(0);
      });
    };

    const subscribeForUser = (userId: string | null) => {
      if (userId === currentUserId) return;
      if (notificationChannel) {
        void supabase.removeChannel(notificationChannel);
        notificationChannel = null;
      }

      currentUserId = userId;
      if (!userId) {
        setUnreadCount(0);
        return;
      }

      load();
      notificationChannel = supabase
        .channel(`notification-bell:${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        }, load)
        .subscribe();
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) subscribeForUser(data.session?.user.id ?? null);
    });
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) subscribeForUser(session?.user.id ?? null);
    });

    const handleFocus = () => load();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, load);
    window.addEventListener('focus', handleFocus);
    return () => {
      mounted = false;
      authSubscription.unsubscribe();
      if (notificationChannel) void supabase.removeChannel(notificationChannel);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, load);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const label = unreadCount > 0 ? `Bildirimler, ${unreadCount} okunmamış bildirim` : 'Bildirimler';
  return <Link to="/notifications" aria-label={label} className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${className}`}>
    <Bell className="h-5 w-5" aria-hidden="true" />
    {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-600 px-1.5 py-0.5 text-center text-[10px] font-bold leading-4 text-white" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}
  </Link>;
};

export default NotificationBell;
