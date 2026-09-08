import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  activityTable,
  auditEventsTable,
  db,
  discoverySessionsTable,
  evidenceTable,
  opportunitiesTable,
  proposalPhasesTable,
  retentionPolicies,
  retentionPoliciesTable,
  stakeholdersTable,
} from "@workspace/db";
import {
  CreateStakeholderBody,
  CreateStakeholderResponse,
  CreateOpportunityBody,
  CreateOpportunityResponse,
  CreateSessionBody,
  CreateSessionResponse,
  GetActivityResponse,
  GetDashboardResponse,
  GetEvidenceResponse,
  GetOpportunitiesResponse,
  GetProposalStrategyResponse,
  GetSessionsResponse,
  GetStakeholdersResponse,
  UpdateOpportunityBody,
  UpdateOpportunityParams,
  UpdateOpportunityResponse,
  UpdateProposalPhaseBody,
  UpdateProposalPhaseParams,
  UpdateProposalPhaseResponse,
  UpdateSessionBody,
  UpdateSessionParams,
  UpdateSessionResponse,
  UpdateStakeholderBody,
  UpdateStakeholderParams,
  UpdateStakeholderResponse,
} from "@workspace/api-zod";
import {
  canManagePrivacy,
  getRequestActor,
  redactSensitiveFields,
} from "../lib/access";
import { requireRole } from "../middlewares/auth";
import {
  recordAuditEvent,
  safeChangeSummary,
  type AuditAction,
  type AuditOutcome,
} from "../lib/audit";

const router: IRouter = Router();

const sessionSensitiveFields = ["stakeholder", "summary"] as const;
const stakeholderSensitiveFields = ["name", "organization", "role", "keyPoints"] as const;
const opportunitySensitiveFields = ["description", "owner"] as const;
const evidenceSensitiveFields = ["detail", "source"] as const;
const phaseSensitiveFields = ["objective", "budgetUf"] as const;

const ExportRequestBody = z.object({
  scope: z.enum(["source_notes", "derived_evidence", "all"]),
});

const DeleteRequestBody = z.object({
  targetType: z.enum(["session", "stakeholder", "opportunity", "evidence", "proposal_phase"]),
  targetId: z.string().min(1),
  reason: z.string().trim().min(1).max(500),
});

function auditFailure(
  req: Parameters<typeof getRequestActor>[0],
  action: AuditAction,
  targetType: string,
  targetId: string,
  outcome: AuditOutcome,
  reason: string,
): Promise<void> {
  return recordAuditEvent(db, req, {
    action,
    targetType,
    targetId,
    outcome,
    changeSummary: safeChangeSummary(undefined, undefined, [], reason),
  });
}

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "unknown" : value ?? "unknown";
}

const seedSessions = [
  {
    id: "ses-exec",
    title: "Executive ambition & value thesis",
    stakeholder: "María Silva",
    role: "Chief Operating Officer",
    track: "Executive",
    status: "completed",
    scheduledAt: "2026-09-01T09:00:00-04:00",
    completedAt: "2026-09-01T10:05:00-04:00",
    summary:
      "Service reliability and exception recovery are the strongest strategic levers. Leadership wants evidence-led pilots with visible human control.",
    questionCount: 18,
    evidenceCount: 7,
  },
  {
    id: "ses-dispatch",
    title: "Dispatch exceptions & escalation",
    stakeholder: "Carlos Muñoz",
    role: "National Control Tower Lead",
    track: "Operations",
    status: "completed",
    scheduledAt: "2026-09-02T11:00:00-04:00",
    completedAt: "2026-09-02T12:15:00-04:00",
    summary:
      "Dispatchers monitor several disconnected views and rely on tacit knowledge to decide which deviations require intervention.",
    questionCount: 24,
    evidenceCount: 11,
  },
  {
    id: "ses-fleet",
    title: "Maintenance signals & workshop flow",
    stakeholder: "Jorge Rojas",
    role: "Fleet Maintenance Director",
    track: "Fleet",
    status: "in_progress",
    scheduledAt: "2026-09-04T15:00:00-04:00",
    completedAt: null,
    summary:
      "Validating access to odometer, fault-code, inspection, and workshop-capacity data.",
    questionCount: 12,
    evidenceCount: 4,
  },
  {
    id: "ses-data",
    title: "Systems, data & integration readiness",
    stakeholder: "Ana Torres",
    role: "Head of Data Platforms",
    track: "Technology",
    status: "planned",
    scheduledAt: "2026-09-07T10:00:00-04:00",
    completedAt: null,
    summary: "Planned deep dive into TMS, telematics, ERP, data ownership, and API constraints.",
    questionCount: 0,
    evidenceCount: 0,
  },
] as const;

