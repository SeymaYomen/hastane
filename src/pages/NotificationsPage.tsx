import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../services/notifications/notificationService';

const formatTimestamp = (value: string) => new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));

const NotificationsPage = () => {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    void getMyNotifications().then((notifications) => {
      if (mounted) setItems(notifications);
    }).catch(() => {
      if (mounted) setError('Bildirimler yüklenemedi. Lütfen tekrar deneyin.');
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const markRead = async (notification: AppNotification) => {
    if (notification.is_read || updating) return;
    setUpdating(notification.id); setError('');
    try {
      if (await markNotificationRead(notification.id)) {
        const readAt = new Date().toISOString();
        setItems((current) => current.map((item) => item.id === notification.id
          ? { ...item, is_read: true, read_at: readAt }
          : item));
      }
    } catch {
      setError('Bildirim okundu olarak işaretlenemedi.');
    } finally { setUpdating(null); }
  };

  const markAllRead = async () => {
    if (updating || !items.some((item) => !item.is_read)) return;
    setUpdating('all'); setError('');
    try {
      await markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, is_read: true, read_at: item.read_at ?? readAt })));
    } catch {
      setError('Bildirimler okundu olarak işaretlenemedi.');
    } finally { setUpdating(null); }
  };

  return <div className="mx-auto min-h-[70vh] max-w-4xl px-4 pb-16 pt-28 sm:px-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-3"><Bell className="h-7 w-7 text-cyan-600" /><h1 className="text-3xl font-bold">Bildirimler</h1></div><p className="mt-2 text-sm text-slate-500">Randevu ve kontrol hatırlatmalarınızı buradan takip edin.</p></div>{items.some((item) => !item.is_read) && <button type="button" disabled={Boolean(updating)} onClick={() => void markAllRead()} className="inline-flex items-center gap-2 rounded-lg border border-cyan-600 px-4 py-2 text-sm font-semibold text-cyan-700 disabled:opacity-50 dark:text-cyan-300"><CheckCheck className="h-4 w-4" />Tümünü okundu yap</button>}</header>
    {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
    {loading ? <p className="mt-8 text-sm text-slate-500">Bildirimler yükleniyor...</p> : items.length === 0 ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-950"><Bell className="mx-auto h-10 w-10 text-slate-400" /><p className="mt-3 text-slate-500">Henüz bildiriminiz yok.</p></div> : <ul className="mt-8 space-y-3">{items.map((notification) => <li key={notification.id} className={`rounded-2xl border p-5 ${notification.is_read ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950' : 'border-cyan-300 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950/20'}`}><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className="font-semibold">{notification.title}</h2><span className="text-xs text-slate-500">{notification.is_read ? 'Okundu' : 'Okunmadı'}</span></div><p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{notification.message}</p><p className="mt-2 text-xs text-slate-500">{formatTimestamp(notification.created_at)}</p></div>{!notification.is_read && <button type="button" disabled={Boolean(updating)} onClick={() => void markRead(notification)} className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium disabled:opacity-50 dark:border-slate-700">Okundu olarak işaretle</button>}</div>{notification.appointment_id && <Link to="/my-appointments" className="mt-4 inline-flex text-sm font-medium text-cyan-700 dark:text-cyan-300">Randevularıma git →</Link>}</li>)}</ul>}
  </div>;
};

export default NotificationsPage;
