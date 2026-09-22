"use client";

import { useState } from "react";
import { PanelLeft } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalTimerIndicator } from "@/components/projects/global-timer-indicator";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-media-query";
import type { AppNotification, Project, RunningTimer, WorkspaceSummary } from "@/lib/domain";
import type { AppPage } from "@/lib/permissions";
import type { ActiveSessionUser } from "@/lib/session";

/**
 * Two-column app shell. The sidebar is pinned on large screens and manages its
 * own collapsed width; below `lg` it slides in as an overlay, always expanded.
 */
export function AppShell({
  user,
  projects,
  teamCount,
  workspaces,
  pages,
  canCreateWorkspace,
  canManageFeatures,
  badges,
  runningTimer,
  notifications,
  unreadNotifications,
  children,
}: {
  user: ActiveSessionUser;
  projects: Pick<Project, "id" | "name" | "features">[];
  teamCount: number;
  workspaces: WorkspaceSummary[];
  /** Pages this member may reach; see `resolvePages`. */
  pages: AppPage[];
  canCreateWorkspace: boolean;
  canManageFeatures: boolean;
  badges?: Record<string, number>;
  /** The viewer's running timer, shown in the header on every page. */
  runningTimer: RunningTimer | null;
  /** The viewer's latest notifications, and how many of theirs are unread. */
  notifications: AppNotification[];
  unreadNotifications: number;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-svh w-full">
      <aside className="hidden shrink-0 lg:block">
        <div className="sticky top-0 h-svh">
          <AppSidebar
            user={user}
            projects={projects}
            teamCount={teamCount}
            workspaces={workspaces}
            pages={pages}
            canCreateWorkspace={canCreateWorkspace}
            canManageFeatures={canManageFeatures}
            badges={badges}
          />
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="absolute inset-y-0 left-0 shadow-lg">
            <AppSidebar
              user={user}
              projects={projects}
              teamCount={teamCount}
              workspaces={workspaces}
              pages={pages}
              canCreateWorkspace={canCreateWorkspace}
              canManageFeatures={canManageFeatures}
              badges={badges}
              collapsible={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm">
          {/* Desktop collapsing lives in the sidebar header; this only opens the drawer. */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:invisible"
            onClick={() => setMobileOpen((value) => !value)}
            aria-expanded={isMobile ? mobileOpen : undefined}
          >
            <PanelLeft className="h-4 w-4" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <GlobalTimerIndicator running={runningTimer} />
            <NotificationBell items={notifications} unread={unreadNotifications} />
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>

        <MobileNavigation role={user.role} badges={badges} />
      </div>
    </div>
  );
}
