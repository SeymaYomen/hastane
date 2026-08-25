import { ArrowRight, CalendarDays, FileHeart, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BentoCard, HomeIntro, type HomeTheme } from './HomePrimitives';

export const GuestHome = ({ theme }: { theme: HomeTheme }) => (
  <>
    <HomeIntro eyebrow="Dijital sağlık deneyimi" title="Sağlığınız için sade, güvenli ve bağlantılı bir yol." description="Randevularınızı planlayın, sağlık kayıtlarınıza erişin ve bakım sürecinizi tek bir güvenli alanda takip edin." />
    <div className="mb-10 flex flex-wrap gap-3">
      <Link to="/appointment" className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 font-semibold text-white hover:bg-cyan-700">Randevu Al <ArrowRight className="h-4 w-4" /></Link>
      <Link to="/login" className="rounded-xl border border-slate-400/50 px-5 py-3 font-semibold hover:bg-slate-500/10">Giriş Yap</Link>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      <BentoCard theme={theme}><CalendarDays className="mb-5 h-8 w-8 text-cyan-500" /><h2 className="text-xl font-bold">Kolay randevu</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Uygun bölüm ve doktoru seçerek bakım yolculuğunuzu başlatın.</p></BentoCard>
      <BentoCard theme={theme}><FileHeart className="mb-5 h-8 w-8 text-blue-500" /><h2 className="text-xl font-bold">Tek sağlık alanı</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Kayıtlarınız ve randevularınız oturumunuza bağlı, düzenli bir görünümde.</p></BentoCard>
      <BentoCard theme={theme}><ShieldCheck className="mb-5 h-8 w-8 text-teal-500" /><h2 className="text-xl font-bold">Gizlilik odağı</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Yetkilendirme ve rol sınırları sağlık verilerinizi korumak için tasarlandı.</p></BentoCard>
    </div>
  </>
);