const reconciledSessions = [
  {
    id: "ses-drive-proposal",
    title: "Proposal positioning & human-in-command",
    stakeholder: "Agustín Jorquera S. + Roderick Woolvett",
    role: "Executive and program sponsors",
    track: "Strategy",
    status: "completed",
    scheduledAt: "2026-08-03T17:23:00-04:00",
    completedAt: "2026-08-03T18:30:00-04:00",
    summary:
      "Drive meeting notes: reposition the work as a project, keep humans in command, deliver module by module, and address change resistance without bypassing internal hierarchies.",
    questionCount: 8,
    evidenceCount: 5,
  },
  {
    id: "ses-drive-ti",
    title: "ÓRBITA + IT architecture and platform constraints",
    stakeholder: "Héctor Salcedo / IT working session",
    role: "Technology and integration stakeholder",
    track: "Technology",
    status: "completed",
    scheduledAt: "2026-08-27T14:21:00-04:00",
    completedAt: "2026-08-27T15:45:00-04:00",
    summary:
      "Drive meeting notes: operational data is fragmented, MSOFT is rigid around closed trips, an in-house platform was discussed, and SII Resolution 154 creates a November 1 compliance window.",
    questionCount: 13,
    evidenceCount: 6,
  },
  {
    id: "ses-drive-adrian",
    title: "Commercial requirements, glossary & availability",
    stakeholder: "Adrián Maldonado",
    role: "Planning and commercial-operations stakeholder",
    track: "Commercial",
    status: "completed",
    scheduledAt: "2026-08-31T14:58:00-04:00",
    completedAt: "2026-08-31T16:15:00-04:00",
    summary:
      "Drive meeting notes: standardize client requirements, definitions, active-client rules, trip terminology, availability, maintenance, tolls, and structured spot quotation capture.",
    questionCount: 16,
    evidenceCount: 7,
  },
  {
    id: "ses-drive-carlos",
    title: "Discovery: data quality, maintenance & prioritization",
    stakeholder: "Carlos Manosalva",
    role: "Second-in-command and operational-accountability stakeholder",
    track: "Operations",
    status: "completed",
    scheduledAt: "2026-09-04T09:02:00-04:00",
    completedAt: "2026-09-04T10:35:00-04:00",
    summary:
      "Drive meeting notes: prioritize digitizing current workflows, normalize heterogeneous provider data, address incomplete work orders and month-end corrections, and select three high-value initiatives from ten problems.",
    questionCount: 20,
    evidenceCount: 9,
  },
  {
    id: "ses-pdf-adrian",
    title: "Process focus, quotations & nominal hours",
    stakeholder: "Adrián Maldonado",
    role: "Subgerente de Planificación",
    track: "Commercial",
    status: "completed",
    scheduledAt: "2026-08-31T09:00:00-04:00",
    completedAt: "2026-08-31T10:00:00-04:00",
    summary:
      "Attached handwritten note: the process begins with the client request; key themes include data capture across areas, commercial/spot quotations, nominal hours, availability and utilization factors, and the mechanical/documentary unit of transport. Some handwritten terms remain subject to transcription validation.",
    questionCount: 6,
    evidenceCount: 4,
  },
  {
    id: "ses-pdf-carlos-1",
    title: "Client requests, resource management & incidents",
    stakeholder: "Carlos Manosalva",
    role: "Second-in-command and operational-accountability stakeholder",
    track: "Operations",
    status: "completed",
    scheduledAt: "2026-09-04T09:00:00-04:00",
    completedAt: "2026-09-04T10:00:00-04:00",
    summary:
      "Attached handwritten note: fragmented data from client tenders and management requests, the need to improve resource and shift management, no incident-management system, and urgent ENEX requests including tanker-seal handling.",
    questionCount: 5,
    evidenceCount: 4,
  },
  {
    id: "ses-pdf-carlos-2",
    title: "GESMO platform, maintenance & control gaps",
    stakeholder: "Carlos Manosalva + Héctor Maldonado",
    role: "Operations and IT working session",
    track: "Technology",
    status: "completed",
    scheduledAt: "2026-09-04T11:00:00-04:00",
    completedAt: "2026-09-04T12:00:00-04:00",
    summary:
      "Attached handwritten note: the GESMO web platform is used as the working context; priorities include technology adoption and ease of use, maintenance visibility, incorrect or parallel data capture, weak trip closure control, alerts without a matrix, and AI for QA/documentation.",
    questionCount: 7,
    evidenceCount: 6,
  },
  {
    id: "ses-pdf-kickoff",
    title: "Kickoff — GateControl, fleet visibility & governance",
    stakeholder:
      "Agustín Jorquera, Roderick W. · Rodrigo Gandara, Viviana Aqueveque & Héctor Salcedo",
    role: "Project organizers and confirmed JTSA kickoff participants",
    track: "Strategy",
    status: "completed",
    scheduledAt: "2026-08-21T11:00:00-04:00",
    completedAt: "2026-08-21T11:30:00-04:00",
    summary:
      "Apple Notes review completed against the provisional kickoff scan. Confirmed attendees: Agustín Jorquera and Roderick W. (project organizers), plus Rodrigo Gandara (Gerente de Comercial), Viviana Aqueveque (Presidenta del Directorio), and Héctor Salcedo (Jefe Área TI). Confirmed direction: use GateControl and intelligent fleet tracking to identify actual departures and in-route activity and address the reported “hacer tierra” practice; Héctor also confirmed the need to relate GateControl to Puerto Seco's existing plate-reading system. Recorded follow-ups: Agustín to arrange a presentation with Carlos Manosalva (date not defined); Agustín/Roderick to hold a remote session with Héctor and Jorge on 2026-08-28. Open question: whether Essex maintenance and spare-parts scope belongs in this project, and if not, how to address that customer need initially. Governance-bar and work-environment proposals remain recorded tasks, not confirmed decisions.",
    questionCount: 6,
    evidenceCount: 5,
  },
  {
    id: "ses-pdf-viviana",
    title: "Operating structure & transformation mandate",
    stakeholder: "Viviana Aqueveque",
    role: "Financial Manager and operational decision validator",
    track: "Finance",
    status: "completed",
    scheduledAt: "2026-09-01T10:30:00-04:00",
    completedAt: "2026-09-01T11:15:00-04:00",
    summary:
      "Attached handwritten note: Viviana is identified as Gerente de Administración y Finanzas; IT is noted as reporting through administration via Carlos Manosalva. The work areas include commercial/legal structure, operations technology, a three-month discovery, and a longer delivery horizon. Delivery duration needs confirmation before being treated as a commitment.",
    questionCount: 5,
    evidenceCount: 3,
  },
  {
    id: "ses-pdf-victor",
    title: "Founder perspective, urgency & ÓRBITA value",
    stakeholder: "Victor Jorquera",
    role: "Founder and General Manager",
    track: "Executive",
    status: "completed",
    scheduledAt: "2026-09-04T15:00:00-04:00",
    completedAt: "2026-09-04T16:00:00-04:00",
    summary:
      "Attached handwritten note: Victor frames the value around the company and its sales problem, supports an agentic layer with an intermediate human touch during technical exploration, and emphasizes urgency plus data. The notes also mention a staged sales presentation and a faster-than-market proposition; the commercial claim requires validation.",
    questionCount: 8,
    evidenceCount: 4,
  },
] as const;

const seedOpportunities = [
  {
    id: "opp-exception",
    name: "Trip exception copilot",
    area: "Control tower",
    description:
      "Monitor active trips, explain meaningful deviations, recommend the next action, and prepare the escalation or customer communication.",
    score: "4.7",
    priority: "high",
    status: "pilot",
    confidence: 88,
    owner: "Operations",
    impact: 5,
    feasibility: 4,
    dataReadiness: 4,
    risk: 2,
    sourceCount: 18,
  },
  {
    id: "opp-eta",
    name: "Proactive ETA communication",
    area: "Customer operations",
    description:
      "Generate context-aware ETA updates and service-recovery messages when trip conditions change.",
    score: "4.3",
    priority: "high",
    status: "shortlist",
    confidence: 79,
    owner: "Customer service",
    impact: 4,
    feasibility: 5,
    dataReadiness: 4,
    risk: 2,
    sourceCount: 12,
  },
  {
    id: "opp-maintenance",
    name: "Maintenance coordination agent",
    area: "Fleet",
    description:
      "Combine mileage, fault signals, inspections, and workshop capacity to recommend service windows without disrupting commitments.",
    score: "3.9",
    priority: "medium",
    status: "validate",
    confidence: 61,
    owner: "Fleet maintenance",
    impact: 5,
    feasibility: 3,
    dataReadiness: 2,
    risk: 3,
    sourceCount: 8,
  },
  {
    id: "opp-docs",
    name: "Trip document assurance",
    area: "Compliance",
    description:
      "Extract, reconcile, and flag missing or inconsistent delivery and inspection documentation for review.",
    score: "3.6",
    priority: "medium",
    status: "validate",
    confidence: 72,
    owner: "Compliance",
    impact: 3,
    feasibility: 4,
    dataReadiness: 3,
    risk: 2,
    sourceCount: 6,
  },
] as const;

const seedEvidence = [
  {
    id: "ev-1",
    label: "Exception triage depends on tacit knowledge",
    detail:
      "Experienced dispatchers combine route context, customer importance, and driver calls to decide which deviations deserve immediate action.",
    type: "fact",
    source: "Dispatch interview",
    confidence: 92,
    sessionId: "ses-dispatch",
  },
  {
    id: "ev-2",
    label: "More than 22,000 monthly trips",
    detail:
      "The operating volume makes manual monitoring and consistent exception treatment structurally difficult.",
    type: "fact",
    source: "Executive briefing",
    confidence: 100,
    sessionId: "ses-exec",
  },
  {
    id: "ev-3",
    label: "Telematics events may be available near real time",
    detail:
      "The team believes position and selected vehicle events can be consumed through an existing integration layer; latency and retention remain unverified.",
    type: "assumption",
    source: "Fleet interview",
    confidence: 58,
    sessionId: "ses-fleet",
  },
  {
    id: "ev-4",
    label: "Human approval required for customer-impacting actions",
    detail:
      "Initial pilots should recommend and draft actions while operations personnel retain final approval.",
    type: "signal",
    source: "Executive interview",
    confidence: 96,
    sessionId: "ses-exec",
  },
  {
    id: "ev-5",
    label: "Which system owns the canonical trip status?",
    detail:
      "TMS, telematics, and customer-service views may disagree; the authoritative source and reconciliation policy must be confirmed.",
    type: "question",
    source: "Discovery synthesis",
    confidence: 100,
    sessionId: null,
  },
] as const;

