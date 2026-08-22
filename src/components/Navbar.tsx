import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, User, Calendar, Phone, LogOut, Heart, Stethoscope, FileHeart } from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import { supabase } from '../lib/supabase';
import { clinicConfig } from '../config/clinicConfig';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUserRole, type UserRole } from '../services/auth/roleService';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';
  const [brandFirst, brandSecond = ''] = clinicConfig.shortName.split(' ');

  const toggleMenu = () => setIsOpen(!isOpen);

  useEffect(() => {
    let mounted = true;
    let roleRequest = 0;

    const applySession = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      const request = ++roleRequest;
      if (!mounted) return;
      setIsAuthenticated(Boolean(session));
      setRole(null);

      if (!session?.user) return;

      try {
        const currentRole = await getCurrentUserRole(session.user.id);
        if (mounted && request === roleRequest) setRole(currentRole);
      } catch (error) {
        console.error('Navbar rolü yüklenemedi:', error);
        if (mounted && request === roleRequest) setRole(null);
      }
    };

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await applySession(session);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setShowUserMenu(false);
  }, [location]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setRole(null);
    localStorage.removeItem('isAuthenticated');
    navigate('/');
  };

  const navLinks = [
    { name: 'Ana Sayfa', path: '/' },
    ...(role === 'doctor'
      ? [{ name: 'Doktor Paneli', path: '/doctor' }]
      : role === 'patient' || !isAuthenticated
        ? [{ name: 'Randevu Al', path: '/appointment' }]
        : []),
    { name: 'Bölümler', path: '/departments' },
    { name: 'Doktorlarımız', path: '/doctors' },
  ];

  const headerThemeClass = isHighContrast
    ? 'border-b-2 border-white bg-black text-white'
    : isLight
      ? 'border-b border-[#0F172A]/10 bg-white/86 text-[#0F172A]'
      : 'border-b border-white/10 bg-[#070A0F]/78 text-[#F8FAFC]';

  const navTextClass = isHighContrast
    ? 'text-white hover:text-cyan-300'
    : isLight
      ? 'text-[#334155] hover:text-[#0F172A]'
      : 'text-white/85 hover:text-white';

  const mobilePanelClass = isHighContrast
    ? 'border border-white bg-black'
    : isLight
      ? 'border border-[#0F172A]/10 bg-white/90'
      : 'border border-white/10 bg-[#0D121B]/95';

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 backdrop-blur-xl transition-all duration-300 ${headerThemeClass} ${scrolled ? 'py-2 shadow-[0_10px_30px_rgba(2,6,23,0.18)]' : 'py-3'}`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="flex items-center relative">
              <div className="relative">
                <Stethoscope className={`h-8 w-8 transform transition-transform duration-300 group-hover:rotate-12 ${isHighContrast ? 'text-white' : isLight ? 'text-[#0F172A]' : 'text-white'}`} />
                <Heart 
                  className="absolute -right-1 -bottom-1 h-4 w-4 text-teal-400" 
                  fill="currentColor"
                />
              </div>
              <span className={`ml-3 flex items-center text-2xl font-bold ${isHighContrast ? 'text-white' : isLight ? 'text-[#0F172A]' : 'text-white'}`}>
                <span className="transform transition-transform duration-300 group-hover:translate-x-1">{brandFirst}</span>
                <span className="transform text-teal-400 transition-transform duration-300 group-hover:translate-x-[-2px]">{brandSecond}</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`font-medium transition-colors ${navTextClass} ${
                  location.pathname === link.path ? 'text-teal-400' : ''
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <ThemeSwitcher />
            
            <a
              href={`tel:+90${clinicConfig.contact.phone.replace(/\D/g, '').slice(1)}`}
              className={`flex items-center space-x-1 transition-colors ${navTextClass}`}
            >
              <Phone size={18} />
              <span className="font-medium">{clinicConfig.contact.phone}</span>
            </a>
            
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center space-x-2 rounded-full py-2 px-4 transition-colors duration-300 ${isHighContrast ? 'border border-white bg-black text-white hover:bg-white hover:text-black' : isLight ? 'border border-[#0F172A]/12 bg-white/90 text-[#0F172A] hover:bg-white' : 'border border-white/15 bg-white/10 text-white hover:bg-white/20'}`}
                >
                  <User size={18} />
                  <span>Hesabım</span>
                  <ChevronDown size={16} />
                </button>

                {showUserMenu && (
                  <div className={`absolute right-0 mt-2 w-52 rounded-2xl py-2 shadow-lg backdrop-blur-md ${isHighContrast ? 'border border-white bg-black' : isLight ? 'border border-[#0F172A]/12 bg-white/95' : 'border border-white/15 bg-[#0D121B]/95'}`}>
                    {role === 'doctor' && (
                      <Link
                        to="/doctor"
                        className={`block px-4 py-2 transition-colors ${isHighContrast ? 'text-white hover:bg-white hover:text-black' : isLight ? 'text-[#0F172A] hover:bg-[#F1F5F9]' : 'text-[#E2E8F0] hover:bg-white/10'}`}
                      >
                        <Stethoscope size={18} className="inline-block mr-2" />
                        Doktor Paneli
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      className={`block px-4 py-2 transition-colors ${isHighContrast ? 'text-white hover:bg-white hover:text-black' : isLight ? 'text-[#0F172A] hover:bg-[#F1F5F9]' : 'text-[#E2E8F0] hover:bg-white/10'}`}
                    >
                      <User size={18} className="inline-block mr-2" />
                      Profilim
                    </Link>
                    {role === 'patient' && (
                      <>
                        <Link to="/health-record" className={`block px-4 py-2 transition-colors ${isHighContrast ? 'text-white hover:bg-white hover:text-black' : isLight ? 'text-[#0F172A] hover:bg-[#F1F5F9]' : 'text-[#E2E8F0] hover:bg-white/10'}`}>
                          <FileHeart size={18} className="inline-block mr-2" />
                          Sağlık Dosyam
                        </Link>
                        <Link to="/my-appointments" className={`block px-4 py-2 transition-colors ${isHighContrast ? 'text-white hover:bg-white hover:text-black' : isLight ? 'text-[#0F172A] hover:bg-[#F1F5F9]' : 'text-[#E2E8F0] hover:bg-white/10'}`}>
                          <Calendar size={18} className="inline-block mr-2" />
                          Randevularım
                        </Link>
                      </>
                    )}
                    <button
                      onClick={handleLogout}
                      className={`w-full text-left px-4 py-2 transition-colors ${isHighContrast ? 'text-rose-300 hover:bg-white hover:text-black' : isLight ? 'text-red-600 hover:bg-[#F1F5F9]' : 'text-red-300 hover:bg-white/10'}`}
                    >
                      <LogOut size={18} className="inline-block mr-2" />
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className={`rounded-full py-2 px-4 transition-colors duration-300 ${isHighContrast ? 'border border-white bg-black text-white hover:bg-white hover:text-black' : isLight ? 'border border-[#0F172A]/12 bg-white/90 text-[#0F172A] hover:bg-white' : 'border border-white/15 bg-white/10 text-white hover:bg-white/20'}`}
              >
                Giriş Yap
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-4">
            <ThemeSwitcher />
            <button
              onClick={toggleMenu}
              className={`rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${isHighContrast ? 'text-white border border-white' : isLight ? 'text-[#0F172A] border border-[#0F172A]/10 bg-white/80' : 'text-white border border-white/15 bg-white/10'}`}
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <X size={24} />
              ) : (
                <Menu size={24} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <nav className={`md:hidden mt-4 rounded-2xl p-3 animate-fade-in ${mobilePanelClass}`}>
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`py-2 px-4 rounded-lg transition-colors ${
                    location.pathname === link.path
                      ? isHighContrast
                        ? 'bg-white text-black'
                        : isLight
                          ? 'bg-[#E2E8F0] text-teal-700'
                          : 'bg-white/10 text-teal-400'
                      : isHighContrast
                        ? 'text-white hover:bg-white hover:text-black'
                        : isLight
                          ? 'text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                          : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              {isAuthenticated ? (
                <>
                  {role === 'doctor' && (
                    <Link
                      to="/doctor"
                      className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition-colors ${isHighContrast ? 'text-white hover:bg-white hover:text-black' : isLight ? 'text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0F172A]' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}
                    >
                      <Stethoscope size={18} />
                      <span>Doktor Paneli</span>
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition-colors ${isHighContrast ? 'text-white hover:bg-white hover:text-black' : isLight ? 'text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0F172A]' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}
                  >
                    <User size={18} />
                    <span>Profilim</span>
                  </Link>
                  {role === 'patient' && (
                    <>
                      <Link to="/health-record" className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition-colors ${isHighContrast ? 'text-white hover:bg-white hover:text-black' : isLight ? 'text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0F172A]' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}>
                        <FileHeart size={18} />
                        <span>Sağlık Dosyam</span>
                      </Link>
                      <Link to="/my-appointments" className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition-colors ${isHighContrast ? 'text-white hover:bg-white hover:text-black' : isLight ? 'text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0F172A]' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}>
                        <Calendar size={18} />
                        <span>Randevularım</span>
                      </Link>
                    </>
                  )}
                  <button
                    onClick={handleLogout}
                    className={`flex items-center justify-center space-x-2 py-2 px-4 rounded-lg transition-colors duration-300 ${isHighContrast ? 'border border-white text-white hover:bg-white hover:text-black' : isLight ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-600/80 text-white hover:bg-red-600'}`}
                  >
                    <LogOut size={18} />
                    <span>Çıkış Yap</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className={`py-2 px-4 rounded-lg text-center transition-colors duration-300 ${isHighContrast ? 'border border-white text-white hover:bg-white hover:text-black' : isLight ? 'border border-[#0F172A]/10 bg-white text-[#0F172A] hover:bg-[#F1F5F9]' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  Giriş Yap
                </Link>
              )}
              <a
                href={`tel:+90${clinicConfig.contact.phone.replace(/\D/g, '').slice(1)}`}
                className={`flex items-center justify-center space-x-2 py-2 transition-colors ${navTextClass}`}
              >
                <Phone size={18} />
                <span>{clinicConfig.contact.phone}</span>
              </a>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Navbar;
