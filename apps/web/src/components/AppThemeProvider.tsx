import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeProvider as NextThemeProvider } from 'next-themes';

export type AppThemePaletteId = 'rose-pink' | 'gold' | 'sage' | 'royal-blue';

export type AppThemePalette = {
    id: AppThemePaletteId;
    name: string;
    color: string;
    colorDark: string;
    colorLight: string;
    background: string;
    muted: string;
    inputBackground: string;
    primaryForeground: string;
    secondary: string;
    accent: string;
    highlightLight: string;
    highlightForeground: string;
    chart2: string;
    chart3: string;
    chart3Light: string;
    chart3Foreground: string;
};

const STORAGE_KEY = 'bellah-theme-palette';

export const APP_THEME_PALETTES: AppThemePalette[] = [
    {
        id: 'rose-pink',
        name: 'Rose Pink',
        color: '#EC4899',
        colorDark: '#DB2777',
        colorLight: '#FCE7F3',
        background: '#FFF7FB',
        muted: '#FDF2F8',
        inputBackground: '#FFFDFE',
        primaryForeground: '#FFFFFF',
        secondary: '#FCE7F3',
        accent: '#FDF2F8',
        highlightLight: '#FEF3C7',
        highlightForeground: '#B45309',
        chart2: '#D4A373',
        chart3: '#4A90D9',
        chart3Light: '#DBEAFE',
        chart3Foreground: '#1D4ED8',
    },
    {
        id: 'gold',
        name: 'Gold',
        color: '#D4A373',
        colorDark: '#B7791F',
        colorLight: '#FEF3C7',
        background: '#FFFCF5',
        muted: '#FFF7ED',
        inputBackground: '#FFFEFB',
        primaryForeground: '#111827',
        secondary: '#FFF7ED',
        accent: '#FFFBEB',
        highlightLight: '#FCE7F3',
        highlightForeground: '#BE185D',
        chart2: '#EC4899',
        chart3: '#4A90D9',
        chart3Light: '#DBEAFE',
        chart3Foreground: '#1D4ED8',
    },
    {
        id: 'sage',
        name: 'Sage',
        color: '#4CAF82',
        colorDark: '#2F855A',
        colorLight: '#DCFCE7',
        background: '#F6FBF7',
        muted: '#ECFDF5',
        inputBackground: '#FBFEFC',
        primaryForeground: '#FFFFFF',
        secondary: '#ECFDF5',
        accent: '#F0FDF4',
        highlightLight: '#FEF3C7',
        highlightForeground: '#B45309',
        chart2: '#D4A373',
        chart3: '#4A90D9',
        chart3Light: '#DBEAFE',
        chart3Foreground: '#1D4ED8',
    },
    {
        id: 'royal-blue',
        name: 'Royal Blue',
        color: '#4A90D9',
        colorDark: '#2563EB',
        colorLight: '#DBEAFE',
        background: '#F7FAFF',
        muted: '#EFF6FF',
        inputBackground: '#FCFDFF',
        primaryForeground: '#FFFFFF',
        secondary: '#EFF6FF',
        accent: '#F8FAFC',
        highlightLight: '#FEF3C7',
        highlightForeground: '#B45309',
        chart2: '#D4A373',
        chart3: '#EC4899',
        chart3Light: '#FCE7F3',
        chart3Foreground: '#BE185D',
    },
];

type AppThemeContextValue = {
    palette: AppThemePalette;
    paletteId: AppThemePaletteId;
    setPaletteId: (paletteId: AppThemePaletteId) => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function getPaletteById(paletteId: AppThemePaletteId) {
    return APP_THEME_PALETTES.find((palette) => palette.id === paletteId) ?? APP_THEME_PALETTES[0];
}

function isPaletteId(value: string): value is AppThemePaletteId {
    return APP_THEME_PALETTES.some((palette) => palette.id === value);
}

function applyPalette(palette: AppThemePalette) {
    const root = document.documentElement;

    root.dataset.themePalette = palette.id;
    root.style.setProperty('--bb-pink', palette.color);
    root.style.setProperty('--bb-pink-dark', palette.colorDark);
    root.style.setProperty('--bb-pink-light', palette.colorLight);
    root.style.setProperty('--bb-primary-soft', palette.colorLight);
    root.style.setProperty('--bb-primary-strong', palette.colorDark);
    root.style.setProperty('--bb-gold', palette.chart2);
    root.style.setProperty('--bb-gold-light', palette.secondary);
    root.style.setProperty('--bb-highlight', palette.chart2);
    root.style.setProperty('--bb-highlight-light', palette.highlightLight);
    root.style.setProperty('--bb-highlight-foreground', palette.highlightForeground);
    root.style.setProperty('--bb-chart-3-light', palette.chart3Light);
    root.style.setProperty('--bb-chart-3-foreground', palette.chart3Foreground);
    root.style.setProperty('--bb-surface-soft', palette.accent);
    root.style.setProperty('--bb-surface-muted', palette.muted);
    root.style.setProperty('--background', palette.background);
    root.style.setProperty('--primary', palette.color);
    root.style.setProperty('--primary-foreground', palette.primaryForeground);
    root.style.setProperty('--secondary', palette.secondary);
    root.style.setProperty('--accent', palette.accent);
    root.style.setProperty('--muted', palette.muted);
    root.style.setProperty('--input-background', palette.inputBackground);
    root.style.setProperty('--ring', palette.color);
    root.style.setProperty('--sidebar-primary', palette.color);
    root.style.setProperty('--sidebar-primary-foreground', palette.primaryForeground);
    root.style.setProperty('--sidebar-accent', palette.colorLight);
    root.style.setProperty('--sidebar-accent-foreground', palette.color);
    root.style.setProperty('--sidebar-ring', palette.color);
    root.style.setProperty('--chart-1', palette.color);
    root.style.setProperty('--chart-2', palette.chart2);
    root.style.setProperty('--chart-3', palette.chart3);
}

function getInitialPaletteId(): AppThemePaletteId {
    if (typeof window === 'undefined') {
        return 'rose-pink';
    }

    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    return storedValue && isPaletteId(storedValue) ? storedValue : 'rose-pink';
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
    const [paletteId, setPaletteId] = useState<AppThemePaletteId>(getInitialPaletteId);

    useEffect(() => {
        const palette = getPaletteById(paletteId);
        applyPalette(palette);
        window.localStorage.setItem(STORAGE_KEY, paletteId);
    }, [paletteId]);

    const value = useMemo<AppThemeContextValue>(() => {
        const palette = getPaletteById(paletteId);
        return {
            palette,
            paletteId,
            setPaletteId,
        };
    }, [paletteId]);

    return (
        <NextThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
        </NextThemeProvider>
    );
}

export function useAppTheme() {
    const context = useContext(AppThemeContext);
    if (!context) {
        throw new Error('useAppTheme must be used within AppThemeProvider');
    }

    return context;
}
