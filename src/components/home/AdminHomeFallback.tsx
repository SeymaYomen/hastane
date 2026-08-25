import { Building2, ShieldCheck, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BentoCard, HomeIntro, type HomeTheme } from './HomePrimitives';

export const AdminHomeFallback = ({ theme }: { theme: HomeTheme }) => (
  <><HomeIntro eyebrow="Yönetici görünümü" title="Hastane portalına hoş geldiniz." description="Bu sürümde ana sayfa yöneticiye özel kişisel veya klinik istatistik göstermez. Genel alanlara güvenli biçimde erişebilirsiniz." />
    <div className="grid gap-4 md:grid-cols-3">
      <BentoCard theme={theme}><Building2 className="h-7 w-7 text-cyan-500" /><h2 className="mt-4 font-bold">Bölümler</h2><Link to="/departments" className="mt-3 inline-flex text-sm text-cyan-600 hover:underline dark:text-cyan-300">Bölümleri görüntüle</Link></BentoCard>
      <BentoCard theme={theme}><Stethoscope className="h-7 w-7 text-blue-500" /><h2 className="mt-4 font-bold">Doktorlar</h2><Link to="/doctors" className="mt-3 inline-flex text-sm text-cyan-600 hover:underline dark:text-cyan-300">Doktorları görüntüle</Link></BentoCard>
      <BentoCard theme={theme}><ShieldCheck className="h-7 w-7 text-teal-500" /><h2 className="mt-4 font-bold">Hesap</h2><Link to="/profile" className="mt-3 inline-flex text-sm text-cyan-600 hover:underline dark:text-cyan-300">Profil ayarları</Link></BentoCard>
    </div>
  </>
);
