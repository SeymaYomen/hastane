import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export type HomeTheme = 'light' | 'dark' | 'high-contrast';

export const HomePageFrame = ({ children, theme }: { children: ReactNode; theme: HomeTheme }) => (
  <div className={`relative min-h-[calc(100vh-4rem)] overflow-hidden ${theme === 'high-contrast' ? 'bg-black text-white' : theme === 'light' ? 'bg-slate-50 text-slate-950' : 'bg-[#07111f] text-slate-100'}`}>
    {theme !== 'high-contrast' && (
      <svg aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-10 h-64 w-full opacity-[0.08]" viewBox="0 0 1200 220" preserveAspectRatio="none">
        <path d="M0 120h290l22-42 28 92 35-142 40 92h95l24-42 28 84 30-42h608" fill="none" stroke="#22d3ee" strokeWidth="3" />
      </svg>
    )}
    <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">{children}</div>
  </div>
);

export const HomeIntro = ({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) => {
  const reduced = useReducedMotion();
  return (
    <motion.header initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 max-w-3xl">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">{eyebrow}</p>
      <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">{description}</p>
    </motion.header>
  );
};

export const BentoCard = ({ children, className = '', theme }: { children: ReactNode; className?: string; theme: HomeTheme }) => (
  <section className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${theme === 'high-contrast' ? 'border-white bg-black' : theme === 'light' ? 'border-slate-200 bg-white/90' : 'border-white/10 bg-white/[0.055] shadow-black/20'} ${className}`}>{children}</section>
);

export const InlineState = ({ children, error = false }: { children: ReactNode; error?: boolean }) => (
  <p role={error ? 'alert' : 'status'} className={`rounded-2xl border px-4 py-3 text-sm ${error ? 'border-rose-400/50 text-rose-600 dark:text-rose-300' : 'border-slate-300/60 text-slate-600 dark:border-white/10 dark:text-slate-300'}`}>{children}</p>
);
