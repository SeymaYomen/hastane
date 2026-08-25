import { useEffect, useState } from 'react';
import { CalendarDays, ClipboardList, LayoutDashboard, LogOut, Menu, Sparkles, Stethoscope, UserRound, UsersRound, X } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import ThemeSwitcher from '../components/ThemeSwitcher';
import { supabase } from '../lib/supabase';
import { getCurrentDoctorProfile, type DoctorProfile } from '../services/doctor/doctorProfileService';
import NotificationBell from '../components/notifications/NotificationBell';
import { useAuthRole } from '../hooks/useAuthRole';
import { useTheme } from '../contexts/ThemeContext';

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
  const { theme } = useTheme();
  const { user } = useAuthRole();
  const isHighContrast = theme === 'high-contrast';

  useEffect(() => {
    let mounted = true;
    if (user) {
      void getCurrentDoctorProfile(user.id)
        .then((doctor) => {
          if (mounted) setProfile(doctor);
        })
        .catch((error) => console.error('Doktor çalışma alanı profili yüklenemedi:', error));
    }
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="rounded-lg bg-cyan-500/15 p-2"><Stethoscope className="h-5 w-5 text-cyan-300" /></div>
        <div className="min-w-0 flex-1"><p className="font-semibold">SağlıkTakip</p><p className="text-xs text-slate-400">Doktor Çalışma Alanı</p></div>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 lg:hidden" aria-label="Menüyü kapat"><X className="h-5 w-5" /></button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Doktor çalışma alanı">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${isActive ? 'bg-cyan-500/15 text-cyan-200' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
            <Icon className="h-5 w-5" />{label}
          </NavLink>
        ))}
      </nav>
      <div className="mx-3 mb-3 rounded-xl border border-amber-400/70 bg-amber-400/10 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-200"><Sparkles className="h-4 w-4" />Klinik Asistan <span className="rounded-full border border-amber-400 px-1.5 py-0.5 text-[9px] font-bold uppercase">AI</span></div>
        <p className="mt-2 text-xs leading-5 text-slate-200">Aktif randevu ayrıntısında kullanılabilir.</p>
        <Link to="/doctor/appointments" onClick={() => setOpen(false)} className="mt-2 inline-flex rounded-md text-xs font-semibold text-amber-200 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">Randevuları aç</Link>
      </div>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-semibold">{profile?.full_name ?? 'Doktor'}</p>
        <p className="truncate text-xs text-slate-400">{profile?.department ?? 'Profil yükleniyor'}</p>
        <button type="button" onClick={() => void logout()} className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"><LogOut className="h-4 w-4" />Çıkış Yap</button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${isHighContrast ? 'bg-black text-white' : 'bg-slate-50 dark:bg-slate-900'}`}>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>
      {open && <div className="fixed inset-0 z-50 lg:hidden"><button type="button" aria-label="Menüyü kapat" className="absolute inset-0 bg-slate-950/60" onClick={() => setOpen(false)} /><aside id="doctor-mobile-navigation" aria-label="Doktor menüsü" className="relative h-full w-[min(18rem,calc(100vw-2rem))] shadow-2xl">{sidebar}</aside></div>}
      <div className="lg:pl-64">
        <header className={`sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b px-4 backdrop-blur sm:px-6 ${isHighContrast ? 'border-white bg-black text-white' : 'border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/90'}`}>
          <button type="button" onClick={() => setOpen(true)} className={`shrink-0 rounded-lg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 lg:hidden ${isHighContrast ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`} aria-label="Doktor menüsünü aç" aria-expanded={open} aria-controls="doctor-mobile-navigation"><Menu className="h-5 w-5" /></button>
          <div className="hidden lg:block"><p className={`text-sm font-semibold ${isHighContrast ? 'text-white' : 'text-slate-900 dark:text-white'}`}>Klinik çalışma alanı</p></div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3"><ThemeSwitcher /><NotificationBell className={`shrink-0 ${isHighContrast ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'}`} /><span className={`hidden max-w-48 truncate text-sm sm:block ${isHighContrast ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{profile?.title} {profile?.full_name}</span></div>
        </header>
        <main><Outlet context={{ doctorProfile: profile }} /></main>
      </div>
    </div>
  );
};

export default DoctorWorkspaceLayout;
