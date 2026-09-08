import type { Request } from "express";

export const workspaceRoles = [
  "read_only",
  "contributor",
  "facilitator",
  "editor",
  "administrator",
] as const;

export type WorkspaceRole = (typeof workspaceRoles)[number];

const roleRank: Record<WorkspaceRole, number> = {
  read_only: 0,
  contributor: 1,
  facilitator: 2,
  editor: 3,
  administrator: 4,
};

export const routeMinimumRoles = {
  "GET /access/me": "read_only",
  "GET /users": "administrator",
  "PATCH /users/:id/role": "administrator",
  "GET /dashboard": "read_only",
  "GET /sessions": "read_only",
  "POST /sessions": "contributor",
  "PATCH /sessions/:id": "facilitator",
  "GET /stakeholders": "read_only",
  "POST /stakeholders": "contributor",
  "PATCH /stakeholders/:id": "facilitator",
  "GET /opportunities": "read_only",
  "POST /opportunities": "contributor",
  "PATCH /opportunities/:id": "editor",
  "GET /evidence": "read_only",
  "GET /activity": "read_only",
  "GET /proposal": "read_only",
  "PATCH /proposal/phases/:id": "editor",
  "GET /privacy/audit": "administrator",
  "POST /privacy/export": "administrator",
  "POST /privacy/delete": "administrator",
} satisfies Record<string, WorkspaceRole>;

export type RequestActor = {
  id: string;
  role: WorkspaceRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: WorkspaceRole;
      };
    }
  }
}

export function getRequestActor(req: Request): RequestActor {
  return req.user ?? { id: "anonymous", role: "read_only" };
}

export function normalizeWorkspaceRole(value: unknown): WorkspaceRole | undefined {
  return typeof value === "string" && workspaceRoles.includes(value as WorkspaceRole)
    ? (value as WorkspaceRole)
    : undefined;
}

export function roleAtLeast(
  role: WorkspaceRole,
  minimumRole: WorkspaceRole,
): boolean {
  return roleRank[role] >= roleRank[minimumRole];
}

export function canViewSensitiveData(role: WorkspaceRole): boolean {
  return roleAtLeast(role, "facilitator");
}

export function canManagePrivacy(role: WorkspaceRole): boolean {
  return role === "administrator";
}

export function redactSensitiveFields<T extends Record<string, unknown>>(
  record: T,
  sensitiveFields: readonly (keyof T)[],
  role: WorkspaceRole,
): T {
  if (canViewSensitiveData(role)) {
    return record;
  }

  const redacted = { ...record };
  for (const field of sensitiveFields) {
    if (field in redacted) {
      const value = redacted[field];
      redacted[field] = (typeof value === "number" ? 0 : "[REDACTED]") as T[keyof T];
    }
  }
  return redacted;
}
