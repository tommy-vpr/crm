import { z } from "zod";

// ─── VERSIONED JSON ENVELOPES ─────────────────────────────────
// All Json fields in the DB use versioned envelopes: { version: N, data: {...} }
// This allows safe schema migration over time.

// Automation conditions
export const AutomationConditionV1 = z.object({
  version: z.literal(1),
  data: z
    .object({
      field: z.string(),
      operator: z.enum([
        "equals",
        "not_equals",
        "contains",
        "gt",
        "lt",
        "gte",
        "lte",
        "in",
        "not_in",
        "is_empty",
        "is_not_empty",
      ]),
      value: z.unknown(),
    })
    .array(),
});

// Automation actions
export const AutomationActionV1 = z.object({
  version: z.literal(1),
  data: z
    .object({
      type: z.enum([
        "create_task",
        "send_email",
        "send_notification",
        "update_field",
      ]),
      config: z.record(z.unknown()),
    })
    .array(),
});

export type AutomationConditions = z.infer<typeof AutomationConditionV1>;
export type AutomationActions = z.infer<typeof AutomationActionV1>;

// ─── API INPUT SCHEMAS ────────────────────────────────────────

export const CreateContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  title: z.string().max(100).optional(),
  source: z
    .enum([
      "MANUAL",
      "WEBSITE",
      "REFERRAL",
      "LINKEDIN",
      "COLD_OUTREACH",
      "INBOUND",
      "EVENT",
      "OTHER",
    ])
    .default("MANUAL"),
  status: z
    .enum(["ACTIVE", "INACTIVE", "CHURNED", "DO_NOT_CONTACT"])
    .default("ACTIVE"),
  companyId: z.string().cuid().optional(),
  ownerId: z.string().cuid().optional(),
  address: z.record(z.unknown()).optional(),
  socialLinks: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
});

export const UpdateContactSchema = CreateContactSchema.partial();

export const CreateDealSchema = z.object({
  title: z.string().min(1).max(200),
  value: z.number().positive().optional(),
  currency: z.string().length(3).default("USD"),
  stageId: z.string().cuid(),
  pipelineId: z.string().cuid(),
  ownerId: z.string().cuid().optional(),
  companyId: z.string().cuid().optional(),
  teamId: z.string().cuid().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  expectedCloseDate: z.coerce.date().optional(),
  description: z.string().max(5000).optional(),
  contactIds: z.array(z.string().cuid()).optional(),
  customFields: z.record(z.unknown()).optional(),
});

export const UpdateDealSchema = CreateDealSchema.partial();

export const MoveDealStageSchema = z.object({
  stageId: z.string().cuid(),
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.coerce.date().optional(),
  assigneeId: z.string().cuid().optional(),
  contactId: z.string().cuid().optional(),
  dealId: z.string().cuid().optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
});

export const CreateActivitySchema = z.object({
  type: z.enum([
    "NOTE",
    "EMAIL_SENT",
    "EMAIL_RECEIVED",
    "CALL",
    "MEETING",
    "TASK_COMPLETED",
    "CUSTOM",
  ]),
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  contactId: z.string().cuid().optional(),
  dealId: z.string().cuid().optional(),
  companyId: z.string().cuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const CreateAutomationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  trigger: z.enum([
    "DEAL_STAGE_CHANGED",
    "DEAL_CREATED",
    "CONTACT_CREATED",
    "TASK_OVERDUE",
    "NO_ACTIVITY_DAYS",
    "FORM_SUBMITTED",
    "EMAIL_RECEIVED",
  ]),
  conditions: AutomationConditionV1,
  actions: AutomationActionV1,
});

// ─── SEARCH SCHEMA ────────────────────────────────────────────

export const SearchSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});
