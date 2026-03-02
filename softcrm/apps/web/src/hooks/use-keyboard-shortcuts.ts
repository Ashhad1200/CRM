import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useCommandPalette } from '../providers/command-palette-provider';
import { useNotifications } from '../providers/notification-provider';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  category: string;
  action: () => void;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const modKey = isMac ? event.metaKey : event.ctrlKey;
  const expectedMod = shortcut.meta ?? shortcut.ctrl ?? false;

  return (
    event.key.toLowerCase() === shortcut.key.toLowerCase() &&
    modKey === expectedMod &&
    event.altKey === (shortcut.alt ?? false) &&
    event.shiftKey === (shortcut.shift ?? false)
  );
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true } = options;
  const navigate = useNavigate();
  const commandPalette = useCommandPalette();
  const notifications = useNotifications();
  const shortcutsRef = useRef<KeyboardShortcut[]>([]);

  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts
    {
      key: 'k',
      meta: true,
      description: 'Open command palette',
      category: 'Navigation',
      action: () => commandPalette.open(),
    },
    {
      key: 'h',
      meta: true,
      shift: true,
      description: 'Go to home/dashboard',
      category: 'Navigation',
      action: () => navigate('/'),
    },
    {
      key: 's',
      meta: true,
      shift: true,
      description: 'Go to Sales',
      category: 'Navigation',
      action: () => navigate('/sales'),
    },
    {
      key: 'p',
      meta: true,
      shift: true,
      description: 'Go to Projects',
      category: 'Navigation',
      action: () => navigate('/projects'),
    },
    {
      key: 't',
      meta: true,
      shift: true,
      description: 'Go to Support tickets',
      category: 'Navigation',
      action: () => navigate('/support'),
    },
    {
      key: 'i',
      meta: true,
      shift: true,
      description: 'Go to Inventory',
      category: 'Navigation',
      action: () => navigate('/inventory'),
    },
    {
      key: 'a',
      meta: true,
      shift: true,
      description: 'Go to Accounting',
      category: 'Navigation',
      action: () => navigate('/accounting'),
    },
    {
      key: 'm',
      meta: true,
      shift: true,
      description: 'Go to Marketing',
      category: 'Navigation',
      action: () => navigate('/marketing'),
    },

    // Quick actions
    {
      key: 'n',
      meta: true,
      description: 'Quick create (opens command palette)',
      category: 'Actions',
      action: () => commandPalette.open('Create'),
    },
    {
      key: '/',
      meta: true,
      description: 'Focus search',
      category: 'Actions',
      action: () => {
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        searchInput?.focus();
      },
    },

    // Notifications
    {
      key: 'b',
      meta: true,
      description: 'Toggle notifications panel',
      category: 'UI',
      action: () => notifications.togglePanel(),
    },

    // Help
    {
      key: '?',
      shift: true,
      description: 'Show keyboard shortcuts',
      category: 'Help',
      action: () => commandPalette.open('Keyboard'),
    },

    // Escape to close modals/panels
    {
      key: 'Escape',
      description: 'Close panel/modal',
      category: 'UI',
      action: () => {
        if (notifications.isPanelOpen) {
          notifications.setPanelOpen(false);
        }
      },
    },
  ];

  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs/textareas
      const target = event.target as HTMLElement;
      const isInputElement =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Allow meta/ctrl + key shortcuts even in input elements
      const hasModifier = event.metaKey || event.ctrlKey;
      if (isInputElement && !hasModifier) return;

      for (const shortcut of shortcutsRef.current) {
        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.action();
          return;
        }
      }
    },
    [enabled],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [handleKeyDown]);

  const getShortcutDisplay = useCallback((shortcut: KeyboardShortcut): string => {
    const parts: string[] = [];

    if (shortcut.meta || shortcut.ctrl) {
      parts.push(isMac ? '⌘' : 'Ctrl');
    }
    if (shortcut.alt) {
      parts.push(isMac ? '⌥' : 'Alt');
    }
    if (shortcut.shift) {
      parts.push('⇧');
    }

    const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
    parts.push(key);

    return parts.join(isMac ? '' : '+');
  }, []);

  const getShortcutsByCategory = useCallback(() => {
    const categories = new Map<string, Array<KeyboardShortcut & { display: string }>>();

    for (const shortcut of shortcuts) {
      const existing = categories.get(shortcut.category) ?? [];
      existing.push({ ...shortcut, display: getShortcutDisplay(shortcut) });
      categories.set(shortcut.category, existing);
    }

    return categories;
  }, [getShortcutDisplay, shortcuts]);

  return {
    shortcuts,
    getShortcutDisplay,
    getShortcutsByCategory,
  };
}

export function formatShortcut(key: string, modifiers?: { meta?: boolean; ctrl?: boolean; alt?: boolean; shift?: boolean }): string {
  const parts: string[] = [];

  if (modifiers?.meta || modifiers?.ctrl) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (modifiers?.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  if (modifiers?.shift) {
    parts.push('⇧');
  }

  parts.push(key.length === 1 ? key.toUpperCase() : key);

  return parts.join(isMac ? '' : '+');
}
