import { clerkClient, getAuth } from "@clerk/express";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { logger } from "../lib/logger";
import {
  type WorkspaceRole,
  roleAtLeast,
} from "../lib/access";
import {
  listAllClerkUsers,
  primaryVerifiedEmail,
  roleFromUserMetadata,
  type ClerkUserLike,
} from "../lib/clerk-users";

export const AUTHENTICATION_REQUIRED = {
  error: "Authentication required",
  code: "AUTHENTICATION_REQUIRED",
} as const;

export const INSUFFICIENT_PERMISSIONS = {
  error: "Insufficient permissions",
  code: "INSUFFICIENT_PERMISSIONS",
} as const;

export const AUTHENTICATION_UNAVAILABLE = {
  error: "Authentication service unavailable",
  code: "AUTHENTICATION_UNAVAILABLE",
} as const;

async function roleForUser(
  userId: string,
): Promise<WorkspaceRole> {
  const user = (await clerkClient.users.getUser(userId)) as ClerkUserLike;
  const role = roleFromUserMetadata(user);
  if (role !== "read_only" || user.publicMetadata.workspaceRole === "read_only") {
    return role;
  }

  const bootstrapEmail = process.env.WORKSPACE_BOOTSTRAP_ADMIN_EMAIL
    ?.trim()
    .toLowerCase();
  if (!bootstrapEmail || primaryVerifiedEmail(user) !== bootstrapEmail) {
    return "read_only";
  }

  const users = await listAllClerkUsers();
  const hasAdministrator = users.some(
    (candidate) => roleFromUserMetadata(candidate) === "administrator",
  );
  if (hasAdministrator) return "read_only";

  await clerkClient.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      workspaceRole: "administrator",
    },
  });
  return "administrator";
}

/**
 * Authenticates all requests that reach the discovery router. Clerk owns the
 * browser session cookie; no client-supplied user id or role is accepted.
 */
export const requireUser: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json(AUTHENTICATION_REQUIRED);
    return;
  }

  try {
    const role = await roleForUser(auth.userId);
    req.user = { id: auth.userId, role };
    next();
  } catch (error) {
    logger.error({ err: error, userId: auth.userId }, "Unable to resolve workspace role");
    res.status(503).json(AUTHENTICATION_UNAVAILABLE);
  }
};

export function requireRole(minimumRole: WorkspaceRole): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role;
    if (!role || !roleAtLeast(role, minimumRole)) {
      res.status(403).json(INSUFFICIENT_PERMISSIONS);
      return;
    }
    next();
  };
}