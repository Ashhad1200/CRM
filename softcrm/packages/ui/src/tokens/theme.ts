'use client'

import {
  createElement,
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react'

/** User-selectable theme option. `'system'` defers to the OS preference. */
export type Theme = 'light' | 'dark' | 'system'

/** The concrete theme after resolving `'system'` to an actual value. */
export type ResolvedTheme = 'light' | 'dark'

/** Shape of the value provided by {@link ThemeContext}. */
export interface ThemeContextValue {
  /** Current user-selected theme (may be `'system'`). */
  theme: Theme
  /** The resolved theme after evaluating system preference. */
  resolvedTheme: ResolvedTheme
  /** Update the active theme and persist it to localStorage. */
  setTheme: (theme: Theme) => void
  /** Glass-effect intensity from 0 (off) to 100 (max). */
  glassIntensity: number
  /** Update glass-effect intensity and persist it to localStorage. */
  setGlassIntensity: (intensity: number) => void
}

/**
 * React context that distributes theme state throughout the component tree.
 * Access it via the {@link useTheme} hook.
 */
export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
)
ThemeContext.displayName = 'ThemeContext'

/** Props accepted by {@link ThemeProvider}. */
export interface ThemeProviderProps {
  children: React.ReactNode
  /** Theme to use when no persisted preference exists. @default 'system' */
  defaultTheme?: Theme
  /** localStorage key for the theme preference. @default 'softcrm-theme' */
  storageKey?: string
}

const GLASS_STORAGE_KEY = 'softcrm-glass-intensity'
const DEFAULT_GLASS_INTENSITY = 75

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme
}

function prefersReducedTransparency(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-transparency: reduce)').matches
}

/** Apply the `dark` / `light` class to `<html>` for Tailwind CSS dark mode. */
function applyThemeClass(resolved: ResolvedTheme): void {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
}

/** Map a 0-100 intensity value to CSS custom properties on `:root`. */
function applyGlassProperties(intensity: number, reducedTransparency: boolean): void {
  const effective = reducedTransparency ? Math.min(intensity, 20) : intensity
  const t = effective / 100
  const root = document.documentElement.style
  root.setProperty('--glass-opacity', (t * 0.25).toFixed(4))
  root.setProperty('--glass-blur', `${(t * 24).toFixed(1)}px`)
  root.setProperty('--glass-border-opacity', t.toFixed(4))
}

/**
 * Provides theme state to the React tree.
 *
 * - Persists the user's theme choice in `localStorage`.
 * - Listens to `prefers-color-scheme` so `'system'` stays in sync.
 * - Checks `prefers-reduced-transparency` to tone down glassmorphism.
 * - Sets a `dark` or `light` class on `<html>` for Tailwind.
 * - Writes CSS custom properties (`--glass-*`) to `:root`.
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'softcrm-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme
    return (localStorage.getItem(storageKey) as Theme | null) ?? defaultTheme
  })

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(theme),
  )

  const [glassIntensity, setGlassIntensityState] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_GLASS_INTENSITY
    const stored = localStorage.getItem(GLASS_STORAGE_KEY)
    if (stored !== null) {
      const parsed = Number(stored)
      if (!Number.isNaN(parsed)) return Math.max(0, Math.min(100, parsed))
    }
    return DEFAULT_GLASS_INTENSITY
  })

  const [reducedTransparency, setReducedTransparency] = useState(
    prefersReducedTransparency,
  )

  // Listen to prefers-color-scheme changes
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'system') {
        const next = getSystemTheme()
        setResolvedTheme(next)
        applyThemeClass(next)
      }
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [theme])

  // Listen to prefers-reduced-transparency changes
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-transparency: reduce)')
    const handler = (e: MediaQueryListEvent) => setReducedTransparency(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // Apply theme class whenever resolvedTheme changes
  useEffect(() => {
    applyThemeClass(resolvedTheme)
  }, [resolvedTheme])

  // Apply glass CSS custom properties
  useEffect(() => {
    applyGlassProperties(glassIntensity, reducedTransparency)
  }, [glassIntensity, reducedTransparency])

  const setTheme = useCallback(
    (next: Theme) => {
      localStorage.setItem(storageKey, next)
      setThemeState(next)
      const resolved = resolveTheme(next)
      setResolvedTheme(resolved)
      applyThemeClass(resolved)
    },
    [storageKey],
  )

  const setGlassIntensity = useCallback((intensity: number) => {
    const clamped = Math.max(0, Math.min(100, intensity))
    localStorage.setItem(GLASS_STORAGE_KEY, String(clamped))
    setGlassIntensityState(clamped)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme, glassIntensity, setGlassIntensity }),
    [theme, resolvedTheme, setTheme, glassIntensity, setGlassIntensity],
  )

  return createElement(ThemeContext.Provider, { value }, children)
}

;(ThemeProvider as React.FC).displayName = 'ThemeProvider'

/**
 * Returns the current theme context.
 * Must be called inside a {@link ThemeProvider}.
 *
 * @throws {Error} If called outside of a ThemeProvider.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (ctx === undefined) {
    throw new Error('useTheme must be used within a <ThemeProvider>')
  }
  return ctx
}
