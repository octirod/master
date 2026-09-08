import { clerkClient } from "@clerk/express";
import { Router, type IRouter } from "express";
import {
  GetCurrentAccessResponse,
  GetWorkspaceUsersResponse,
  UpdateWorkspaceUserRoleBody,
  UpdateWorkspaceUserRoleParams,
  UpdateWorkspaceUserRoleResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { getRequestActor } from "../lib/access";
import {
  listAllClerkUsers,
  roleFromUserMetadata,
  workspaceUserForApi,
  type ClerkUserLike,
} from "../lib/clerk-users";
import { recordAuditEvent, safeChangeSummary } from "../lib/audit";
import { requireRole } from "../middlewares/auth";

const router: IRouter = Router();

function clerkErrorStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }
  return undefined;
}

router.get(
  "/access/me",
  requireRole("read_only"),
  (req, res): void => {
    res.json(GetCurrentAccessResponse.parse(getRequestActor(req)));
  },
);

router.get(
  "/users",
  requireRole("administrator"),
  async (req, res): Promise<void> => {
    try {
      const actor = getRequestActor(req);
      const users = await listAllClerkUsers();
      const response = users
        .map((user) => workspaceUserForApi(user, actor.id))
        .sort((left, right) => {
          if (left.isCurrentUser) return -1;
          if (right.isCurrentUser) return 1;
          return left.name.localeCompare(right.name);
        });
      res.json(GetWorkspaceUsersResponse.parse(response));
    } catch (error) {
      req.log.error({ err: error }, "Unable to list workspace users");
      res.status(502).json({ error: "Unable to load workspace users" });
    }
  },
);

router.patch(
  "/users/:id/role",
  requireRole("administrator"),
  async (req, res): Promise<void> => {
    const params = UpdateWorkspaceUserRoleParams.safeParse(req.params);
    const parsed = UpdateWorkspaceUserRoleBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid user role update" });
      return;
    }

    try {
      const target = (await clerkClient.users.getUser(
        params.data.id,
      )) as ClerkUserLike;
      const previousRole = roleFromUserMetadata(target);

      if (
        previousRole === "administrator" &&
        parsed.data.role !== "administrator"
      ) {
        const users = await listAllClerkUsers();
        const administratorCount = users.filter(
          (user) => roleFromUserMetadata(user) === "administrator",
        ).length;
        if (administratorCount <= 1) {
          res.status(409).json({
            error: "Assign another administrator before changing this role",
          });
          return;
        }
      }

      const updated = (await clerkClient.users.updateUserMetadata(
        params.data.id,
        {
          publicMetadata: {
            ...target.publicMetadata,
            workspaceRole: parsed.data.role,
          },
        },
      )) as ClerkUserLike;

      await recordAuditEvent(db, req, {
        action: "update",
        targetType: "workspace_user_role",
        targetId: params.data.id,
        outcome: "success",
        changeSummary: safeChangeSummary(
          { role: previousRole },
          { role: parsed.data.role },
        ),
      });

      res.json(
        UpdateWorkspaceUserRoleResponse.parse(
          workspaceUserForApi(updated, getRequestActor(req).id),
        ),
      );
    } catch (error) {
      if (clerkErrorStatus(error) === 404) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      req.log.error(
        { err: error, targetUserId: params.data.id },
        "Unable to update workspace user role",
      );
      res.status(502).json({ error: "Unable to update workspace user role" });
    }
  },
);

export default router;