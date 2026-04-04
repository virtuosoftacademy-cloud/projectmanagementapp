"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GlobalPagination } from "@/components/ui/global-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileCheck,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  X,
  Grid3X3,
  List,
} from "lucide-react";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { useViewPreferencesStore } from "@/stores/view-preferences.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { ComplianceStatusManager } from "@/components/compliance/compliance-status-manager";

interface ComplianceReport {
  _id: string;
  property: { name: string; address: { city: string; state?: string } };
  complianceType: string;
  issueDate: string;
  expiryDate: string;
  estimatedCost?: number;
  status: "active" | "expired" | "pending" | "revoked";
  documents?: string[];
  daysUntilExpiry?: number;
  createdAt: string;
}

export default function CompliancePage() {
  const { data: session, status: sessionStatus } = useSession();
  const { t } = useLocalizationContext();

  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL_STATUSES");
  const [typeFilter, setTypeFilter] = useState("ALL_TYPES");
  const [expiryFilter, setExpiryFilter] = useState("ALL_EXPIRY");

  const [sortBy, setSortBy] = useState("expiryDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

const viewMode = useViewPreferencesStore((state) => state.maintenanceView);
  const setViewMode = useViewPreferencesStore(
    (state) => state.setMaintenanceView
  );
  // ────────────────────────────────────────────────
  // Fetch function
  // ────────────────────────────────────────────────
  const fetchComplianceReports = useCallback(async () => {
    if (sessionStatus !== "authenticated") return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sort: `${sortBy}:${sortOrder}`,
      });

      if (searchTerm) params.set("search", searchTerm);
      if (statusFilter !== "ALL_STATUSES") params.set("status", statusFilter);
      if (typeFilter !== "ALL_TYPES") params.set("complianceType", typeFilter);
      if (expiryFilter === "EXPIRING_SOON") params.set("expiringSoon", "true");

      const res = await fetch(`/api/compliance?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch compliance reports");
      }

      setReports(json.data || []);
      setTotalItems(json.pagination?.total || 0);
      setTotalPages(json.pagination?.pages || 1);
    } catch (err: any) {
      const msg = err.message || "Could not load compliance reports";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [
    sessionStatus,
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
    searchTerm,
    statusFilter,
    typeFilter,
    expiryFilter,
  ]);

  useEffect(() => {
    fetchComplianceReports();
  }, [fetchComplianceReports]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, expiryFilter, sortBy, sortOrder]);

  // ────────────────────────────────────────────────
  // Status update handler (optimistic + refetch fallback)
  // ────────────────────────────────────────────────
  const handleStatusUpdate = (reportId: string, newStatus: ComplianceReport["status"]) => {
    // Optimistic update
    setReports((prev) =>
      prev.map((r) =>
        r._id === reportId ? { ...r, status: newStatus } : r
      )
    );

    // Refetch after short delay to ensure backend sync
    setTimeout(() => {
      fetchComplianceReports();
    }, 800);
  };

  const handleReportUpdate = () => {
    fetchComplianceReports();
  };

  // ────────────────────────────────────────────────
  // Stats
  // ────────────────────────────────────────────────
  const stats = {
    total: totalItems,
    active: reports.filter((r) => r.status === "active").length,
    expired: reports.filter((r) => (r.daysUntilExpiry ?? 0) < 0).length,
    expiringSoon: reports.filter((r) => {
      const days = r.daysUntilExpiry ?? 0;
      return days >= 0 && days <= 30;
    }).length,
    totalEstimatedCost: reports.reduce((sum, r) => sum + (r.estimatedCost || 0), 0),
  };

  // ────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────
  const formatDate = (date?: string) => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const getExpiryStyle = (days?: number) => {
    if (!days) return "";
    if (days < 0) return "text-red-600 font-medium";
    if (days <= 30) return "text-orange-600 font-medium";
    return "text-green-600";
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":   return "default";
      case "expired":  return "destructive";
      case "pending":  return "secondary";
      case "revoked":  return "outline";
      default:         return "outline";
    }
  };

  // ────────────────────────────────────────────────
  // Table Columns
  // ────────────────────────────────────────────────
  const columns: DataTableColumn<ComplianceReport>[] = [
    {
      id: "type",
      header: "Type",
      cell: (r) => <div className="font-medium capitalize">{r.complianceType.replace("-", " ")}</div>,
    },
    {
      id: "property",
      header: "Property",
      cell: (r) => (
        <div>
          <div className="font-medium">{r.property?.name || "—"}</div>
          <div className="text-xs text-muted-foreground">{r.property?.address?.city || "—"}</div>
        </div>
      ),
    },
    {
      id: "issued",
      header: "Issued",
      cell: (r) => formatDate(r.issueDate),
    },
    {
      id: "expiry",
      header: "Expiry",
      cell: (r) => (
        <div className={getExpiryStyle(r.daysUntilExpiry)}>
          {formatDate(r.expiryDate)}
          {r.daysUntilExpiry != null && (
            <span className="text-xs ml-1">
              ({r.daysUntilExpiry < 0 ? `${Math.abs(r.daysUntilExpiry)}d ago` : `${r.daysUntilExpiry}d left`})
            </span>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (r) => <Badge variant={getStatusVariant(r.status)}>{r.status}</Badge>,
    },
    {
      id: "cost",
      header: "Est. Cost",
      cell: (r) => (r.estimatedCost ? `$${r.estimatedCost.toLocaleString()}` : "—"),
    },
    {
      id: "docs",
      header: "Docs",
      cell: (r) => r.documents?.length || 0,
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (report) => (
        <ComplianceStatusManager
          report={report}
          onStatusUpdate={handleStatusUpdate}
          onReportUpdate={handleReportUpdate}
        />
      ),
    },
  ];

  if (sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Compliance Reports</h1>
          <Link href="/dashboard/compliance/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Report
            </Button>
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Failed to load reports</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchComplianceReports}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Reports</h1>
          <p className="text-muted-foreground">Manage building compliance certificates and inspections</p>
        </div>
        <Link href="/dashboard/compliance/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.expiringSoon}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Est. Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalEstimatedCost.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main List Card */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
                <FileCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Compliance Reports</h2>
                <p className="text-sm text-muted-foreground">
                  {reports.length} {reports.length === 1 ? "report" : "reports"} found
                </p>
              </div>
            </div>

            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => setViewMode("table")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => setViewMode("cards")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by type, property, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_STATUSES">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-10 w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_TYPES">All Types</SelectItem>
                <SelectItem value="fire-safety">Fire Safety</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="structural">Structural</SelectItem>
                <SelectItem value="elevator">Elevator</SelectItem>
                <SelectItem value="pest-control">Pest Control</SelectItem>
                {/* Add more as needed */}
              </SelectContent>
            </Select>

            <Select value={expiryFilter} onValueChange={setExpiryFilter}>
              <SelectTrigger className="h-10 w-[160px]">
                <SelectValue placeholder="Expiry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_EXPIRY">All Expiry</SelectItem>
                <SelectItem value="EXPIRING_SOON">Expiring Soon (≤30d)</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <FileCheck className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No compliance reports found</h3>
              <p className="text-muted-foreground max-w-md">
                {searchTerm || statusFilter !== "ALL_STATUSES" || typeFilter !== "ALL_TYPES"
                  ? "Try adjusting your filters"
                  : "Start by adding your first compliance certificate"}
              </p>
              <Link href="/dashboard/compliance/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Report
                </Button>
              </Link>
            </div>
          ) : viewMode === "table" ? (
            <DataTable
              columns={columns}
              data={reports}
              getRowKey={(r) => r._id}
              loading={loading}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reports.map((report) => (
                <Card key={report._id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="space-y-1">
                        <h3 className="font-medium line-clamp-2">
                          {report.complianceType.replace("-", " ")}
                        </h3>
                        <p className="text-sm text-muted-foreground">{report.property?.name}</p>
                      </div>
                      <Badge variant={getStatusVariant(report.status)}>
                        {report.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-muted-foreground">Issued</div>
                        {formatDate(report.issueDate)}
                      </div>
                      <div>
                        <div className="text-muted-foreground">Expiry</div>
                        <div className={getExpiryStyle(report.daysUntilExpiry)}>
                          {formatDate(report.expiryDate)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Est. Cost</div>
                        {report.estimatedCost ? `$${report.estimatedCost.toLocaleString()}` : "—"}
                      </div>
                      <div>
                        <div className="text-muted-foreground">Docs</div>
                        {report.documents?.length || 0}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <ComplianceStatusManager
                        report={report}
                        onStatusUpdate={handleStatusUpdate}
                        onReportUpdate={handleReportUpdate}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {totalItems > 0 && (
            <div className="mt-6">
              <GlobalPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}