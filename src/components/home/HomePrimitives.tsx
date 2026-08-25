import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export type HomeTheme = 'light' | 'dark' | 'high-contrast';

export const HomePageFrame = ({ children, theme }: { children: ReactNode; theme: HomeTheme }) => (
  <div className={`relative min-h-[calc(100vh-4rem)] overflow-hidden ${theme === 'high-contrast' ? 'bg-black text-white' : theme === 'light' ? 'bg-slate-50 text-slate-950' : 'bg-[#07111f] text-slate-100'}`}>
    {theme !== 'high-contrast' && (
      <svg aria-hidden="true" className="pointer-events-none absolute right-0 top-24 hidden h-48 w-[42%] opacity-[0.05] sm:block" viewBox="0 0 600 180" preserveAspectRatio="none">
        <path d="M0 108h140l18-28 24 62 30-112 34 78h70l20-30 24 58 28-28h212" fill="none" stroke="#22d3ee" strokeWidth="3" />
      </svg>
    )}
    <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">{children}</div>
  </div>
);

export const HomeIntro = ({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) => {
  const reduced = useReducedMotion();
  return (
    <motion.header initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 max-w-3xl">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-accent)]">{eyebrow}</p>
      <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-text-secondary)]">{description}</p>
    </motion.header>
  );
};

export const BentoCard = ({ children, className = '', theme }: { children: ReactNode; className?: string; theme: HomeTheme }) => (
  <section className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${theme === 'high-contrast' ? 'border-white bg-black' : theme === 'light' ? 'border-slate-200 bg-white/90' : 'border-white/10 bg-white/[0.055] shadow-black/20'} ${className}`}>{children}</section>
);

export const InlineState = ({ children, error = false }: { children: ReactNode; error?: boolean }) => (
  <p role={error ? 'alert' : 'status'} className={`rounded-2xl border px-4 py-3 text-sm ${error ? 'border-[var(--color-danger)] text-[var(--color-danger)]' : 'border-[var(--color-border-light)] text-[var(--color-text-secondary)]'}`}>{children}</p>
);