const reconciledEvidence = [
  {
    id: "ev-recon-1",
    label: "Operational inputs are fragmented across channels",
    detail:
      "The Drive synthesis describes operational data spread across email, Excel, phone calls, and WhatsApp; Carlos's notes add client tenders and management requests as separate sources.",
    type: "fact",
    source: "Drive meeting summaries · Carlos Manosalva PDFs",
    confidence: 96,
    sessionId: "ses-drive-carlos",
  },
  {
    id: "ev-recon-2",
    label: "Incomplete work orders distort availability",
    detail:
      "The existing synthesis reports incomplete work orders and inconsistent data entry that distort fleet-availability indicators, including a reported artificial overload in maintenance capacity.",
    type: "fact",
    source: "Drive summary · Discovery ÓRBITA-Carlos Manosalva",
    confidence: 91,
    sessionId: "ses-drive-carlos",
  },
  {
    id: "ev-recon-3",
    label: "Maintenance visibility is a named gap",
    detail:
      "Carlos and Héctor's attached note explicitly marks maintenance as unavailable or insufficiently visible and calls for better use of technology and resources.",
    type: "fact",
    source: "Carlos Manosalva + Héctor Maldonado PDF",
    confidence: 94,
    sessionId: "ses-pdf-carlos-2",
  },
  {
    id: "ev-recon-4",
    label: "Trip closures and alerts lack consistent control",
    detail:
      "The attached Carlos/Héctor note identifies weak trip-closure control and alerts without a defined matrix; the policy for escalation is not yet documented.",
    type: "fact",
    source: "Carlos Manosalva + Héctor Maldonado PDF",
    confidence: 91,
    sessionId: "ses-pdf-carlos-2",
  },
  {
    id: "ev-recon-5",
    label: "A normalization layer is needed for provider data",
    detail:
      "Existing meeting notes describe heterogeneous JSON from providers and the need to normalize inputs before downstream analysis or agents can rely on them.",
    type: "signal",
    source: "Drive summary · ÓRBITA + TI",
    confidence: 88,
    sessionId: "ses-drive-ti",
  },
  {
    id: "ev-recon-6",
    label: "Client requirements drive the process",
    detail:
      "Adrián's note starts the process with the client request and highlights data capture across areas, commercial/spot quotations, and the need for a shared operational glossary.",
    type: "fact",
    source: "Adrián Maldonado PDF · Drive Adrián summary",
    confidence: 89,
    sessionId: "ses-pdf-adrian",
  },
  {
    id: "ev-recon-7",
    label: "Nominal hours, availability and utilization affect costing",
    detail:
      "The handwritten planning note connects nominal hours with availability and utilization factors versus fixed truck cost; the exact handwritten formula still needs transcription confirmation.",
    type: "signal",
    source: "Adrián Maldonado PDF",
    confidence: 78,
    sessionId: "ses-pdf-adrian",
  },
  {
    id: "ev-recon-8",
    label: "Viviana validates operational decisions",
    detail:
      "User-provided stakeholder clarification identifies Viviana as Financial Manager, operationally running the company, validating every decision, and strongly supporting organizing and displaying company data.",
    type: "fact",
    source: "Stakeholder clarification · 2026-09-07",
    confidence: 100,
    sessionId: "ses-pdf-viviana",
  },
  {
    id: "ev-recon-9",
    label: "Victor is the founder-level sponsor",
    detail:
      "User-provided clarification identifies Victor as founder and General Manager, expected to support the direction approved by his team and Viviana; his attached note emphasizes urgency and data.",
    type: "fact",
    source: "Stakeholder clarification · Victor Jorquera PDF",
    confidence: 98,
    sessionId: "ses-pdf-victor",
  },
  {
    id: "ev-recon-10",
    label: "Carlos wants a broad organizing capability",
    detail:
      "User-provided clarification says Carlos wants a new proposal and a 'super agent' to organize everything, while the intended answer presented to him is a governed squad of agents under a central command bar and IT governance.",
    type: "signal",
    source: "Stakeholder clarification · Carlos Manosalva PDFs",
    confidence: 95,
    sessionId: "ses-pdf-carlos-1",
  },
  {
    id: "ev-recon-11",
    label: "Carlos's commercial alignment is unresolved",
    detail:
      "It is not yet known whether Carlos has reviewed the same proposal presented to Viviana and Victor or is negotiating from a high-stakes operational position.",
    type: "question",
    source: "Stakeholder clarification · Discovery synthesis",
    confidence: 100,
    sessionId: null,
  },
  {
    id: "ev-recon-12",
    label: "Rodrigo needs concrete value proof",
    detail:
      "User-provided clarification describes Rodrigo as enthusiastic about the ideas but skeptical about the concrete efficiency or value that will be delivered; the exact concern—ROI, delivery proof, adoption, or scope—is open.",
    type: "question",
    source: "Stakeholder clarification · Kickoff working note",
    confidence: 100,
    sessionId: null,
  },
  {
    id: "ev-recon-13",
    label: "IT ownership and browser-only access need validation",
    detail:
      "Héctor is described as keeping systems running, using Docker, Python and SQL, and integrating owned and outsourced systems. Formal decision rights and the client-owned systems accessible only through browser navigation remain to be mapped.",
    type: "assumption",
    source: "Stakeholder clarification · Héctor Maldonado",
    confidence: 86,
    sessionId: "ses-pdf-carlos-2",
  },
  {
    id: "ev-recon-14",
    label: "SII Resolution 154 creates a hard compliance window",
    detail:
      "The proposal and Drive notes identify November 1, 2026 as the deadline for digital dispatch-guide and tax compliance requirements.",
    type: "fact",
    source: "ÓRBITA proposal · Drive TI summary",
    confidence: 100,
    sessionId: "ses-drive-ti",
  },
] as const;

const kickoffEvidence = [
  {
    id: "ev-kickoff-attendees",
    label: "Kickoff attendees confirmed in reviewed notes",
    detail:
      "The reviewed kickoff note names Agustín Jorquera and Roderick W. as project organizers and records Rodrigo Gandara (Gerente de Comercial), Viviana Aqueveque (Presidenta del Directorio), and Héctor Salcedo (Jefe Área TI) as JTSA participants.",
    type: "fact",
    source: "Kickoff review · Notas_KickOff_21/08/2026 (Google Drive)",
    confidence: 100,
    sessionId: "ses-pdf-kickoff",
  },
  {
    id: "ev-kickoff-gate-control",
    label: "GateControl and intelligent fleet tracking are confirmed kickoff direction",
    detail:
      "The kickoff notes record GateControl and intelligent fleet tracking as the direction for identifying actual departure and in-route activity and addressing the reported “hacer tierra” practice.",
    type: "fact",
    source: "Kickoff review · Notas_KickOff_21/08/2026 (Google Drive)",
    confidence: 100,
    sessionId: "ses-pdf-kickoff",
  },
  {
    id: "ev-kickoff-puerto-seco",
    label: "GateControl should connect to Puerto Seco plate reading",
    detail:
      "Héctor Salcedo's kickoff contribution records the need to relate the GateControl solution to the plate-reading system already used at Puerto Seco and to integrate with existing IT platforms.",
    type: "signal",
    source: "Kickoff review · Notas_KickOff_21/08/2026 (Google Drive)",
    confidence: 96,
    sessionId: "ses-pdf-kickoff",
  },
  {
    id: "ev-kickoff-actions",
    label: "Kickoff follow-ups recorded",
    detail:
      "Agustín Jorquera is responsible for arranging a presentation with Carlos Manosalva (date not defined). Agustín Jorquera and Roderick W. are responsible for a remote session with Héctor Salcedo and Jorge on 2026-08-28.",
    type: "signal",
    source: "Kickoff review · Notas_KickOff_21/08/2026 (Google Drive)",
    confidence: 100,
    sessionId: "ses-pdf-kickoff",
  },
  {
    id: "ev-kickoff-essex-scope",
    label: "Should Essex maintenance and spare parts be in scope?",
    detail:
      "The note records this as a decision to define, not a confirmed inclusion: determine whether Essex maintenance and spare-parts work belongs in ÓRBITA and, if not, how to address the customer's need initially.",
    type: "question",
    source: "Kickoff review · Notas_KickOff_21/08/2026 (Google Drive)",
    confidence: 100,
    sessionId: "ses-pdf-kickoff",
  },
] as const;

