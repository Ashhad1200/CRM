// ── @softcrm/ui — Public API ───────────────────────────────────────────────────

// Utilities
export { cn } from './utils/cn.js';
export {
  transitions,
  keyframes,
  animations,
  staggerDelay,
  staggeredItem,
} from './utils/motion.js';

// Design tokens
export * from './tokens/index.js';
export * from './tokens/glass.js';
export {
  ThemeProvider,
  useTheme,
  ThemeContext,
  type Theme,
  type ResolvedTheme,
  type ThemeContextValue,
  type ThemeProviderProps,
} from './tokens/theme.js';

// Primitives
export { Button, buttonVariants, type ButtonProps } from './primitives/button.js';
export { Input, type InputProps } from './primitives/input.js';
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from './primitives/select.js';
export { Checkbox, type CheckboxProps } from './primitives/checkbox.js';
export { RadioGroup, RadioGroupItem } from './primitives/radio-group.js';
export { Textarea, type TextareaProps } from './primitives/textarea.js';
export { Badge, badgeVariants, type BadgeProps } from './primitives/badge.js';
export { Avatar, type AvatarProps } from './primitives/avatar.js';
export {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from './primitives/tooltip.js';
export { GlassCard, type GlassCardProps } from './primitives/glass-card.js';
export { GlassPanel, type GlassPanelProps } from './primitives/glass-panel.js';
export { StatCard, type StatCardProps } from './primitives/stat-card.js';
export { ProgressRing, type ProgressRingProps } from './primitives/progress-ring.js';
export { Switch, type SwitchProps } from './primitives/switch.js';
export { Slider, type SliderProps } from './primitives/slider.js';
export {
  DateRangePicker,
  type DateRangePickerProps,
} from './primitives/date-range-picker.js';
export {
  SearchInput,
  type SearchInputProps,
} from './primitives/search-input.js';
export { FileUpload, type FileUploadProps } from './primitives/file-upload.js';
export { Skeleton, type SkeletonProps } from './primitives/skeleton.js';
export {
  Breadcrumb,
  type BreadcrumbProps,
  type BreadcrumbItem,
} from './primitives/breadcrumb.js';

// Composites
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogOverlay,
  DialogContent,
  type DialogContentProps,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './composites/dialog.js';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './composites/dropdown-menu.js';
export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  toastVariants,
  registerToastState,
  toast,
  type ToastProps,
} from './composites/toast.js';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './composites/tabs.js';
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './composites/accordion.js';
export { DataTable, type DataTableProps } from './composites/data-table.js';
export {
  KanbanBoard,
  type KanbanBoardProps,
  type KanbanColumn,
} from './composites/kanban.js';
export {
  FormBuilder,
  type FormBuilderProps,
  type FieldSchema,
  type FieldType,
} from './composites/form-builder.js';
export {
  Calendar,
  type CalendarProps,
  type CalendarEvent,
  type CalendarView,
} from './composites/calendar.js';
export {
  GanttChart,
  type GanttChartProps,
  type GanttTask,
} from './composites/gantt-chart.js';
export {
  StepWizard,
  type StepWizardProps,
  type WizardStep,
} from './composites/step-wizard.js';
export {
  TreeView,
  type TreeViewProps,
  type TreeNode,
} from './composites/tree-view.js';
export {
  CommandPalette,
  type CommandPaletteProps,
  type CommandItem,
} from './composites/command-palette.js';
export {
  NotificationPanel,
  type NotificationPanelProps,
  type Notification,
} from './composites/notification-panel.js';
export {
  Timeline,
  type TimelineProps,
  type TimelineItem,
} from './composites/timeline.js';
export {
  DashboardGrid,
  type DashboardGridProps,
  type DashboardWidget,
} from './composites/dashboard-grid.js';
export {
  ChartCard,
  type ChartCardProps,
  type ChartDataPoint,
  type ChartType,
} from './composites/chart-card.js';
export {
  LoadingOverlay,
  type LoadingOverlayProps,
} from './composites/loading-overlay.js';
export {
  ErrorBoundary,
  ErrorFallback,
  type ErrorBoundaryProps,
  type ErrorFallbackProps,
} from './composites/error-boundary.js';

// Layouts
export {
  Shell,
  type ShellProps,
  Sidebar,
  type SidebarProps,
  TopNav,
  type TopNavProps,
  MobileNav,
  type MobileNavProps,
  type NavItem,
} from './layouts/shell.js';
