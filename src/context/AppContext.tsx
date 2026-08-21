/**
 * AppContext — global navigation & app-level state
 *
 * Replaces the vanilla `showAppView()` function. Any component can call
 * `useAppContext().navigate('palabras-lobby')` without needing the function
 * passed as a prop.
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { AppView } from '@/types/appView';

interface AppContextValue {
  currentView: AppView;
  navigate: (view: AppView) => void;
  goHome: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return ctx;
}

interface AppProviderProps {
  value: AppContextValue;
  children: ReactNode;
}

export function AppProvider({ value, children }: AppProviderProps) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