const seedActivity = [
  { id: "act-1", text: "Trip exception copilot promoted to pilot candidate", time: "18 min ago", kind: "opportunity" },
  { id: "act-2", text: "Four evidence items captured from fleet maintenance", time: "2 hrs ago", kind: "evidence" },
  { id: "act-3", text: "Dispatch exception session completed", time: "2 days ago", kind: "session" },
  { id: "act-4", text: "Discovery scoring model initialized", time: "3 days ago", kind: "system" },
] as const;

const reconciledActivity = [
  { id: "act-recon-1", text: "Attached meeting notes reconciled into discovery sessions", time: "just now", kind: "session" },
  { id: "act-recon-2", text: "Stakeholder power map updated with Viviana, Victor, Rodrigo and Héctor", time: "just now", kind: "system" },
  { id: "act-recon-3", text: "Carlos and Héctor data-quality/control gaps logged as evidence", time: "just now", kind: "evidence" },
  { id: "act-recon-4", text: "Kickoff review completed; unresolved scope questions remain open", time: "just now", kind: "system" },
] as const;

const kickoffActivity = [
  {
    id: "act-kickoff-reviewed",
    text: "Kickoff attendees and decisions validated from reviewed notes",
    time: "2026-09-07",
    kind: "session",
  },
  {
    id: "act-kickoff-actions",
    text: "Kickoff follow-ups captured: Carlos presentation and Héctor/Jorge working session",
    time: "2026-09-07",
    kind: "system",
  },
] as const;

const proposalGoals = [
  {
    id: "goal-admin",
    title: "Reduce administrative re-entry",
    description:
      "Replace manual transcription from spreadsheets and delayed MSOFT validation with event-driven capture and normalization.",
    successSignal:
      "Less coordinator time spent re-keying requests, trip data, and production records.",
  },
  {
    id: "goal-visibility",
    title: "Unify operational visibility",
    description:
      "Connect GPS, Webfleet, SunTrack, MSOFT, guides, PODs, and load status into a traceable operating view.",
    successSignal:
      "Supervisors and the control tower retrieve operational evidence without chasing multiple channels.",
  },
  {
    id: "goal-close",
    title: "Accelerate month-end control",
    description:
      "Pre-audit production, driver shifts, weights, cubic volume, pallets, rates, and dispatch-guide requirements.",
    successSignal:
      "Month-end production and billing packs arrive consolidated with fewer manual reconciliations.",
  },
  {
    id: "goal-human",
    title: "Move people from data entry to decisions",
    description:
      "Use asynchronous agents behind the scenes while coordinators and drivers validate consequential actions through one-click flows.",
    successSignal:
      "Human attention is concentrated on exceptions, approvals, and customer-impacting decisions.",
  },
] as const;

const proposalAgents = [
  {
    id: "agent-demand",
    name: "Demand Ingestor & Normalizer",
    mission:
      "Read and interpret customer emails and requests in any format, creating a canonical demand record.",
    impact:
      "Requests enter the operation without direct re-keying and become structured inputs for downstream agents.",
  },
  {
    id: "agent-resource",
    name: "Intelligent Resource Allocator",
    mission:
      "Cross-check accreditation, licenses, driving and rest hours, and operating-group restrictions to propose vehicle-driver assignments.",
    impact:
      "Supervisors receive data-based UT-driver preassignments while retaining the final decision.",
  },
  {
    id: "agent-audit",
    name: "Production Auditor",
    mission:
      "Detect trip closure by geofence and consolidate dispatch guides, Resolution 154 requirements, tariffs, assignments, and results.",
    impact:
      "Trip reporting is digitized and pre-audited before month-end and formal audits.",
  },
  {
    id: "agent-operations",
    name: "Operational Coordinator",
    mission:
      "Support trip execution and closure in real time, assign tasks, and capture evidence such as PODs, including asynchronous offline operation.",
    impact:
      "Drivers and the control tower rely less on phone calls while retaining operational support and evidence continuity.",
  },
  {
    id: "agent-tax",
    name: "Intelligent Dispatch & Tax Certification",
    mission:
      "Guarantee timely data capture and tax issuance at the location of events under SII Exempt Resolution No. 154.",
    impact:
      "Dispatch-guide compliance is coupled to logistics execution and feeds continuous resource-assignment improvement.",
  },
] as const;

const seedProposalPhases = [
  {
    id: "phase-kickoff",
    name: "Kickoff & initial authorization",
    window: "Milestone 1 · September 2026",
    budgetUf: 180,
    objective:
      "Formal approval, purchase order, confidentiality agreement, and authorization to begin operational discovery and technological shadow mode.",
    status: "active",
    progress: 35,
    deadline: "2026-09-15",
  },
  {
    id: "phase-discovery",
    name: "Operational discovery & shadow-mode assessment",
    window: "Months 1–3 · September–November 2026",
    budgetUf: 480,
    objective:
      "Run read-only discovery, obtain recent historical emails and MSOFT production data, and validate agent behavior in an isolated sandbox.",
    status: "active",
    progress: 12,
    deadline: "2026-11-30",
  },
  {
    id: "phase-pilot",
    name: "Human-in-the-loop pilot",
    window: "Months 4–5",
    budgetUf: 1270,
    objective:
      "Deploy a limited automation pilot for one fleet, site, or client with one-click human assistance and measurable ROI evidence.",
    status: "not_started",
    progress: 0,
    deadline: null,
  },
  {
    id: "phase-deployment",
    name: "Controlled deployment & expansion",
    window: "Months 6–7",
    budgetUf: 550,
    objective:
      "Expand progressively across Retail, Forestry, and Chemical operations and activate greater agent autonomy only after evidence-based approval.",
    status: "not_started",
    progress: 0,
    deadline: null,
  },
] as const;

