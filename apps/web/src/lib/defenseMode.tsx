import React from 'react';

const STORAGE_KEY = 'bb_defense_mode';

type DefenseModeContextValue = {
  defenseMode: boolean;
  setDefenseMode: (enabled: boolean) => void;
};

const DefenseModeContext = React.createContext<DefenseModeContextValue | null>(null);

function readInitialValue() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(STORAGE_KEY) !== 'false';
}

export function DefenseModeProvider({ children }: { children: React.ReactNode }) {
  const [defenseMode, setDefenseModeState] = React.useState(readInitialValue);

  const setDefenseMode = React.useCallback((enabled: boolean) => {
    setDefenseModeState(enabled);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      // Best-effort only; the app still works without localStorage.
    }
  }, []);

  return (
    <DefenseModeContext.Provider value={{ defenseMode, setDefenseMode }}>
      {children}
    </DefenseModeContext.Provider>
  );
}

export function useDefenseMode() {
  const value = React.useContext(DefenseModeContext);
  if (!value) throw new Error('useDefenseMode must be used inside DefenseModeProvider');
  return value;
}

export function isDefenseModeEnabled() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(STORAGE_KEY) !== 'false';
}
