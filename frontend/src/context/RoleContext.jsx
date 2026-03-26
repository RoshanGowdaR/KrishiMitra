import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const ADMIN_EMAIL = 'gowdaroshan49@gmail.com';

const RoleContext = createContext({
  role: 'farmer',
  changeRole: () => {},
});

export function RoleProvider({ children }) {
  const { user } = useAuth();
  const [role, setRole] = useState(localStorage.getItem('krishimitra_role') || 'farmer');

  useEffect(() => {
    const email = String(user?.email || '').toLowerCase();
    if (email === ADMIN_EMAIL && role !== 'admin') {
      setRole('admin');
      localStorage.setItem('krishimitra_role', 'admin');
    }
  }, [role, user?.email]);

  const changeRole = (newRole) => {
    const email = String(user?.email || '').toLowerCase();
    if (newRole === 'admin' && email !== ADMIN_EMAIL) {
      return;
    }
    setRole(newRole);
    localStorage.setItem('krishimitra_role', newRole);
  };

  const value = useMemo(() => ({ role, changeRole }), [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export const useRole = () => useContext(RoleContext);
