/**
 * Glassmorphism Design Tokens — SoftBusiness Platform
 *
 * Pure token definitions for the glassmorphism visual language.
 * Covers surface tiers, blur presets, border glow, module accent
 * colors, mesh gradients, layered shadows, and motion presets.
 *
 * No external imports — this file is the single source of truth
 * for all glass-related styling primitives.
 */

// ---------------------------------------------------------------------------
// Glass Surface Tiers
// ---------------------------------------------------------------------------

/** Backdrop-blur + background opacity + border for three intensity tiers. */
export const glass = {
  /** Tier 1: Subtle glass (nav items, cards in light areas) */
  1: {
    light: { bg: 'rgba(255, 255, 255, 0.08)', blur: '4px', border: 'rgba(255, 255, 255, 0.1)' },
    dark: { bg: 'rgba(255, 255, 255, 0.04)', blur: '4px', border: 'rgba(255, 255, 255, 0.06)' },
  },
  /** Tier 2: Medium glass (primary cards, panels) */
  2: {
    light: { bg: 'rgba(255, 255, 255, 0.15)', blur: '12px', border: 'rgba(255, 255, 255, 0.18)' },
    dark: { bg: 'rgba(255, 255, 255, 0.08)', blur: '12px', border: 'rgba(255, 255, 255, 0.1)' },
  },
  /** Tier 3: Strong glass (modals, overlays, sidebar) */
  3: {
    light: { bg: 'rgba(255, 255, 255, 0.25)', blur: '24px', border: 'rgba(255, 255, 255, 0.25)' },
    dark: { bg: 'rgba(255, 255, 255, 0.12)', blur: '24px', border: 'rgba(255, 255, 255, 0.15)' },
  },
} as const;

// ---------------------------------------------------------------------------
// Backdrop Blur Presets
// ---------------------------------------------------------------------------

/** Predefined backdrop-blur values from subtle to heavy. */
export const blur = {
  sm: '4px',
  md: '12px',
  lg: '24px',
  xl: '40px',
} as const;

// ---------------------------------------------------------------------------
// Border Glow
// ---------------------------------------------------------------------------

/** Luminous borders that catch light — three intensity levels per scheme. */
export const borderGlow = {
  light: {
    subtle: '1px solid rgba(0, 0, 0, 0.05)',
    medium: '1px solid rgba(0, 0, 0, 0.08)',
    strong: '1px solid rgba(0, 0, 0, 0.12)',
  },
  dark: {
    subtle: '1px solid rgba(255, 255, 255, 0.06)',
    medium: '1px solid rgba(255, 255, 255, 0.1)',
    strong: '1px solid rgba(255, 255, 255, 0.18)',
  },
} as const;

// ---------------------------------------------------------------------------
// Module Accent Colors
// ---------------------------------------------------------------------------

/** Each CRM module gets a unique gradient accent with matching glow color. */
export const moduleAccents = {
  sales: { from: '#3b82f6', to: '#6366f1', glow: 'rgba(59, 130, 246, 0.15)' },
  marketing: { from: '#ec4899', to: '#f43f5e', glow: 'rgba(236, 72, 153, 0.15)' },
  support: { from: '#14b8a6', to: '#06b6d4', glow: 'rgba(20, 184, 166, 0.15)' },
  accounting: { from: '#22c55e', to: '#10b981', glow: 'rgba(34, 197, 94, 0.15)' },
  inventory: { from: '#f97316', to: '#f59e0b', glow: 'rgba(249, 115, 22, 0.15)' },
  projects: { from: '#8b5cf6', to: '#a855f7', glow: 'rgba(139, 92, 246, 0.15)' },
  comms: { from: '#06b6d4', to: '#0ea5e9', glow: 'rgba(6, 182, 212, 0.15)' },
  analytics: { from: '#6366f1', to: '#818cf8', glow: 'rgba(99, 102, 241, 0.15)' },
  hr: { from: '#f59e0b', to: '#eab308', glow: 'rgba(245, 158, 11, 0.15)' },
  manufacturing: { from: '#64748b', to: '#94a3b8', glow: 'rgba(100, 116, 139, 0.15)' },
  warehouse: { from: '#ea580c', to: '#f97316', glow: 'rgba(234, 88, 12, 0.15)' },
  procurement: { from: '#0d9488', to: '#14b8a6', glow: 'rgba(13, 148, 136, 0.15)' },
  pos: { from: '#7c3aed', to: '#8b5cf6', glow: 'rgba(124, 58, 237, 0.15)' },
  assets: { from: '#be185d', to: '#ec4899', glow: 'rgba(190, 24, 93, 0.15)' },
  quality: { from: '#059669', to: '#10b981', glow: 'rgba(5, 150, 105, 0.15)' },
  platform: { from: '#475569', to: '#64748b', glow: 'rgba(71, 85, 105, 0.15)' },
} as const;

