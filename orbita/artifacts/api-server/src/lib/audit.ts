import { randomUUID } from "node:crypto";
import type { Request } from "express";
import {
  auditEventsTable,
  db,
  type AuditChangeSummary,
} from "@workspace/db";
import { getRequestActor } from "./access";

type AuditInsertDatabase = Pick<typeof db, "insert">;

function addAuditRetentionYears(value: Date, years: number): string {
  const retainedUntil = new Date(value);
  retainedUntil.setUTCFullYear(retainedUntil.getUTCFullYear() + years);
  return retainedUntil.toISOString();
}

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "export"
  | "access"
  | "access_denied"
  | "system_seed";

export type AuditOutcome = "success" | "denied" | "not_found" | "rejected" | "error";

export function safeChangeSummary(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
  sensitiveFields: readonly string[] = [],
  reason?: string,
): AuditChangeSummary {
  const sensitive = new Set(sensitiveFields);
  const fields = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  const changedFields = [...fields].filter(
    (field) => JSON.stringify(before?.[field]) !== JSON.stringify(after?.[field]),
  );

  const snapshot = (value: Record<string, unknown> | undefined) => {
    if (!value) return undefined;
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        sensitive.has(key) ? "[REDACTED]" : entry,
      ]),
    );
  };

  return {
    changedFields,
    ...(before ? { before: snapshot(before) } : {}),
    ...(after ? { after: snapshot(after) } : {}),
    ...(reason ? { reason } : {}),
  };
}

export async function recordAuditEvent(
  executor: AuditInsertDatabase,
  req: Request | undefined,
  input: {
    action: AuditAction;
    targetType: string;
    targetId: string;
    outcome: AuditOutcome;
    changeSummary: AuditChangeSummary;
    actor?: { id: string; role: string };
  },
): Promise<void> {
  const actor = input.actor ?? (req ? getRequestActor(req) : { id: "system", role: "system" });
  const requestId = req?.id === undefined ? "system" : String(req.id);
  const occurredAt = new Date();

  await executor.insert(auditEventsTable).values({
    id: randomUUID(),
    actorId: actor.id,
    actorRole: actor.role,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    occurredAt: occurredAt.toISOString(),
    retentionUntil: addAuditRetentionYears(occurredAt, 7),
    requestId,
    outcome: input.outcome,
    changeSummary: input.changeSummary,
  });
}
