import { useEffect, useState, type ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { LayoutDashboard, LogOut, Menu, UserRound, X } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import NotificationBell from '../components/notifications/NotificationBell';
import ThemeSwitcher from '../components/ThemeSwitcher';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';

type RoleWorkspaceShellProps = {
  basePath: '/admin' | '/secretary';
  workspaceLabel: string;
  headerLabel: string;
  navigationLabel: string;
  icon: ComponentType<LucideProps>;
};

const RoleWorkspaceShell = ({
  basePath,
  workspaceLabel,
  headerLabel,
  navigationLabel,
  icon: WorkspaceIcon,
}: RoleWorkspaceShellProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isHighContrast = theme === 'high-contrast';
  const mobileNavigationId = `${basePath.slice(1)}-mobile-navigation`;
  const links = [
    { to: basePath, label: 'Genel Bakış', icon: LayoutDashboard, end: true },
    { to: '/profile', label: 'Profil', icon: UserRound, end: false },
  ];

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
        <div className="rounded-lg bg-cyan-500/15 p-2">
          <WorkspaceIcon className="h-5 w-5 text-cyan-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">SağlıkTakip</p>
          <p className="text-xs text-slate-400">{workspaceLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 lg:hidden"
          aria-label="Menüyü kapat"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label={navigationLabel}>
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${isActive ? 'bg-cyan-500/15 text-cyan-200' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${isHighContrast ? 'bg-black text-white' : 'bg-slate-50 dark:bg-slate-900'}`}>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Menüyü kapat"
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setOpen(false)}
          />
          <aside
            id={mobileNavigationId}
            aria-label={navigationLabel}
            className="relative h-full w-[min(18rem,calc(100vw-2rem))] shadow-2xl"
          >
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className={`sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b px-4 backdrop-blur sm:px-6 ${isHighContrast ? 'border-white bg-black text-white' : 'border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/90'}`}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`shrink-0 rounded-lg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 lg:hidden ${isHighContrast ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}
            aria-label={`${workspaceLabel} menüsünü aç`}
            aria-expanded={open}
            aria-controls={mobileNavigationId}
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className={`hidden text-sm font-semibold lg:block ${isHighContrast ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
            {headerLabel}
          </p>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeSwitcher />
            <NotificationBell className={`shrink-0 ${isHighContrast ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'}`} />
          </div>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default RoleWorkspaceShell;
