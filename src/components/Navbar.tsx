import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, User, Calendar, Phone, LogOut, Heart, Stethoscope } from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import { supabase } from '../lib/supabase';
import { clinicConfig } from '../config/clinicConfig';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleMenu = () => setIsOpen(!isOpen);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
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
    localStorage.removeItem('isAuthenticated');
    navigate('/');
  };

  const navLinks = [
    { name: 'Ana Sayfa', path: '/' },
    { name: 'Randevu Al', path: '/appointment' },
    { name: 'Bölümler', path: '/departments' },
    { name: 'Doktorlarımız', path: '/doctors' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'gradient-theme shadow-lg backdrop-blur-sm bg-opacity-95 py-2'
          : 'gradient-theme py-4'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="flex items-center relative">
              <div className="relative">
                <Stethoscope className="h-8 w-8 text-white transform transition-transform group-hover:rotate-12 duration-300" />
                <Heart 
                  className="absolute -right-1 -bottom-1 h-4 w-4 text-teal-400 animate-pulse" 
                  fill="currentColor"
                />
              </div>
              <span className="text-2xl font-bold text-white ml-3 flex items-center">
                <span className="transform transition-transform group-hover:translate-x-1 duration-300">{clinicConfig.shortName.split(' ')[0]}</span>
                <span className="transform transition-transform group-hover:translate-x-[-2px] duration-300 text-teal-400">{clinicConfig.shortName.split(' ')[1]}</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`font-medium transition-colors text-white/90 hover:text-white ${
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
              className="flex items-center space-x-1 text-white/90 hover:text-white"
            >
              <Phone size={18} />
              <span className="font-medium">{clinicConfig.contact.phone}</span>
            </a>
            
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors duration-300"
                >
                  <User size={18} />
                  <span>Hesabım</span>
                  <ChevronDown size={16} />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      <User size={18} className="inline-block mr-2" />
                      Profilim
                    </Link>
                    <Link
                      to="/my-appointments"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      <Calendar size={18} className="inline-block mr-2" />
                      Randevularım
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
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
                className="bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors duration-300"
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
              className="text-white focus:outline-none"
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
          <nav className="md:hidden mt-4 pb-4 animate-fade-in">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`py-2 px-4 rounded text-white/90 hover:text-white ${
                    location.pathname === link.path
                      ? 'bg-white/10 text-teal-400'
                      : 'hover:bg-white/10'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 py-2 px-4 text-white/90 hover:text-white hover:bg-white/10 rounded"
                  >
                    <User size={18} />
                    <span>Profilim</span>
                  </Link>
                  <Link
                    to="/my-appointments"
                    className="flex items-center space-x-2 py-2 px-4 text-white/90 hover:text-white hover:bg-white/10 rounded"
                  >
                    <Calendar size={18} />
                    <span>Randevularım</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center space-x-2 bg-red-600/80 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors duration-300"
                  >
                    <LogOut size={18} />
                    <span>Çıkış Yap</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors duration-300 text-center"
                >
                  Giriş Yap
                </Link>
              )}
              <a
                href="tel:+904242334455"
                className="flex items-center justify-center space-x-2 py-2 text-white/90 hover:text-white"
              >
                <Phone size={18} />
                <span>0424 233 44 55</span>
              </a>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Navbar;