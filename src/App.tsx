
import { Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthRoleProvider } from './contexts/AuthRoleContext';
import { DataProvider } from './contexts/DataContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import AppointmentPage from './pages/AppointmentPage';
import DepartmentsPage from './pages/DepartmentsPage';
import DoctorsPage from './pages/DoctorsPage';
import LoginPage from './pages/LoginPage';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import PatientHealthRecordPage from './pages/PatientHealthRecordPage';
import ProfilePage from './pages/ProfilePage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import PrivateRoute from './components/PrivateRoute';
import RoleRoute from './components/RoleRoute';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorAppointmentDetailPage from './pages/DoctorAppointmentDetailPage';
import DoctorWorkspaceLayout from './layouts/DoctorWorkspaceLayout';
import DoctorCalendarPage from './pages/DoctorCalendarPage';
import DoctorAppointmentsPage from './pages/DoctorAppointmentsPage';
import DoctorPatientsPage from './pages/DoctorPatientsPage';
import DoctorPatientTimelinePage from './pages/DoctorPatientTimelinePage';
import DoctorVisitsPage from './pages/DoctorVisitsPage';
import AdminWorkspaceLayout from './layouts/AdminWorkspaceLayout';
import SecretaryWorkspaceLayout from './layouts/SecretaryWorkspaceLayout';
import AdminDashboard from './pages/AdminDashboard';
import SecretaryDashboard from './pages/SecretaryDashboard';
import NotificationsPage from './pages/NotificationsPage';
import ChatbotButton from './components/Chatbot/ChatbotButton';
import ScrollToTop from './components/ScrollToTop';
import './App.css';

function AppContent() {
  const location = useLocation();
  const isDedicatedWorkspace = ['/doctor', '/admin', '/secretary'].some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
  );

  return (
        <div className="theme-bg theme-text flex min-h-screen flex-col transition-colors duration-300">
          {!isDedicatedWorkspace && <Navbar />}
          <main className="flex-grow">
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route 
                path="/appointment" 
                element={
                  <PrivateRoute>
                    <AppointmentPage />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/my-appointments" 
                element={
                  <PrivateRoute>
                    <MyAppointmentsPage />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <PrivateRoute>
                    <ProfilePage />
                  </PrivateRoute>
                } 
              />
              <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
              <Route
                path="/health-record"
                element={
                  <RoleRoute allowedRoles={['patient']}>
                    <PatientHealthRecordPage />
                  </RoleRoute>
                }
              />
              <Route path="/doctor" element={<RoleRoute allowedRoles={['doctor']}><DoctorWorkspaceLayout /></RoleRoute>}>
                <Route index element={<DoctorDashboard />} />
                <Route path="calendar" element={<DoctorCalendarPage />} />
                <Route path="appointments" element={<DoctorAppointmentsPage />} />
                <Route path="patients" element={<DoctorPatientsPage />} />
                <Route path="patients/:patientId" element={<DoctorPatientTimelinePage />} />
                <Route path="visits" element={<DoctorVisitsPage />} />
                <Route path="appointment/:appointmentId" element={<DoctorAppointmentDetailPage />} />
              </Route>
              <Route path="/admin" element={<RoleRoute allowedRoles={['admin']}><AdminWorkspaceLayout /></RoleRoute>}>
                <Route index element={<AdminDashboard />} />
              </Route>
              <Route path="/secretary" element={<RoleRoute allowedRoles={['secretary']}><SecretaryWorkspaceLayout /></RoleRoute>}>
                <Route index element={<SecretaryDashboard />} />
              </Route>
              <Route path="/departments" element={<DepartmentsPage />} />
              <Route path="/doctors" element={<DoctorsPage />} />
            </Routes>
          </main>
          {!isDedicatedWorkspace && <ChatbotButton />}
          {!isDedicatedWorkspace && <Footer />}
        </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthRoleProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </AuthRoleProvider>
    </ThemeProvider>
  );
}

export default App;
