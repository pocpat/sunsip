import { createContext, useContext, ReactNode } from 'react';
import { useAppStore } from '../store/appStore';

type AppContextType = ReturnType<typeof useAppStore>;

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  return <AppContext.Provider value={useAppStore()}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}