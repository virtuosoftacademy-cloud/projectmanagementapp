"use client";

import { useState } from "react";
import { Bell, PanelLeft } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-media-query";
import type { Project, WorkspaceSummary } from "@/lib/domain";
import type { SessionUser } from "@/lib/session";

/**
 * Two-column app shell. The sidebar is pinned on large screens and manages its
 * own collapsed width; below `lg` it slides in as an overlay, always expanded.
 */
export function AppShell({
  user,
  projects,
  teamCount,
  workspaces,
  badges,
  children,
}: {
  user: SessionUser;
  projects: Pick<Project, "id" | "name">[];
  teamCount: number;
  workspaces: WorkspaceSummary[];
  badges?: Record<string, number>;
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
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
        </header>

        <main className="flex-1 p-6">{children}</main>

        <MobileNavigation role={user.role} badges={badges} />
      </div>
    </div>
  );
}
