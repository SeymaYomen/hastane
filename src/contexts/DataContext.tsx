import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, testConnection } from '../lib/supabase';
import type { Database } from '../types/supabase';

type Doctor = Database['public']['Tables']['doctors']['Row'];
type Appointment = Database['public']['Tables']['appointments']['Row'];
type Department = Database['public']['Tables']['departments']['Row'];

interface DataContextType {
  doctors: Doctor[];
  appointments: Appointment[];
  departments: Department[];
  refreshData: () => Promise<void>;
  loading: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'connected' | 'failed';
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting');

  const fetchDoctors = async () => {
    try {
      console.log('Fetching doctors...');
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('department');
      
      if (error) {
        console.error('Doktorlar yüklenirken hata:', error);
        throw new Error(`Veritabanı hatası: ${error.message}`);
      }
      
      console.log('Doctors fetched successfully:', data?.length || 0, 'records');
      setDoctors(data || []);
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Fetch doctors error:', err);
      setConnectionStatus('failed');
      
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        throw new Error('Supabase bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin ve Supabase projenizin aktif olduğundan emin olun.');
      }
      throw err;
    }
  };

  const fetchAppointments = async () => {
    try {
      console.log('Fetching appointments...');
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        console.log('No authenticated user, skipping appointments fetch');
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
        throw new Error(`Veritabanı hatası: ${error.message}`);
      }
      
      console.log('Appointments fetched successfully:', data?.length || 0, 'records');
      setAppointments(data || []);
    } catch (err) {
      console.error('Fetch appointments error:', err);
      
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        throw new Error('Supabase bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin.');
      }
      throw err;
    }
  };

  const fetchDepartments = async () => {
    try {
      console.log('Fetching departments...');
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('Bölümler yüklenirken hata:', error);
        throw new Error(`Veritabanı hatası: ${error.message}`);
      }

      console.log('Departments fetched successfully:', data?.length || 0, 'records');
      setDepartments(data || []);
    } catch (err) {
      console.error('Fetch departments error:', err);

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
      setConnectionStatus('connecting');
      
      // First test the connection
      console.log('Testing connection before data fetch...');
      const connectionTest = await testConnection();
      
      if (!connectionTest.success) {
        throw new Error(`Bağlantı testi başarısız: ${connectionTest.error}`);
      }
      
      console.log('Connection test passed, fetching data...');
      await Promise.all([fetchDoctors(), fetchAppointments(), fetchDepartments()]);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu';
      setError(errorMessage);
      setConnectionStatus('failed');
      console.error('Data refresh error:', err);
      
      // Provide more specific error messages
      if (errorMessage.includes('Failed to fetch')) {
        setError('Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin ve birkaç saniye sonra tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial data load with delay to ensure environment is ready
    const initializeData = async () => {
      console.log('Initializing data context...');
      
      // Small delay to ensure environment variables are loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await refreshData();
    };

    initializeData();

    // Set up real-time subscriptions only after successful connection
    let doctorsSubscription: any;
    let appointmentsSubscription: any;
    let departmentsSubscription: any;

    const setupSubscriptions = () => {
      if (connectionStatus === 'connected') {
        console.log('Setting up real-time subscriptions...');
        
        doctorsSubscription = supabase
          .channel('doctors_changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'doctors' },
            (payload) => {
              console.log('Doctors table changed:', payload);
              refreshData();
            }
          )
          .subscribe();

        appointmentsSubscription = supabase
          .channel('appointments_changes')
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'appointments' },
            (payload) => {
              console.log('Appointments table changed:', payload);
              refreshData();
            }
          )
          .subscribe();

        departmentsSubscription = supabase
          .channel('departments_changes')
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'departments' },
            (payload) => {
              console.log('Departments table changed:', payload);
              refreshData();
            }
          )
          .subscribe();
      }
    };

    // Setup subscriptions when connection is established
    if (connectionStatus === 'connected') {
      setupSubscriptions();
    }

    return () => {
      if (doctorsSubscription) {
        console.log('Cleaning up doctors subscription');
        doctorsSubscription.unsubscribe();
      }
      if (appointmentsSubscription) {
        console.log('Cleaning up appointments subscription');
        appointmentsSubscription.unsubscribe();
      }
      if (departmentsSubscription) {
        console.log('Cleaning up departments subscription');
        departmentsSubscription.unsubscribe();
      }
    };
  }, [connectionStatus]);

  return (
    <DataContext.Provider value={{ 
      doctors, 
      appointments, 
      departments,
      refreshData, 
      loading, 
      error,
      connectionStatus
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