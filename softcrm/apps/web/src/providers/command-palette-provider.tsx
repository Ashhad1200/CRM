import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router';
import { CommandPalette, type CommandItem, useTheme, type Theme } from '@softcrm/ui';

interface CommandPaletteContextValue {
  /** Register commands from a module */
  registerCommands: (moduleId: string, commands: CommandItem[]) => void;
  /** Unregister all commands from a module */
  unregisterCommands: (moduleId: string) => void;
  /** Open the palette programmatically, optionally with a search filter */
  open: (filter?: string) => void;
  /** Close the palette */
  close: () => void;
  /** Whether the palette is currently open */
  isOpen: boolean;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

const RECENT_COMMANDS_KEY = 'softcrm-recent-commands';
const MAX_RECENT = 5;

function loadRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_COMMANDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecentIds(ids: string[]) {
  localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)));
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

function formatShortcut(key: string, modifiers?: { meta?: boolean; shift?: boolean }): string {
  const parts: string[] = [];
  if (modifiers?.meta) parts.push(isMac ? '⌘' : 'Ctrl+');
  if (modifiers?.shift) parts.push('⇧');
  parts.push(key.toUpperCase());
  return parts.join('');
}

const THEME_CYCLE: Theme[] = ['light', 'dark', 'system'];

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [initialFilter, setInitialFilter] = useState('');
  const [, forceUpdate] = useState(0);
  const registryRef = useRef(new Map<string, CommandItem[]>());
  const [recentIds, setRecentIds] = useState<string[]>(loadRecentIds);

  const cycleTheme = useCallback(() => {
    const idx = THEME_CYCLE.indexOf(theme);
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]!);
  }, [theme, setTheme]);

  const navigationCommands = useMemo<CommandItem[]>(
    () => [
      // Core Navigation
      { id: 'nav-dashboard', label: 'Go to Dashboard', icon: '🏠', group: 'Navigation', keywords: ['home', 'main', 'dashboard'], onSelect: () => navigate('/') },
      { id: 'nav-sales', label: 'Go to Sales Pipeline', icon: '💰', group: 'Navigation', keywords: ['sales', 'pipeline', 'deals', 'opportunities'], onSelect: () => navigate('/sales') },
      { id: 'nav-accounting', label: 'Go to Accounting', icon: '📊', group: 'Navigation', keywords: ['accounting', 'finance', 'invoices', 'billing'], onSelect: () => navigate('/accounting') },
      { id: 'nav-support', label: 'Go to Support', icon: '🎧', group: 'Navigation', keywords: ['support', 'tickets', 'help', 'customer'], onSelect: () => navigate('/support') },
      { id: 'nav-marketing', label: 'Go to Marketing', icon: '📣', group: 'Navigation', keywords: ['marketing', 'campaigns', 'email'], onSelect: () => navigate('/marketing') },
      { id: 'nav-inventory', label: 'Go to Inventory', icon: '📦', group: 'Navigation', keywords: ['inventory', 'stock', 'products'], onSelect: () => navigate('/inventory') },
      { id: 'nav-projects', label: 'Go to Projects', icon: '📁', group: 'Navigation', keywords: ['projects', 'tasks', 'boards'], onSelect: () => navigate('/projects') },
      { id: 'nav-analytics', label: 'Go to Analytics', icon: '📈', group: 'Navigation', keywords: ['analytics', 'reports', 'metrics', 'data'], onSelect: () => navigate('/analytics') },
      { id: 'nav-admin', label: 'Go to Admin', icon: '⚙️', group: 'Navigation', keywords: ['admin', 'settings', 'configuration'], onSelect: () => navigate('/admin') },

      // Extended Modules
      { id: 'nav-hr', label: 'Go to HR', icon: '👥', group: 'Navigation', keywords: ['hr', 'human resources', 'employees', 'payroll', 'leave'], onSelect: () => navigate('/hr') },
      { id: 'nav-warehouse', label: 'Go to Warehouse', icon: '🏭', group: 'Navigation', keywords: ['warehouse', 'wms', 'stock', 'locations', 'shipments'], onSelect: () => navigate('/warehouse') },
      { id: 'nav-manufacturing', label: 'Go to Manufacturing', icon: '🔧', group: 'Navigation', keywords: ['manufacturing', 'production', 'bom', 'work orders'], onSelect: () => navigate('/manufacturing') },
      { id: 'nav-procurement', label: 'Go to Procurement', icon: '🛒', group: 'Navigation', keywords: ['procurement', 'purchase', 'vendors', 'requisitions'], onSelect: () => navigate('/procurement') },
      { id: 'nav-pos', label: 'Go to Point of Sale', icon: '💳', group: 'Navigation', keywords: ['pos', 'point of sale', 'register', 'retail'], onSelect: () => navigate('/pos') },
      { id: 'nav-assets', label: 'Go to Assets', icon: '🏢', group: 'Navigation', keywords: ['assets', 'equipment', 'maintenance', 'depreciation'], onSelect: () => navigate('/assets') },
      { id: 'nav-quality', label: 'Go to Quality Control', icon: '✅', group: 'Navigation', keywords: ['quality', 'qc', 'inspection', 'ncr', 'capa'], onSelect: () => navigate('/quality') },

      // Quick Actions
      { id: 'action-new-contact', label: 'Create New Contact', icon: '➕', group: 'Quick Actions', keywords: ['new', 'create', 'add', 'contact'], onSelect: () => navigate('/sales/contacts?action=new') },
      { id: 'action-new-deal', label: 'Create New Deal', icon: '➕', group: 'Quick Actions', keywords: ['new', 'create', 'add', 'deal', 'opportunity'], onSelect: () => navigate('/sales/deals?action=new') },
      { id: 'action-new-ticket', label: 'Create New Ticket', icon: '➕', group: 'Quick Actions', keywords: ['new', 'create', 'add', 'ticket', 'support'], onSelect: () => navigate('/support/tickets?action=new') },
      { id: 'action-new-invoice', label: 'Create New Invoice', icon: '➕', group: 'Quick Actions', keywords: ['new', 'create', 'add', 'invoice', 'bill'], onSelect: () => navigate('/accounting/invoices?action=new') },
      { id: 'action-new-employee', label: 'Add New Employee', icon: '➕', group: 'Quick Actions', keywords: ['new', 'create', 'add', 'employee', 'hire'], onSelect: () => navigate('/hr/employees?action=new') },
      { id: 'action-new-po', label: 'Create Purchase Order', icon: '➕', group: 'Quick Actions', keywords: ['new', 'create', 'purchase order', 'po', 'buy'], onSelect: () => navigate('/procurement/purchase-orders/new') },

      // Theme Settings
      { id: 'toggle-theme', label: `Toggle Theme (${theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'})`, icon: resolvedTheme === 'dark' ? '🌙' : '☀️', group: 'Settings', keywords: ['dark', 'light', 'theme', 'mode', 'toggle'], onSelect: cycleTheme },
      { id: 'set-light-mode', label: 'Set Light Mode', icon: '☀️', group: 'Settings', keywords: ['light', 'theme', 'mode', 'bright'], onSelect: () => setTheme('light') },
      { id: 'set-dark-mode', label: 'Set Dark Mode', icon: '🌙', group: 'Settings', keywords: ['dark', 'theme', 'mode', 'night'], onSelect: () => setTheme('dark') },
      { id: 'set-system-theme', label: 'Use System Theme', icon: '💻', group: 'Settings', keywords: ['system', 'theme', 'auto', 'os'], onSelect: () => setTheme('system') },

      // Keyboard Shortcuts Help
      { id: 'shortcuts-nav-home', label: `${formatShortcut('H', { meta: true, shift: true })} — Go to Dashboard`, icon: '⌨️', group: 'Keyboard Shortcuts', keywords: ['keyboard', 'shortcut', 'home', 'dashboard'], onSelect: () => navigate('/') },
      { id: 'shortcuts-nav-sales', label: `${formatShortcut('S', { meta: true, shift: true })} — Go to Sales`, icon: '⌨️', group: 'Keyboard Shortcuts', keywords: ['keyboard', 'shortcut', 'sales'], onSelect: () => navigate('/sales') },
      { id: 'shortcuts-nav-projects', label: `${formatShortcut('P', { meta: true, shift: true })} — Go to Projects`, icon: '⌨️', group: 'Keyboard Shortcuts', keywords: ['keyboard', 'shortcut', 'projects'], onSelect: () => navigate('/projects') },
      { id: 'shortcuts-nav-support', label: `${formatShortcut('T', { meta: true, shift: true })} — Go to Support`, icon: '⌨️', group: 'Keyboard Shortcuts', keywords: ['keyboard', 'shortcut', 'support', 'tickets'], onSelect: () => navigate('/support') },
      { id: 'shortcuts-nav-inventory', label: `${formatShortcut('I', { meta: true, shift: true })} — Go to Inventory`, icon: '⌨️', group: 'Keyboard Shortcuts', keywords: ['keyboard', 'shortcut', 'inventory'], onSelect: () => navigate('/inventory') },
      { id: 'shortcuts-nav-accounting', label: `${formatShortcut('A', { meta: true, shift: true })} — Go to Accounting`, icon: '⌨️', group: 'Keyboard Shortcuts', keywords: ['keyboard', 'shortcut', 'accounting'], onSelect: () => navigate('/accounting') },
      { id: 'shortcuts-nav-marketing', label: `${formatShortcut('M', { meta: true, shift: true })} — Go to Marketing`, icon: '⌨️', group: 'Keyboard Shortcuts', keywords: ['keyboard', 'shortcut', 'marketing'], onSelect: () => navigate('/marketing') },
      { id: 'shortcuts-cmd-palette', label: `${formatShortcut('K', { meta: true })} — Open Command Palette`, icon: '⌨️', group: 'Keyboard Shortcuts', keywords: ['keyboard', 'shortcut', 'command', 'palette'], onSelect: () => {} },
      { id: 'shortcuts-quick-create', label: `${formatShortcut('N', { meta: true })} — Quick Create`, icon: '⌨️', group: 'Keyboard Shortcuts', keywords: ['keyboard', 'shortcut', 'create', 'new'], onSelect: () => {} },
      { id: 'shortcuts-notifications', label: `${formatShortcut('B', { meta: true })} — Toggle Notifications`, icon: '⌨️', group: 'Keyboard Shortcuts', keywords: ['keyboard', 'shortcut', 'notifications', 'bell'], onSelect: () => {} },
      { id: 'shortcuts-search', label: `${formatShortcut('/', { meta: true })} — Focus Search`, icon: '⌨️', group: 'Keyboard Shortcuts', keywords: ['keyboard', 'shortcut', 'search', 'find'], onSelect: () => {} },
    ],
    [navigate, theme, resolvedTheme, cycleTheme, setTheme],
  );

  const allItems = useMemo(() => {
    const moduleCommands = Array.from(registryRef.current.values()).flat();
    return [...navigationCommands, ...moduleCommands];
  }, [navigationCommands, forceUpdate]); // forceUpdate triggers recalc when registry changes

  const recentItems = useMemo(
    () => recentIds.map((id) => allItems.find((c) => c.id === id)).filter(Boolean) as CommandItem[],
    [recentIds, allItems],
  );

  const handleSelect = useCallback(
    (item: CommandItem) => {
      setRecentIds((prev) => {
        const next = [item.id, ...prev.filter((id) => id !== item.id)].slice(0, MAX_RECENT);
        saveRecentIds(next);
        return next;
      });
      item.onSelect();
      setIsOpen(false);
    },
    [],
  );

  const registerCommands = useCallback((moduleId: string, commands: CommandItem[]) => {
    registryRef.current.set(moduleId, commands);
    forceUpdate((n) => n + 1);
  }, []);

  const unregisterCommands = useCallback((moduleId: string) => {
    registryRef.current.delete(moduleId);
    forceUpdate((n) => n + 1);
  }, []);

  const open = useCallback((filter?: string) => {
    setInitialFilter(filter ?? '');
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
    setInitialFilter('');
  }, []);

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const contextValue = useMemo<CommandPaletteContextValue>(
    () => ({ registerCommands, unregisterCommands, open, close, isOpen }),
    [registerCommands, unregisterCommands, open, close, isOpen],
  );

  // Wrap onSelect for each item so selection goes through handleSelect
  const wrappedItems = useMemo(
    () => allItems.map((item) => ({ ...item, onSelect: () => handleSelect(item) })),
    [allItems, handleSelect],
  );

  const wrappedRecentItems = useMemo(
    () => recentItems.map((item) => ({ ...item, onSelect: () => handleSelect(item) })),
    [recentItems, handleSelect],
  );

  return (
    <CommandPaletteContext.Provider value={contextValue}>
      {children}
      <CommandPalette
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setInitialFilter('');
        }}
        items={wrappedItems}
        recentItems={wrappedRecentItems}
        placeholder="Type a command…"
        emptyMessage="No results found."
        initialSearch={initialFilter}
      />
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider');
  }
  return ctx;
}
