import { useEffect, useState } from 'react';
import { CalendarDays, ClipboardList, LayoutDashboard, LogOut, Menu, Sparkles, Stethoscope, UserRound, UsersRound } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import ThemeSwitcher from '../components/ThemeSwitcher';
import { supabase } from '../lib/supabase';
import { getCurrentDoctorProfile, type DoctorProfile } from '../services/doctor/doctorProfileService';
import NotificationBell from '../components/notifications/NotificationBell';

const links = [
  { to: '/doctor', label: 'Genel Bakış', icon: LayoutDashboard, end: true },
  { to: '/doctor/calendar', label: 'Takvim', icon: CalendarDays },
  { to: '/doctor/appointments', label: 'Randevular', icon: ClipboardList },
  { to: '/doctor/patients', label: 'Hastalar', icon: UsersRound },
  { to: '/doctor/visits', label: 'Muayeneler', icon: Stethoscope },
  { to: '/profile', label: 'Profil', icon: UserRound },
];

const DoctorWorkspaceLayout = () => {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const doctor = await getCurrentDoctorProfile(data.user.id);
        if (mounted) setProfile(doctor);
      }
    }).catch((error) => console.error('Doktor çalışma alanı profili yüklenemedi:', error));
    return () => { mounted = false; };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="rounded-lg bg-cyan-500/15 p-2"><Stethoscope className="h-5 w-5 text-cyan-300" /></div>
        <div><p className="font-semibold">SağlıkTakip</p><p className="text-xs text-slate-400">Doktor Çalışma Alanı</p></div>
      </div>
      <nav className="flex-1 space-y-1 p-3" aria-label="Doktor çalışma alanı">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${isActive ? 'bg-cyan-500/15 text-cyan-200' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
            <Icon className="h-5 w-5" />{label}
          </NavLink>
        ))}
        <div className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-slate-500" aria-disabled="true"><span className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-violet-400" />Klinik Asistan</span><span className="text-[10px] uppercase">Yakında</span></div>
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-semibold">{profile?.full_name ?? 'Doktor'}</p>
        <p className="truncate text-xs text-slate-400">{profile?.department ?? 'Profil yükleniyor'}</p>
        <button type="button" onClick={() => void logout()} className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"><LogOut className="h-4 w-4" />Çıkış Yap</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>
      {open && <div className="fixed inset-0 z-50 lg:hidden"><button type="button" aria-label="Menüyü kapat" className="absolute inset-0 bg-slate-950/60" onClick={() => setOpen(false)} /><aside className="relative h-full w-72 shadow-2xl">{sidebar}</aside></div>}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-slate-200 lg:hidden" aria-label="Doktor menüsünü aç"><Menu className="h-5 w-5" /></button>
          <div className="hidden lg:block"><p className="text-sm font-semibold text-slate-900 dark:text-white">Klinik çalışma alanı</p></div>
          <div className="flex items-center gap-3"><ThemeSwitcher /><NotificationBell className="text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800" /><span className="hidden text-sm text-slate-600 dark:text-slate-300 sm:block">{profile?.title} {profile?.full_name}</span></div>
        </header>
        <main><Outlet context={{ doctorProfile: profile }} /></main>
      </div>
    </div>
  );
};

export default DoctorWorkspaceLayout;
