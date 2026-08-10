import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Palette approved in planning — navy + gold stay the brand pair in both
// modes, but which one is "surface" vs "text" flips. See PLANNING.md.
const dark = {
  mode: 'dark',
  background: '#0B1830',
  surface: '#16264A',
  border: '#1C3155',
  textPrimary: '#F2F5FA',
  textSecondary: '#9FB2CC',
  textMuted: '#7E93B3',
  accentText: '#F0B429',
  accentFill: '#F0B429',
  onAccentFill: '#0B1830',
  avatarPlaceholders: ['#22406B', '#3A5578', '#2C4568'],
};

const light = {
  mode: 'light',
  background: '#F5F8FC',
  surface: '#EAF0F8',
  border: '#E1E8F2',
  textPrimary: '#10213D',
  textSecondary: '#55698A',
  textMuted: '#8B9AB5',
  accentText: '#B8790A',
  accentFill: '#F0B429',
  onAccentFill: '#10213D',
  avatarPlaceholders: ['#C7D2E3', '#B9C6DC', '#D7E1F0'],
};

const THEME_STORAGE_KEY = 'flightly_theme_mode';

const ThemeContext = createContext({
  colors: dark,
  mode: 'dark',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') setMode(saved);
    });
  }, []);

  const toggleTheme = () => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
      return next;
    });
  };

  const value = useMemo(
    () => ({ colors: mode === 'dark' ? dark : light, mode, toggleTheme }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