const seedStakeholders = [
  {
    id: "stk-agustin-jorquera",
    name: "Agustín Jorquera S.",
    organization: "Jorquera Transportes S.A.",
    role: "Executive sponsor — validate",
    keyPoints:
      "Project framing, formal approval, access to operating teams, and alignment around a low-risk evidence-led rollout.",
    power: 5,
    interest: 5,
    stance: "champion",
    confidence: "working_hypothesis",
  },
  {
    id: "stk-hector-salcedo",
    name: "Héctor Salcedo",
    organization: "Jorquera Transportes S.A.",
    role: "Technology and architecture lead — validate",
    keyPoints:
      "Current platform architecture, database inventory, integration constraints, control-tower systems, and API documentation.",
    power: 4,
    interest: 5,
    stance: "supportive",
    confidence: "needs_validation",
  },
  {
    id: "stk-adrian-maldonado",
    name: "Adrián Maldonado",
    organization: "Jorquera Transportes S.A.",
    role: "Commercial and operations stakeholder — validate",
    keyPoints:
      "Demand qualification, quotation controls, operational glossary, service feasibility, tariffs, and structured customer inputs.",
    power: 4,
    interest: 5,
    stance: "supportive",
    confidence: "needs_validation",
  },
  {
    id: "stk-carlos-manosalva",
    name: "Carlos Manosalva",
    organization: "Jorquera Transportes S.A.",
    role: "Operations and data stakeholder — validate",
    keyPoints:
      "Work-order quality, fleet availability, maintenance capacity, parallel Excel controls, provider data normalization, and initiative prioritization.",
    power: 3,
    interest: 5,
    stance: "supportive",
    confidence: "needs_validation",
  },
  {
    id: "stk-roderick-woolvett",
    name: "Roderick Woolvett",
    organization: "Segitec SpA",
    role: "ÓRBITA program lead — validate",
    keyPoints:
      "Discovery governance, agentic operating model, evidence discipline, change management, and program alignment.",
    power: 4,
    interest: 5,
    stance: "champion",
    confidence: "working_hypothesis",
  },
  {
    id: "stk-jorge-gutierrez",
    name: "Jorge Gutiérrez",
    organization: "Project team",
    role: "Technical advisor — validate",
    keyPoints:
      "Technical feasibility, document and data extraction, operational process analysis, and system integration options.",
    power: 3,
    interest: 4,
    stance: "supportive",
    confidence: "needs_validation",
  },
] as const;

const reconciledStakeholders = [
  {
    id: "stk-viviana-aqueveque",
    name: "Viviana Aqueveque",
    organization: "Jorquera Transportes S.A.",
    role: "Financial Manager · operational decision validator",
    keyPoints:
      "Runs the company operationally and validates every decision. Strongly supports organizing and displaying company data and the proposed work. Attached note places her in administration and finance; the scope of formal sign-off should still be documented.",
    power: 5,
    interest: 5,
    stance: "champion",
    confidence: "confirmed",
  },
  {
    id: "stk-victor-jorquera",
    name: "Victor Jorquera",
    organization: "Jorquera Transportes S.A.",
    role: "Founder and General Manager",
    keyPoints:
      "Founder and lead of the company. Expected to support the direction approved by his team and Viviana. His attached note emphasizes urgency, data, a staged sales narrative, and a human bridge during technical exploration.",
    power: 5,
    interest: 4,
    stance: "supportive",
    confidence: "working_hypothesis",
  },
  {
    id: "stk-rodrigo-gandaras",
    name: "Rodrigo Gandaras",
    organization: "Jorquera Transportes S.A.",
    role: "Commercial Manager",
    keyPoints:
      "Very enthusiastic about the ideas but skeptical about the concrete value or efficiency delivered. Confirm whether the concern is ROI, delivery proof, operational adoption, or scope.",
    power: 3,
    interest: 5,
    stance: "cautious",
    confidence: "confirmed",
  },
  {
    id: "stk-sebastian-donoso",
    name: "Sebastián Donoso",
    organization: "Jorquera Transportes S.A.",
    role: "Controller / economic advisor — validate",
    keyPoints:
      "Named in Viviana's attached organizational note as controller and economic advisor. Decision rights and relationship to the project remain unconfirmed.",
    power: 3,
    interest: 3,
    stance: "neutral",
    confidence: "needs_validation",
  },
] as const;

async function ensureSeeded(): Promise<void> {
  await db
    .insert(retentionPoliciesTable)
    .values(
      retentionPolicies.map((policy) => ({
        ...policy,
        requiresLegalHoldCheck: true,
        active: true,
      })),
    )
    .onConflictDoNothing();

  const [{ value: sessionCount }] = await db.select({ value: count() }).from(discoverySessionsTable);
  if (sessionCount === 0) {
    await db.insert(discoverySessionsTable).values([...seedSessions]).onConflictDoNothing();
    await db.insert(opportunitiesTable).values([...seedOpportunities]).onConflictDoNothing();
    await db.insert(evidenceTable).values([...seedEvidence]).onConflictDoNothing();
    await db.insert(activityTable).values([...seedActivity]).onConflictDoNothing();
  }

  const [{ value: phaseCount }] = await db.select({ value: count() }).from(proposalPhasesTable);
  if (phaseCount === 0) {
    await db.insert(proposalPhasesTable).values([...seedProposalPhases]).onConflictDoNothing();
  }

  const [{ value: stakeholderCount }] = await db.select({ value: count() }).from(stakeholdersTable);
  if (stakeholderCount === 0) {
    await db.insert(stakeholdersTable).values([...seedStakeholders]).onConflictDoNothing();
  }

  const existingSessions = await db
    .select({ id: discoverySessionsTable.id })
    .from(discoverySessionsTable);
  if (!existingSessions.some((session) => session.id === "ses-drive-proposal")) {
    const legacySessionIds = [
      "ses-exec",
      "ses-dispatch",
      "ses-fleet",
      "ses-data",
    ].filter((id) => existingSessions.some((session) => session.id === id));
    if (legacySessionIds.length > 0) {
      await db.delete(discoverySessionsTable).where(inArray(discoverySessionsTable.id, legacySessionIds));
    }
    await db.insert(discoverySessionsTable).values([...reconciledSessions]).onConflictDoNothing();

    await db.delete(evidenceTable).where(
      inArray(evidenceTable.id, ["ev-1", "ev-2", "ev-3", "ev-4", "ev-5"]),
    );
    await db.insert(evidenceTable).values([...reconciledEvidence]).onConflictDoNothing();

    await db.delete(activityTable).where(
      inArray(activityTable.id, ["act-1", "act-2", "act-3", "act-4"]),
    );
    await db.insert(activityTable).values([...reconciledActivity]).onConflictDoNothing();
  }

  await db
    .update(discoverySessionsTable)
    .set({
      title: "Kickoff — GateControl, fleet visibility & governance",
      stakeholder:
        "Agustín Jorquera, Roderick W. · Rodrigo Gandara, Viviana Aqueveque & Héctor Salcedo",
      role: "Project organizers and confirmed JTSA kickoff participants",
      status: "completed",
      scheduledAt: "2026-08-21T11:00:00-04:00",
      completedAt: "2026-08-21T11:30:00-04:00",
      summary:
        "Apple Notes review completed against the provisional kickoff scan. Confirmed attendees: Agustín Jorquera and Roderick W. (project organizers), plus Rodrigo Gandara (Gerente de Comercial), Viviana Aqueveque (Presidenta del Directorio), and Héctor Salcedo (Jefe Área TI). Confirmed direction: use GateControl and intelligent fleet tracking to identify actual departures and in-route activity and address the reported “hacer tierra” practice; Héctor also confirmed the need to relate GateControl to Puerto Seco's existing plate-reading system. Recorded follow-ups: Agustín to arrange a presentation with Carlos Manosalva (date not defined); Agustín/Roderick to hold a remote session with Héctor and Jorge on 2026-08-28. Open question: whether Essex maintenance and spare-parts scope belongs in this project, and if not, how to address that customer need initially. Governance-bar and work-environment proposals remain recorded tasks, not confirmed decisions.",
      evidenceCount: 5,
    })
    .where(eq(discoverySessionsTable.id, "ses-pdf-kickoff"));
  await db.insert(evidenceTable).values([...kickoffEvidence]).onConflictDoNothing();
  await db.insert(activityTable).values([...kickoffActivity]).onConflictDoNothing();

  const existingStakeholders = await db
    .select({ id: stakeholdersTable.id })
    .from(stakeholdersTable);
  if (!existingStakeholders.some((stakeholder) => stakeholder.id === "stk-viviana-aqueveque")) {
    await db
      .update(stakeholdersTable)
      .set({
        name: "Adrián Maldonado",
        role: "Subgerente de Planificación · commercial-operations stakeholder",
        keyPoints:
          "Requirement gathering begins with the client request. Validate the business glossary, commercial/spot quotations, data capture across areas, nominal hours, availability and utilization factors, and the mechanical/documentary unit of transport.",
        power: 4,
        interest: 5,
        stance: "supportive",
        confidence: "confirmed",
      })
      .where(eq(stakeholdersTable.id, "stk-adrian-maldonado"));
    await db
      .update(stakeholdersTable)
      .set({
        name: "Carlos Manosalva",
        role: "Second-in-command · operational and accountability lead",
        keyPoints:
          "Highly operational with an accountability background. Exposed client-request fragmentation, resource and shift-management needs, missing incident management, incomplete work orders, parallel Excel controls, weak trip closures, and alerts without a matrix. Neutral as a promoter, wants a new proposal, and is asking for a broad organizing capability; confirm whether he has reviewed the same proposal presented to Viviana and Victor.",
        power: 4,
        interest: 5,
        stance: "neutral",
        confidence: "working_hypothesis",
      })
      .where(eq(stakeholdersTable.id, "stk-carlos-manosalva"));
    await db
      .update(stakeholdersTable)
      .set({
        name: "Héctor Maldonado",
        role: "IT and integration lead · decision rights to validate",
        keyPoints:
          "Responds primarily to Carlos but is also responsive to the broader organization. Keeps systems running, has organized an internal Docker/Python service, uses SQL for retrieval and integrations across owned and outsourced systems, and faces browser-only access in some client-owned systems. The attached notes identify GESMO, maintenance visibility, trip closure, alerts, and AI QA/documentation as working topics. The attached kickoff sheet uses the surname Salcedo, so formal identity and architecture ownership must be confirmed.",
        power: 4,
        interest: 4,
        stance: "supportive",
        confidence: "needs_validation",
      })
      .where(eq(stakeholdersTable.id, "stk-hector-salcedo"));
    await db.insert(stakeholdersTable).values([...reconciledStakeholders]).onConflictDoNothing();
  }

  await db
    .update(stakeholdersTable)
    .set({
      name: "Héctor Salcedo",
      role: "Jefe Área TI · architecture ownership to validate",
      keyPoints:
        "Kickoff notes confirm Héctor Salcedo as Jefe Área TI and participant in the GateControl discussion. He described existing IT platforms and the need to integrate with Puerto Seco's plate-reading system. Formal architecture ownership, decision rights, and browser-only system boundaries remain open for a separate technology validation.",
      confidence: "confirmed",
    })
    .where(eq(stakeholdersTable.id, "stk-hector-salcedo"));
  await db
    .update(stakeholdersTable)
    .set({
      role: "Executive sponsor · kickoff organizer",
      keyPoints:
        "Confirmed in the reviewed kickoff notes as a project organizer and participant. Formal approval scope and decision rights remain to be documented.",
      confidence: "confirmed",
    })
    .where(eq(stakeholdersTable.id, "stk-agustin-jorquera"));
  await db
    .update(stakeholdersTable)
    .set({
      role: "ÓRBITA program lead · kickoff organizer",
      keyPoints:
        "Confirmed in the reviewed kickoff notes as a project organizer and participant. Governance ownership beyond the recorded follow-ups remains to be documented.",
      confidence: "confirmed",
    })
    .where(eq(stakeholdersTable.id, "stk-roderick-woolvett"));

  const [{ value: auditCount }] = await db
    .select({ value: count() })
    .from(auditEventsTable);
  if (auditCount === 0) {
    const [{ value: evidenceCount }] = await db
      .select({ value: count() })
      .from(evidenceTable);
    await recordAuditEvent(db, undefined, {
      action: "system_seed",
      targetType: "workspace",
      targetId: "discovery",
      outcome: "success",
      actor: { id: "system:seed", role: "system" },
      changeSummary: safeChangeSummary(
        undefined,
        {
          sessions: sessionCount,
          stakeholders: stakeholderCount,
          evidence: evidenceCount,
        },
        [],
        "Initial or reconciled development seed data",
      ),
    });
  }
}

