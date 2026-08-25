import { ClipboardList } from 'lucide-react';

const SecretaryDashboard = () => (
  <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">
        <ClipboardList className="h-6 w-6" />
      </div>
      <h1 className="mt-5 text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
        Resepsiyon çalışma alanı
      </h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-600 dark:text-slate-300">
        Güvenli sekreter rolü ve çalışma alanı altyapısı hazır. Randevu ve check-in işlemleri bu temel sürümün kapsamında değildir.
      </p>
    </section>
  </div>
);

export default SecretaryDashboard;
