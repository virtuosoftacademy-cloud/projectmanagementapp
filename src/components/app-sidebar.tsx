/**
 * Sidebar Navigation
 * Role-based navigation sidebar for the workspace.
 *
 * Structure follows the PropertyPro sidebar: role-filtered `NavSection[]` of
 * `NavItem[]`, collapsible parents with tree connectors, count badges, an
 * in-sidebar collapse toggle and a user footer. Colours use this app's design
 * tokens rather than hard-coded greys, so it still themes light and dark.
 */

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Check, ChevronLeft, ChevronRight, ChevronsUpDown, LogOut, Plus } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormDialog } from "@/components/ui/form-dialog";
import { DialogActions } from "@/components/ui/form-actions";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { visibleSections, type NavItem } from "@/components/navigation";
import type { Project, WorkspaceSummary } from "@/lib/domain";
import { roleLabel } from "@/lib/permissions";
import type { SessionUser } from "@/lib/session";
import { createWorkspaceAction } from "@/lib/workspace-actions";
import { cn } from "@/lib/utils";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function AppSidebar({
  user,
  projects,
  teamCount,
  workspaces,
  badges = {},
  collapsible = true,
  onNavigate,
}: {
  user: SessionUser;
  projects: Pick<Project, "id" | "name">[];
  teamCount: number;
  workspaces: WorkspaceSummary[];
  /** Counts keyed by href, e.g. overdue tasks on /projects/tasks. */
  badges?: Record<string, number>;
  /** The mobile drawer renders expanded and hides the collapse control. */
  collapsible?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { update } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [switching, setSwitching] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [draft, setDraft] = useState({ name: "", slug: "" });
  const [slugTouched, setSlugTouched] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, startCreating] = useTransition();

  const collapsed = collapsible && isCollapsed;
  const currentWorkspace = workspaces.find((workspace) => workspace.id === user.workspaceId);

  async function switchWorkspace(workspaceId: string) {
    if (workspaceId === user.workspaceId || switching) return;
    setSwitching(true);
    await update({ workspaceId });
    router.push("/dashboard");
    router.refresh();
  }

  function submitNewWorkspace() {
    startCreating(async () => {
      const result = await createWorkspaceAction(draft);
      if (!result.ok || !result.workspaceId) {
        setCreateError(result.error ?? "Could not create that workspace.");
        return;
      }
      setCreatingWorkspace(false);
      setDraft({ name: "", slug: "" });
      setSlugTouched(false);
      setCreateError(null);
      await switchWorkspace(result.workspaceId);
    });
  }

  const toggleExpanded = (href: string) =>
    setExpandedItems((previous) =>
      previous.includes(href)
        ? previous.filter((item) => item !== href)
        : [...previous, href],
    );

  const sections = visibleSections(user.role, projects, badges);

  function renderNavItem(item: NavItem, level = 0): React.ReactNode {
    const isActive = pathname === item.href;
    // `visibleSections` already dropped children this role cannot see.
    const children = item.children;
    const hasChildren = Boolean(children && children.length > 0);

    const hasActiveChild = Boolean(children?.some((child) => pathname === child.href));
    const isParentActive = hasActiveChild && level === 0 && !isActive;
    const isChildActive = isActive && level > 0;
    const isExpanded = expandedItems.includes(item.href) || hasActiveChild;

    return (
      <div key={`${item.href}-${item.title}`}>
        <Link
          href={hasChildren ? "#" : item.href}
          onClick={(event) => {
            if (hasChildren) {
              event.preventDefault();
              toggleExpanded(item.href);
            } else {
              onNavigate?.();
            }
          }}
          aria-current={isActive && !hasChildren ? "page" : undefined}
          aria-expanded={hasChildren ? isExpanded : undefined}
          title={collapsed ? item.title : undefined}
          className={cn(
            "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
            "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            isActive &&
              level === 0 &&
              "border border-primary/20 bg-gradient-to-r from-primary/20 to-primary/5 text-primary shadow-sm",
            isParentActive && "border border-primary/10 bg-primary/10 text-primary",
            isChildActive && "ml-6 border-l-2 border-primary/30 bg-primary/5 text-primary",
            level > 0 && "relative ml-8 py-1.5 text-xs",
            collapsed && "justify-center px-2",
          )}
        >
          {/* Tree connector for child items */}
          {level > 0 && !collapsed ? (
            <span className="absolute -left-3 top-1/2 h-px w-3 bg-sidebar-border" />
          ) : null}

          {/* Active rail on a selected top-level item */}
          {isActive && level === 0 ? (
            <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary to-primary/60 shadow-sm" />
          ) : null}

          <item.icon
            className={cn(
              "shrink-0 transition-colors",
              collapsed ? "h-5 w-5" : "h-4 w-4",
              isActive || isParentActive ? "text-primary" : "text-sidebar-foreground/70",
            )}
          />

          {!collapsed ? (
            <>
              <span
                className={cn(
                  "flex-1 truncate font-medium",
                  isActive || isParentActive
                    ? "text-primary"
                    : "text-sidebar-foreground",
                )}
              >
                {item.title}
              </span>

              {item.badge ? (
                <span className="inline-flex items-center justify-center rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary">
                  {item.badge}
                </span>
              ) : null}

              {hasChildren ? (
                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 text-sidebar-foreground/50 transition-transform duration-200",
                    isExpanded && "rotate-90",
                  )}
                />
              ) : null}
            </>
          ) : null}
        </Link>

        {hasChildren && isExpanded && !collapsed && children ? (
          <div className="relative mt-1 space-y-0.5">
            {/* Single vertical line linking the children */}
            <span className="absolute bottom-2 left-3 top-0 w-px bg-sidebar-border" />
            {children.map((child) => (
              <div key={`${child.href}-${child.title}`} className="relative">
                {renderNavItem(child, level + 1)}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex h-16 items-center gap-3 border-b border-sidebar-border",
          collapsed ? "px-2" : "px-4",
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={switching}
              title={collapsed ? currentWorkspace?.name : undefined}
              className={cn(
                "flex min-w-0 items-center rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:opacity-60",
                collapsed ? "flex-1 justify-center" : "flex-1 gap-3",
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
                {currentWorkspace?.name[0] ?? "W"}
              </span>
              {!collapsed ? (
                <>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-semibold text-sidebar-accent-foreground">
                      {currentWorkspace?.name ?? "Workspace"}
                    </span>
                    <span className="block truncate text-xs text-sidebar-foreground/70">
                      <span className="font-mono">{teamCount}</span> teams
                    </span>
                  </span>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
                </>
              ) : null}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onSelect={() => {
                  onNavigate?.();
                  void switchWorkspace(workspace.id);
                }}
                className="gap-2"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-semibold text-primary">
                  {workspace.name[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{workspace.name}</span>
                  <span className="block truncate text-xs capitalize text-muted-foreground">
                    {roleLabel(workspace.role)}
                  </span>
                </span>
                {workspace.id === user.workspaceId ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                ) : null}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                setCreateError(null);
                setCreatingWorkspace(true);
              }}
              className="gap-2"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-dashed border-sidebar-border text-muted-foreground">
                <Plus className="h-3.5 w-3.5" />
              </span>
              New workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <FormDialog
          open={creatingWorkspace}
          onClose={() => setCreatingWorkspace(false)}
          title="New workspace"
          description="You'll be its owner — invite others once it's created."
        >
          <form
            className="grid gap-4 py-2"
            onSubmit={(event) => {
              event.preventDefault();
              submitNewWorkspace();
            }}
          >
            <Field label="Workspace Name" error={createError ?? undefined}>
              <Input
                required
                autoFocus
                value={draft.name}
                placeholder="e.g. Northwind Traders"
                onChange={(event) => {
                  const name = event.target.value;
                  setDraft((current) => ({
                    ...current,
                    name,
                    slug: slugTouched ? current.slug : slugify(name),
                  }));
                }}
              />
            </Field>
            <Field label="URL Slug" hint="Lowercase letters, numbers and hyphens">
              <Input
                required
                value={draft.slug}
                placeholder="northwind-traders"
                onChange={(event) => {
                  setSlugTouched(true);
                  setDraft((current) => ({ ...current, slug: event.target.value }));
                }}
              />
            </Field>
            <DialogActions
              onCancel={() => setCreatingWorkspace(false)}
              submitLabel="Create workspace"
              disabled={creating || switching}
            />
          </form>
        </FormDialog>

        {collapsible ? (
          <button
            type="button"
            onClick={() => setIsCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-md p-1 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          "min-h-0 flex-1 space-y-4 overflow-y-auto",
          collapsed ? "p-3" : "p-4",
        )}
      >
        {sections.map((section) => (
          <div key={section.title ?? "default"} className="space-y-1">
            {section.title && !collapsed ? (
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                  {section.title}
                </h3>
              </div>
            ) : null}
            <div className="space-y-0.5">{section.items.map((item) => renderNavItem(item))}</div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="shrink-0 border-t border-sidebar-border p-4">
        {collapsed ? (
          <button
            type="button"
            onClick={() => signOut({ redirectTo: "/signin" })}
            aria-label="Sign out"
            title="Sign out"
            className="flex w-full items-center justify-center rounded-md p-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <UserAvatar name={user.name} className="h-8 w-8" textClassName="text-xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
                {user.name}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/70">
                {roleLabel(user.role)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ redirectTo: "/signin" })}
              aria-label="Sign out"
              title="Sign out"
              className="rounded-md p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
