"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MoreHorizontal,
  Eye,
  Edit,
  RefreshCw,
  Ban,
  AlertTriangle,
  CheckCircle,
  FileCheck,
} from "lucide-react";
import { UserRole } from "@/types";

// Adjust these enums/types to match your actual ComplianceReport model
type ComplianceStatus = "active" | "expired" | "pending" | "revoked";

interface ComplianceReport {
  _id: string;
  status: ComplianceStatus;
  // ... other fields you might need
}

interface ComplianceStatusManagerProps {
  report: ComplianceReport;
  onStatusUpdate?: (reportId: string, newStatus: ComplianceStatus) => void;
  onReportUpdate?: () => void;
}

interface StatusAction {
  action: string;
  label: string;
  icon: React.ComponentType<any>;
  variant: "default" | "destructive" | "outline" | "secondary";
  requiresConfirmation?: boolean;
  requiresInput?: boolean;
}

export function ComplianceStatusManager({
  report,
  onStatusUpdate,
  onReportUpdate,
}: ComplianceStatusManagerProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<StatusAction | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const userRole = session?.user?.role as UserRole;
  const canManage = [UserRole.ADMIN, UserRole.MANAGER].includes(userRole);

  // Define available actions based on current status and permissions
  const getAvailableActions = (): StatusAction[] => {
    const actions: StatusAction[] = [];

    // View is always available
    actions.push({
      action: "view",
      label: "View Details",
      icon: Eye,
      variant: "outline",
    });

    // Edit allowed for non-final states
    if (report.status !== "expired" && report.status !== "revoked") {
      actions.push({
        action: "edit",
        label: "Edit Report",
        icon: Edit,
        variant: "outline",
      });
    }

    switch (report.status) {
      case "pending":
        if (canManage) {
          actions.push({
            action: "approve",
            label: "Mark as Active",
            icon: CheckCircle,
            variant: "default",
            requiresConfirmation: true,
          });
        }
        break;

      case "active":
        if (canManage) {
          actions.push({
            action: "renew",
            label: "Renew Certificate",
            icon: RefreshCw,
            variant: "default",
            // You could add requiresInput if you want to collect new expiry date here
          });
          actions.push({
            action: "revoke",
            label: "Revoke Certificate",
            icon: Ban,
            variant: "destructive",
            requiresInput: true,
          });
        }
        break;

      case "expired":
      case "revoked":
        // For final states — only view + possibly re-activate if allowed
        if (canManage) {
          actions.push({
            action: "reactivate",
            label: "Reactivate",
            icon: CheckCircle,
            variant: "default",
            requiresConfirmation: true,
          });
        }
        break;
    }

    // Always allow manual expiry override for admins/managers
    if (canManage && report.status === "active") {
      actions.push({
        action: "markExpired",
        label: "Mark as Expired",
        icon: AlertTriangle,
        variant: "destructive",
        requiresConfirmation: true,
      });
    }

    return actions;
  };

  // Handle API status update
  const handleStatusUpdate = async (action: string, extraData: any = {}) => {
    try {
      setIsLoading(true);

      const res = await fetch(`/api/compliance/${report._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...extraData,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update compliance status");
      }

      const result = await res.json();

      toast.success(`Report updated: ${action} successful`);

      if (onStatusUpdate && result.data?.status) {
        onStatusUpdate(report._id, result.data.status);
      }
      if (onReportUpdate) {
        onReportUpdate();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
      setShowRevokeDialog(false);
      setSelectedAction(null);
      setRevokeReason("");
    }
  };

  const handleActionClick = (action: StatusAction) => {
    setSelectedAction(action);

    if (action.action === "view") {
      router.push(`/dashboard/compliance/${report._id}`);
      return;
    }

    if (action.action === "edit") {
      router.push(`/dashboard/compliance/${report._id}/edit`);
      return;
    }

    if (action.requiresInput) {
      if (action.action === "revoke") {
        setShowRevokeDialog(true);
      }
    } else if (action.requiresConfirmation) {
      setShowConfirmDialog(true);
    } else {
      handleStatusUpdate(action.action);
    }
  };

  const handleRevoke = () => {
    if (!revokeReason.trim()) {
      toast.error("Please provide a reason for revocation");
      return;
    }
    handleStatusUpdate("revoke", { reason: revokeReason.trim() });
  };

  const availableActions = getAvailableActions();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {availableActions.length > 0 && (
            <>
              <DropdownMenuLabel>Compliance Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}

          {availableActions.map((action) => {
            const Icon = action.icon;
            return (
              <DropdownMenuItem
                key={action.action}
                onClick={() => handleActionClick(action)}
                className={
                  action.variant === "destructive"
                    ? "text-red-600 focus:text-red-600 focus:bg-red-50"
                    : action.variant === "default"
                    ? "text-blue-600 focus:text-blue-600 focus:bg-blue-50"
                    : ""
                }
                disabled={isLoading}
              >
                <Icon className="mr-2 h-4 w-4" />
                {action.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Generic Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {selectedAction?.label.toLowerCase()} this compliance report? 
              {selectedAction?.action === "markExpired" && " This will mark it as expired immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleStatusUpdate(selectedAction?.action || "")}
              disabled={isLoading}
              className={
                selectedAction?.variant === "destructive"
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
            >
              {isLoading ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Dialog with Reason */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Compliance Certificate</DialogTitle>
            <DialogDescription>
              Provide a reason for revoking this certificate. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="revoke-reason">Reason for Revocation</Label>
              <Textarea
                id="revoke-reason"
                placeholder="Enter detailed reason (e.g., failed inspection, non-compliance...)"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={isLoading || !revokeReason.trim()}
            >
              {isLoading ? "Revoking..." : "Revoke Certificate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}