function opportunityForApi(row: typeof opportunitiesTable.$inferSelect) {
  return { ...row, score: Number(row.score) };
}

router.get("/dashboard", requireRole("read_only"), async (_req, res): Promise<void> => {
  await ensureSeeded();
  const sessions = await db.select().from(discoverySessionsTable);
  const opportunities = await db.select().from(opportunitiesTable);
  const evidence = await db.select().from(evidenceTable);
  const completed = sessions.filter((session) => session.status === "completed").length;
  const highPriority = opportunities.filter((opportunity) => opportunity.priority === "high").length;

  res.json(
    GetDashboardResponse.parse({
      clientName: "ÓRBITA · Jorquera Transportes",
      fleetSize: 800,
      monthlyTrips: 22000,
      phase: "Discovery & shadow mode",
      daysRemaining: 58,
      sessionsCompleted: completed,
      sessionsTotal: sessions.length,
      evidenceItems: evidence.length,
      opportunities: opportunities.length,
      highPriority,
      progress: 12,
    }),
  );
});

router.get("/sessions", requireRole("read_only"), async (_req, res): Promise<void> => {
  await ensureSeeded();
  const sessions = await db.select().from(discoverySessionsTable);
  const role = getRequestActor(_req).role;
  res.json(
    GetSessionsResponse.parse(
      sessions.map((session) =>
        redactSensitiveFields({ ...session }, sessionSensitiveFields, role),
      ),
    ),
  );
});

router.post("/sessions", requireRole("contributor"), async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    await auditFailure(req, "create", "session", "unknown", "rejected", "Invalid session payload");
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const id = randomUUID();
  const session = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(discoverySessionsTable)
      .values({
        id,
        ...parsed.data,
        status: "planned",
        completedAt: null,
        summary: "",
        questionCount: 0,
        evidenceCount: 0,
      })
      .returning();
    await recordAuditEvent(tx, req, {
      action: "create",
      targetType: "session",
      targetId: id,
      outcome: "success",
      changeSummary: safeChangeSummary(undefined, created, sessionSensitiveFields),
    });
    return created;
  });
  const visibleSession = redactSensitiveFields(
    { ...session },
    sessionSensitiveFields,
    getRequestActor(req).role,
  );
  res.status(201).json(CreateSessionResponse.parse(visibleSession));
});

router.patch("/sessions/:id", requireRole("facilitator"), async (req, res): Promise<void> => {
  const params = UpdateSessionParams.safeParse(req.params);
  const parsed = UpdateSessionBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    await auditFailure(req, "update", "session", routeParam(req.params.id), "rejected", "Invalid session update");
    res.status(400).json({ error: "Invalid session update" });
    return;
  }
  const [before] = await db
    .select()
    .from(discoverySessionsTable)
    .where(eq(discoverySessionsTable.id, params.data.id));
  if (!before) {
    await auditFailure(req, "update", "session", params.data.id, "not_found", "Session not found");
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const updates = {
    ...parsed.data,
    ...(parsed.data.status === "completed" ? { completedAt: new Date().toISOString() } : {}),
  };
  const session = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(discoverySessionsTable)
      .set(updates)
      .where(eq(discoverySessionsTable.id, params.data.id))
      .returning();
    if (!updated) return undefined;
    await recordAuditEvent(tx, req, {
      action: "update",
      targetType: "session",
      targetId: params.data.id,
      outcome: "success",
      changeSummary: safeChangeSummary(before, updated, sessionSensitiveFields),
    });
    return updated;
  });
  if (!session) {
    await auditFailure(req, "update", "session", params.data.id, "not_found", "Session not found");
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(
    UpdateSessionResponse.parse(
      redactSensitiveFields({ ...session }, sessionSensitiveFields, getRequestActor(req).role),
    ),
  );
});