/** Union of all CRM module identifiers. */
export type ModuleName = keyof typeof moduleAccents;

// ---------------------------------------------------------------------------
// Mesh Gradient Backgrounds
// ---------------------------------------------------------------------------

/** Page-level ambient lighting — very subtle, large-scale radial gradients. */
export const meshGradients = {
  default:
    'radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.06), transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(139, 92, 246, 0.04), transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(16, 185, 129, 0.04), transparent 50%)',
  sales:
    'radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.08), transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(99, 102, 241, 0.06), transparent 50%)',
  accounting:
    'radial-gradient(ellipse at 20% 50%, rgba(34, 197, 94, 0.08), transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(16, 185, 129, 0.06), transparent 50%)',
  pos:
    'radial-gradient(ellipse at 20% 50%, rgba(124, 58, 237, 0.08), transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(139, 92, 246, 0.06), transparent 50%)',
  hr:
    'radial-gradient(ellipse at 20% 50%, rgba(245, 158, 11, 0.08), transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(234, 179, 8, 0.06), transparent 50%)',
  manufacturing:
    'radial-gradient(ellipse at 20% 50%, rgba(100, 116, 139, 0.08), transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(148, 163, 184, 0.06), transparent 50%)',
} as const;

// ---------------------------------------------------------------------------
// Layered Glass Shadows
// ---------------------------------------------------------------------------

/** Multi-layer shadows with color tinting for realistic glass depth. */
export const glassShadows = {
  sm: {
    light: '0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
    dark: '0 1px 2px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.12)',
  },
  md: {
    light:
      '0 4px 6px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02), 0 0 0 1px rgba(0, 0, 0, 0.03)',
    dark:
      '0 4px 6px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.05)',
  },
  lg: {
    light:
      '0 10px 25px rgba(0, 0, 0, 0.06), 0 4px 10px rgba(0, 0, 0, 0.03), 0 0 0 1px rgba(0, 0, 0, 0.03)',
    dark:
      '0 10px 25px rgba(0, 0, 0, 0.3), 0 4px 10px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.06)',
  },
  xl: {
    light:
      '0 20px 40px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.03)',
    dark:
      '0 20px 40px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.08)',
  },
  /** Colored glow — pair with `moduleAccents` for accent shadows. */
  glow: (color: string, opacity = 0.15) =>
    `0 0 20px rgba(${color}, ${opacity}), 0 0 40px rgba(${color}, ${opacity * 0.5})`,
} as const;

// ---------------------------------------------------------------------------
// Motion / Spring Physics Presets
// ---------------------------------------------------------------------------

/** Animation presets — spring configs, durations, and easing curves. */
export const motion = {
  springs: {
    snappy: { stiffness: 400, damping: 30, mass: 1 },
    gentle: { stiffness: 200, damping: 20, mass: 1 },
    bouncy: { stiffness: 300, damping: 15, mass: 1 },
    slow: { stiffness: 100, damping: 20, mass: 1 },
  },
  durations: {
    instant: '75ms',
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
    slower: '600ms',
  },
  easings: {
    ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    easeIn: 'cubic-bezier(0.42, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.58, 1)',
    easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;
