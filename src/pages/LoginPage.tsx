import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, User, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthRole } from '../hooks/useAuthRole';
import { getRoleHomePath } from '../services/auth/roleService';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [tckn, setTCKN] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [roleRedirectUserId, setRoleRedirectUserId] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const { user: authRoleUser, role, error: authRoleError } = useAuthRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!roleRedirectUserId || authRoleUser?.id !== roleRedirectUserId) return;

    if (authRoleError) {
      setError('Kullanıcı rolü doğrulanamadı. Lütfen tekrar deneyin.');
      setRoleRedirectUserId(null);
      return;
    }

    if (!role) return;

    if (role === 'patient') {
      const from = location.state?.from?.pathname || '/appointment';
      navigate(from, { replace: true });
    } else {
      navigate(getRoleHomePath(role), { replace: true });
    }
    setRoleRedirectUserId(null);
  }, [authRoleError, authRoleUser?.id, location.state, navigate, role, roleRedirectUserId]);

  const validateTCKN = (tcno: string): boolean => {
    if (!/^[1-9][0-9]{10}$/.test(tcno)) return false;

    const digits = tcno.split('').map(Number);
    
    // 10. digit validation
    const digit10 = (((digits[0] + digits[2] + digits[4] + digits[6] + digits[8]) * 7) -
                     (digits[1] + digits[3] + digits[5] + digits[7])) % 10;
    if (digit10 !== digits[9]) return false;

    // 11. digit validation
    const digit11 = (digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0)) % 10;
    if (digit11 !== digits[10]) return false;

    return true;
  };

  const validateForm = () => {
    if (!isLogin && !name.trim()) {
      setError('Ad Soyad alanı zorunludur');
      return false;
    }

    if (!isLogin && !validateTCKN(tckn)) {
      setError('Geçerli bir TC Kimlik Numarası giriniz');
      return false;
    }

    if (!email.trim()) {
      setError('E-posta adresi zorunludur');
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Geçerli bir e-posta adresi giriniz');
      return false;
    }

    if (!isResettingPassword && (password.length < 8 || password.length > 14)) {
      setError('Şifre 8-14 karakter arasında olmalıdır');
      return false;
    }

    return true;
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Geçerli bir e-posta adresi giriniz');
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      setSuccess('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi');
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Şifre sıfırlama işlemi başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
  email,
  password
});

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            throw new Error('E-posta veya şifre hatalı');
          }
          throw signInError;
        }

        if (data.user) {
  localStorage.setItem('isAuthenticated', 'true');
  setRoleRedirectUserId(data.user.id);
}
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              tckn: tckn
            }
          }
        });

        if (signUpError) {
          if (signUpError.message === 'User already registered' || signUpError.message.includes('already exists')) {
            setError('Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.');
            setIsLogin(true);
            setPassword('');
            return;
          }
          throw signUpError;
        }

        if (signUpData.user) {
  localStorage.setItem('isAuthenticated', 'true');
  navigate('/appointment');
}
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          {isResettingPassword ? 'Şifre Sıfırlama' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isResettingPassword ? 'Şifre sıfırlama bağlantısı için e-posta adresinizi girin' : 
           isLogin ? 'Randevu almak için giriş yapın' : 'Yeni hesap oluşturun'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          <form className="space-y-6" onSubmit={isResettingPassword ? handlePasswordReset : handleSubmit}>
            {!isLogin && !isResettingPassword && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Ad Soyad
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2.5"
                      placeholder="Ad Soyad"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="tckn" className="block text-sm font-medium text-gray-700">
                    TC Kimlik No
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="tckn"
                      name="tckn"
                      type="text"
                      required
                      value={tckn}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 11 && value[0] !== '0') {
                          setTCKN(value);
                        }
                      }}
                      className="pl-10 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2.5"
                      placeholder="TC Kimlik No"
                      maxLength={11}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                E-posta
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2.5"
                  placeholder="E-posta adresiniz"
                />
              </div>
            </div>

            {!isResettingPassword && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Şifre (8-14 karakter)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value.slice(0, 14))}
                    minLength={8}
                    maxLength={14}
                    className="pl-10 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2.5"
                    placeholder="Şifreniz"
                  />
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-800 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    {isResettingPassword ? 'Şifre Sıfırlama Bağlantısı Gönder' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {isResettingPassword ? 'veya' : isLogin ? 'Hesabınız yok mu?' : 'Zaten hesabınız var mı?'}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setIsResettingPassword(false);
                  setError('');
                  setSuccess('');
                }}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isResettingPassword ? 'Giriş Yap' : isLogin ? 'Yeni Hesap Oluştur' : 'Giriş Yap'}
              </button>

              {isLogin && !isResettingPassword && (
                <button
                  onClick={() => {
                    setIsResettingPassword(true);
                    setError('');
                    setSuccess('');
                    setPassword('');
                  }}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Şifremi Unuttum
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
