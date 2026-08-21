export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  pending: 'Bekliyor',
  confirmed: 'Onaylandı',
  in_progress: 'Muayenede',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  no_show: 'Gelmedi',
};

export const activeAppointmentStatuses: AppointmentStatus[] = [
  'pending', 'confirmed', 'in_progress',
];

export const statusBadgeClass: Record<AppointmentStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200',
  confirmed: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-200',
  in_progress: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200',
  no_show: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
};
