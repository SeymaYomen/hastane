import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Building2, Pencil, Plus, Power } from 'lucide-react';
import AdminConfirmationDialog from '../components/admin/AdminConfirmationDialog';
import { useTheme } from '../contexts/ThemeContext';
import {
  createAdminDepartment,
  getAdminDepartments,
  setAdminDepartmentActive,
  updateAdminDepartment,
  type AdminDepartment,
} from '../services/admin/departmentService';

type DepartmentFormState = {
  name: string;
  description: string;
  services: string;
  sortOrder: string;
};

const emptyForm: DepartmentFormState = {
  name: '',
  description: '',
  services: '',
  sortOrder: '0',
};

const getDepartmentError = (error: unknown, fallback: string) => {
  const message = typeof error === 'object' && error && 'message' in error
    ? String(error.message)
    : '';
  const safeMessages = [
    'Bu bölümde aktif doktorlar bulunduğu için bölüm pasifleştirilemez.',
    'Aktif doktor bulunan bölümün adı değiştirilemez.',
    'Bu bölüm adı zaten kullanılıyor.',
    'Geçersiz bölüm bilgileri.',
  ];
  return safeMessages.find((safeMessage) => message.includes(safeMessage)) ?? fallback;
};

const AdminDepartmentsPage = () => {
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [form, setForm] = useState<DepartmentFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deactivationTarget, setDeactivationTarget] = useState<AdminDepartment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const requestVersion = useRef(0);
  const { theme } = useTheme();
  const isHighContrast = theme === 'high-contrast';

  const loadDepartments = useCallback(async (showLoading = true) => {
    const request = ++requestVersion.current;
    if (showLoading) setLoading(true);
    try {
      const rows = await getAdminDepartments();
      if (request === requestVersion.current) setDepartments(rows);
    } catch {
      if (request === requestVersion.current) {
        setError('Bölümler yüklenemedi. Lütfen tekrar deneyin.');
      }
    } finally {
      if (showLoading && request === requestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDepartments();
    return () => { requestVersion.current += 1; };
  }, [loadDepartments]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = window.setTimeout(() => setSuccess(''), 4000);
    return () => window.clearTimeout(timer);
  }, [success]);

  const editingDepartment = departments.find((item) => item.department_id === editingId) ?? null;

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEditing = (department: AdminDepartment) => {
    setEditingId(department.department_id);
    setForm({
      name: department.name,
      description: department.description ?? '',
      services: department.services.join(', '),
      sortOrder: String(department.sort_order),
    });
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitDepartment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    const services = Array.from(new Set(
      form.services.split(',').map((value) => value.trim()).filter(Boolean),
    ));
    const sortOrder = Number(form.sortOrder);
    if (!form.name.trim() || services.length > 20 || !Number.isInteger(sortOrder)
      || sortOrder < 0 || sortOrder > 10000) {
      setError('Bölüm adı, hizmetler ve sıralama değerini kontrol edin.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const input = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        services,
        sortOrder,
      };
      if (editingId) {
        await updateAdminDepartment(editingId, input);
        setSuccess('Bölüm bilgileri güncellendi.');
      } else {
        await createAdminDepartment(input);
        setSuccess('Bölüm oluşturuldu.');
      }
      resetForm();
      await loadDepartments(false);
    } catch (submitError) {
      setError(getDepartmentError(submitError, 'Bölüm kaydedilemedi. Lütfen tekrar deneyin.'));
    } finally {
      setSaving(false);
    }
  };

  const changeActiveState = async (department: AdminDepartment, isActive: boolean) => {
    if (updatingId) return;
    setUpdatingId(department.department_id);
    setError('');
    setSuccess('');
    try {
      await setAdminDepartmentActive(department.department_id, isActive);
      await loadDepartments(false);
      setSuccess(isActive ? 'Bölüm aktifleştirildi.' : 'Bölüm pasifleştirildi.');
      setDeactivationTarget(null);
    } catch (updateError) {
      setError(getDepartmentError(updateError, 'Bölüm durumu güncellenemedi.'));
    } finally {
      setUpdatingId(null);
    }
  };

  const cardClass = isHighContrast
    ? 'border-white bg-black text-white'
    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950';
  const inputClass = `mt-1 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-cyan-500 ${isHighContrast ? 'border-white bg-black text-white' : 'border-slate-300 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white'}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">Yönetim</p>
        <h1 className="mt-2 text-3xl font-bold">Bölümler</h1>
        <p className={`mt-3 max-w-3xl leading-7 ${isHighContrast ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
          Hasta tarafında yalnızca aktif bölümler görünür. Kayıtlar silinmez; pasifleştirme güvenli biçimde denetlenir.
        </p>
      </header>

      {error && <p role="alert" className="mt-6 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
      {success && <p role="status" className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">{success}</p>}

      <section className={`mt-8 rounded-2xl border p-5 shadow-sm sm:p-6 ${cardClass}`}>
        <div className="flex items-center gap-3">
          {editingId ? <Pencil className="h-5 w-5 text-cyan-600" /> : <Plus className="h-5 w-5 text-cyan-600" />}
          <h2 className="text-lg font-bold">{editingId ? 'Bölümü Düzenle' : 'Yeni Bölüm'}</h2>
        </div>
        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={submitDepartment}>
          <label className="text-sm font-medium">
            Bölüm adı
            <input
              required
              maxLength={120}
              disabled={Boolean(editingDepartment?.doctor_count)}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className={inputClass}
            />
            {editingDepartment && editingDepartment.doctor_count > 0 && (
              <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">Doktor bağlı olduğu için bölüm adı değiştirilemez.</span>
            )}
          </label>
          <label className="text-sm font-medium">
            Sıra
            <input
              required
              type="number"
              min={0}
              max={10000}
              value={form.sortOrder}
              onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Açıklama
            <textarea
              maxLength={1000}
              rows={3}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Hizmetler
            <input
              value={form.services}
              onChange={(event) => setForm((current) => ({ ...current, services: event.target.value }))}
              className={inputClass}
              placeholder="Virgülle ayırın; en fazla 20 hizmet"
            />
          </label>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50">
              {saving ? 'Kaydediliyor...' : editingId ? 'Değişiklikleri Kaydet' : 'Bölüm Ekle'}
            </button>
            {editingId && <button type="button" disabled={saving} onClick={resetForm} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${isHighContrast ? 'border-white' : 'border-slate-300 dark:border-slate-700'}`}>Vazgeç</button>}
          </div>
        </form>
      </section>

      {loading ? (
        <p role="status" className="mt-8 text-sm text-slate-500 dark:text-slate-300">Bölümler yükleniyor...</p>
      ) : departments.length === 0 ? (
        <div className={`mt-8 rounded-2xl border p-10 text-center ${cardClass}`}>
          <Building2 className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3">Henüz bölüm kaydı yok.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {departments.map((department) => (
            <article key={department.department_id} className={`min-w-0 rounded-2xl border p-5 shadow-sm ${cardClass}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-lg font-bold">{department.name}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${department.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                      {department.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <p className={`mt-1 text-sm ${isHighContrast ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>Sıra: {department.sort_order} · Doktor: {department.doctor_count}</p>
                </div>
                <button type="button" onClick={() => startEditing(department)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${isHighContrast ? 'border-white' : 'border-slate-300 dark:border-slate-700'}`}>
                  <Pencil className="h-4 w-4" /> Düzenle
                </button>
              </div>
              <p className={`mt-4 break-words text-sm leading-6 ${isHighContrast ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{department.description || 'Açıklama belirtilmemiş.'}</p>
              {department.services.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{department.services.map((service) => <span key={service} className={`max-w-full break-words rounded-full border px-2.5 py-1 text-xs ${isHighContrast ? 'border-white' : 'border-slate-200 dark:border-slate-700'}`}>{service}</span>)}</div>}
              <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                {department.is_active ? (
                  <div>
                    <button
                      type="button"
                      disabled={updatingId === department.department_id || department.doctor_count > 0}
                      onClick={() => setDeactivationTarget(department)}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30"
                    >
                      <Power className="h-4 w-4" /> Pasifleştir
                    </button>
                    {department.doctor_count > 0 && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Aktif doktor bulunduğu için pasifleştirilemez.</p>}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={Boolean(updatingId)}
                    onClick={() => void changeActiveState(department, true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    <Power className="h-4 w-4" /> Aktifleştir
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <AdminConfirmationDialog
        open={Boolean(deactivationTarget)}
        title="Bölüm pasifleştirilsin mi?"
        description="Pasif bölümler hasta tarafındaki bölüm ve randevu seçimlerinde gösterilmez. Kayıt silinmez."
        confirmLabel="Bölümü Pasifleştir"
        busy={Boolean(updatingId)}
        danger
        onClose={() => setDeactivationTarget(null)}
        onConfirm={() => {
          if (deactivationTarget) void changeActiveState(deactivationTarget, false);
        }}
      >
        <p><span className="font-semibold">Bölüm:</span> {deactivationTarget?.name}</p>
      </AdminConfirmationDialog>
    </div>
  );
};

export default AdminDepartmentsPage;
