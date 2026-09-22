"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { AppNotification } from "@/lib/domain";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/notification-actions";
import { cn } from "@/lib/utils";

/** "just now", "4h", "3d" — enough to place it without a full timestamp. */
function ago(iso: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/**
 * The header bell: what happened that is addressed to you, in this workspace.
 *
 * Opening it does not mark anything read — that would make the badge useless
 * for anyone who glances. Reading happens when an entry is clicked, or all at
 * once from the header of the list.
 */
export function NotificationBell({
  items,
  unread,
}: {
  items: AppNotification[];
  unread: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function read(id: string) {
    startTransition(async () => {
      await markNotificationReadAction(id);
      router.refresh();
    });
  }

  function readAll() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-none text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          {unread > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={pending}
              onClick={readAll}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nothing yet. You will hear about work assigned to you here.
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {items.map((item) => {
              const body = (
                <span className="flex gap-2.5">
                  {item.actor ? (
                    <UserAvatar
                      name={item.actor.name}
                      image={item.actor.image}
                      className="mt-0.5 size-7 shrink-0"
                      textClassName="text-[10px]"
                    />
                  ) : (
                    <Bell aria-hidden className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug">{item.title}</span>
                    {item.body ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {item.body}
                      </span>
                    ) : null}
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {item.actor ? `${item.actor.name} · ` : ""}
                      {ago(item.createdAt)}
                    </span>
                  </span>
                  {item.read ? null : (
                    <span
                      aria-hidden
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    />
                  )}
                </span>
              );

              return (
                <li key={item.id} className={cn("border-b last:border-0", !item.read && "bg-muted/40")}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="block px-3 py-2 transition-colors hover:bg-muted/60"
                      onClick={() => {
                        setOpen(false);
                        if (!item.read) read(item.id);
                      }}
                    >
                      {body}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left transition-colors hover:bg-muted/60"
                      disabled={pending || item.read}
                      onClick={() => read(item.id)}
                    >
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
