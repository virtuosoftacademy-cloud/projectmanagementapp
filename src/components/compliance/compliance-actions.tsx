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
  Trash2,
  X,
} from "lucide-react";
import {
  DeleteConfirmationDialog,
  CancelConfirmationDialog,
} from "@/components/ui/confirmation-dialog";
import { UserRole } from "@/types";

interface ComplianceReport {
  _id: string;
  complianceType: string;
  status: "active" | "expired" | "pending" | "revoked";
  // ... other fields you might need
}

interface ComplianceActionsProps {
  report: ComplianceReport;
  userRole: UserRole;
  onUpdate: () => void;
  onDelete: () => void;
  onView: () => void;
  onEdit: () => void;
}

export function ComplianceActions({
  report,
  userRole,
  onUpdate,
  onDelete,
  onView,
  onEdit,
}: ComplianceActionsProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [newExpiryDate, setNewExpiryDate] = useState("");

  const canEdit = [UserRole.ADMIN, UserRole.MANAGER].includes(userRole);
  const canDelete = [UserRole.ADMIN, UserRole.MANAGER].includes(userRole);
  const canRevoke = [UserRole.ADMIN, UserRole.MANAGER].includes(userRole);
  const canRenew = [UserRole.ADMIN, UserRole.MANAGER].includes(userRole);
  const canMarkExpired = [UserRole.ADMIN, UserRole.MANAGER].includes(userRole);

  const handleAction = async (action: string, data?: any) => {
    try {
      setActionLoading(action);

      const response = await fetch(`/api/compliance/${report._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          ...data,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `Failed to ${action} compliance report`
        );
      }

      toast.success(`Compliance report ${action} successfully!`);
      onUpdate();
    } catch (error: any) {
      toast.error(error?.message || `Failed to ${action} compliance report`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async () => {
    if (!revokeReason.trim()) {
      toast.error("Please provide a reason for revocation");
      return;
    }

    await handleAction("revoke", { reason: revokeReason.trim() });
    setRevokeDialogOpen(false);
    setRevokeReason("");
  };

  const handleRenew = async () => {
    if (!newExpiryDate) {
      toast.error("Please select a new expiry date");
      return;
    }

    await handleAction("renew", { newExpiryDate });
    setRenewDialogOpen(false);
    setNewExpiryDate("");
  };

  const handleMarkExpired = async () => {
    await handleAction("markExpired");
  };

  const handleDelete = async () => {
    try {
      setActionLoading("delete");

      const response = await fetch(`/api/compliance/${report.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete compliance report");
      }

      toast.success("Compliance report deleted successfully!");
      onDelete();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete compliance report");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={onView}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>

          {canEdit && report.status !== "expired" && report.status !== "revoked" && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Report
            </DropdownMenuItem>
          )}

          {/* Status-based actions */}
          {report.status === "pending" && canEdit && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleAction("approve")}
                className="text-green-600"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark as Active
              </DropdownMenuItem>
            </>
          )}

          {report.status === "active" && canRenew && (
            <DropdownMenuItem onClick={() => setRenewDialogOpen(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Renew Certificate
            </DropdownMenuItem>
          )}

          {report.status === "active" && canMarkExpired && (
            <DropdownMenuItem
              onClick={handleMarkExpired}
              className="text-orange-600"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Mark as Expired
            </DropdownMenuItem>
          )}

          {report.status === "active" && canRevoke && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setRevokeDialogOpen(true)}>
                <Ban className="mr-2 h-4 w-4" />
                Revoke Certificate
              </DropdownMenuItem>
            </>
          )}

          {/* Destructive actions */}
          {canDelete && report.status !== "revoked" && (
            <>
              <DropdownMenuSeparator />
              <DeleteConfirmationDialog
                itemName={report.complianceType}
                itemType="compliance report"
                onConfirm={handleDelete}
                loading={actionLoading === "delete"}
              >
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Report
                </DropdownMenuItem>
              </DeleteConfirmationDialog>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Revoke Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Compliance Certificate</DialogTitle>
            <DialogDescription>
              Provide a reason for revoking "{report.complianceType}". This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="revoke-reason">Revocation Reason</Label>
              <Textarea
                id="revoke-reason"
                placeholder="e.g., Failed inspection, documentation issues, non-compliance..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeDialogOpen(false)}
              disabled={actionLoading === "revoke"}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={actionLoading === "revoke" || !revokeReason.trim()}
            >
              {actionLoading === "revoke" ? "Revoking..." : "Revoke Certificate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew Dialog */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Compliance Certificate</DialogTitle>
            <DialogDescription>
              Set a new expiry date for "{report.complianceType}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-expiry">New Expiry Date</Label>
              <Input
                id="new-expiry"
                type="date"
                value={newExpiryDate}
                onChange={(e) => setNewExpiryDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenewDialogOpen(false)}
              disabled={actionLoading === "renew"}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenew}
              disabled={actionLoading === "renew" || !newExpiryDate}
            >
              {actionLoading === "renew" ? "Renewing..." : "Renew Certificate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}