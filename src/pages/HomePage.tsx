import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { clinicConfig } from '../config/clinicConfig';
import { useTheme } from '../contexts/ThemeContext';

const HomePage = () => {
  const prefersReducedMotion = useReducedMotion();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  const appointmentPreview = [
    { date: '22 Ağu', department: 'Kardiyoloji', doctor: 'Dr. A. Demir', time: '10:30', status: 'Onaylı' },
    { date: '24 Ağu', department: 'Nöroloji', doctor: 'Dr. E. Yıldız', time: '14:00', status: 'Planlandı' },
    { date: '27 Ağu', department: 'Dahiliye', doctor: 'Dr. M. Kaya', time: '09:15', status: 'Beklemede' },
  ];

  const doctorAvailabilityPreview = [
    { name: 'Dr. Selin Aras', branch: 'Kardiyoloji', slot: 'Bugün 16:20' },
    { name: 'Dr. Emre Baş', branch: 'Nöroloji', slot: 'Yarın 09:40' },
    { name: 'Dr. Melis Tuna', branch: 'Dahiliye', slot: 'Yarın 11:10' },
  ];

  const notificationsPreview = [
    { title: 'Randevu Hatırlatması', detail: 'Yarın 10:30 randevunuz bulunuyor.', time: '2 dk önce', unread: true },
    { title: 'Dosya Güncellemesi', detail: 'Yeni belge inceleme için eklendi.', time: '18 dk önce', unread: true },
    { title: 'Sistem Bilgilendirmesi', detail: 'Bildirim tercihlerinizi güncelleyebilirsiniz.', time: '1 saat önce', unread: false },
  ];

  const healthFileChips = ['Tahliller', 'Reçeteler', 'Aşılar', 'Kronik Takip'];

  const previewStagger = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.08,
        delayChildren: prefersReducedMotion ? 0 : 0.04,
      }
    }
  };

  const previewItem = {
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  const bentoCards = [
    {
      id: '01',
      title: 'Akıllı Randevu',
      description: 'Uygun zaman dilimlerini tek bakışta görüp randevunuzu hızlıca planlayın.',
      className: 'md:col-span-2 md:row-span-2'
    },
    {
      id: '02',
      title: 'Sağlık Asistanı',
      description: 'Sorularınıza rehberlik eden, süreç odaklı yapay zeka destekli deneyim.',
      className: 'md:col-span-1 md:row-span-1'
    },
    {
      id: '03',
      title: 'Dijital Hasta Dosyası',
      description: 'Geçmiş kayıtlarınızı sade ve güvenli bir arayüzde düzenli biçimde takip edin.',
      className: 'md:col-span-1 md:row-span-1'
    },
    {
      id: '04',
      title: 'Bildirim ve Takip',
      description: 'Randevu ve bakım adımlarını kaçırmamanız için akıllı hatırlatma akışı.',
      className: 'md:col-span-2 md:row-span-1'
    }
  ];

  return (
    <div className={`min-h-screen pt-16 ${isHighContrast ? 'bg-black text-white' : isLight ? 'bg-[#F8FAFC] text-[#0F172A]' : 'bg-[#070A0F] text-[#F8FAFC]'}`}>
      <section className="relative isolate overflow-hidden pb-28 pt-16 sm:pt-24">
        <div className={`pointer-events-none absolute inset-0 ${isHighContrast ? 'bg-black' : isLight ? 'bg-[#F7FAFC]' : 'bg-[#070A0F]'}`} aria-hidden="true" />
        <div
          className={`pointer-events-none absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.24),rgba(45,212,191,0.04)_55%,transparent_74%)] blur-[140px] ${isHighContrast ? 'opacity-0' : isLight ? 'opacity-70' : ''}`}
          aria-hidden="true"
        />
        <div
          className={`pointer-events-none absolute -bottom-24 -right-16 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.2),rgba(59,130,246,0.04)_58%,transparent_78%)] blur-[150px] ${isHighContrast ? 'opacity-0' : isLight ? 'opacity-70' : ''}`}
          aria-hidden="true"
        />

        <svg
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-[38%] h-24 w-full ${isHighContrast ? 'opacity-0' : 'opacity-[0.03]'}`}
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0 74h118l26-28 28 56 30-82 26 72 24-42 30 24h124l22-34 30 62 28-88 30 78 24-44 26 26h140l24-54 30 76 26-62 24 44h110"
            fill="none"
            stroke="url(#ambient-ekg)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="ambient-ekg" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#2DD4BF" />
              <stop offset="0.4" stopColor="#22D3EE" />
              <stop offset="0.75" stopColor="#3B82F6" />
              <stop offset="1" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
        </svg>

        <motion.div
          className="relative mx-auto flex w-full max-w-[1220px] flex-col px-5 sm:px-8"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: prefersReducedMotion ? 0 : 0.1,
                delayChildren: prefersReducedMotion ? 0 : 0.06,
              }
            }
          }}
        >
          <motion.div
            className={`mb-8 inline-flex w-fit items-center rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.2em] backdrop-blur-md ${isHighContrast ? 'border border-white bg-black text-white' : isLight ? 'border border-[#0F172A]/10 bg-white/80 text-[#64748B]' : 'border border-white/10 bg-white/[0.02] text-[#8B96A8]'}`}
            variants={{
              hidden: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0 }
            }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {clinicConfig.clinicName} | Smart Care Platform
          </motion.div>

          <motion.h1
            className="max-w-[11ch] text-[clamp(4rem,9vw,8rem)] font-black leading-[0.9] tracking-[-0.04em]"
            variants={{
              hidden: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0 }
            }}
            transition={{ duration: 0.72, ease: 'easeOut' }}
          >
            <span className="block">SAĞLIĞINI</span>
            <span className="block">YÖNET.</span>
            <span className={`mt-2 block ${isHighContrast ? 'text-cyan-200' : 'bg-gradient-to-r from-[#2DD4BF] via-[#22D3EE] to-[#3B82F6] bg-clip-text text-transparent'}`}>DAHA AKILLI</span>
            <span className={`block ${isHighContrast ? 'text-cyan-200' : 'bg-gradient-to-r from-[#22D3EE] via-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent'}`}>YAŞA.</span>
          </motion.h1>

          <motion.p
            className={`mt-12 max-w-2xl text-lg leading-relaxed sm:text-xl ${isHighContrast ? 'text-gray-100' : isLight ? 'text-[#64748B]' : 'text-[#8B96A8]'}`}
            variants={{
              hidden: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0 }
            }}
            transition={{ duration: 0.62, ease: 'easeOut' }}
          >
            Randevularınızı yönetin, sağlık geçmişinizi takip edin ve akıllı sağlık teknolojileriyle
            bakım sürecinizi tek yerden yönetin.
          </motion.p>

          <motion.div
            className="mt-12 flex flex-col gap-4 sm:flex-row"
            variants={{
              hidden: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0 }
            }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <motion.div whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}>
              <Link
                to="/appointment"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#2DD4BF] via-[#22D3EE] to-[#3B82F6] px-8 py-3 text-base font-semibold text-[#070A0F] shadow-[0_10px_35px_rgba(34,211,238,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2"
              >
                Randevu Al {'->'}
              </Link>
            </motion.div>
            <motion.div whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}>
              <Link
                to="/departments"
                className={`inline-flex items-center justify-center rounded-full px-8 py-3 text-base font-semibold backdrop-blur-md transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 ${isHighContrast ? 'border border-white bg-black text-white hover:bg-white hover:text-black' : isLight ? 'border border-[#0F172A]/10 bg-white/70 text-[#0F172A] hover:bg-white' : 'border border-white/15 bg-white/[0.03] text-[#F8FAFC] hover:bg-white/[0.06]'}`}
              >
                Platformu Keşfet
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      <section className="relative z-10 -mt-10 pb-14 sm:pb-20">
        <motion.div
          className={`mx-auto w-[calc(100%-2.5rem)] max-w-[1160px] overflow-hidden rounded-[32px] p-4 backdrop-blur-[18px] sm:p-6 ${isHighContrast ? 'border border-white bg-black shadow-none' : isLight ? 'border border-[#0F172A]/10 bg-white/85 shadow-[0_20px_56px_rgba(15,23,42,0.10)]' : 'border border-white/[0.08] bg-white/[0.04] shadow-[0_18px_58px_rgba(0,0,0,0.45)]'}`}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
          viewport={{ once: true, amount: 0.2 }}
        >
          <div className={`rounded-[26px] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-6 ${isHighContrast ? 'border border-white bg-black' : isLight ? 'border border-[#0F172A]/10 bg-white/92' : 'border border-white/10 bg-[#0D121B]/95'}`}>
            <div className={`mb-6 flex items-center justify-between pb-4 ${isHighContrast ? 'border-b border-white' : isLight ? 'border-b border-[#0F172A]/10' : 'border-b border-white/10'}`}>
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#fb7185]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#facc15]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#4ade80]" />
              </div>
              <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs tracking-[0.14em] ${isHighContrast ? 'border border-white bg-black text-white' : isLight ? 'border border-[#0F172A]/10 bg-white text-[#64748B]' : 'border border-white/10 bg-white/5 text-[#8B96A8]'}`}>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
                SağlıkTakip Dashboard
              </div>
            </div>

            <div className={`mb-5 flex items-center justify-between rounded-2xl px-4 py-3 text-xs ${isHighContrast ? 'border border-white bg-black text-gray-100' : isLight ? 'border border-[#0F172A]/10 bg-white text-[#64748B]' : 'border border-white/10 bg-white/[0.02] text-[#8B96A8]'}`}>
              <span className="tracking-[0.14em] uppercase">Product Preview</span>
              <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-medium text-cyan-200">
                Demo Arayüz
              </span>
            </div>

            <motion.div
              className="grid grid-cols-1 gap-4 lg:grid-cols-12"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={previewStagger}
            >
              <motion.div
                className={`rounded-[20px] p-5 lg:col-span-7 ${isHighContrast ? 'border border-white bg-black' : isLight ? 'border border-[#0F172A]/10 bg-white/90' : 'border border-white/10 bg-[#111827]'}`}
                variants={previewItem}
                transition={{ duration: 0.42, ease: 'easeOut' }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className={`text-[11px] uppercase tracking-[0.18em] ${isHighContrast ? 'text-white' : isLight ? 'text-[#64748B]' : 'text-[#8B96A8]'}`}>Yaklaşan Randevu</p>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] ${isHighContrast ? 'border border-white bg-black text-white' : isLight ? 'border border-[#0F172A]/10 bg-white text-[#64748B]' : 'border border-white/10 bg-white/5 text-[#8B96A8]'}`}>Haftalık</span>
                </div>

                <div className={`overflow-x-auto rounded-2xl ${isHighContrast ? 'border border-white' : isLight ? 'border border-[#0F172A]/10' : 'border border-white/10'}`}>
                  <div className="min-w-[540px]">
                    <div className={`grid grid-cols-[1.1fr_1.2fr_1.2fr_0.8fr_0.9fr] px-3 py-2 text-[10px] uppercase tracking-[0.14em] ${isHighContrast ? 'bg-black text-gray-200' : isLight ? 'bg-[#F1F5F9] text-[#64748B]' : 'bg-white/[0.03] text-[#8B96A8]'}`}>
                      <span>Tarih</span>
                      <span>Bölüm</span>
                      <span>Doktor</span>
                      <span>Saat</span>
                      <span>Durum</span>
                    </div>
                    {appointmentPreview.map((item, index) => (
                      <div
                        key={`${item.date}-${item.time}`}
                        className={`grid grid-cols-[1.1fr_1.2fr_1.2fr_0.8fr_0.9fr] items-center px-3 py-2.5 text-sm transition-colors duration-200 ${isHighContrast ? 'border-t border-white text-white hover:bg-neutral-900' : isLight ? 'border-t border-[#0F172A]/10 text-[#1E293B] hover:bg-[#F1F5F9]' : 'border-t border-white/10 text-[#D4D9E1] hover:bg-white/[0.03]'}`}
                      >
                        <span className={isLight ? 'text-[#475569]' : 'text-[#C6CDD8]'}>{item.date}</span>
                        <span className={isLight ? 'text-[#475569]' : 'text-[#C6CDD8]'}>{item.department}</span>
                        <span>{item.doctor}</span>
                        <span className={isLight ? 'text-[#475569]' : 'text-[#C6CDD8]'}>{item.time}</span>
                        <span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${index === 2 ? 'border-amber-300/30 bg-amber-300/10 text-amber-100' : 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'}`}>
                            {item.status}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.div
                className={`rounded-[20px] p-5 lg:col-span-5 ${isHighContrast ? 'border border-white bg-black' : isLight ? 'border border-[#0F172A]/10 bg-white/90' : 'border border-white/10 bg-[#111827]'}`}
                variants={previewItem}
                transition={{ duration: 0.42, ease: 'easeOut' }}
              >
                <p className={`text-[11px] uppercase tracking-[0.18em] ${isHighContrast ? 'text-white' : isLight ? 'text-[#64748B]' : 'text-[#8B96A8]'}`}>Doktor Uygunluğu</p>
                <div className="mt-4 space-y-2">
                  {doctorAvailabilityPreview.map((doctor, index) => (
                    <div
                      key={doctor.name}
                      className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors duration-200 ${isHighContrast ? 'border border-white bg-black hover:bg-neutral-900' : isLight ? 'border border-[#0F172A]/10 bg-white hover:bg-[#F1F5F9]' : 'border border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-300/10 text-[10px] font-semibold text-cyan-100">
                          D{index + 1}
                        </span>
                        <div>
                          <p className={`text-sm font-medium ${isHighContrast ? 'text-white' : isLight ? 'text-[#0F172A]' : 'text-[#E6EAF0]'}`}>{doctor.name}</p>
                          <p className={`text-xs ${isHighContrast ? 'text-gray-200' : isLight ? 'text-[#64748B]' : 'text-[#8B96A8]'}`}>{doctor.branch}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs ${isHighContrast ? 'text-gray-200' : isLight ? 'text-[#475569]' : 'text-[#B6C0CF]'}`}>{doctor.slot}</p>
                        <span className="mt-1 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-[10px] text-cyan-100">
                          Müsait
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className={`rounded-[20px] p-5 lg:col-span-5 ${isHighContrast ? 'border border-white bg-black' : isLight ? 'border border-[#0F172A]/10 bg-white/90' : 'border border-white/10 bg-[#111827]'}`}
                variants={previewItem}
                transition={{ duration: 0.42, ease: 'easeOut' }}
              >
                <p className={`text-[11px] uppercase tracking-[0.18em] ${isHighContrast ? 'text-white' : isLight ? 'text-[#64748B]' : 'text-[#8B96A8]'}`}>Bildirimler</p>
                <div className="mt-4 space-y-2.5">
                  {notificationsPreview.map((notification) => (
                    <div
                      key={notification.title}
                      className={`flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200 ${isHighContrast ? 'border border-white bg-black hover:bg-neutral-900' : isLight ? 'border border-[#0F172A]/10 bg-white hover:bg-[#F1F5F9]' : 'border border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-300/10 text-[10px] text-cyan-100">
                          i
                        </span>
                        <div>
                          <p className={`text-sm font-medium ${isHighContrast ? 'text-white' : isLight ? 'text-[#0F172A]' : 'text-[#E4E9F1]'}`}>{notification.title}</p>
                          <p className={`text-xs ${isHighContrast ? 'text-gray-200' : isLight ? 'text-[#64748B]' : 'text-[#8B96A8]'}`}>{notification.detail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] ${isHighContrast ? 'text-gray-200' : isLight ? 'text-[#64748B]' : 'text-[#8B96A8]'}`}>{notification.time}</span>
                        {notification.unread && <span className="h-2 w-2 rounded-full bg-cyan-300" />}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className={`rounded-[20px] p-5 lg:col-span-4 ${isHighContrast ? 'border border-white bg-black' : isLight ? 'border border-[#0F172A]/10 bg-white/90' : 'border border-white/10 bg-[#111827]'}`}
                variants={previewItem}
                transition={{ duration: 0.42, ease: 'easeOut' }}
              >
                <p className={`text-[11px] uppercase tracking-[0.18em] ${isHighContrast ? 'text-white' : isLight ? 'text-[#64748B]' : 'text-[#8B96A8]'}`}>Sağlık Dosyam</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {healthFileChips.map((chip, index) => (
                    <span
                      key={chip}
                      className={`rounded-full border px-3 py-1.5 text-xs ${index === 0 ? 'border-cyan-300/30 bg-cyan-300/12 text-cyan-100' : isHighContrast ? 'border-white bg-black text-gray-100' : isLight ? 'border-[#0F172A]/10 bg-white text-[#64748B]' : 'border-white/15 bg-white/[0.03] text-[#B7C0CC]'}`}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
                <p className={`mt-4 text-xs leading-relaxed ${isHighContrast ? 'text-gray-100' : isLight ? 'text-[#64748B]' : 'text-[#8B96A8]'}`}>
                  Bu alan ürün görünümünü temsil eden bir önizlemedir. Klinik sonuç veya tanı verisi içermez.
                </p>
              </motion.div>

              <motion.div
                className={`rounded-[20px] p-5 lg:col-span-3 ${isHighContrast ? 'border border-white bg-black' : isLight ? 'border border-[#0F172A]/10 bg-white/90' : 'border border-white/10 bg-[#111827]'}`}
                variants={previewItem}
                transition={{ duration: 0.42, ease: 'easeOut' }}
              >
                <p className={`text-[11px] uppercase tracking-[0.18em] ${isHighContrast ? 'text-white' : isLight ? 'text-[#64748B]' : 'text-[#8B96A8]'}`}>AI Asistan</p>
                <div className={`mt-4 space-y-2 rounded-2xl p-3 ${isHighContrast ? 'border border-white bg-black' : isLight ? 'border border-[#0F172A]/10 bg-white' : 'border border-white/10 bg-white/[0.03]'}`}>
                  <div className={`h-2.5 w-5/6 rounded-full ${isLight ? 'bg-[#DCE4EE]' : 'bg-white/20'}`} />
                  <div className="h-2.5 w-2/3 rounded-full bg-cyan-300/35" />
                  <div className="h-2.5 w-3/4 rounded-full bg-blue-400/35" />
                </div>
              </motion.div>

              <motion.div
                className={`rounded-[20px] p-5 lg:col-span-12 ${isHighContrast ? 'border border-white bg-black' : isLight ? 'border border-[#0F172A]/10 bg-white/90' : 'border border-white/10 bg-[#111827]'}`}
                variants={previewItem}
                transition={{ duration: 0.42, ease: 'easeOut' }}
              >
                <div className={`flex flex-wrap items-center justify-between gap-3 text-xs ${isHighContrast ? 'text-gray-100' : isLight ? 'text-[#64748B]' : 'text-[#8B96A8]'}`}>
                  <span>Platform görünümü</span>
                  <span className={`rounded-full px-3 py-1 ${isHighContrast ? 'border border-white bg-black text-white' : isLight ? 'border border-[#0F172A]/10 bg-white text-[#475569]' : 'border border-white/15 bg-white/[0.03]'}`}>Klinik veri içermez</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section className="pb-24 sm:pb-28">
        <div className="mx-auto w-full max-w-[1160px] px-5 sm:px-8">
          <motion.div
            className="mb-14 max-w-2xl"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            viewport={{ once: true, amount: 0.2 }}
          >
            <p className={`text-xs uppercase tracking-[0.22em] ${isHighContrast ? 'text-gray-100' : isLight ? 'text-[#64748B]' : 'text-[#8B96A8]'}`}>Platform Özellikleri</p>
            <h2 className={`mt-4 text-4xl font-bold leading-tight tracking-[-0.02em] sm:text-5xl ${isHighContrast ? 'text-white' : isLight ? 'text-[#0F172A]' : 'text-[#F8FAFC]'}`}>
              Sağlık sürecinizi tek bir premium deneyimde birleştirin.
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 gap-5 md:auto-rows-[220px] md:grid-cols-2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={{
              hidden: { opacity: 1 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: prefersReducedMotion ? 0 : 0.12,
                }
              }
            }}
          >
            {bentoCards.map((card) => (
              <motion.article
                key={card.id}
                className={`group relative overflow-hidden rounded-[28px] p-6 sm:p-7 ${card.className} ${isHighContrast ? 'border border-white bg-black' : isLight ? 'border border-[#0F172A]/10 bg-white/90' : 'border border-white/[0.08] bg-[#0D121B]'}`}
                variants={{
                  hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <div className="pointer-events-none absolute inset-0 rounded-[28px] border border-transparent transition-colors duration-300 group-hover:border-cyan-300/25" />
                <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${isHighContrast ? 'text-gray-100' : isLight ? 'text-[#64748B]' : 'text-[#8B96A8]'}`}>{card.id}</p>
                <h3 className={`mt-5 text-2xl font-semibold tracking-[-0.02em] ${isHighContrast ? 'text-white' : isLight ? 'text-[#0F172A]' : 'text-[#F8FAFC]'}`}>{card.title}</h3>
                <p className={`mt-3 max-w-[38ch] text-sm leading-relaxed ${isHighContrast ? 'text-gray-100' : isLight ? 'text-[#64748B]' : 'text-[#8B96A8]'}`}>{card.description}</p>

                <div className={`mt-8 rounded-2xl p-4 ${isHighContrast ? 'border border-white bg-black' : isLight ? 'border border-[#0F172A]/10 bg-[#F8FAFC]' : 'border border-white/10 bg-[#111827]'}`}>
                  {card.id === '01' && (
                    <div className="grid grid-cols-6 gap-2">
                      <span className="col-span-3 h-10 rounded-lg bg-cyan-300/18" />
                      <span className="col-span-3 h-10 rounded-lg bg-blue-400/18" />
                      <span className={`col-span-2 h-8 rounded-lg ${isLight ? 'bg-[#DCE4EE]' : 'bg-white/10'}`} />
                      <span className={`col-span-4 h-8 rounded-lg ${isLight ? 'bg-[#DCE4EE]' : 'bg-white/10'}`} />
                    </div>
                  )}
                  {card.id === '02' && (
                    <div className="space-y-2">
                      <div className={`h-2 w-5/6 rounded-full ${isLight ? 'bg-[#DCE4EE]' : 'bg-white/20'}`} />
                      <div className="h-2 w-2/3 rounded-full bg-cyan-300/35" />
                      <div className="h-2 w-3/4 rounded-full bg-blue-400/30" />
                    </div>
                  )}
                  {card.id === '03' && (
                    <div className="grid grid-cols-4 gap-2">
                      <span className={`h-12 rounded-xl ${isHighContrast ? 'border border-white bg-black' : isLight ? 'border border-[#0F172A]/10 bg-white' : 'border border-white/10 bg-white/5'}`} />
                      <span className={`h-12 rounded-xl ${isHighContrast ? 'border border-white bg-black' : isLight ? 'border border-[#0F172A]/10 bg-white' : 'border border-white/10 bg-white/5'}`} />
                      <span className="h-12 rounded-xl border border-cyan-300/20 bg-cyan-300/10" />
                      <span className={`h-12 rounded-xl ${isHighContrast ? 'border border-white bg-black' : isLight ? 'border border-[#0F172A]/10 bg-white' : 'border border-white/10 bg-white/5'}`} />
                    </div>
                  )}
                  {card.id === '04' && (
                    <div className="flex items-end gap-2">
                      <span className={`h-7 w-1/6 rounded-t-lg ${isLight ? 'bg-[#DCE4EE]' : 'bg-white/15'}`} />
                      <span className="h-12 w-1/6 rounded-t-lg bg-cyan-300/30" />
                      <span className="h-9 w-1/6 rounded-t-lg bg-blue-400/25" />
                      <span className="h-14 w-1/6 rounded-t-lg bg-blue-400/35" />
                      <span className={`h-10 w-1/6 rounded-t-lg ${isLight ? 'bg-[#DCE4EE]' : 'bg-white/15'}`} />
                      <span className="h-8 w-1/6 rounded-t-lg bg-violet-400/20" />
                    </div>
                  )}
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;