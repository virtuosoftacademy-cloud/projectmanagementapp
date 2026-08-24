"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  deleteUserAction,
  setUserRoleAction,
  setUsersDisabledAction,
  type ActionResult,
} from "@/app/(app)/admin/users/actions";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import type { AdminUser } from "@/lib/admin";
import type { Role, Team } from "@/lib/domain";
import { ROLES, roleLabel } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

export function UsersTable({
  users,
  teams,
  canInvite,
  canManageRoles,
  currentUserId,
}: {
  users: AdminUser[];
  teams: Team[];
  /** Owners and admins get the management controls; everyone else reads. */
  canInvite: boolean;
  canManageRoles: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [removing, setRemoving] = useState<AdminUser | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (teamFilter !== "all" && user.teamId !== teamFilter) return false;
      if (statusFilter === "active" && !user.active) return false;
      if (statusFilter === "inactive" && user.active) return false;
      if (!term) return true;
      return (
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.designation ?? "").toLowerCase().includes(term)
      );
    });
  }, [users, search, roleFilter, teamFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selectable = visible.filter((user) => user.id !== currentUserId).map((user) => user.id);
  const allSelected = selectable.length > 0 && selectable.every((id) => selected.includes(id));

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await action();
      setNotice(result.error ?? null);
      if (result.ok) {
        onSuccess?.();
        router.refresh();
      }
    });
  }

  function resetTo(pageNumber: number) {
    setPage(pageNumber);
    setSelected([]);
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-none">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetTo(1);
              }}
              placeholder="Search name, email or designation"
              aria-label="Search users"
              className="pl-8"
            />
          </div>

          <SelectField
            value={roleFilter}
            onValueChange={(value) => {
              setRoleFilter(value as "all" | Role);
              resetTo(1);
            }}
            aria-label="Filter by role"
            className="w-[150px]"
            options={[
              { value: "all", label: "All roles" },
              ...ROLES.map((role) => ({ value: role, label: roleLabel(role) })),
            ]}
          />

          <SelectField
            value={teamFilter}
            onValueChange={(value) => {
              setTeamFilter(value);
              resetTo(1);
            }}
            aria-label="Filter by team"
            className="w-[150px]"
            options={[
              { value: "all", label: "All teams" },
              ...teams.map((team) => ({ value: team.id, label: team.name })),
            ]}
          />

          <SelectField
            value={statusFilter}
            onValueChange={(value) =>
              {
                setStatusFilter(value as "all" | "active" | "inactive");
                resetTo(1);
              }
            }
            aria-label="Filter by status"
            className="w-[140px]"
            options={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Disabled" },
            ]}
          />

          {canInvite ? (
            <Link
              href="/admin/users/new"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add user
            </Link>
          ) : null}
        </CardContent>
      </Card>

      {notice ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-sm text-warning"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </p>
      ) : null}

      {canInvite && selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-3">
          <span className="text-sm font-medium">
            <span className="font-mono">{selected.length}</span> selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => setUsersDisabledAction(selected, false), () => setSelected([]))}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Enable
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => setUsersDisabledAction(selected, true), () => setSelected([]))}
            >
              <UserX className="h-3.5 w-3.5" />
              Disable
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <Card className="shadow-none">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="text-left text-xs text-muted-foreground">
                  {canInvite ? (
                    <th className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        aria-label="Select all on this page"
                        disabled={selectable.length === 0}
                        onChange={(event) =>
                          setSelected(event.target.checked ? selectable : [])
                        }
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                      />
                    </th>
                  ) : null}
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Team</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  {canInvite ? (
                    <th className="px-3 py-2 font-medium">Last sign-in</th>
                  ) : null}
                  {canManageRoles ? (
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {visible.map((user) => (
                  <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                    {canInvite ? (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.includes(user.id)}
                          // Bulk enable/disable only acts on members of this
                          // workspace, so an outsider cannot be selected.
                          disabled={user.id === currentUserId || !user.inWorkspace}
                          aria-label={`Select ${user.name}`}
                          onChange={() =>
                            setSelected((current) =>
                              current.includes(user.id)
                                ? current.filter((id) => id !== user.id)
                                : [...current, user.id],
                            )
                          }
                          className="h-4 w-4 accent-[hsl(var(--primary))]"
                        />
                      </td>
                    ) : null}

                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2">
                        <UserAvatar
                          name={user.name}
                          className="h-8 w-8 bg-primary/10"
                          textClassName="text-xs text-primary"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {user.name}
                            {user.id === currentUserId ? (
                              <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                            ) : null}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </span>
                      </span>
                    </td>

                    <td className="px-3 py-2">
                      {/* Someone outside this workspace has no role here, and the
                          role action would refuse them anyway — so say so rather
                          than offering a control that cannot work. */}
                      {!user.role ? (
                        <Badge variant="muted" title="This account belongs to another workspace">
                          Not a member
                        </Badge>
                      ) : canManageRoles ? (
                        <SelectField
                          aria-label={`Role for ${user.name}`}
                          value={user.role}
                          disabled={pending}
                          className="h-8 w-[120px]"
                          onValueChange={(value) =>
                            run(() => setUserRoleAction(user.id, value as Role))
                          }
                          options={ROLES.map((role) => ({ value: role, label: roleLabel(role) }))}
                        />
                      ) : (
                        <Badge variant="outline">{roleLabel(user.role)}</Badge>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {teams.find((team) => team.id === user.teamId)?.name ?? "—"}
                    </td>

                    <td className="px-3 py-2">
                      <Badge variant={user.active ? "success" : "destructive"}>
                        {user.active ? "Active" : "Disabled"}
                      </Badge>
                    </td>

                    {canInvite ? (
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-muted-foreground">
                        {user.lastLoginAt ?? "Never"}
                      </td>
                    ) : null}

                    {canManageRoles ? (
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        {user.id !== currentUserId && user.inWorkspace ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={pending}
                            onClick={() => setRemoving(user)}
                            aria-label={`Delete ${user.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}

                {visible.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4 + (canInvite ? 2 : 0) + (canManageRoles ? 1 : 0)}
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                    >
                      No users match those filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-mono">{visible.length}</span> of{" "}
          <span className="font-mono">{filtered.length}</span> users
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            disabled={currentPage <= 1}
            onClick={() => resetTo(currentPage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className={cn("min-w-[80px] text-center font-mono text-sm")}>
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            disabled={currentPage >= totalPages}
            onClick={() => resetTo(currentPage + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return;
          run(() => deleteUserAction(removing.id));
        }}
        title={`Delete ${removing?.name ?? "user"}?`}
        description={
          removing
            ? `This also deletes ${removing.entryCount} time ${
                removing.entryCount === 1 ? "entry" : "entries"
              } and removes them from ${removing.taskCount} ${
                removing.taskCount === 1 ? "task" : "tasks"
              }. Disable the account instead if you need to keep their history.`
            : ""
        }
      />
    </div>
  );
}
