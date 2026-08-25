import { useContext } from 'react';
import { AuthRoleContext } from '../contexts/authRoleContextValue';

export const useAuthRole = () => {
  const context = useContext(AuthRoleContext);
  if (!context) {
    throw new Error('useAuthRole must be used within an AuthRoleProvider');
  }
  return context;
};
