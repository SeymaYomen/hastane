import { ShieldCheck } from 'lucide-react';
import RoleWorkspaceShell from './RoleWorkspaceShell';

const AdminWorkspaceLayout = () => (
  <RoleWorkspaceShell
    basePath="/admin"
    workspaceLabel="Yönetim Çalışma Alanı"
    headerLabel="Yönetim çalışma alanı"
    navigationLabel="Yönetim çalışma alanı"
    icon={ShieldCheck}
  />
);

export default AdminWorkspaceLayout;