router.get("/stakeholders", requireRole("read_only"), async (_req, res): Promise<void> => {
  await ensureSeeded();
  const stakeholders = await db.select().from(stakeholdersTable);
  const role = getRequestActor(_req).role;
  res.json(
    GetStakeholdersResponse.parse(
      stakeholders.map((stakeholder) =>
        redactSensitiveFields({ ...stakeholder }, stakeholderSensitiveFields, role),
      ),
    ),
  );
});

router.post("/stakeholders", requireRole("contributor"), async (req, res): Promise<void> => {
  const parsed = CreateStakeholderBody.safeParse(req.body);
  if (!parsed.success) {
    await auditFailure(req, "create", "stakeholder", "unknown", "rejected", "Invalid stakeholder payload");
    res.status(400).json({ error: "Invalid stakeholder" });
    return;
  }
  const id = randomUUID();
  const stakeholder = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(stakeholdersTable)
      .values({
        id,
        ...parsed.data,
        confidence: parsed.data.confidence ?? "working_hypothesis",
      })
      .returning();
    await recordAuditEvent(tx, req, {
      action: "create",
      targetType: "stakeholder",
      targetId: id,
      outcome: "success",
      changeSummary: safeChangeSummary(undefined, created, stakeholderSensitiveFields),
    });
    return created;
  });
  res.status(201).json(
    CreateStakeholderResponse.parse(
      redactSensitiveFields(
        { ...stakeholder },
        stakeholderSensitiveFields,
        getRequestActor(req).role,
      ),
    ),
  );
});

router.patch("/stakeholders/:id", requireRole("facilitator"), async (req, res): Promise<void> => {
  const params = UpdateStakeholderParams.safeParse(req.params);
  const parsed = UpdateStakeholderBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    await auditFailure(
      req,
      "update",
      "stakeholder",
      routeParam(req.params.id),
      "rejected",
      "Invalid stakeholder update",
    );
    res.status(400).json({ error: "Invalid stakeholder update" });
    return;
  }
  const [before] = await db
    .select()
    .from(stakeholdersTable)
    .where(eq(stakeholdersTable.id, params.data.id));
  if (!before) {
    await auditFailure(req, "update", "stakeholder", params.data.id, "not_found", "Stakeholder not found");
    res.status(404).json({ error: "Stakeholder not found" });
    return;
  }
  const stakeholder = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(stakeholdersTable)
      .set(parsed.data)
      .where(eq(stakeholdersTable.id, params.data.id))
      .returning();
    if (!updated) return undefined;
    await recordAuditEvent(tx, req, {
      action: "update",
      targetType: "stakeholder",
      targetId: params.data.id,
      outcome: "success",
      changeSummary: safeChangeSummary(before, updated, stakeholderSensitiveFields),
    });
    return updated;
  });
  if (!stakeholder) {
    await auditFailure(req, "update", "stakeholder", params.data.id, "not_found", "Stakeholder not found");
    res.status(404).json({ error: "Stakeholder not found" });
    return;
  }
  res.json(
    UpdateStakeholderResponse.parse(
      redactSensitiveFields(
        { ...stakeholder },
        stakeholderSensitiveFields,
        getRequestActor(req).role,
      ),
    ),
  );
});

router.get("/opportunities", requireRole("read_only"), async (_req, res): Promise<void> => {
  await ensureSeeded();
  const opportunities = await db.select().from(opportunitiesTable);
  const role = getRequestActor(_req).role;
  res.json(
    GetOpportunitiesResponse.parse(
      opportunities.map((opportunity) =>
        opportunityForApi(
          redactSensitiveFields({ ...opportunity }, opportunitySensitiveFields, role),
        ),
      ),
    ),
  );
});

router.post("/opportunities", requireRole("contributor"), async (req, res): Promise<void> => {
  const parsed = CreateOpportunityBody.safeParse(req.body);
  if (!parsed.success) {
    await auditFailure(req, "create", "opportunity", "unknown", "rejected", "Invalid opportunity payload");
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const id = randomUUID();
  const opportunity = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(opportunitiesTable)
      .values({
        id,
        ...parsed.data,
        score: "2.5",
        priority: "watch",
        status: "validate",
        confidence: 25,
        impact: 3,
        feasibility: 2,
        dataReadiness: 1,
        risk: 3,
        sourceCount: 0,
      })
      .returning();
    await recordAuditEvent(tx, req, {
      action: "create",
      targetType: "opportunity",
      targetId: id,
      outcome: "success",
      changeSummary: safeChangeSummary(undefined, created, opportunitySensitiveFields),
    });
    return created;
  });
  res.status(201).json(
    CreateOpportunityResponse.parse(
      opportunityForApi(
        redactSensitiveFields(
          { ...opportunity },
          opportunitySensitiveFields,
          getRequestActor(req).role,
        ),
      ),
    ),
  );
});

router.patch("/opportunities/:id", requireRole("editor"), async (req, res): Promise<void> => {
  const params = UpdateOpportunityParams.safeParse(req.params);
  const parsed = UpdateOpportunityBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    await auditFailure(
      req,
      "update",
      "opportunity",
      routeParam(req.params.id),
      "rejected",
      "Invalid opportunity update",
    );
    res.status(400).json({ error: "Invalid opportunity update" });
    return;
  }
  const [before] = await db
    .select()
    .from(opportunitiesTable)
    .where(eq(opportunitiesTable.id, params.data.id));
  if (!before) {
    await auditFailure(req, "update", "opportunity", params.data.id, "not_found", "Opportunity not found");
    res.status(404).json({ error: "Opportunity not found" });
    return;
  }
  const opportunity = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(opportunitiesTable)
      .set(parsed.data)
      .where(eq(opportunitiesTable.id, params.data.id))
      .returning();
    if (!updated) return undefined;
    await recordAuditEvent(tx, req, {
      action: "update",
      targetType: "opportunity",
      targetId: params.data.id,
      outcome: "success",
      changeSummary: safeChangeSummary(before, updated, opportunitySensitiveFields),
    });
    return updated;
  });
  if (!opportunity) {
    await auditFailure(req, "update", "opportunity", params.data.id, "not_found", "Opportunity not found");
    res.status(404).json({ error: "Opportunity not found" });
    return;
  }
  res.json(
    UpdateOpportunityResponse.parse(
      opportunityForApi(
        redactSensitiveFields(
          { ...opportunity },
          opportunitySensitiveFields,
          getRequestActor(req).role,
        ),
      ),
    ),
  );
});

router.get("/evidence", requireRole("read_only"), async (_req, res): Promise<void> => {
  await ensureSeeded();
  const evidence = await db.select().from(evidenceTable);
  const role = getRequestActor(_req).role;
  res.json(
    GetEvidenceResponse.parse(
      evidence.map((item) =>
        redactSensitiveFields({ ...item }, evidenceSensitiveFields, role),
      ),
    ),
  );
});

router.get("/activity", requireRole("read_only"), async (_req, res): Promise<void> => {
  await ensureSeeded();
  const activity = await db.select().from(activityTable);
  const role = getRequestActor(_req).role;
  res.json(
    GetActivityResponse.parse(
      activity.map((entry) =>
        role === "read_only" ? { ...entry, text: "[REDACTED]" } : entry,
      ),
    ),
  );
});

