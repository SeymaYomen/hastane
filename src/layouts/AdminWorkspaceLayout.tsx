import { Building2, LayoutDashboard, ScrollText, ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import RoleWorkspaceShell from './RoleWorkspaceShell';

const navigationItems = [
  { to: '/admin', label: 'Genel Bakış', icon: LayoutDashboard, end: true },
  { to: '/admin/departments', label: 'Bölümler', icon: Building2 },
  { to: '/admin/users', label: 'Kullanıcılar ve Roller', icon: UsersRound },
  { to: '/admin/audit', label: 'İşlem Geçmişi', icon: ScrollText },
  { to: '/profile', label: 'Profil', icon: UserRound },
];

const AdminWorkspaceLayout = () => (
  <RoleWorkspaceShell
    basePath="/admin"
    workspaceLabel="Yönetim Çalışma Alanı"
    headerLabel="Yönetim çalışma alanı"
    navigationLabel="Yönetim çalışma alanı"
    icon={ShieldCheck}
    navigationItems={navigationItems}
  />
);

export default AdminWorkspaceLayout;
