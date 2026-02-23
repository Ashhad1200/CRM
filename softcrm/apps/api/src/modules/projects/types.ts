/**
 * Projects module — domain types.
 */

// ── Project types ──────────────────────────────────────────────────────────────

export interface ProjectWithTasks {
  id: string;
  tenantId: string;
  name: string;
  dealId: string | null;
  accountId: string | null;
  templateId: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tasks: Array<{
    id: string;
    projectId: string;
    title: string;
    description: string | null;
    assigneeId: string | null;
    priority: string;
    status: string;
    dueDate: Date | null;
    order: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  milestones: Array<{
    id: string;
    projectId: string;
    name: string;
    dueDate: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export interface TaskWithTimeEntries {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  priority: string;
  status: string;
  dueDate: Date | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  timeEntries: Array<{
    id: string;
    taskId: string;
    userId: string;
    hours: unknown;
    isBillable: boolean;
    description: string | null;
    date: Date;
    createdAt: Date;
  }>;
  milestoneTasks: Array<{
    id: string;
    milestoneId: string;
    taskId: string;
  }>;
}

export interface MilestoneWithTasks {
  id: string;
  projectId: string;
  name: string;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  milestoneTasks: Array<{
    id: string;
    milestoneId: string;
    taskId: string;
    task: {
      id: string;
      title: string;
      status: string;
    };
  }>;
}

// ── Progress types ─────────────────────────────────────────────────────────────

export interface ProjectProgress {
  totalTasks: number;
  completedTasks: number;
  percentComplete: number;
  milestoneStatus: Array<{
    name: string;
    completed: boolean;
    dueDate: Date | null;
  }>;
}

// ── Filter types ───────────────────────────────────────────────────────────────

export interface ProjectFilters {
  search?: string;
  status?: string;
  dealId?: string;
  accountId?: string;
}

export interface TaskFilters {
  status?: string;
  assigneeId?: string;
  priority?: string;
}

// ── Template types ─────────────────────────────────────────────────────────────

export interface TemplateTask {
  title: string;
  description?: string;
  priority: string;
  order: number;
}

export interface TemplateMilestone {
  name: string;
  taskIndices: number[];
  offsetDays: number;
}
