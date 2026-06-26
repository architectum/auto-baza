import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Mode = "light" | "dark" | "amoled";

interface ThemeColors {
  [key: string]: string;
}

interface ColorScheme {
  id: string;
  name: string;
  light: ThemeColors;
  dark: ThemeColors;
}

interface ThemeContextType {
  mode: Mode;
  toggleMode: () => void;
  setMode: (mode: Mode) => void;
  colorSchemeId: string;
  setColorScheme: (id: string) => void;
  availableSchemes: { id: string; name: string; preview: string }[];
  loading: boolean;
  systemTheme: "light" | "dark";
  setAccentColor: (id: string) => void;
}

const THEME_SCHEMES = [
  "blue-steel",
  "graphite-cyan",
  "emerald-noir",
  "arctic-indigo",
  "amber-flame",
  "rose-quartz",
  "violet-aurora",
  "slate-drift",
];

const ThemeProviderContext = createContext<ThemeContextType>({
  mode: "dark",
  toggleMode: () => null,
  setMode: () => null,
  colorSchemeId: "blue-steel",
  setColorScheme: () => null,
  availableSchemes: [],
  loading: true,
  systemTheme: "dark",
  setAccentColor: () => null,
});

function hexToHsl(hex: string) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function applyThemeColors(colors: ThemeColors, mode: Mode) {
  const root = document.documentElement;
  
  // Apply standard key-value theme properties as --t- kebab variables
  Object.entries(colors).forEach(([key, value]) => {
    const cssVar = `--t-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
    root.style.setProperty(cssVar, value);
  });

  // Parse accent color to create dynamic HSL color scales
  const primaryHsl = hexToHsl(colors.accentPrimary || "#3b82f6");
  
  // Set primary HSL scale (10 shades from 50 to 950)
  const primaryLightnesses = [97, 92, 84, 74, 62, 50, 42, 32, 22, 12, 6];
  primaryLightnesses.forEach((light, index) => {
    const grade = index === 0 ? 50 : index === 10 ? 950 : index * 100;
    root.style.setProperty(`--primary-${grade}`, `hsl(${primaryHsl.h}, ${primaryHsl.s}%, ${light}%)`);
  });

  // Set matching neutral scale (uses primary hue with low saturation)
  const neutralSat = 8;
  const neutralLightnesses = [99, 95, 88, 75, 60, 45, 30, 20, 12, 6, 2];
  neutralLightnesses.forEach((light, index) => {
    const grade = index === 0 ? 50 : index === 10 ? 950 : index * 100;
    root.style.setProperty(`--neutral-${grade}`, `hsl(${primaryHsl.h}, ${neutralSat}%, ${light}%)`);
  });

  // Standardize and unify status colors on root
  root.style.setProperty('--status-problem', colors.statusProblem || '#ef4444');
  root.style.setProperty('--status-problem-bg', colors.statusProblemBg || 'rgba(239, 68, 68, 0.10)');
  
  root.style.setProperty('--status-solution', colors.statusSolution || '#22c55e');
  root.style.setProperty('--status-solution-bg', colors.statusSolutionBg || 'rgba(34, 197, 94, 0.10)');
  
  root.style.setProperty('--status-mileage', colors.statusMileage || '#a855f7');
  root.style.setProperty('--status-mileage-bg', colors.statusMileageBg || 'rgba(168, 85, 247, 0.10)');
  
  root.style.setProperty('--status-note', colors.statusNote || '#3b82f6');
  root.style.setProperty('--status-note-bg', colors.statusNoteBg || 'rgba(59, 130, 246, 0.10)');

  // New status reminder colors
  root.style.setProperty('--t-status-reminder', colors.statusReminder || '#f59e0b');
  root.style.setProperty('--t-status-reminder-bg', colors.statusReminderBg || 'rgba(245, 158, 11, 0.10)');
  root.style.setProperty('--status-reminder', colors.statusReminder || '#f59e0b');
  root.style.setProperty('--status-reminder-bg', colors.statusReminderBg || 'rgba(245, 158, 11, 0.10)');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>(
    () => (localStorage.getItem("ui-mode") as Mode) || "dark"
  );
  const [colorSchemeId, setColorSchemeId] = useState<string>(
    () => localStorage.getItem("ui-color-scheme") || "blue-steel"
  );
  const [schemes, setSchemes] = useState<ColorScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const loadSchemes = async () => {
      const loaded: ColorScheme[] = [];
      for (const id of THEME_SCHEMES) {
        try {
          const res = await fetch(`/themes/${id}.json`);
          if (res.ok) {
            const data = await res.json();
            loaded.push(data);
          }
        } catch (e) {
          console.warn(`Failed to load theme ${id}`, e);
        }
      }
      setSchemes(loaded);
      setLoading(false);
    };
    loadSchemes();
  }, []);

  useEffect(() => {
    if (schemes.length === 0) return;
    
    localStorage.setItem("ui-mode", mode);
    localStorage.setItem("ui-color-scheme", colorSchemeId);
    
    document.documentElement.classList.remove("light", "dark", "amoled");
    document.documentElement.classList.add(mode);

    const scheme = schemes.find((s) => s.id === colorSchemeId) || schemes[0];
    if (scheme) {
      let colors = mode === "light" ? scheme.light : scheme.dark;
      
      // AMOLED specific dark-mode overrides
      if (mode === "amoled") {
        colors = {
          ...scheme.dark,
          surfaceBg: "#000000",
          surfaceCard: "#070708",
          surfaceCardHover: "#121214",
          surfaceElevated: "#0d0d0f",
          surfaceInput: "#09090b",
          borderDefault: "#161619",
          borderSubtle: "#0f0f12",
        };
      }
      
      applyThemeColors(colors, mode);
    }
  }, [mode, colorSchemeId, schemes]);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "amoled";
      return "light";
    });
  }, []);

  const setMode = useCallback((newMode: Mode) => {
    setModeState(newMode);
  }, []);

  const setColorScheme = useCallback((id: string) => {
    setColorSchemeId(id);
  }, []);

  const setAccentColor = useCallback((id: string) => {
    setColorSchemeId(id);
  }, []);

  const availableSchemes = schemes.map((s) => ({
    id: s.id,
    name: s.name,
    preview: s.dark.accentPrimary,
  }));

  return (
    <ThemeProviderContext.Provider
      value={{ mode, toggleMode, setMode, colorSchemeId, setColorScheme, availableSchemes, loading, systemTheme, setAccentColor }}
    >
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeProviderContext);
