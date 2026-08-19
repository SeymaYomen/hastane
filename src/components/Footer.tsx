import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { clinicConfig } from '../config/clinicConfig';
import { useTheme } from '../contexts/ThemeContext';

const Footer = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  const footerClass = isHighContrast
    ? 'border-t-2 border-white bg-black text-white'
    : isLight
      ? 'border-t border-[#0F172A]/10 bg-[#F8FAFC] text-[#0F172A]'
      : 'border-t border-white/10 bg-[#070A0F] text-[#F8FAFC]';

  const mutedClass = isHighContrast ? 'text-gray-100' : isLight ? 'text-[#64748B]' : 'text-[#8B96A8]';
  const linkClass = isHighContrast
    ? 'text-white hover:text-cyan-300'
    : isLight
      ? 'text-[#475569] hover:text-[#0F172A]'
      : 'text-[#AAB4C2] hover:text-cyan-300';

  return (
    <footer className={`pt-16 pb-8 ${footerClass}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`mb-10 rounded-[28px] p-8 sm:p-10 ${isHighContrast ? 'border border-white bg-black' : isLight ? 'border border-[#0F172A]/10 bg-white/88 shadow-[0_14px_40px_rgba(15,23,42,0.08)]' : 'border border-white/10 bg-white/[0.03] backdrop-blur-md'}`}>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* About */}
            <div>
              <h3 className="mb-4 text-xl font-semibold">{clinicConfig.clinicName}</h3>
              <p className={`mb-5 text-sm leading-relaxed ${mutedClass}`}>
                {clinicConfig.contact.city}'de sağlık süreçlerini daha sade ve erişilebilir hale getiren,
                güvenilir dijital sağlık deneyimi.
              </p>
              <div className="mt-4 flex space-x-4">
              {clinicConfig.socialMedia?.facebook && (
                <a href={clinicConfig.socialMedia.facebook} className={`${linkClass} transition-colors`}>
                  <Facebook size={20} />
                </a>
              )}
              {clinicConfig.socialMedia?.twitter && (
                <a href={clinicConfig.socialMedia.twitter} className={`${linkClass} transition-colors`}>
                  <Twitter size={20} />
                </a>
              )}
              {clinicConfig.socialMedia?.instagram && (
                <a href={clinicConfig.socialMedia.instagram} className={`${linkClass} transition-colors`}>
                  <Instagram size={20} />
                </a>
              )}
              {clinicConfig.socialMedia?.linkedin && (
                <a href={clinicConfig.socialMedia.linkedin} className={`${linkClass} transition-colors`}>
                  <Linkedin size={20} />
                </a>
              )}
              </div>
            </div>

          {/* Quick Links */}
            <div>
              <h3 className="mb-4 text-lg font-semibold">Hızlı Erişim</h3>
              <ul className="space-y-2.5">
              <li>
                <Link to="/" className={`${linkClass} transition-colors`}>Ana Sayfa</Link>
              </li>
              <li>
                <Link to="/appointment" className={`${linkClass} transition-colors`}>Randevu Al</Link>
              </li>
              <li>
                <Link to="/departments" className={`${linkClass} transition-colors`}>Bölümlerimiz</Link>
              </li>
              <li>
                <Link to="/doctors" className={`${linkClass} transition-colors`}>Doktorlarımız</Link>
              </li>
            </ul>
            </div>

          {/* Services */}
            <div>
              <h3 className="mb-4 text-lg font-semibold">Hizmet Alanları</h3>
              <ul className="space-y-2.5">
              <li>
                <span className={mutedClass}>Acil Servis</span>
              </li>
              <li>
                <span className={mutedClass}>Laboratuvar</span>
              </li>
              <li>
                <span className={mutedClass}>Radyoloji</span>
              </li>
              <li>
                <span className={mutedClass}>Diş Sağlığı</span>
              </li>
            </ul>
            </div>

          {/* Contact Info */}
            <div>
              <h3 className="mb-4 text-lg font-semibold">İletişim</h3>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                <MapPin size={20} className="text-teal-400 mt-1 flex-shrink-0" />
                  <span className={mutedClass}>
                  {clinicConfig.contact.address}, {clinicConfig.contact.city} {clinicConfig.contact.zipCode || ''}
                  </span>
                </li>
                <li className="flex items-center space-x-3">
                <Phone size={20} className="text-teal-400 flex-shrink-0" />
                  <a href={`tel:+90${clinicConfig.contact.phone.replace(/\D/g, '').slice(1)}`} className={`${linkClass} transition-colors`}>
                  {clinicConfig.contact.phone}
                </a>
                </li>
                <li className="flex items-center space-x-3">
                <Mail size={20} className="text-teal-400 flex-shrink-0" />
                  <a href={`mailto:${clinicConfig.contact.email}`} className={`${linkClass} transition-colors`}>
                  {clinicConfig.contact.email}
                </a>
                </li>
                <li className="flex items-start space-x-3">
                <Clock size={20} className="text-teal-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className={mutedClass}>Hafta içi: {clinicConfig.workingHours.weekday}</p>
                  {clinicConfig.workingHours.weekend && (
                      <p className={mutedClass}>Hafta sonu: {clinicConfig.workingHours.weekend}</p>
                  )}
                  {clinicConfig.workingHours.note && (
                      <p className={mutedClass}>{clinicConfig.workingHours.note}</p>
                  )}
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className={`pt-6 ${isHighContrast ? 'border-t border-white' : isLight ? 'border-t border-[#0F172A]/10' : 'border-t border-white/10'}`}>
          <p className={`text-center text-sm ${mutedClass}`}>
            &copy; {new Date().getFullYear()} {clinicConfig.clinicName}. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;