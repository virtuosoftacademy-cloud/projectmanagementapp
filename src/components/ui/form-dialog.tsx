"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Controlled dialog wrapper over shadcn's Dialog.
 *
 * The screens here drive dialogs from `open`/`onClose` state rather than a
 * trigger element, so this adapts that to Radix's `onOpenChange` and keeps the
 * header markup in one place.
 */
export function FormDialog({
  open,
  onClose,
  title,
  description,
  footer,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className={cn("max-h-[85svh] overflow-y-auto", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        {footer}
      </DialogContent>
    </Dialog>
  );
}
