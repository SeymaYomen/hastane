import { useEffect, useState } from 'react';
import { BookOpen, Briefcase, Calendar, CreditCard, Languages, Mail, Phone, Stethoscope, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCurrentUserRole, type UserRole } from '../services/auth/roleService';
import { getCurrentDoctorProfile, type DoctorProfile } from '../services/doctor/doctorProfileService';

type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  tckn: string;
  created_at: string;
};

const ProfilePage = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('Kullanıcı bulunamadı.');

        const currentRole = await getCurrentUserRole(user.id);
        if (!mounted) return;
        setRole(currentRole);
        setAuthEmail(user.email ?? '');

        if (currentRole === 'doctor') {
          const doctor = await getCurrentDoctorProfile(user.id);
          if (!mounted) return;
          setDoctorProfile(doctor);
          if (!doctor) setError('Hesabınıza bağlı doktor profili bulunamadı.');
          return;
        }

        const { data, error: profileError } = await supabase
          .from('users')
          .select('id, email, full_name, phone, tckn, created_at')
          .eq('id', user.id)
          .single();
        if (profileError) throw profileError;
        if (!mounted) return;

        const userProfile = data as UserProfile;
        setProfile(userProfile);
        setEditName(userProfile.full_name || '');
        setEditPhone(userProfile.phone || '');
      } catch (fetchError) {
        console.error('Profil bilgileri yüklenemedi:', fetchError);
        if (mounted) setError('Profil bilgileri yüklenirken bir hata oluştu.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => { mounted = false; };
  }, []);

  const handleSaveProfile = async () => {
    if (!profile || role !== 'patient') return;
    if (!editName.trim()) {
      window.alert('Ad Soyad boş bırakılamaz.');
      return;
    }
    if (editPhone && !/^[0-9]{11}$/.test(editPhone)) {
      window.alert('Telefon numarası 11 haneli olmalıdır.');
      return;
    }

    try {
      setIsSaving(true);
      const { data, error: updateError } = await supabase
        .from('users')
        .update({ full_name: editName.trim(), phone: editPhone || null })
        .eq('id', profile.id)
        .select('id, email, full_name, phone, tckn, created_at')
        .single();
      if (updateError) throw updateError;

      const updatedProfile = data as UserProfile;
      setProfile(updatedProfile);
      setEditName(updatedProfile.full_name || '');
      setEditPhone(updatedProfile.phone || '');
      setIsEditing(false);
    } catch (saveError) {
      console.error('Profil güncellenemedi:', saveError);
      window.alert('Profil bilgileri güncellenirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 pt-16 dark:bg-slate-950"><div className="h-12 w-12 animate-spin rounded-full border-b-2 border-cyan-600" aria-label="Profil yükleniyor" /></div>;
  }

  if (error || (role === 'doctor' && !doctorProfile) || (role !== 'doctor' && !profile)) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 pt-16 dark:bg-slate-950"><div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"><h1 className="text-xl font-semibold text-slate-900 dark:text-white">{error || 'Profil bilgileri yüklenemedi.'}</h1><Link to="/" className="mt-5 inline-block font-medium text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-cyan-300">Ana Sayfaya Dön</Link></div></div>;
  }

  if (role === 'doctor' && doctorProfile) {
    const details = [
      { label: 'Bölüm', value: doctorProfile.department, icon: Stethoscope },
      { label: 'Ünvan', value: doctorProfile.title, icon: Briefcase },
      { label: 'Deneyim', value: `${doctorProfile.experience_years} yıl`, icon: Calendar },
      { label: 'Eğitim', value: doctorProfile.education, icon: BookOpen },
      { label: 'Diller', value: doctorProfile.languages.join(', ') || 'Belirtilmemiş', icon: Languages },
      { label: 'Uzmanlık Alanları', value: doctorProfile.specialties.join(', ') || 'Belirtilmemiş', icon: Stethoscope },
      { label: 'Çalışma Günleri', value: doctorProfile.working_days.join(', ') || 'Belirtilmemiş', icon: Calendar },
    ];

    return (
      <div className="min-h-screen bg-slate-50 pb-12 pt-16 dark:bg-slate-950"><div className="mx-auto max-w-5xl px-4 py-12 sm:px-6"><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="bg-gradient-to-r from-cyan-700 to-violet-800 px-6 py-8"><div className="flex items-center gap-5"><div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10"><Stethoscope className="h-10 w-10 text-white" /></div><div><h1 className="text-2xl font-bold text-white">{doctorProfile.full_name}</h1><p className="mt-1 text-cyan-100">Doktor Profili</p><p className="mt-2 text-sm text-white/80">{doctorProfile.title} • {doctorProfile.department}</p></div></div></div>
        <div className="grid gap-8 p-6 md:grid-cols-[1fr_280px] md:p-8"><section><h2 className="text-xl font-semibold text-slate-900 dark:text-white">Mesleki Bilgiler</h2><div className="mt-6 grid gap-5 sm:grid-cols-2">{details.map(({ label, value, icon: Icon }) => <div key={label} className="flex items-start gap-3"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-cyan-600 dark:text-cyan-400" /><div><p className="text-sm text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 text-slate-900 dark:text-white">{value}</p></div></div>)}</div></section>
        <aside><h2 className="text-xl font-semibold text-slate-900 dark:text-white">Hızlı İşlemler</h2><div className="mt-6 space-y-3"><Link to="/doctor" className="block rounded-lg bg-gradient-to-r from-cyan-600 to-violet-600 px-4 py-3 text-center font-medium text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">Doktor Paneline Git</Link><Link to="/doctor" className="block rounded-lg border border-cyan-600 px-4 py-3 text-center font-medium text-cyan-700 hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-cyan-300 dark:hover:bg-cyan-950/30">Bugünkü Randevular</Link></div></aside></div>
      </div></div></div>
    );
  }

  const isPatient = role === 'patient';
  return (
    <div className="min-h-screen bg-slate-50 pb-12 pt-16 dark:bg-slate-950"><div className="mx-auto max-w-4xl px-4 py-12 sm:px-6"><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-8"><div className="flex items-center gap-5"><div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10"><User className="h-10 w-10 text-white" /></div><div><h1 className="text-2xl font-bold text-white">{profile!.full_name}</h1><p className="mt-1 text-blue-200">{isPatient ? 'Hasta Profili' : 'Yönetici Profili'}</p></div></div></div>
      <div className="grid gap-8 p-6 md:grid-cols-2 md:p-8"><section><h2 className="text-xl font-semibold text-slate-900 dark:text-white">Kişisel Bilgiler</h2><div className="mt-6 space-y-5">
        <div className="flex items-start gap-3"><User className="mt-1 h-5 w-5 text-slate-400" /><div className="flex-1"><label htmlFor="profile-name" className="text-sm text-slate-500 dark:text-slate-400">Ad Soyad</label>{isEditing ? <input id="profile-name" type="text" value={editName} onChange={(event) => setEditName(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-400" /> : <p className="text-slate-900 dark:text-white">{profile!.full_name}</p>}</div></div>
        <div className="flex items-start gap-3"><Mail className="mt-1 h-5 w-5 text-slate-400" /><div><p className="text-sm text-slate-500 dark:text-slate-400">E-posta</p><p className="text-slate-900 dark:text-white">{profile!.email || authEmail}</p></div></div>
        {isPatient && <><div className="flex items-start gap-3"><Phone className="mt-1 h-5 w-5 text-slate-400" /><div className="flex-1"><label htmlFor="profile-phone" className="text-sm text-slate-500 dark:text-slate-400">Telefon</label>{isEditing ? <input id="profile-phone" type="tel" value={editPhone} onChange={(event) => { const value = event.target.value.replace(/\D/g, ''); if (value.length <= 11) setEditPhone(value); }} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-400" placeholder="05XXXXXXXXX" /> : <p className="text-slate-900 dark:text-white">{profile!.phone || 'Belirtilmemiş'}</p>}</div></div><div className="flex items-start gap-3"><CreditCard className="mt-1 h-5 w-5 text-slate-400" /><div><p className="text-sm text-slate-500 dark:text-slate-400">T.C. Kimlik No</p><p className="text-slate-900 dark:text-white">{profile!.tckn}</p></div></div></>}
        <div className="flex items-start gap-3"><Calendar className="mt-1 h-5 w-5 text-slate-400" /><div><p className="text-sm text-slate-500 dark:text-slate-400">Üyelik Tarihi</p><p className="text-slate-900 dark:text-white">{new Date(profile!.created_at).toLocaleDateString('tr-TR')}</p></div></div>
      </div></section>
      <aside><h2 className="text-xl font-semibold text-slate-900 dark:text-white">Hızlı İşlemler</h2>{isPatient && <><div className="mt-6 flex gap-3">{isEditing ? <><button type="button" onClick={() => void handleSaveProfile()} disabled={isSaving} className="flex-1 rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50">{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</button><button type="button" onClick={() => { setEditName(profile!.full_name); setEditPhone(profile!.phone || ''); setIsEditing(false); }} className="flex-1 rounded-lg bg-slate-200 px-4 py-3 font-medium text-slate-800 hover:bg-slate-300">Vazgeç</button></> : <button type="button" onClick={() => setIsEditing(true)} className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700">Bilgileri Düzenle</button>}</div><div className="mt-4 space-y-3"><Link to="/appointment" className="block rounded-lg bg-blue-600 px-4 py-3 text-center font-medium text-white hover:bg-blue-700">Yeni Randevu Al</Link><Link to="/my-appointments" className="block rounded-lg border border-blue-600 px-4 py-3 text-center font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/30">Randevu Geçmişi</Link></div></>}</aside></div>
    </div></div></div>
  );
};

export default ProfilePage;
