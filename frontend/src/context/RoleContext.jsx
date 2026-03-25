import { createContext, useContext, useMemo, useState } from 'react';

const RoleContext = createContext({
  role: 'farmer',
  changeRole: () => {},
});

export function RoleProvider({ children }) {
  const [role, setRole] = useState(localStorage.getItem('krishimitra_role') || 'farmer');

  const changeRole = (newRole) => {
    setRole(newRole);
    localStorage.setItem('krishimitra_role', newRole);
  };

  const value = useMemo(() => ({ role, changeRole }), [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export const useRole = () => useContext(RoleContext);
