import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type Doctor = Database['public']['Tables']['doctors']['Row'];
type Appointment = Database['public']['Tables']['appointments']['Row'];

interface DataContextType {
  doctors: Doctor[];
  appointments: Appointment[];
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const fetchDoctors = async () => {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .order('department');
    
    if (error) {
      console.error('Doktorlar yüklenirken hata:', error);
      return;
    }
    
    setDoctors(data);
  };

  const fetchAppointments = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data, error } = await supabase
      .from('appointments')
      .select('*, doctors(*)')
      .eq('user_id', userData.user.id)
      .order('date');
    
    if (error) {
      console.error('Randevular yüklenirken hata:', error);
      return;
    }
    
    setAppointments(data);
  };

  const refreshData = async () => {
    await Promise.all([fetchDoctors(), fetchAppointments()]);
  };

  useEffect(() => {
    refreshData();

    // Gerçek zamanlı güncellemeler için subscription
    const doctorsSubscription = supabase
      .channel('doctors_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'doctors' },
        refreshData
      )
      .subscribe();

    const appointmentsSubscription = supabase
      .channel('appointments_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        refreshData
      )
      .subscribe();

    return () => {
      doctorsSubscription.unsubscribe();
      appointmentsSubscription.unsubscribe();
    };
  }, []);

  return (
    <DataContext.Provider value={{ doctors, appointments, refreshData }}>
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