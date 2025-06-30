import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type Doctor = Database['public']['Tables']['doctors']['Row'];
type Appointment = Database['public']['Tables']['appointments']['Row'];

interface DataContextType {
  doctors: Doctor[];
  appointments: Appointment[];
  refreshData: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('department');
      
      if (error) {
        console.error('Doktorlar yüklenirken hata:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      setDoctors(data || []);
    } catch (err) {
      console.error('Fetch doctors error:', err);
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        throw new Error('Supabase bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin ve .env dosyasındaki Supabase ayarlarının doğru olduğundan emin olun.');
      }
      throw err;
    }
  };

  const fetchAppointments = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setAppointments([]);
        return;
      }

      const { data, error } = await supabase
        .from('appointments')
        .select('*, doctors(*)')
        .eq('user_id', userData.user.id)
        .order('date');
      
      if (error) {
        console.error('Randevular yüklenirken hata:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      setAppointments(data || []);
    } catch (err) {
      console.error('Fetch appointments error:', err);
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        throw new Error('Supabase bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin.');
      }
      throw err;
    }
  };

  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([fetchDoctors(), fetchAppointments()]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu';
      setError(errorMessage);
      console.error('Data refresh error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();

    // Gerçek zamanlı güncellemeler için subscription
    const doctorsSubscription = supabase
      .channel('doctors_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'doctors' },
        () => {
          console.log('Doctors table changed, refreshing data...');
          refreshData();
        }
      )
      .subscribe();

    const appointmentsSubscription = supabase
      .channel('appointments_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          console.log('Appointments table changed, refreshing data...');
          refreshData();
        }
      )
      .subscribe();

    return () => {
      doctorsSubscription.unsubscribe();
      appointmentsSubscription.unsubscribe();
    };
  }, []);

  return (
    <DataContext.Provider value={{ 
      doctors, 
      appointments, 
      refreshData, 
      loading, 
      error 
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};