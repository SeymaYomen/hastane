import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getAdminAuditEntries, type AdminAuditEntry } from '../services/admin/auditService';

const PAGE_SIZE = 25;
const actionOptions = [
  { value: '', label: 'Tüm işlemler' },
  { value: 'user_role_changed', label: 'Kullanıcı rolü değiştirildi' },
  { value: 'department_created', label: 'Bölüm oluşturuldu' },
  { value: 'department_updated', label: 'Bölüm güncellendi' },
  { value: 'department_activated', label: 'Bölüm aktifleştirildi' },
  { value: 'department_deactivated', label: 'Bölüm pasifleştirildi' },
];

const actionLabels = Object.fromEntries(
  actionOptions.filter((item) => item.value).map((item) => [item.value, item.label]),
);

const displayValue = (value: string | null) => {
  if (value === null || value === '') return '—';
  const labels: Record<string, string> = {
    patient: 'Hasta',
    doctor: 'Doktor',
    secretary: 'Sekreter',
    admin: 'Yönetici',
    true: 'Aktif',
    false: 'Pasif',
  };
  return labels[value] ?? value;
};

const AdminAuditPage = () => {
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [action, setAction] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);
  const { theme } = useTheme();
  const isHighContrast = theme === 'high-contrast';

  const loadEntries = useCallback(async () => {
    const request = ++requestVersion.current;
    setLoading(true);
    setError('');
    try {
      const rows = await getAdminAuditEntries({
        action: action || undefined,
        limit: PAGE_SIZE,
        offset,
      });
      if (request === requestVersion.current) setEntries(rows);
    } catch {
      if (request === requestVersion.current) {
        setError('İşlem geçmişi yüklenemedi. Lütfen tekrar deneyin.');
      }
    } finally {
      if (request === requestVersion.current) setLoading(false);
    }
  }, [action, offset]);

  useEffect(() => {
    void loadEntries();
    return () => { requestVersion.current += 1; };
  }, [loadEntries]);

  const cardClass = isHighContrast
    ? 'border-white bg-black text-white'
    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">Yönetim</p>
        <h1 className="mt-2 text-3xl font-bold">İşlem Geçmişi</h1>
        <p className={`mt-3 max-w-3xl leading-7 ${isHighContrast ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
          İdari güvenlik olayları salt okunur olarak gösterilir. Kayıtlar frontend üzerinden düzenlenemez veya silinemez.
        </p>
      </header>

      <div className={`mt-8 rounded-2xl border p-4 ${cardClass}`}>
        <label className="block max-w-sm text-sm font-medium">
          İşlem türü
          <select
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setOffset(0);
            }}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-cyan-500 ${isHighContrast ? 'border-white bg-black text-white' : 'border-slate-300 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white'}`}
          >
            {actionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {error && <p role="alert" className="mt-5 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
      {loading ? (
        <p role="status" className="mt-8 text-sm text-slate-500 dark:text-slate-300">İşlem geçmişi yükleniyor...</p>
      ) : entries.length === 0 ? (
        <div className={`mt-8 rounded-2xl border p-10 text-center ${cardClass}`}>
          <ScrollText className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3">Bu filtre için işlem kaydı bulunamadı.</p>
        </div>
      ) : (
        <ol className="mt-8 space-y-4">
          {entries.map((entry) => {
            const metadataName = typeof entry.metadata?.name === 'string' ? entry.metadata.name : null;
            const target = entry.target_display_identity ?? metadataName ?? '—';
            return (
              <li key={entry.id} className={`min-w-0 rounded-2xl border p-5 shadow-sm ${cardClass}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{actionLabels[entry.action] ?? entry.action}</p>
                    <p className={`mt-1 break-words text-sm ${isHighContrast ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                      {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.created_at))}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs ${isHighContrast ? 'border-white' : 'border-slate-200 dark:border-slate-700'}`}>{entry.action}</span>
                </div>
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-[130px_minmax(0,1fr)]">
                  <dt className="font-semibold">İşlemi yapan</dt><dd className="break-words">{entry.actor_display_identity}</dd>
                  <dt className="font-semibold">Hedef</dt><dd className="break-words">{target}</dd>
                  {(entry.old_value !== null || entry.new_value !== null) && (
                    <>
                      <dt className="font-semibold">Eski değer</dt><dd className="break-words">{displayValue(entry.old_value)}</dd>
                      <dt className="font-semibold">Yeni değer</dt><dd className="break-words">{displayValue(entry.new_value)}</dd>
                    </>
                  )}
                </dl>
              </li>
            );
          })}
        </ol>
      )}

      {!loading && (offset > 0 || entries.length === PAGE_SIZE) && (
        <nav aria-label="İşlem geçmişi sayfaları" className="mt-8 flex items-center justify-between gap-4">
          <button type="button" disabled={offset === 0} onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))} className={`rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${isHighContrast ? 'border-white' : 'border-slate-300 dark:border-slate-700'}`}>Önceki</button>
          <span className="text-sm">Sayfa {Math.floor(offset / PAGE_SIZE) + 1}</span>
          <button type="button" disabled={entries.length < PAGE_SIZE} onClick={() => setOffset((current) => current + PAGE_SIZE)} className={`rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${isHighContrast ? 'border-white' : 'border-slate-300 dark:border-slate-700'}`}>Sonraki</button>
        </nav>
      )}
    </div>
  );
};

export default AdminAuditPage;