router.get("/proposal", requireRole("read_only"), async (_req, res): Promise<void> => {
  await ensureSeeded();
  const phases = await db.select().from(proposalPhasesTable);
  const role = getRequestActor(_req).role;
  res.json(
    GetProposalStrategyResponse.parse({
      projectName: "ÓRBITA",
      client: "Jorquera Transportes S.A.",
      provider: "Segitec SpA",
      preparedAt: "August 2026",
      operatingPrinciple:
        "Zero operational risk: begin with passive read-only discovery, validate agents against recent historical data in an isolated shadow-mode sandbox, and connect to live systems only after evidence-based approval.",
      sourceDocument:
        role === "read_only"
          ? "[REDACTED]"
          : "ÓRBITA Technical-Commercial Proposal · August 2026",
      totalInvestmentUf: role === "read_only" ? 0 : 2480,
      regulatoryDeadline: "2026-11-01",
      timelineAlignmentNote:
        "The implementation strategy describes Discovery as months 1–2, while the commercial schedule allocates Levantamiento across months 1–3. Confirm the governing baseline at kickoff.",
      goals: proposalGoals,
      agents: proposalAgents,
      phases: phases.map((phase) =>
        redactSensitiveFields({ ...phase }, phaseSensitiveFields, role),
      ),
    }),
  );
});

router.patch("/proposal/phases/:id", requireRole("editor"), async (req, res): Promise<void> => {
  const params = UpdateProposalPhaseParams.safeParse(req.params);
  const parsed = UpdateProposalPhaseBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    await auditFailure(
      req,
      "update",
      "proposal_phase",
      routeParam(req.params.id),
      "rejected",
      "Invalid proposal phase update",
    );
    res.status(400).json({ error: "Invalid phase update" });
    return;
  }
  const [before] = await db
    .select()
    .from(proposalPhasesTable)
    .where(eq(proposalPhasesTable.id, params.data.id));
  if (!before) {
    await auditFailure(req, "update", "proposal_phase", params.data.id, "not_found", "Proposal phase not found");
    res.status(404).json({ error: "Proposal phase not found" });
    return;
  }
  const phase = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(proposalPhasesTable)
      .set(parsed.data)
      .where(eq(proposalPhasesTable.id, params.data.id))
      .returning();
    if (!updated) return undefined;
    await recordAuditEvent(tx, req, {
      action: "update",
      targetType: "proposal_phase",
      targetId: params.data.id,
      outcome: "success",
      changeSummary: safeChangeSummary(before, updated, phaseSensitiveFields),
    });
    return updated;
  });
  if (!phase) {
    await auditFailure(req, "update", "proposal_phase", params.data.id, "not_found", "Proposal phase not found");
    res.status(404).json({ error: "Proposal phase not found" });
    return;
  }
  res.json(
    UpdateProposalPhaseResponse.parse(
      redactSensitiveFields({ ...phase }, phaseSensitiveFields, getRequestActor(req).role),
    ),
  );
});

router.get("/privacy/audit", requireRole("administrator"), async (req, res): Promise<void> => {
  const actor = getRequestActor(req);
  if (!canManagePrivacy(actor.role)) {
    await auditFailure(req, "access_denied", "audit_log", "workspace", "denied", "Privacy administrator role required");
    res.status(403).json({ error: "Privacy administrator role required" });
    return;
  }

  const requestedLimit = Number(req.query.limit ?? 100);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 500)
    : 100;
  const events = await db
    .select()
    .from(auditEventsTable)
    .orderBy(desc(auditEventsTable.occurredAt))
    .limit(limit);
  await recordAuditEvent(db, req, {
    action: "access",
    targetType: "audit_log",
    targetId: "workspace",
    outcome: "success",
    changeSummary: safeChangeSummary(undefined, undefined, [], `Returned ${events.length} audit events`),
  });
  res.json({ events });
});

router.post("/privacy/export", requireRole("administrator"), async (req, res): Promise<void> => {
  const parsed = ExportRequestBody.safeParse(req.body);
  if (!parsed.success) {
    await auditFailure(req, "export", "workspace", "unknown", "rejected", "Invalid export scope");
    res.status(400).json({ error: "Invalid export scope" });
    return;
  }

  const actor = getRequestActor(req);
  if (!canManagePrivacy(actor.role)) {
    await auditFailure(req, "export", "workspace", parsed.data.scope, "denied", "Privacy administrator role required");
    res.status(403).json({ error: "Privacy administrator role required" });
    return;
  }

  await ensureSeeded();
  const [sessions, stakeholders, opportunities, evidence, phases, activity] = await Promise.all([
    db.select().from(discoverySessionsTable),
    db.select().from(stakeholdersTable),
    db.select().from(opportunitiesTable),
    db.select().from(evidenceTable),
    db.select().from(proposalPhasesTable),
    db.select().from(activityTable),
  ]);
  const data =
    parsed.data.scope === "source_notes"
      ? { sessions, stakeholders }
      : parsed.data.scope === "derived_evidence"
        ? { evidence, opportunities, phases }
        : { sessions, stakeholders, opportunities, evidence, phases, activity };
  const recordCounts = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, value.length]),
  );

  await recordAuditEvent(db, req, {
    action: "export",
    targetType: "workspace",
    targetId: parsed.data.scope,
    outcome: "success",
    changeSummary: safeChangeSummary(
      undefined,
      recordCounts,
      [],
      "Authorized privacy export; response is not persisted by the API",
    ),
  });
  res.json({
    scope: parsed.data.scope,
    exportedAt: new Date().toISOString(),
    recordCounts,
    data,
  });
});

router.post("/privacy/delete", requireRole("administrator"), async (req, res): Promise<void> => {
  const parsed = DeleteRequestBody.safeParse(req.body);
  if (!parsed.success) {
    await auditFailure(req, "delete", "workspace", "unknown", "rejected", "Invalid deletion request");
    res.status(400).json({ error: "Invalid deletion request" });
    return;
  }

  const actor = getRequestActor(req);
  if (!canManagePrivacy(actor.role)) {
    await auditFailure(
      req,
      "delete",
      parsed.data.targetType,
      parsed.data.targetId,
      "denied",
      "Privacy administrator role required",
    );
    res.status(403).json({ error: "Privacy administrator role required" });
    return;
  }

  const deletedCount = await db.transaction(async (tx) => {
    let deleted = 0;
    switch (parsed.data.targetType) {
      case "session":
        deleted = (await tx.delete(discoverySessionsTable).where(eq(discoverySessionsTable.id, parsed.data.targetId)).returning()).length;
        break;
      case "stakeholder":
        deleted = (await tx.delete(stakeholdersTable).where(eq(stakeholdersTable.id, parsed.data.targetId)).returning()).length;
        break;
      case "opportunity":
        deleted = (await tx.delete(opportunitiesTable).where(eq(opportunitiesTable.id, parsed.data.targetId)).returning()).length;
        break;
      case "evidence":
        deleted = (await tx.delete(evidenceTable).where(eq(evidenceTable.id, parsed.data.targetId)).returning()).length;
        break;
      case "proposal_phase":
        deleted = (await tx.delete(proposalPhasesTable).where(eq(proposalPhasesTable.id, parsed.data.targetId)).returning()).length;
        break;
    }
    await recordAuditEvent(tx, req, {
      action: "delete",
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      outcome: deleted === 1 ? "success" : "not_found",
      changeSummary: safeChangeSummary(
        undefined,
        undefined,
        [],
        `Authorized privacy deletion; deletedCount=${deleted}`,
      ),
    });
    return deleted;
  });

  if (deletedCount === 0) {
    res.status(404).json({ error: "Record not found", deletedCount });
    return;
  }
  res.json({
    targetType: parsed.data.targetType,
    targetId: parsed.data.targetId,
    deletedCount,
  });
});

export default router;