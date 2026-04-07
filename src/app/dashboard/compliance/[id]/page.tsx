"use client";

import Link from "next/link";
import { toast } from "sonner";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Ban,
  FileCheck,
  Image as ImageIcon,
  MapPin,
  Loader2,
  DollarSign,
  Building2,
  Settings,
} from "lucide-react";
import { UserRole } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { ComplianceDetailSkeleton } from "@/components/compliance/compliance-skeleton";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ComplianceActions } from "@/components/compliance/compliance-actions";
import { ComplianceStatusChanger } from "@/components/compliance/compliance-status-manager";

interface ComplianceReportDetail {
  _id: string;
  complianceType: string;
  issueDate: string;
  expiryDate: string;
  estimatedCost?: number;
  status: "active" | "expired" | "pending" | "revoked";
  notes?: string;
  documents?: string[];
  createdAt: string;
  property: {
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
}

export default function ComplianceReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const {
    t,
    formatCurrency,
    formatDate: formatDateLocalized,
  } = useLocalizationContext();

  const [report, setReport] = useState<ComplianceReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog states
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [markExpiredDialogOpen, setMarkExpiredDialogOpen] = useState(false);

  const [newExpiryDate, setNewExpiryDate] = useState("");
  const [revokeReason, setRevokeReason] = useState("");

  useEffect(() => {
    if (params.id && session) {
      fetchComplianceReport();
    }
  }, [params.id, session]);

  const fetchComplianceReport = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/compliance/${params.id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || t("compliance.details.toasts.fetchError")
        );
      }

      const data = await response.json();
      const reportData = data?.data;

      if (!reportData) {
        throw new Error(t("compliance.details.toasts.fetchError"));
      }

      setReport(reportData);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("compliance.details.toasts.fetchError")
      );
      router.push("/dashboard/compliance");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "expired": return "destructive";
      case "pending": return "secondary";
      case "revoked": return "outline";
      default: return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return Clock;
      case "active": return CheckCircle;
      case "expired": return AlertTriangle;
      case "revoked": return Ban;
      default: return Clock;
    }
  };

  const formatCurrencyDisplay = (amount: number | undefined) => {
    if (!amount) return t("compliance.details.labels.na");
    return formatCurrency(amount);
  };

  const formatDateDisplay = (date: string | Date | undefined) => {
    if (!date) return t("compliance.details.labels.na");
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return t("compliance.details.labels.na");
      return formatDateLocalized(dateObj, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return t("compliance.details.labels.na");
    }
  };

  // Action Handlers
  const handleRenewCertificate = async () => {
    if (!newExpiryDate) {
      toast.error("Please select a new expiry date");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/compliance/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "renew",
          newExpiryDate,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to renew certificate");
      }

      toast.success("Certificate renewed successfully");
      setRenewDialogOpen(false);
      setNewExpiryDate("");
      await fetchComplianceReport();
    } catch (err: any) {
      toast.error(err.message || "Failed to renew");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeCertificate = async () => {
    if (!revokeReason.trim()) {
      toast.error("Please provide a revocation reason");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/compliance/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke",
          reason: revokeReason.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to revoke certificate");
      }

      toast.success("Certificate revoked successfully");
      setRevokeDialogOpen(false);
      setRevokeReason("");
      await fetchComplianceReport();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkExpired = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/compliance/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markExpired" }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to mark as expired");
      }

      toast.success("Report marked as expired");
      setMarkExpiredDialogOpen(false);
      await fetchComplianceReport();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <ComplianceDetailSkeleton />;
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">
          {t("compliance.details.header.notFound")}
        </h2>
        <p className="text-muted-foreground text-center">
          {t("compliance.details.header.notFoundDescription")}
        </p>
        <Link href="/dashboard/compliance">
          <Button size="sm" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("compliance.details.header.backToCompliance")}
          </Button>
        </Link>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(report.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {report.complianceType.replace("-", " ").toUpperCase() || "Compliance Report"}
            </h1>
            <p className="text-muted-foreground">
              Report ID: {report._id?.toString().slice(-8).toUpperCase() || "N/A"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {session?.user?.role &&
            report.status !== "revoked" &&
            report.status !== "expired" &&
            [UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole) && (
              <Link href={`/dashboard/compliance/${report._id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit Report
                </Button>
              </Link>
            )}

          <ComplianceActions
            report={report}
            onStatusUpdate={(id, newStatus) =>
              setReport((prev) =>
                prev && prev._id === id ? { ...prev, status: newStatus } : prev
              )
            }
            onReportUpdate={fetchComplianceReport}
          />

          <Link href="/dashboard/compliance">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        {/* Main Content */}
        <div className="md:col-span-1 lg:col-span-3 space-y-6">
          {/* Report Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Report Details</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusColor(report.status)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {report.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Notes / Remarks</h4>
                <p className="text-muted-foreground">
                  {report.notes || "No additional notes provided."}
                </p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Issued On</h4>
                  <p className="text-muted-foreground">
                    {formatDateDisplay(report.issueDate)}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Expiry Date</h4>
                  <p className="text-muted-foreground">
                    {formatDateDisplay(report.expiryDate)}
                  </p>
                </div>
              </div>

              {report.documents && report.documents.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Attached Documents</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {report.documents.map((doc, index) => (
                        <div
                          key={index}
                          className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => window.open(doc, "_blank")}
                        >
                          <Image
                            src={doc}
                            alt={`Document ${index + 1}`}
                            className="w-full h-full object-cover"
                            width={200}
                            height={200}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="md:col-span-1 lg:col-span-2 space-y-6">
          {/* Property Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Property
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">
                  {report.property?.name || "N/A"}
                </h4>
                <div className="flex items-start gap-2 mt-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p>{report.property?.address?.street || "N/A"}</p>
                    <p>
                      {report.property?.address?.city || "N/A"}, {" "}
                      {report.property?.address?.state || "N/A"}{" "}
                      {report.property?.address?.zipCode || ""}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.estimatedCost && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Estimated Cost
                  </span>
                  <span className="font-medium">
                    {formatCurrencyDisplay(report.estimatedCost)}
                  </span>
                </div>
              )}
              {!report.estimatedCost && (
                <div className="text-center py-4">
                  <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No cost information available
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Status Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {t("leases.details.status.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ComplianceStatusChanger
                report={report}
                onUpdate={fetchComplianceReport}
                disabled={actionLoading}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Renew Dialog */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Compliance Certificate</DialogTitle>
            <DialogDescription>
              Set a new expiry date for this certificate.
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
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenewCertificate}
              disabled={actionLoading || !newExpiryDate}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Renewing...
                </>
              ) : (
                "Renew Certificate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Certificate</DialogTitle>
            <DialogDescription>
              Provide a reason for revoking this compliance certificate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="revoke-reason">Reason</Label>
              <Textarea
                id="revoke-reason"
                placeholder="e.g. Failed inspection, non-compliance..."
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
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeCertificate}
              disabled={actionLoading || !revokeReason.trim()}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                "Revoke"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Expired Confirmation Dialog */}
      <AlertDialog open={markExpiredDialogOpen} onOpenChange={setMarkExpiredDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Expired?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this compliance report as expired?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkExpired}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : "Mark as Expired"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}