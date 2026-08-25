import { ArrowRight, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BentoCard, HomeIntro, type HomeTheme } from './HomePrimitives';

export const SecretaryHomeFallback = ({ theme }: { theme: HomeTheme }) => (
  <>
    <HomeIntro
      eyebrow="Sekreter görünümü"
      title="Hastane portalına hoş geldiniz."
      description="Sekreter çalışma alanına geçerek rolünüze ait kullanılabilir işlemlere güvenli biçimde erişebilirsiniz."
    />
    <BentoCard theme={theme} className="max-w-2xl">
      <ClipboardList className="h-7 w-7 text-cyan-500" />
      <h2 className="mt-4 text-lg font-bold">Resepsiyon çalışma alanı</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
        Bu temel sürüm yalnızca güvenli çalışma alanı erişimini ve profil işlemlerini içerir.
      </p>
      <Link
        to="/secretary"
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        Sekreter Paneline Git <ArrowRight className="h-4 w-4" />
      </Link>
    </BentoCard>
  </>
);
