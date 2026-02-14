// ─── REAL-TIME EVENTS ─────────────────────────────────────────
export interface CRMEvent {
  type: string;
  entityType: EntityType;
  entityId: string;
  action: "created" | "updated" | "deleted" | "stage_changed" | "completed";
  userId: string;
  timestamp: number;
  changes?: Record<string, { old: unknown; new: unknown }>;
  summary?: string;
}

export type EntityType =
  | "deal"
  | "contact"
  | "company"
  | "task"
  | "activity"
  | "notification";

// ─── ABLY CHANNELS ────────────────────────────────────────────
export const channels = {
  user: (userId: string) => `user:${userId}`,
  deal: (dealId: string) => `deal:${dealId}`,
  contact: (contactId: string) => `contact:${contactId}`,
  pipeline: (pipelineId: string) => `pipeline:${pipelineId}`,
  global: "crm:global",
} as const;

// ─── API FILTERS ──────────────────────────────────────────────
export interface DealFilters {
  pipelineId?: string;
  stageId?: string;
  ownerId?: string;
  teamId?: string;
  search?: string;
  priority?: string;
  limit?: number;
  offset?: number;
}

export interface ContactFilters {
  search?: string;
  status?: string;
  source?: string;
  ownerId?: string;
  companyId?: string;
  tagId?: string;
  limit?: number;
  offset?: number;
}

export interface TaskFilters {
  assigneeId?: string;
  status?: string;
  priority?: string;
  dealId?: string;
  contactId?: string;
  overdue?: boolean;
  limit?: number;
  offset?: number;
}

// ─── PERMISSIONS ──────────────────────────────────────────────
export type UserRole = "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";
export type Action = "create" | "read" | "update" | "delete" | "manage";
export type Resource =
  | "deal"
  | "contact"
  | "task"
  | "pipeline"
  | "automation"
  | "user"
  | "report";

export const permissions: Record<UserRole, Record<Resource, Action[]>> = {
  ADMIN: {
    deal: ["create", "read", "update", "delete", "manage"],
    contact: ["create", "read", "update", "delete", "manage"],
    task: ["create", "read", "update", "delete", "manage"],
    pipeline: ["create", "read", "update", "delete", "manage"],
    automation: ["create", "read", "update", "delete", "manage"],
    user: ["create", "read", "update", "delete", "manage"],
    report: ["create", "read", "update", "delete", "manage"],
  },
  MANAGER: {
    deal: ["create", "read", "update", "delete"],
    contact: ["create", "read", "update", "delete"],
    task: ["create", "read", "update", "delete"],
    pipeline: ["read"],
    automation: ["create", "read", "update"],
    user: ["read"],
    report: ["read"],
  },
  MEMBER: {
    deal: ["create", "read", "update"],
    contact: ["create", "read", "update"],
    task: ["create", "read", "update"],
    pipeline: ["read"],
    automation: ["read"],
    user: ["read"],
    report: ["read"],
  },
  VIEWER: {
    deal: ["read"],
    contact: ["read"],
    task: ["read"],
    pipeline: ["read"],
    automation: [],
    user: ["read"],
    report: ["read"],
  },
};

export function can(role: UserRole, action: Action, resource: Resource): boolean {
  return permissions[role]?.[resource]?.includes(action) ?? false;
}

// ─── AUTOMATION ───────────────────────────────────────────────
export const MAX_AUTOMATION_DEPTH = 3;
