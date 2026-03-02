import { useState, useEffect } from 'react';
import { useTheme, GlassCard, Slider, Switch, Badge, type Theme } from '@softcrm/ui';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const ACCENT_COLORS = [
  { name: 'Blue', from: '#3b82f6', to: '#6366f1' },
  { name: 'Purple', from: '#8b5cf6', to: '#a855f7' },
  { name: 'Pink', from: '#ec4899', to: '#f43f5e' },
  { name: 'Orange', from: '#f97316', to: '#ef4444' },
  { name: 'Teal', from: '#14b8a6', to: '#06b6d4' },
  { name: 'Green', from: '#22c55e', to: '#10b981' },
  { name: 'Amber', from: '#f59e0b', to: '#eab308' },
  { name: 'Rose', from: '#f43f5e', to: '#e11d48' },
];

const ACCENT_STORAGE_KEY = 'softcrm-accent-color';

function getStoredAccent(): string {
  if (typeof window === 'undefined') return ACCENT_COLORS[0]!.name;
  return localStorage.getItem(ACCENT_STORAGE_KEY) ?? ACCENT_COLORS[0]!.name;
}

function applyAccent(from: string, to: string) {
  const root = document.documentElement.style;
  root.setProperty('--accent-from', from);
  root.setProperty('--accent-to', to);
}

export default function ThemeSettingsPage() {
  const { theme, resolvedTheme, setTheme, glassIntensity, setGlassIntensity } = useTheme();
  const [selectedAccent, setSelectedAccent] = useState(getStoredAccent);

  useEffect(() => {
    const accent = ACCENT_COLORS.find((c) => c.name === selectedAccent) ?? ACCENT_COLORS[0]!;
    applyAccent(accent.from, accent.to);
  }, [selectedAccent]);

  function handleAccentSelect(color: (typeof ACCENT_COLORS)[number]) {
    setSelectedAccent(color.name);
    localStorage.setItem(ACCENT_STORAGE_KEY, color.name);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Theme Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Customize the look and feel of your workspace.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Theme Mode */}
        <GlassCard tier="medium" padding="lg" hover={false}>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Theme Mode
          </h2>
          <div className="inline-flex rounded-lg border border-white/20 p-1">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                  theme === opt.value
                    ? 'bg-gradient-to-r from-[var(--accent-from,#3b82f6)] to-[var(--accent-to,#6366f1)] text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Currently resolved: <Badge variant="outline">{resolvedTheme}</Badge>
          </p>
        </GlassCard>

        {/* Glass Intensity */}
        <GlassCard tier="medium" padding="lg" hover={false}>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Glass Intensity
          </h2>
          <div className="space-y-3">
            <Slider
              min={0}
              max={100}
              step={1}
              value={glassIntensity}
              onValueChange={(v: number) => setGlassIntensity(v)}
            />
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Off</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{glassIntensity}%</span>
              <span>Max</span>
            </div>
          </div>
        </GlassCard>

        {/* Accent Color */}
        <GlassCard tier="medium" padding="lg" hover={false}>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Accent Color
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => handleAccentSelect(color)}
                className={`group flex flex-col items-center gap-1.5 rounded-lg p-2 transition ${
                  selectedAccent === color.name
                    ? 'ring-2 ring-offset-2 ring-[var(--accent-from,#3b82f6)] dark:ring-offset-gray-900'
                    : 'hover:bg-white/10'
                }`}
              >
                <div
                  className="h-8 w-8 rounded-full shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}
                />
                <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">
                  {color.name}
                </span>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Preview Panel */}
        <GlassCard tier="medium" padding="lg" hover={false}>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Live Preview
          </h2>
          <div className="space-y-3">
            <GlassCard tier="subtle" padding="sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                  Revenue
                </span>
                <Badge>+12%</Badge>
              </div>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">$48,200</p>
            </GlassCard>

            <GlassCard tier="medium" padding="sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                  Active Deals
                </span>
                <Badge variant="outline">24</Badge>
              </div>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">$124,500</p>
            </GlassCard>

            <GlassCard tier="strong" padding="sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                  Conversion
                </span>
                <Badge variant="outline">68%</Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Sample text to preview glass tiers at current intensity.
              </p>
            </GlassCard>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
