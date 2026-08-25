import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Search, ShieldCheck, UsersRound } from 'lucide-react';
import AdminConfirmationDialog from '../components/admin/AdminConfirmationDialog';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthRole } from '../hooks/useAuthRole';
import type { UserRole } from '../services/auth/roleService';
import {
  listAdminUsers,
  setAdminUserRole,
  type AdminUserDirectoryItem,
  type ManagedAdminRole,
} from '../services/admin/userRoleService';

const PAGE_SIZE = 25;
const managedRoles: ManagedAdminRole[] = ['patient', 'secretary', 'admin'];
const roleLabels: Record<UserRole, string> = {
  patient: 'Hasta',
  doctor: 'Doktor',
  secretary: 'Sekreter',
  admin: 'Yönetici',
};

type PendingRoleChange = {
  user: AdminUserDirectoryItem;
  nextRole: ManagedAdminRole;
};

const AdminUsersPage = () => {
  const [users, setUsers] = useState<AdminUserDirectoryItem[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [roleInput, setRoleInput] = useState<'all' | UserRole>('all');
  const [query, setQuery] = useState<{ search: string; role: 'all' | UserRole }>({ search: '', role: 'all' });
  const [offset, setOffset] = useState(0);
  const [draftRoles, setDraftRoles] = useState<Record<string, ManagedAdminRole>>({});
  const [pendingChange, setPendingChange] = useState<PendingRoleChange | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const requestVersion = useRef(0);
  const { user: currentUser } = useAuthRole();
  const { theme } = useTheme();
  const isHighContrast = theme === 'high-contrast';

  const loadUsers = useCallback(async (showLoading = true) => {
    const request = ++requestVersion.current;
    if (showLoading) setLoading(true);
    try {
      const rows = await listAdminUsers({
        search: query.search,
        role: query.role === 'all' ? undefined : query.role,
        limit: PAGE_SIZE,
        offset,
      });
      if (request === requestVersion.current) setUsers(rows);
    } catch {
      if (request === requestVersion.current) {
        setError('Kullanıcı dizini yüklenemedi. Lütfen tekrar deneyin.');
      }
    } finally {
      if (showLoading && request === requestVersion.current) setLoading(false);
    }
  }, [offset, query.role, query.search]);

  useEffect(() => {
    void loadUsers();
    return () => { requestVersion.current += 1; };
  }, [loadUsers]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = window.setTimeout(() => setSuccess(''), 5000);
    return () => window.clearTimeout(timer);
  }, [success]);

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setOffset(0);
    setQuery({ search: searchInput.trim(), role: roleInput });
  };

  const confirmRoleChange = async () => {
    if (!pendingChange || updatingUserId) return;
    setUpdatingUserId(pendingChange.user.user_id);
    setError('');
    setSuccess('');
    try {
      await setAdminUserRole(pendingChange.user.user_id, pendingChange.nextRole);
      setDraftRoles((current) => {
        const next = { ...current };
        delete next[pendingChange.user.user_id];
        return next;
      });
      await loadUsers(false);
      setSuccess('Kullanıcı rolü güncellendi. Etkilenen kullanıcı yeniden giriş yapmak zorunda kalabilir.');
      setPendingChange(null);
    } catch {
      setError('Kullanıcı rolü güncellenemedi. Yetki ve rol kurallarını kontrol edin.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const cardClass = isHighContrast
    ? 'border-white bg-black text-white'
    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950';
  const controlClass = `rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-cyan-500 ${isHighContrast ? 'border-white bg-black text-white' : 'border-slate-300 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white'}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">Yönetim</p>
        <h1 className="mt-2 text-3xl font-bold">Kullanıcılar ve Roller</h1>
        <p className={`mt-3 max-w-3xl leading-7 ${isHighContrast ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
          Bu dizin yalnızca ad, e-posta, rol ve oluşturulma tarihini gösterir. Rol değişiklikleri sunucu tarafında denetlenir ve kaydedilir.
        </p>
      </header>

      <div className={`mt-6 rounded-xl border p-4 text-sm ${isHighContrast ? 'border-white' : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'}`}>
        Backend yetkileri veritabanındaki rolü hemen kullanır. Rolü değişen, halen oturum açmış bir kullanıcının navigasyonunun yenilenmesi için oturumunu yenilemesi veya yeniden giriş yapması gerekebilir.
      </div>
      {error && <p role="alert" className="mt-5 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
      {success && <p role="status" className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">{success}</p>}

      <form onSubmit={applyFilters} className={`mt-8 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-end ${cardClass}`}>
        <label className="min-w-0 flex-1 text-sm font-medium">
          Ad veya e-posta ara
          <input value={searchInput} maxLength={100} onChange={(event) => setSearchInput(event.target.value)} className={`mt-1 w-full ${controlClass}`} />
        </label>
        <label className="text-sm font-medium sm:w-52">
          Rol
          <select value={roleInput} onChange={(event) => setRoleInput(event.target.value as 'all' | UserRole)} className={`mt-1 w-full ${controlClass}`}>
            <option value="all">Tüm roller</option>
            <option value="patient">Hasta</option>
            <option value="doctor">Doktor</option>
            <option value="secretary">Sekreter</option>
            <option value="admin">Yönetici</option>
          </select>
        </label>
        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800">
          <Search className="h-4 w-4" /> Filtrele
        </button>
      </form>

      {loading ? (
        <p role="status" className="mt-8 text-sm text-slate-500 dark:text-slate-300">Kullanıcılar yükleniyor...</p>
      ) : users.length === 0 ? (
        <div className={`mt-8 rounded-2xl border p-10 text-center ${cardClass}`}>
          <UsersRound className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3">Filtreye uygun kullanıcı bulunamadı.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {users.map((item) => {
            const isCurrentAdmin = item.user_id === currentUser?.id;
            const selectedRole = draftRoles[item.user_id]
              ?? (item.role === 'doctor' ? 'patient' : item.role);
            return (
              <article key={item.user_id} className={`min-w-0 rounded-2xl border p-5 shadow-sm ${cardClass}`}>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,auto)] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words font-bold">{item.full_name}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isHighContrast ? 'border border-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{roleLabels[item.role]}</span>
                      {isCurrentAdmin && <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">Siz</span>}
                    </div>
                    <p className={`mt-2 break-all text-sm ${isHighContrast ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{item.email}</p>
                    <p className={`mt-1 text-xs ${isHighContrast ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>Oluşturulma: {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(item.created_at))}</p>
                  </div>

                  {item.role === 'doctor' ? (
                    <div className={`rounded-xl border p-3 text-sm ${isHighContrast ? 'border-white' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'}`}>
                      Doktor rolleri Doktor Yönetimi üzerinden değiştirilir.
                    </div>
                  ) : isCurrentAdmin ? (
                    <div className={`rounded-xl border p-3 text-sm ${isHighContrast ? 'border-white' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'}`}>
                      Kendi rolünüzü değiştiremezsiniz.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <label className="text-sm font-medium">
                        Yeni rol
                        <select
                          value={selectedRole}
                          onChange={(event) => setDraftRoles((current) => ({ ...current, [item.user_id]: event.target.value as ManagedAdminRole }))}
                          className={`mt-1 w-full sm:w-44 ${controlClass}`}
                        >
                          {managedRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
                        </select>
                      </label>
                      <button
                        type="button"
                        disabled={selectedRole === item.role || Boolean(updatingUserId)}
                        onClick={() => setPendingChange({ user: item, nextRole: selectedRole })}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50"
                      >
                        <ShieldCheck className="h-4 w-4" /> Rolü Değiştir
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && (offset > 0 || users.length === PAGE_SIZE) && (
        <nav aria-label="Kullanıcı sayfaları" className="mt-8 flex items-center justify-between gap-4">
          <button type="button" disabled={offset === 0} onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))} className={`rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${isHighContrast ? 'border-white' : 'border-slate-300 dark:border-slate-700'}`}>Önceki</button>
          <span className="text-sm">Sayfa {Math.floor(offset / PAGE_SIZE) + 1}</span>
          <button type="button" disabled={users.length < PAGE_SIZE} onClick={() => setOffset((current) => current + PAGE_SIZE)} className={`rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${isHighContrast ? 'border-white' : 'border-slate-300 dark:border-slate-700'}`}>Sonraki</button>
        </nav>
      )}

      <AdminConfirmationDialog
        open={Boolean(pendingChange)}
        title="Rol değişikliğini onaylayın"
        description="Bu işlem kullanıcının sistem yetkilerini değiştirir ve işlem geçmişine kaydedilir."
        confirmLabel="Rolü Değiştir"
        busy={Boolean(updatingUserId)}
        onClose={() => setPendingChange(null)}
        onConfirm={() => void confirmRoleChange()}
      >
        <dl className="grid gap-2 sm:grid-cols-[110px_1fr]">
          <dt className="font-semibold">Kullanıcı</dt><dd className="break-words">{pendingChange?.user.full_name}</dd>
          <dt className="font-semibold">E-posta</dt><dd className="break-all">{pendingChange?.user.email}</dd>
          <dt className="font-semibold">Eski rol</dt><dd>{pendingChange ? roleLabels[pendingChange.user.role] : ''}</dd>
          <dt className="font-semibold">Yeni rol</dt><dd>{pendingChange ? roleLabels[pendingChange.nextRole] : ''}</dd>
        </dl>
      </AdminConfirmationDialog>
    </div>
  );
};

export default AdminUsersPage;
