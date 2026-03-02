import type React from 'react';

/** CSS transition shorthand for common glassmorphism transitions */
export const transitions = {
  /** All standard properties: background, border, box-shadow, opacity, transform */
  glass:
    'background 250ms ease, border-color 250ms ease, box-shadow 250ms ease, opacity 250ms ease, transform 250ms ease',
  /** Fast color/opacity changes (hover states) */
  fast: 'all 150ms ease',
  /** Normal transitions */
  normal: 'all 250ms ease',
  /** Slow, dramatic transitions (page/modal enter) */
  slow: 'all 400ms cubic-bezier(0.25, 0.1, 0.25, 1)',
  /** Spring-like overshoot for dialogs/sheets */
  spring: 'all 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  /** No transition */
  none: 'none',
} as const;

/** CSS keyframe animation names + definitions (to be injected via style tag or Tailwind config) */
export const keyframes = {
  fadeIn: {
    from: { opacity: '0' },
    to: { opacity: '1' },
  },
  fadeOut: {
    from: { opacity: '1' },
    to: { opacity: '0' },
  },
  slideInFromRight: {
    from: { transform: 'translateX(100%)', opacity: '0' },
    to: { transform: 'translateX(0)', opacity: '1' },
  },
  slideInFromLeft: {
    from: { transform: 'translateX(-100%)', opacity: '0' },
    to: { transform: 'translateX(0)', opacity: '1' },
  },
  slideInFromBottom: {
    from: { transform: 'translateY(16px)', opacity: '0' },
    to: { transform: 'translateY(0)', opacity: '1' },
  },
  slideInFromTop: {
    from: { transform: 'translateY(-16px)', opacity: '0' },
    to: { transform: 'translateY(0)', opacity: '1' },
  },
  scaleIn: {
    from: { transform: 'scale(0.95)', opacity: '0' },
    to: { transform: 'scale(1)', opacity: '1' },
  },
  scaleOut: {
    from: { transform: 'scale(1)', opacity: '1' },
    to: { transform: 'scale(0.95)', opacity: '0' },
  },
  shimmer: {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },
  pulseGlow: {
    '0%, 100%': { boxShadow: '0 0 8px rgba(var(--accent-rgb), 0.2)' },
    '50%': { boxShadow: '0 0 20px rgba(var(--accent-rgb), 0.4)' },
  },
  float: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-4px)' },
  },
} as const;

/** Animation shorthand presets matching keyframe names */
export const animations = {
  fadeIn: 'fadeIn 250ms ease forwards',
  fadeOut: 'fadeOut 200ms ease forwards',
  slideInRight:
    'slideInFromRight 300ms cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
  slideInLeft:
    'slideInFromLeft 300ms cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
  slideInBottom:
    'slideInFromBottom 300ms cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
  slideInTop:
    'slideInFromTop 300ms cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
  scaleIn: 'scaleIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
  scaleOut: 'scaleOut 150ms ease forwards',
  shimmer: 'shimmer 2s linear infinite',
  pulseGlow: 'pulseGlow 2s ease-in-out infinite',
  float: 'float 3s ease-in-out infinite',
} as const;

/**
 * Generate a staggered animation delay for list items.
 * @param index - Item index in the list
 * @param baseDelay - Base delay in ms (default 50)
 * @param maxDelay - Maximum delay cap in ms (default 500)
 * @returns CSS animation-delay value string
 */
export function staggerDelay(
  index: number,
  baseDelay = 50,
  maxDelay = 500,
): string {
  const delay = Math.min(index * baseDelay, maxDelay);
  return `${delay}ms`;
}

/**
 * Generate inline style object for a staggered list item animation.
 * @param index - Item index
 * @param animation - Animation shorthand to use (default 'slideInBottom')
 */
export function staggeredItem(
  index: number,
  animation: keyof typeof animations = 'slideInBottom',
): React.CSSProperties {
  return {
    opacity: 0,
    animation: animations[animation],
    animationDelay: staggerDelay(index),
  };
}
