// ── @softcrm/ui — Public API ───────────────────────────────────────────────────

// Utilities
export { cn } from './utils/cn.js';

// Design tokens
export * from './tokens/index.js';

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
