import { ClipboardList } from 'lucide-react';
import RoleWorkspaceShell from './RoleWorkspaceShell';

const SecretaryWorkspaceLayout = () => (
  <RoleWorkspaceShell
    basePath="/secretary"
    workspaceLabel="Resepsiyon Çalışma Alanı"
    headerLabel="Resepsiyon çalışma alanı"
    navigationLabel="Resepsiyon çalışma alanı"
    icon={ClipboardList}
  />
);

export default SecretaryWorkspaceLayout;
