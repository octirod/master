import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { requireRole } from "../middlewares/auth";
import {
  routeMinimumRoles,
  roleAtLeast,
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "./access";

const roles: WorkspaceRole[] = [
  "read_only",
  "contributor",
  "facilitator",
  "editor",
  "administrator",
];

function responseDouble() {
  let statusCode = 200;
  let body: unknown;
  const response = {
    status(code: number) {
      statusCode = code;
      return response;
    },
    json(value: unknown) {
      body = value;
      return response;
    },
  } as unknown as Response;
  return { response, get statusCode() { return statusCode; }, get body() { return body; } };
}

test("role hierarchy is monotonic and rejects unknown roles", () => {
  assert.equal(normalizeWorkspaceRole("administrator"), "administrator");
  assert.equal(normalizeWorkspaceRole("privacy_admin"), undefined);
  assert.equal(normalizeWorkspaceRole("client_supplied_role"), undefined);

  for (const [index, role] of roles.entries()) {
    for (const candidate of roles.slice(index)) {
      assert.equal(roleAtLeast(candidate, role), true);
    }
    for (const candidate of roles.slice(0, index)) {
      assert.equal(roleAtLeast(candidate, role), false);
    }
  }
});

test("every CRUD route has an explicit least-privilege minimum", () => {
  const expected: Record<string, WorkspaceRole> = {
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
  };
  assert.deepEqual(routeMinimumRoles, expected);
});

test("function-level authorization denies every CRUD mutation below its minimum", () => {
  for (const [route, minimum] of Object.entries(routeMinimumRoles)) {
    const middleware = requireRole(minimum);
    const method = route.split(" ")[0];
    if (method === "GET") continue;

    for (const role of roles) {
      const req = {
        params: { id: "record-owned-by-another-user" },
        user: { id: `user-${role}`, role },
      } as unknown as Request;
      const result = responseDouble();
      let called = false;
      middleware(req, result.response, () => {
        called = true;
      });
      assert.equal(called, roleAtLeast(role, minimum), `${role} on ${route}`);
      if (!called) {
        assert.equal(result.statusCode, 403);
        assert.deepEqual(result.body, {
          error: "Insufficient permissions",
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }
    }
  }
});

test("a missing identity cannot satisfy any function-level role gate", () => {
  for (const minimum of Object.values(routeMinimumRoles)) {
    const result = responseDouble();
    let called = false;
    requireRole(minimum)({} as Request, result.response, () => {
      called = true;
    });
    assert.equal(called, false);
    assert.equal(result.statusCode, 403);
    assert.deepEqual(result.body, {
      error: "Insufficient permissions",
      code: "INSUFFICIENT_PERMISSIONS",
    });
  }
});