import { useState, useEffect } from 'react';
import { User, Mail, Phone, CreditCard, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  tckn: string;
  created_at: string;
}

const ProfilePage = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
const [isSaving, setIsSaving] = useState(false);
const [editName, setEditName] = useState('');
const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
  const fetchProfile = async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Kullanıcı bulunamadı');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);
      setEditName(profileData.full_name || '');
      setEditPhone(profileData.phone || '');
    } catch (err) {
      setError('Profil bilgileri yüklenirken bir hata oluştu');
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  fetchProfile();
}, []);
  const handleSaveProfile = async () => {
  if (!profile) return;

  if (!editName.trim()) {
    alert('Ad Soyad boş bırakılamaz.');
    return;
  }

  if (editPhone && !/^[0-9]{11}$/.test(editPhone)) {
    alert('Telefon numarası 11 haneli olmalıdır.');
    return;
  }

  setIsSaving(true);

  try {
    const { data, error: updateError } = await supabase
      .from('users')
      .update({
        full_name: editName.trim(),
        phone: editPhone || null
      })
      .eq('id', profile.id)
      .select()
      .single();

    if (updateError) throw updateError;

    setProfile(data);
    setEditName(data.full_name || '');
    setEditPhone(data.phone || '');
    setIsEditing(false);
  } catch (error) {
    console.error('Profil güncellenirken hata oluştu:', error);
    alert('Profil bilgileri güncellenirken bir hata oluştu.');
  } finally {
    setIsSaving(false);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen pt-16 pb-12 flex flex-col bg-gray-50">
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen pt-16 pb-12 flex flex-col bg-gray-50">
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-xl font-medium text-gray-900 mb-4">
              {error || 'Profil bilgileri yüklenemedi'}
            </h3>
            <Link
              to="/"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-12 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-8">
            <div className="flex items-center">
              <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center">
                <User className="h-10 w-10 text-white" />
              </div>
              <div className="ml-6">
                <h1 className="text-2xl font-bold text-white">
                  {profile.full_name}
                </h1>
                <p className="text-blue-200 mt-1">Hasta Profili</p>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="px-6 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Kişisel Bilgiler
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="flex items-center space-x-3">
  <User className="h-5 w-5 text-gray-400" />

  <div className="flex-1">
    <p className="text-sm text-gray-500">Ad Soyad</p>

    {isEditing ? (
      <input
        type="text"
        value={editName}
        onChange={(e) => setEditName(e.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
      />
    ) : (
      <p className="text-gray-900">{profile.full_name}</p>
    )}
  </div>
</div>
                      <p className="text-sm text-gray-500">E-posta</p>
                      <p className="text-gray-900">{profile.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Telefon</p>
                      {isEditing ? (
  <input
    type="tel"
    value={editPhone}
    onChange={(e) => {
      const value = e.target.value.replace(/\D/g, '');

      if (value.length <= 11) {
        setEditPhone(value);
      }
    }}
    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
    placeholder="05XXXXXXXXX"
  />
) : (
  <p className="text-gray-900">
    {profile.phone || 'Belirtilmemiş'}
  </p>
)}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">T.C. Kimlik No</p>
                      <p className="text-gray-900">{profile.tckn}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Üyelik Tarihi</p>
                      <p className="text-gray-900">
                        {new Date(profile.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Hızlı İşlemler
                </h2>
                <div className="flex gap-3">
  {isEditing ? (
    <>
      <button
        type="button"
        onClick={handleSaveProfile}
        disabled={isSaving}
        className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg"
      >
        {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
      </button>

      <button
        type="button"
        onClick={() => {
          setEditName(profile.full_name);
          setEditPhone(profile.phone || '');
          setIsEditing(false);
        }}
        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg"
      >
        Vazgeç
      </button>
    </>
  ) : (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg"
    >
      Bilgileri Düzenle
    </button>
  )}
</div>
                <div className="space-y-4">
                  <Link
                    to="/appointment"
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors duration-300"
                  >
                    Yeni Randevu Al
                  </Link>
                  
                  <Link
                    to="/my-appointments"
                    className="block w-full bg-white hover:bg-gray-50 text-blue-600 font-medium py-3 px-4 rounded-lg text-center transition-colors duration-300 border border-blue-600"
                  >
                    Randevu Geçmişi
                  </Link>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">
                    Önemli Bilgi
                  </h3>
                  <p className="text-sm text-blue-600">
                    Randevularınızı en az 24 saat öncesinden iptal edebilirsiniz. 
                    İptal edilmeyen randevular için ücret tahsil edilecektir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;