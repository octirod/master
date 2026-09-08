import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import test from "node:test";
import express, { type Request } from "express";
import { eq, inArray } from "drizzle-orm";
import {
  auditEventsTable,
  db,
  discoverySessionsTable,
} from "@workspace/db";
import { canManagePrivacy, redactSensitiveFields } from "./access";
import type { WorkspaceRole } from "./access";
import { recordAuditEvent, safeChangeSummary } from "./audit";
import discoveryRouter from "../routes/discovery";

test("read-only responses redact sensitive fields while facilitators can see them", () => {
  const record = {
    id: "stakeholder-1",
    name: "Named person",
    keyPoints: "Sensitive interview note",
    power: 4,
  };

  assert.deepEqual(
      redactSensitiveFields({ ...record }, ["name", "keyPoints"], "read_only"),
    {
      id: "stakeholder-1",
      name: "[REDACTED]",
      keyPoints: "[REDACTED]",
      power: 4,
    },
  );
  assert.deepEqual(
      redactSensitiveFields({ ...record }, ["name", "keyPoints"], "facilitator"),
    record,
  );
});

test("safe change summaries keep sensitive before/after values out of audit events", () => {
  const summary = safeChangeSummary(
    { status: "planned", summary: "Private note" },
    { status: "completed", summary: "Updated private note" },
    ["summary"],
  );

  assert.deepEqual(summary.changedFields, ["status", "summary"]);
  assert.equal(summary.before?.summary, "[REDACTED]");
  assert.equal(summary.after?.summary, "[REDACTED]");
  assert.equal(summary.before?.status, "planned");
  assert.equal(summary.after?.status, "completed");
});

test("privacy actions require the privacy administrator role and are audit-shaped", async () => {
  assert.equal(canManagePrivacy("read_only"), false);
  assert.equal(canManagePrivacy("editor"), false);
  assert.equal(canManagePrivacy("administrator"), true);

  const inserted: Record<string, unknown>[] = [];
  const executor = {
    insert: () => ({
      values: (event: Record<string, unknown>) => {
        inserted.push(event);
      },
    }),
  };

  await recordAuditEvent(executor as never, undefined, {
    action: "export",
    targetType: "workspace",
    targetId: "all",
    outcome: "success",
      actor: { id: "privacy-user", role: "administrator" },
    changeSummary: safeChangeSummary(undefined, { evidence: 2 }),
  });
  await recordAuditEvent(executor as never, undefined, {
    action: "delete",
    targetType: "evidence",
    targetId: "evidence-1",
    outcome: "success",
      actor: { id: "privacy-user", role: "administrator" },
    changeSummary: safeChangeSummary(undefined, undefined, [], "approved deletion"),
  });

  assert.equal(inserted.length, 2);
  assert.equal(inserted[0]?.action, "export");
  assert.equal(inserted[1]?.action, "delete");
  assert.equal(inserted[1]?.requestId, "system");
});

const privacyTestApp = express();
privacyTestApp.use(express.json());
privacyTestApp.use((req, _res, next) => {
  const role = req.header("x-test-role");
  if (role) {
    req.user = {
      id: req.header("x-test-actor") ?? "privacy-test-user",
      role: role as WorkspaceRole,
    };
  }
  (req as Request & { id?: string }).id =
    req.header("x-test-request-id") ?? randomUUID();
  next();
});
privacyTestApp.use("/api", discoveryRouter);

async function startPrivacyTestServer(): Promise<{
  server: Server;
  baseUrl: string;
}> {
  const server = createServer(privacyTestApp);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}/api`,
  };
}

async function stopPrivacyTestServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function privacyRequest(
  baseUrl: string,
  path: string,
  options: {
    role: WorkspaceRole;
    actorId?: string;
    requestId: string;
    method?: "GET" | "POST";
    body?: Record<string, string>;
  },
): Promise<{ status: number; body: Record<string, any> }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      "x-test-role": options.role,
      "x-test-actor": options.actorId ?? "privacy-test-user",
      "x-test-request-id": options.requestId,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, any>,
  };
}

test("authenticated privacy flows enforce scope, exact targets, and traceable audit events", async () => {
  const { server, baseUrl } = await startPrivacyTestServer();
  const fixtureId = `privacy-test-${randomUUID()}`;
  const decoyId = `privacy-test-decoy-${randomUUID()}`;
  const actorId = "privacy-administrator";
  const sensitiveValue = `raw-sensitive-value-${randomUUID()}`;
  const requestIds = [
    `privacy-export-${randomUUID()}`,
    `privacy-idor-${randomUUID()}`,
    `privacy-delete-${randomUUID()}`,
  ];

  await db.insert(discoverySessionsTable).values([
    {
      id: fixtureId,
      title: "Privacy test record",
      stakeholder: "Test stakeholder",
      role: "Test role",
      track: "Test",
      status: "completed",
      scheduledAt: "2026-09-07T09:00:00.000Z",
      completedAt: "2026-09-07T10:00:00.000Z",
      summary: sensitiveValue,
      questionCount: 1,
      evidenceCount: 1,
    },
    {
      id: decoyId,
      title: "Privacy test decoy",
      stakeholder: "Decoy stakeholder",
      role: "Test role",
      track: "Test",
      status: "planned",
      scheduledAt: "2026-09-07T11:00:00.000Z",
      completedAt: null,
      summary: "Decoy record",
      questionCount: 0,
      evidenceCount: 0,
    },
  ]);

  try {
    const exportResult = await privacyRequest(baseUrl, "/privacy/export", {
      role: "administrator",
      actorId,
      requestId: requestIds[0],
      method: "POST",
      body: { scope: "source_notes" },
    });
    assert.equal(exportResult.status, 200);
    assert.equal(exportResult.body.scope, "source_notes");
    assert.deepEqual(Object.keys(exportResult.body.data).sort(), [
      "sessions",
      "stakeholders",
    ]);
    assert.equal("opportunities" in exportResult.body.data, false);
    assert.equal("evidence" in exportResult.body.data, false);
    assert.equal("phases" in exportResult.body.data, false);
    assert.equal("activity" in exportResult.body.data, false);

    const exportAudit = await db
      .select()
      .from(auditEventsTable)
      .where(eq(auditEventsTable.requestId, requestIds[0]));
    assert.equal(exportAudit.length, 1);
    assert.equal(exportAudit[0]?.actorId, actorId);
    assert.equal(exportAudit[0]?.actorRole, "administrator");
    assert.equal(exportAudit[0]?.action, "export");
    assert.equal(exportAudit[0]?.targetType, "workspace");
    assert.equal(exportAudit[0]?.targetId, "source_notes");
    assert.equal(exportAudit[0]?.outcome, "success");
    assert.equal(
      JSON.stringify(exportAudit[0]?.changeSummary).includes(sensitiveValue),
      false,
    );

    for (const role of ["read_only", "editor"] as const) {
      const auditResult = await privacyRequest(baseUrl, "/privacy/audit", {
        role,
        requestId: `privacy-audit-${role}-${randomUUID()}`,
      });
      assert.equal(auditResult.status, 403);

      const deniedExport = await privacyRequest(baseUrl, "/privacy/export", {
        role,
        requestId: `privacy-denied-export-${role}-${randomUUID()}`,
        method: "POST",
        body: { scope: "source_notes" },
      });
      assert.equal(deniedExport.status, 403);

      const deniedDelete = await privacyRequest(baseUrl, "/privacy/delete", {
        role,
        requestId: `privacy-denied-delete-${role}-${randomUUID()}`,
        method: "POST",
        body: {
          targetType: "session",
          targetId: fixtureId,
          reason: "attempted IDOR",
        },
      });
      assert.equal(deniedDelete.status, 403);
    }

    const editorTarget = await db
      .select()
      .from(discoverySessionsTable)
      .where(eq(discoverySessionsTable.id, fixtureId));
    assert.equal(editorTarget.length, 1);

    const idorResult = await privacyRequest(baseUrl, "/privacy/delete", {
      role: "administrator",
      actorId,
      requestId: requestIds[1],
      method: "POST",
      body: {
        targetType: "stakeholder",
        targetId: fixtureId,
        reason: "wrong-table IDOR attempt",
      },
    });
    assert.equal(idorResult.status, 404);
    const idorTarget = await db
      .select()
      .from(discoverySessionsTable)
      .where(eq(discoverySessionsTable.id, fixtureId));
    assert.equal(idorTarget.length, 1);

    const deleteResult = await privacyRequest(baseUrl, "/privacy/delete", {
      role: "administrator",
      actorId,
      requestId: requestIds[2],
      method: "POST",
      body: {
        targetType: "session",
        targetId: fixtureId,
        reason: sensitiveValue,
      },
    });
    assert.equal(deleteResult.status, 200);
    assert.deepEqual(deleteResult.body, {
      targetType: "session",
      targetId: fixtureId,
      deletedCount: 1,
    });

    const deletedTarget = await db
      .select()
      .from(discoverySessionsTable)
      .where(eq(discoverySessionsTable.id, fixtureId));
    const preservedDecoy = await db
      .select()
      .from(discoverySessionsTable)
      .where(eq(discoverySessionsTable.id, decoyId));
    assert.equal(deletedTarget.length, 0);
    assert.equal(preservedDecoy.length, 1);

    const deletionAudit = await db
      .select()
      .from(auditEventsTable)
      .where(eq(auditEventsTable.requestId, requestIds[2]));
    assert.equal(deletionAudit.length, 1);
    assert.equal(deletionAudit[0]?.actorId, actorId);
    assert.equal(deletionAudit[0]?.actorRole, "administrator");
    assert.equal(deletionAudit[0]?.action, "delete");
    assert.equal(deletionAudit[0]?.targetType, "session");
    assert.equal(deletionAudit[0]?.targetId, fixtureId);
    assert.equal(deletionAudit[0]?.requestId, requestIds[2]);
    assert.equal(deletionAudit[0]?.outcome, "success");
    assert.equal(
      JSON.stringify(deletionAudit[0]?.changeSummary).includes(sensitiveValue),
      false,
    );

    const idorAudit = await db
      .select()
      .from(auditEventsTable)
      .where(eq(auditEventsTable.requestId, requestIds[1]));
    assert.equal(idorAudit.length, 1);
    assert.equal(idorAudit[0]?.targetType, "stakeholder");
    assert.equal(idorAudit[0]?.targetId, fixtureId);
    assert.equal(idorAudit[0]?.outcome, "not_found");
  } finally {
    await db
      .delete(discoverySessionsTable)
      .where(inArray(discoverySessionsTable.id, [fixtureId, decoyId]));
    await db
      .delete(auditEventsTable)
      .where(inArray(auditEventsTable.requestId, requestIds));
    await stopPrivacyTestServer(server);
  }
});