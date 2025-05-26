
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  role: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock authentication - in real app this would call your backend
    if (email === 'admin@maubank.my' && password === 'admin123') {
      setUser({
        id: '1',
        name: 'Ahmad Rahman',
        role: 'Issue Manager',
        email: 'admin@maubank.my'
      });
      return true;
    }
    if (email === 'supervisor@maubank.my' && password === 'super123') {
      setUser({
        id: '2',
        name: 'Siti Nurhaliza',
        role: 'Supervisor',
        email: 'supervisor@maubank.my'
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
