import { clerkClient } from "@clerk/express";
import {
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "./access";

type ClerkEmailAddress = {
  id: string;
  emailAddress: string;
  verification?: {
    status?: string | null;
  } | null;
};

export type ClerkUserLike = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  primaryEmailAddressId?: string | null;
  emailAddresses: ClerkEmailAddress[];
  publicMetadata: Record<string, unknown>;
  createdAt: number;
  lastActiveAt?: number | null;
  banned?: boolean;
  locked?: boolean;
};

export function roleFromUserMetadata(user: ClerkUserLike): WorkspaceRole {
  return (
    normalizeWorkspaceRole(
      user.publicMetadata.workspaceRole ?? user.publicMetadata.role,
    ) ?? "read_only"
  );
}

export function primaryEmail(user: ClerkUserLike): ClerkEmailAddress | undefined {
  return (
    user.emailAddresses.find(
      (address) => address.id === user.primaryEmailAddressId,
    ) ?? user.emailAddresses[0]
  );
}

export function primaryVerifiedEmail(user: ClerkUserLike): string | undefined {
  const email = primaryEmail(user);
  return email?.verification?.status === "verified"
    ? email.emailAddress.toLowerCase()
    : undefined;
}

export async function listAllClerkUsers(): Promise<ClerkUserLike[]> {
  const users: ClerkUserLike[] = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const page = await clerkClient.users.getUserList({ limit, offset });
    users.push(...(page.data as ClerkUserLike[]));
    offset += page.data.length;
    if (page.data.length === 0 || offset >= page.totalCount) break;
  }

  return users;
}

export function workspaceUserForApi(
  user: ClerkUserLike,
  currentUserId: string,
) {
  const email = primaryEmail(user);
  const displayName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    id: user.id,
    name: displayName || email?.emailAddress || "Unnamed user",
    email: email?.emailAddress ?? "unknown@example.invalid",
    emailVerified: email?.verification?.status === "verified",
    role: roleFromUserMetadata(user),
    status: user.banned ? "banned" : user.locked ? "locked" : "active",
    createdAt: new Date(user.createdAt).toISOString(),
    lastActiveAt:
      user.lastActiveAt == null
        ? null
        : new Date(user.lastActiveAt).toISOString(),
    isCurrentUser: user.id === currentUserId,
  } as const;
}