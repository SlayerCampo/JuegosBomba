import { createContext, useContext, type ReactNode } from 'react';
import { useDictionary, type UseDictionaryReturn } from '@/hooks/useDictionary';

const DictionaryContext = createContext<UseDictionaryReturn | null>(null);

export function DictionaryProvider({ children }: { children: ReactNode }) {
  const dictionary = useDictionary();
  return (
    <DictionaryContext.Provider value={dictionary}>
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionaryContext(): UseDictionaryReturn {
  const value = useContext(DictionaryContext);
  if (!value) throw new Error('useDictionaryContext debe usarse dentro de DictionaryProvider');
  return value;
}
