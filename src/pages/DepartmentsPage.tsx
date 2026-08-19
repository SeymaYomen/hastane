
import { Link } from 'react-router-dom';
import {
  Heart,
  Brain,
  Bone,
  Eye,
  Ear,
  Activity,
  User,
  Droplet,
  Stethoscope,
  Baby,
  Sparkles,
  CircleUserRound,
} from 'lucide-react';
import { useData } from '../contexts/DataContext';

const DepartmentsPage = () => {
  const { departments, doctors, loading, error } = useData();

  const getDepartmentIcon = (departmentName: string) => {
    const iconClass = 'h-10 w-10 text-cyan-500';

    switch (departmentName) {
      case 'Kardiyoloji':
        return <Heart className={iconClass} />;
      case 'Nöroloji':
        return <Brain className={iconClass} />;
      case 'Ortopedi':
        return <Bone className={iconClass} />;
      case 'Göz Hastalıkları':
        return <Eye className={iconClass} />;
      case 'Kulak Burun Boğaz':
        return <Ear className={iconClass} />;
      case 'Üroloji':
        return <Droplet className={iconClass} />;
      case 'Dahiliye':
        return <Stethoscope className={iconClass} />;
      case 'Cildiye':
        return <User className={iconClass} />;
      case 'Kadın Hastalıkları ve Doğum':
        return <Baby className={iconClass} />;
      case 'Fizik Tedavi ve Rehabilitasyon':
        return <Activity className={iconClass} />;
      case 'Psikiyatri':
        return <CircleUserRound className={iconClass} />;
      case 'Genel Cerrahi':
        return <Sparkles className={iconClass} />;
      default:
        return <Stethoscope className={iconClass} />;
    }
  };

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center">
        <p>Bölümler yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center">
        <p>Bölümler yüklenirken bir hata oluştu: {error}</p>
      </div>
    );
  }

  return (
    <div className="pt-16 pb-16 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center py-12">
          <h1 className="text-3xl font-bold mb-4">Bölümlerimiz</h1>
          <p className="text-lg opacity-70">
            İhtiyacınıza uygun bölümü inceleyebilir ve ilgili doktorlardan
            randevu oluşturabilirsiniz.
          </p>
        </div>

        {departments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {departments.map((department) => {
              const departmentDoctors = doctors.filter(
                (doctor) => doctor.department === department.name
              );

              return (
                <div
                  key={department.id}
                  className="rounded-2xl border border-white/10 overflow-hidden transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="p-3 rounded-full mr-4 bg-cyan-500/10">
                        {getDepartmentIcon(department.name)}
                      </div>

                      <div>
                        <p className="text-xs tracking-widest opacity-50 mb-1">
                          BÖLÜM
                        </p>
                        <h3 className="text-xl font-bold">
                          {department.name}
                        </h3>
                      </div>
                    </div>

                    {department.description && (
                      <p className="opacity-70 mb-6">
                        {department.description}
                      </p>
                    )}

                    {department.services?.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold mb-3">Hizmetler</h4>

                        <div className="flex flex-wrap gap-2">
                          {department.services.map((service) => (
                            <span
                              key={service}
                              className="px-3 py-1 rounded-full border border-cyan-500/20 text-sm"
                            >
                              {service}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mb-6">
                      <h4 className="font-semibold mb-3">
                        Doktorlarımız
                      </h4>

                      {departmentDoctors.length > 0 ? (
                        <div className="space-y-2">
                          {departmentDoctors.map((doctor) => (
                            <div
                              key={doctor.id}
                              className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                            >
                              <span>
                                {doctor.title} {doctor.full_name}
                              </span>

                              <span className="text-xs opacity-50">
                                {doctor.experience_years} yıl
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm opacity-50">
                          Bu bölüme henüz doktor eklenmemiş.
                        </p>
                      )}
                    </div>

                    <Link
                      to="/appointment"
                      onClick={() =>
                        localStorage.setItem(
                          'selectedDepartment',
                          department.name
                        )
                      }
                      className="block w-full text-center bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-3 px-4 rounded-xl transition-colors"
                    >
                      Randevu Al
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <h3 className="text-xl font-semibold mb-2">
              Aktif bölüm bulunamadı
            </h3>
            <p className="opacity-60">
              Bölüm bilgileri henüz sisteme eklenmemiş.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentsPage;