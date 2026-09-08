import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  text,
} from "drizzle-orm/pg-core";

export const retentionRecordTypes = [
  "source_notes",
  "derived_evidence",
  "scoped_exports",
  "application_logs",
  "audit_events",
  "backups",
] as const;

export type RetentionRecordType = (typeof retentionRecordTypes)[number];

export const retentionPolicies = [
  {
    recordType: "source_notes",
    retentionDays: 730,
    anchor: "discovery_close",
    disposalRule:
      "Privacy administrator archives or deletes the exact source-note records after owner approval.",
    enforcement:
      "Database policy plus an authorized retention action; legal holds override expiry.",
  },
  {
    recordType: "derived_evidence",
    retentionDays: 1095,
    anchor: "discovery_close",
    disposalRule:
      "Delete or anonymize derived evidence and opportunity assessments when no longer needed to substantiate an approved decision.",
    enforcement:
      "Database policy plus an authorized retention action; legal holds override expiry.",
  },
  {
    recordType: "scoped_exports",
    retentionDays: 30,
    anchor: "creation",
    disposalRule:
      "The API does not persist responses; authorized downstream copies must be encrypted and destroyed at expiry.",
    enforcement:
      "Request-correlated export audit event and downstream owner-controlled deletion.",
  },
  {
    recordType: "application_logs",
    retentionDays: 30,
    anchor: "creation",
    disposalRule:
      "Redacted application/request logs age out through the platform's managed log-disposal controls.",
    enforcement:
      "Managed platform log retention; raw notes and secrets are never written to logs.",
  },
  {
    recordType: "audit_events",
    retentionDays: 2555,
    anchor: "event",
    disposalRule:
      "Audit events remain append-only and are deleted only by an approved, request-correlated retention action after the seven-year window.",
    enforcement:
      "Database row-level security and append-only policy; legal holds override expiry.",
  },
  {
    recordType: "backups",
    retentionDays: 35,
    anchor: "backup_generation",
    disposalRule:
      "Managed database backup generations age out automatically; deletion requests complete after the applicable backup window.",
    enforcement:
      "Managed database backup lifecycle; no production backup is copied into development.",
  },
] as const;

export type RetentionPolicy = (typeof retentionPolicies)[number];

export const retentionPoliciesTable = pgTable(
  "discovery_retention_policies",
  {
    recordType: text("record_type").primaryKey(),
    retentionDays: integer("retention_days").notNull(),
    anchor: text("anchor").notNull(),
    disposalRule: text("disposal_rule").notNull(),
    enforcement: text("enforcement").notNull(),
    requiresLegalHoldCheck: boolean("requires_legal_hold_check")
      .notNull()
      .default(true),
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    check(
      "retention_policy_record_type_valid",
      sql`${table.recordType} in ('source_notes', 'derived_evidence', 'scoped_exports', 'application_logs', 'audit_events', 'backups')`,
    ),
    check(
      "retention_policy_days_positive",
      sql`${table.retentionDays} > 0`,
    ),
    check(
      "retention_policy_approved_schedule",
      sql`(${table.recordType} = 'source_notes' and ${table.retentionDays} = 730)
        or (${table.recordType} = 'derived_evidence' and ${table.retentionDays} = 1095)
        or (${table.recordType} = 'scoped_exports' and ${table.retentionDays} = 30)
        or (${table.recordType} = 'application_logs' and ${table.retentionDays} = 30)
        or (${table.recordType} = 'audit_events' and ${table.retentionDays} = 2555)
        or (${table.recordType} = 'backups' and ${table.retentionDays} = 35)`,
    ),
    pgPolicy("retention_policies_read", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
    pgPolicy("retention_policies_insert", {
      for: "insert",
      to: "public",
      withCheck: sql`${table.retentionDays} > 0`,
    }),
  ],
).enableRLS();

export const discoverySessionsTable = pgTable("discovery_sessions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  stakeholder: text("stakeholder").notNull(),
  role: text("role").notNull(),
  track: text("track").notNull(),
  status: text("status").notNull(),
  scheduledAt: text("scheduled_at").notNull(),
  completedAt: text("completed_at"),
  summary: text("summary").notNull().default(""),
  questionCount: integer("question_count").notNull().default(0),
  evidenceCount: integer("evidence_count").notNull().default(0),
});

export const opportunitiesTable = pgTable("discovery_opportunities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  area: text("area").notNull(),
  description: text("description").notNull(),
  score: numeric("score", { precision: 3, scale: 1 }).notNull(),
  priority: text("priority").notNull(),
  status: text("status").notNull(),
  confidence: integer("confidence").notNull(),
  owner: text("owner").notNull(),
  impact: integer("impact").notNull(),
  feasibility: integer("feasibility").notNull(),
  dataReadiness: integer("data_readiness").notNull(),
  risk: integer("risk").notNull(),
  sourceCount: integer("source_count").notNull(),
});

export const evidenceTable = pgTable("discovery_evidence", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  detail: text("detail").notNull(),
  type: text("type").notNull(),
  source: text("source").notNull(),
  confidence: integer("confidence").notNull(),
  sessionId: text("session_id"),
});

export const activityTable = pgTable("discovery_activity", {
  id: text("id").primaryKey(),
  text: text("text").notNull(),
  time: text("time").notNull(),
  kind: text("kind").notNull(),
});

export type AuditChangeSummary = {
  changedFields: string[];
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
};

export const auditEventsTable = pgTable(
  "discovery_audit_events",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").notNull(),
    actorRole: text("actor_role").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    occurredAt: text("occurred_at").notNull(),
    retentionUntil: text("retention_until")
      .notNull()
      // Keep the default expression simple enough for Replit's publish-time
      // schema diff serializer to round-trip as valid PostgreSQL.
      .default(sql`(CURRENT_DATE + 2555)::text`),
    requestId: text("request_id").notNull(),
    outcome: text("outcome").notNull(),
    changeSummary: jsonb("change_summary").$type<AuditChangeSummary>().notNull(),
  },
  (table) => [
    check("audit_event_actor_required", sql`length(trim(${table.actorId})) > 0`),
    check("audit_event_role_required", sql`length(trim(${table.actorRole})) > 0`),
    check("audit_event_request_required", sql`length(trim(${table.requestId})) > 0`),
    check("audit_event_target_required", sql`length(trim(${table.targetId})) > 0`),
    pgPolicy("audit_events_read", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
    pgPolicy("audit_events_insert", {
      for: "insert",
      to: "public",
      withCheck: sql`
        length(trim(${table.actorId})) > 0
        and length(trim(${table.actorRole})) > 0
        and length(trim(${table.requestId})) > 0
        and length(trim(${table.targetId})) > 0
        and ${table.retentionUntil} <> ''
      `,
    }),
  ],
).enableRLS();

export type RetentionActionDetails = {
  legalHold?: boolean;
  affectedRecordIds?: string[];
  notes?: string;
};

export const retentionActionsTable = pgTable(
  "discovery_retention_actions",
  {
    id: text("id").primaryKey(),
    recordType: text("record_type").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    actorId: text("actor_id").notNull(),
    actorRole: text("actor_role").notNull(),
    requestId: text("request_id").notNull(),
    authorizationReference: text("authorization_reference").notNull(),
    reason: text("reason").notNull(),
    cutoffAt: text("cutoff_at").notNull(),
    affectedCount: integer("affected_count").notNull().default(0),
    outcome: text("outcome").notNull(),
    executedAt: text("executed_at").notNull(),
    details: jsonb("details").$type<RetentionActionDetails>().notNull(),
  },
  (table) => [
    check(
      "retention_action_record_type_valid",
      sql`${table.recordType} in ('source_notes', 'derived_evidence', 'scoped_exports', 'application_logs', 'audit_events', 'backups')`,
    ),
    check(
      "retention_action_action_valid",
      sql`${table.action} in ('expire', 'archive', 'anonymize')`,
    ),
    check(
      "retention_action_actor_authorized",
      sql`${table.actorRole} in ('administrator', 'system')`,
    ),
    check(
      "retention_action_request_required",
      sql`length(trim(${table.requestId})) > 0`,
    ),
    check(
      "retention_action_authorization_required",
      sql`length(trim(${table.authorizationReference})) > 0`,
    ),
    check(
      "retention_action_reason_required",
      sql`length(trim(${table.reason})) > 0`,
    ),
    check(
      "retention_action_count_nonnegative",
      sql`${table.affectedCount} >= 0`,
    ),
    check(
      "retention_action_outcome_valid",
      sql`${table.outcome} in ('success', 'rejected', 'error')`,
    ),
    pgPolicy("retention_actions_read", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
    pgPolicy("retention_actions_insert", {
      for: "insert",
      to: "public",
      withCheck: sql`
        ${table.actorRole} in ('administrator', 'system')
        and length(trim(${table.requestId})) > 0
        and length(trim(${table.authorizationReference})) > 0
        and length(trim(${table.reason})) > 0
      `,
    }),
  ],
).enableRLS();

export const proposalPhasesTable = pgTable("proposal_phases", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  window: text("window").notNull(),
  budgetUf: integer("budget_uf").notNull(),
  objective: text("objective").notNull(),
  status: text("status").notNull(),
  progress: integer("progress").notNull().default(0),
  deadline: text("deadline"),
});

export const stakeholdersTable = pgTable("discovery_stakeholders", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  organization: text("organization").notNull(),
  role: text("role").notNull(),
  keyPoints: text("key_points").notNull().default(""),
  power: integer("power").notNull(),
  interest: integer("interest").notNull(),
  stance: text("stance").notNull(),
  confidence: text("confidence").notNull().default("working_hypothesis"),
});