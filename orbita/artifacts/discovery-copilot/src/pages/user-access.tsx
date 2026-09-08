import {
  getGetCurrentAccessQueryKey,
  getGetWorkspaceUsersQueryKey,
  useGetWorkspaceUsers,
  useUpdateWorkspaceUserRole,
  type WorkspaceRole,
  type WorkspaceUser,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Search,
  UserRoundCog,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const roles: Array<{
  value: WorkspaceRole;
  label: string;
  description: string;
}> = [
  {
    value: "read_only",
    label: "Read only",
    description: "Sees the workspace with sensitive fields redacted.",
  },
  {
    value: "contributor",
    label: "Contributor",
    description: "Can add sessions, stakeholders, and opportunities.",
  },
  {
    value: "facilitator",
    label: "Facilitator",
    description: "Can view sensitive discovery data and update sessions.",
  },
  {
    value: "editor",
    label: "Editor",
    description: "Can edit prioritization and roadmap controls.",
  },
  {
    value: "administrator",
    label: "Administrator",
    description: "Can manage users, privacy operations, and audit access.",
  },
];

function roleLabel(role: WorkspaceRole): string {
  return roles.find((item) => item.value === role)?.label ?? role;
}

function formatDate(value: string | null): string {
  if (!value) return "No activity recorded";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function errorStatus(error: unknown): number | undefined {
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

export default function UserAccess() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const usersQuery = useGetWorkspaceUsers();
  const updateRole = useUpdateWorkspaceUserRole();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<WorkspaceRole | "all">("all");
  const [draftRoles, setDraftRoles] = useState<Record<string, WorkspaceRole>>(
    {},
  );

  const handleRoleChange = (user: WorkspaceUser, role: WorkspaceRole) => {
    if (role === user.role) return;
    if (
      (role === "administrator" || user.role === "administrator") &&
      !window.confirm(
        user.isCurrentUser && role !== "administrator"
          ? "Remove your own administrator access? You may lose access to this page immediately."
          : `${role === "administrator" ? "Grant" : "Remove"} administrator access for ${user.name}?`,
      )
    ) {
      return;
    }
    updateRole.mutate(
      { id: user.id, data: { role } },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData<WorkspaceUser[]>(
            getGetWorkspaceUsersQueryKey(),
            (current) =>
              current?.map((item) =>
                item.id === updated.id ? updated : item,
              ),
          );
          if (updated.isCurrentUser) {
            queryClient.invalidateQueries({
              queryKey: getGetCurrentAccessQueryKey(),
            });
          }
          toast({
            title: "Access updated",
            description: `${updated.name} is now ${roleLabel(updated.role)}.`,
          });
          setDraftRoles((current) => {
            const next = { ...current };
            delete next[updated.id];
            return next;
          });
        },
        onError: (error) => {
          toast({
            title: "Access update failed",
            description:
              errorStatus(error) === 409
                ? "Assign another administrator before changing the final administrator."
                : "The role could not be changed. Please try again.",
            variant: "destructive",
          });
        },
      },
    );
  };

  if (usersQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading workspace users...
      </div>
    );
  }

  if (usersQuery.isError) {
    const forbidden = errorStatus(usersQuery.error) === 403;
    return (
      <Card className="mx-auto max-w-2xl border-amber-500/30">
        <CardContent className="flex gap-4 p-6">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-500" />
          <div>
            <h1 className="text-lg font-semibold">
              {forbidden
                ? "Administrator access required"
                : "User access is unavailable"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {forbidden
                ? "Only workspace administrators can view or change team access."
                : "The identity service could not load the user list. Please try again shortly."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const users = usersQuery.data ?? [];
  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [roleFilter, search, users]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <ShieldCheck className="h-4 w-4" />
            Administrator control
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">User access</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Assign the minimum access each team member needs. Changes are
            enforced by the API and recorded in the security audit trail.
          </p>
        </div>
        <Badge variant="outline" className="w-fit gap-1.5 py-1.5">
          <UserRoundCog className="h-3.5 w-3.5" />
          {users.length} {users.length === 1 ? "user" : "users"}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 font-semibold">
              <LockKeyhole className="h-4 w-4 text-slate-500" />
              Safe by default
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              New users start read-only with sensitive fields redacted.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Immediate enforcement
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              The server checks current Clerk metadata on every request.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Admin continuity
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              The final administrator cannot be accidentally demoted.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Workspace members</CardTitle>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or email..."
                className="pl-9"
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={(value) =>
                setRoleFilter(value as WorkspaceRole | "all")
              }
            >
              <SelectTrigger className="sm:w-[190px]" aria-label="Filter by role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All access levels</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team member</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead className="w-[230px]">Access level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    selectedRole={draftRoles[user.id] ?? user.role}
                    pending={updateRole.isPending}
                    onDraftChange={(role) =>
                      setDraftRoles((current) => ({
                        ...current,
                        [user.id]: role,
                      }))
                    }
                    onRoleChange={handleRoleChange}
                  />
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No users match these filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="divide-y md:hidden">
            {filteredUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                selectedRole={draftRoles[user.id] ?? user.role}
                pending={updateRole.isPending}
                onDraftChange={(role) =>
                  setDraftRoles((current) => ({
                    ...current,
                    [user.id]: role,
                  }))
                }
                onRoleChange={handleRoleChange}
              />
            ))}
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No users match these filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base">Access levels</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {roles.map((role) => (
            <div key={role.value} className="rounded-lg border bg-background p-3">
              <div className="font-medium">{role.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {role.description}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function RoleSelect({
  user,
  selectedRole,
  pending,
  onDraftChange,
  onRoleChange,
}: {
  user: WorkspaceUser;
  selectedRole: WorkspaceRole;
  pending: boolean;
  onDraftChange: (role: WorkspaceRole) => void;
  onRoleChange: (user: WorkspaceUser, role: WorkspaceRole) => void;
}) {
  return (
    <div className="flex gap-2">
      <Select
        value={selectedRole}
        disabled={pending || user.status !== "active"}
        onValueChange={(value) => onDraftChange(value as WorkspaceRole)}
      >
        <SelectTrigger aria-label={`Access level for ${user.name}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem key={role.value} value={role.value}>
              {role.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        disabled={
          pending ||
          user.status !== "active" ||
          selectedRole === user.role
        }
        onClick={() => onRoleChange(user, selectedRole)}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
      </Button>
    </div>
  );
}

function UserIdentity({ user }: { user: WorkspaceUser }) {
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {initials || "U"}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 font-medium">
          <span className="truncate">{user.name}</span>
          {user.isCurrentUser && (
            <Badge variant="secondary" className="text-[10px]">
              You
            </Badge>
          )}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {user.email}
          {!user.emailVerified && " · Unverified"}
        </div>
      </div>
    </div>
  );
}

function UserRow({
  user,
  selectedRole,
  pending,
  onDraftChange,
  onRoleChange,
}: {
  user: WorkspaceUser;
  selectedRole: WorkspaceRole;
  pending: boolean;
  onDraftChange: (role: WorkspaceRole) => void;
  onRoleChange: (user: WorkspaceUser, role: WorkspaceRole) => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <UserIdentity user={user} />
      </TableCell>
      <TableCell>
        <Badge
          variant={user.status === "active" ? "success" : "outline"}
          className="capitalize"
        >
          {user.status}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(user.lastActiveAt)}
      </TableCell>
      <TableCell>
        <RoleSelect
          user={user}
          selectedRole={selectedRole}
          pending={pending}
          onDraftChange={onDraftChange}
          onRoleChange={onRoleChange}
        />
      </TableCell>
    </TableRow>
  );
}

function UserCard({
  user,
  selectedRole,
  pending,
  onDraftChange,
  onRoleChange,
}: {
  user: WorkspaceUser;
  selectedRole: WorkspaceRole;
  pending: boolean;
  onDraftChange: (role: WorkspaceRole) => void;
  onRoleChange: (user: WorkspaceUser, role: WorkspaceRole) => void;
}) {
  return (
    <div className="space-y-4 p-4">
      <UserIdentity user={user} />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <Badge
          variant={user.status === "active" ? "success" : "outline"}
          className="capitalize"
        >
          {user.status}
        </Badge>
        <span>{formatDate(user.lastActiveAt)}</span>
      </div>
      <RoleSelect
        user={user}
        selectedRole={selectedRole}
        pending={pending}
        onDraftChange={onDraftChange}
        onRoleChange={onRoleChange}
      />
    </div>
  );
}