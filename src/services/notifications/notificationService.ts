import { supabase } from '../../lib/supabase';

export type NotificationType =
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'appointment_reminder'
  | 'appointment_status_changed'
  | 'appointment_no_show'
  | 'follow_up_reminder';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  appointment_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

export const NOTIFICATIONS_CHANGED_EVENT = 'notifications:changed';

const notifyChanged = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));

export const getMyNotifications = async (): Promise<AppNotification[]> => {
  const { data, error } = await supabase.rpc('get_my_notifications', { p_limit: 50 });
  if (error) throw error;
  return (data ?? []) as AppNotification[];
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  const { data, error } = await supabase.rpc('get_unread_notification_count');
  if (error) throw error;
  return Number(data ?? 0);
};

export const markNotificationRead = async (notificationId: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: notificationId,
  });
  if (error) throw error;
  const updated = Boolean(data);
  notifyChanged();
  return updated;
};

export const markAllNotificationsRead = async (): Promise<number> => {
  const { data, error } = await supabase.rpc('mark_all_notifications_read');
  if (error) throw error;
  const updated = Number(data ?? 0);
  notifyChanged();
  return updated;
};
