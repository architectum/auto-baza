import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Mode = "dark" | "light";

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
  colorSchemeId: string;
  setColorScheme: (id: string) => void;
  availableSchemes: { id: string; name: string; preview: string }[];
  loading: boolean;
}

const THEME_SCHEMES = [
  "blue-steel",
  "emerald-noir",
  "amber-flame",
  "rose-quartz",
  "violet-aurora",
];

const ThemeProviderContext = createContext<ThemeContextType>({
  mode: "dark",
  toggleMode: () => null,
  colorSchemeId: "blue-steel",
  setColorScheme: () => null,
  availableSchemes: [],
  loading: true,
});

function applyThemeColors(colors: ThemeColors) {
  const root = document.documentElement;
  Object.entries(colors).forEach(([key, value]) => {
    // Convert camelCase to kebab-case CSS variable
    const cssVar = `--t-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
    root.style.setProperty(cssVar, value);
  });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>(
    () => (localStorage.getItem("ui-mode") as Mode) || "dark"
  );
  const [colorSchemeId, setColorSchemeId] = useState<string>(
    () => localStorage.getItem("ui-color-scheme") || "blue-steel"
  );
  const [schemes, setSchemes] = useState<ColorScheme[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all theme files
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

  // Apply theme whenever mode or scheme changes
  useEffect(() => {
    if (schemes.length === 0) return;
    
    localStorage.setItem("ui-mode", mode);
    localStorage.setItem("ui-color-scheme", colorSchemeId);
    
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(mode);

    const scheme = schemes.find((s) => s.id === colorSchemeId) || schemes[0];
    if (scheme) {
      const colors = mode === "dark" ? scheme.dark : scheme.light;
      applyThemeColors(colors);
    }
  }, [mode, colorSchemeId, schemes]);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const setColorScheme = useCallback((id: string) => {
    setColorSchemeId(id);
  }, []);

  const availableSchemes = schemes.map((s) => ({
    id: s.id,
    name: s.name,
    preview: s.dark.accentPrimary, // use dark accent as the preview swatch
  }));

  return (
    <ThemeProviderContext.Provider
      value={{ mode, toggleMode, colorSchemeId, setColorScheme, availableSchemes, loading }}
    >
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeProviderContext);
