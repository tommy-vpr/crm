import { prisma } from "@cultivated-crm/db";
import type { UserRole } from "@cultivated-crm/shared";
import type { AuthenticatedUser } from "@/lib/api-utils";

// ─── ROW-LEVEL AUTHORIZATION ──────────────────────────────────
//
// Every API query MUST use these functions to scope results.
// Deny-by-default: users only see records they own or that belong
// to teams they're members of.
//
// Scoping rules:
//   ADMIN:   all records (no filter)
//   MANAGER: records owned by self + records in any team they lead or belong to
//   MEMBER:  records owned by self + records in teams they belong to
//   VIEWER:  same as MEMBER (read-only enforced by can() at route level)

/**
 * Get all team IDs the user belongs to. Cached per request via closure.
 */
export async function getUserTeamIds(userId: string): Promise<string[]> {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });
  return memberships.map((m: { teamId: string }) => m.teamId);
}

/**
 * Build a Prisma WHERE clause that restricts results to what the user can access.
 *
 * For resources with both `ownerId` and `teamId`:
 *   - Admin: {}
 *   - Others: OR [ ownerId = user.id, teamId IN user's teams ]
 *
 * Usage:
 *   const scope = await scopeWhere(user);
 *   const deals = await prisma.deal.findMany({ where: { ...scope.deal, ...userFilters } });
 */
export async function scopeWhere(user: AuthenticatedUser) {
  if (user.role === "ADMIN") {
    return {
      deal: {},
      contact: {},
      company: {},
      task: {},
      pipeline: {},
      activity: {},
      notification: { userId: user.id }, // notifications are always user-scoped
    };
  }

  const teamIds = await getUserTeamIds(user.id);

  // Records the user owns OR that belong to one of their teams
  const ownerOrTeam = (ownerField = "ownerId") => ({
    OR: [
      { [ownerField]: user.id },
      ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
    ],
  });

  // For tasks: user is assignee OR creator OR task is on a deal they can see
  const taskScope = {
    OR: [
      { assigneeId: user.id },
      { creatorId: user.id },
      ...(teamIds.length > 0 ? [{ deal: { teamId: { in: teamIds } } }] : []),
    ],
  };

  // For activities: linked to user, or linked to entities in their scope
  const activityScope = {
    OR: [
      { userId: user.id },
      ...(teamIds.length > 0
        ? [
            { deal: { teamId: { in: teamIds } } },
            { contact: { teamId: { in: teamIds } } },
            { company: { teamId: { in: teamIds } } },
          ]
        : []),
    ],
  };

  // Pipelines: shared (teamId = null) or team-scoped
  // const pipelineScope = {
  //   OR: [
  //     { teamId: null }, // shared/global pipelines
  //     ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
  //   ],
  // };
  // Pipelines: only team-scoped (no global pipelines)
  const pipelineScope =
    teamIds.length > 0 ? { teamId: { in: teamIds } } : { id: "NONE" }; // no team = see nothing

  return {
    deal: ownerOrTeam(),
    contact: ownerOrTeam(),
    company:
      teamIds.length > 0
        ? { OR: [{ teamId: null }, { teamId: { in: teamIds } }] }
        : { teamId: null },
    task: taskScope,
    pipeline: pipelineScope,
    activity: activityScope,
    notification: { userId: user.id },
  };
}

// Add to authorization.ts
export async function canModifyPipeline(
  user: AuthenticatedUser,
  pipelineId: string,
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, createdById: user.id },
    select: { id: true },
  });
  return pipeline !== null;
}

/**
 * Check if a user can access a specific record by ID.
 * Use this for single-record operations (GET by id, UPDATE, DELETE).
 */
export async function canAccessDeal(
  user: AuthenticatedUser,
  dealId: string,
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const scope = await scopeWhere(user);
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, ...scope.deal },
    select: { id: true },
  });
  return deal !== null;
}

export async function canAccessContact(
  user: AuthenticatedUser,
  contactId: string,
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const scope = await scopeWhere(user);
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, ...scope.contact },
    select: { id: true },
  });
  return contact !== null;
}

export async function canAccessCompany(
  user: AuthenticatedUser,
  companyId: string,
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const scope = await scopeWhere(user);
  const company = await prisma.company.findFirst({
    where: { id: companyId, ...scope.company },
    select: { id: true },
  });
  return company !== null;
}

export async function canAccessTask(
  user: AuthenticatedUser,
  taskId: string,
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const scope = await scopeWhere(user);
  const task = await prisma.task.findFirst({
    where: { id: taskId, ...scope.task },
    select: { id: true },
  });
  return task !== null;
}

export async function canAccessPipeline(
  user: AuthenticatedUser,
  pipelineId: string,
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const scope = await scopeWhere(user);
  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, ...scope.pipeline },
    select: { id: true },
  });
  return pipeline !== null;
}

/**
 * Validate that a user is actually a member of the specified team.
 * Use on create/update to prevent teamId spoofing.
 */
export async function validateTeamMembership(
  userId: string,
  teamId: string | null | undefined,
): Promise<void> {
  if (!teamId) return; // null teamId = no team assignment (allowed)

  const membership = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });

  if (!membership) {
    throw new Error(`User is not a member of team ${teamId}`);
  }
}

/**
 * Deny access — throw 403 NextResponse.
 */
export function denyAccess(): never {
  const { NextResponse } = require("next/server");
  throw NextResponse.json(
    { error: "Forbidden: insufficient access" },
    { status: 403 },
  );
}

export async function getUserDefaultTeamId(
  userId: string,
): Promise<string | undefined> {
  const membership = await prisma.teamMember.findFirst({
    where: { userId },
    select: { teamId: true },
  });
  return membership?.teamId ?? undefined;
}
