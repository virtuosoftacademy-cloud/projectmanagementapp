// app/api/compliance/route.ts  (or pages/api/compliance.ts depending on your setup)

import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { NextRequest } from "next/server";
import { Property, User } from "@/models"; // ← make sure ComplianceReport model exists
import { UserRole } from "@/types";
import {
    createSuccessResponse,
    createErrorResponse,
    handleApiError,
    parseRequestBody,
    parsePaginationParams,
    paginateQuery,
    withRoleAndDB,
} from "@/lib/api-utils";
import { z } from "zod";
import { ComplianceReport } from "@/models/ComplianceReport";
import { complianceReportSchema } from "@/lib/validations";

// ────────────────────────────────────────────────
// Validation Schema
// ────────────────────────────────────────────────


export async function POST(request: NextRequest) {
    try {
        // 1. Connect to database
        await connectDB();

        // 2. Authentication
        const session = await auth();
        if (!session?.user) {
            return createErrorResponse("Unauthorized", 401);
        }

        // 3. Role-based access (usually admin/manager only)
        const allowedRoles = [UserRole.ADMIN, UserRole.MANAGER];

        if (!allowedRoles.includes(session.user.role as UserRole)) {
            return createErrorResponse("Forbidden: Only admins and managers can create compliance reports", 403);
        }

        const user = session.user;

        // 4. Parse and validate body
        const { success, data: body, error } = await parseRequestBody(request);
        if (!success) {
            return createErrorResponse(error || "Invalid request body", 400);
        }

        const validation = complianceReportSchema.safeParse(body);
        if (!validation.success) {
            return createErrorResponse(
                validation.error.errors.map(e => e.message).join(", "),
                400
            );
        }

        const reportData = validation.data;

        // 5. Verify property exists
        const property = await Property.findById(reportData.propertyId);
        if (!property) {
            return createErrorResponse("Property not found", 404);
        }

        // Optional: you could add more checks (e.g. property is active, etc.)

        // 6. Create the compliance report
        const complianceReport = new ComplianceReport({
            ...reportData,
            createdBy: user.id,              // who created it
            // issuedBy / certifiedBy can be added later if needed
        });

        await complianceReport.save();

        // 7. Populate useful references
        await complianceReport.populate([
            {
                path: "propertyId",
                select: "name address type isMultiUnit",
                options: { lean: true },
            },
            {
                path: "createdBy",
                select: "firstName lastName email role",
                options: { lean: true },
            },
        ]);

        // 8. Transform response shape to match frontend expectations
        const reportObj = complianceReport.toObject
            ? complianceReport.toObject()
            : complianceReport;

        const transformedReport = {
            ...reportObj,
            property: reportObj.propertyId,
            createdByUser: reportObj.createdBy,
            // rename fields if your frontend expects different naming
            propertyName: reportObj.propertyId?.name,
            propertyAddress: reportObj.propertyId?.address,
        };

        // 9. Success response
        return createSuccessResponse(
            transformedReport,
            "Compliance report created successfully",
            201 // or just return the default 200 if your utils don't support status
        );

    } catch (error) {
        return handleApiError(error);
    }
}




// app/api/compliance/route.ts  (add this GET handler alongside your POST)

export async function GET(request: NextRequest) {
  try {
    // 1. Connect to database
    await connectDB();

    // 2. Authentication
    const session = await auth();
    if (!session?.user) {
      return createErrorResponse("Unauthorized", 401);
    }

    // 3. Role-based access (same as POST — only admin/manager)
    const allowedRoles = [UserRole.ADMIN, UserRole.MANAGER];

    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return createErrorResponse(
        "Forbidden: Only admins and managers can view compliance reports",
        403
      );
    }

    const user = session.user;

    // 4. Parse query parameters
    const { searchParams } = new URL(request.url);

    // Pagination (using your existing helper)
    const { page = 1, limit = 20, skip } = parsePaginationParams(searchParams);

    // Filters (same style as your POST uses schema)
    const propertyId = searchParams.get("propertyId") || undefined;
    const status = searchParams.get("status") || undefined;
    const complianceType = searchParams.get("complianceType") || undefined;
    const expiringSoon = searchParams.get("expiringSoon") === "true";
    const search = searchParams.get("search") || undefined; // optional free-text search

    // Sorting (e.g. ?sort=expiryDate:desc)
    let sort: Record<string, 1 | -1> = { expiryDate: 1 }; // default: soonest expiry first
    const sortParam = searchParams.get("sort");
    if (sortParam) {
      const [field, direction] = sortParam.split(":");
      if (field && ["expiryDate", "issueDate", "estimatedCost", "createdAt"].includes(field)) {
        sort = { [field]: direction === "desc" ? -1 : 1 };
      }
    }

    // 5. Build query filter
    const filter: any = {};

    // Apply filters (same fields your frontend likely sends)
    if (propertyId) filter.propertyId = propertyId;
    if (status) filter.status = status;
    if (complianceType) filter.complianceType = complianceType;

    // Optional: free-text search on notes or property name (requires population or $lookup)
    if (search) {
      filter.$or = [
        { notes: { $regex: search, $options: "i" } },
        // If you want to search property name, you need either:
        // a) populate first and filter in JS (inefficient for large datasets)
        // b) use aggregation with $lookup (more complex)
        // For simplicity here, we search only notes
      ];
    }

    // Expiring soon (next 30 days) — very useful for dashboard
    if (expiringSoon) {
      const now = new Date();
      const thirtyDaysLater = new Date(now);
      thirtyDaysLater.setDate(now.getDate() + 30);

      filter.expiryDate = {
        $gte: now,
        $lte: thirtyDaysLater,
      };
      filter.status = "active"; // only active reports can be "expiring soon"
    }

    // 6. Fetch total count for pagination
    const total = await ComplianceReport.countDocuments(filter);

    // 7. Fetch paginated data with population
    const reports = await ComplianceReport.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate([
        {
          path: "propertyId",
          select: "name address type isMultiUnit",
          options: { lean: true },
        },
        {
          path: "createdBy",
          select: "firstName lastName email role",
          options: { lean: true },
        },
      ])
      .lean(); // faster response

    // 8. Transform each report to match your POST response shape
    const transformedReports = reports.map((report: any) => {
      const reportObj = report.toObject ? report.toObject() : report;

      return {
        ...reportObj,
        property: reportObj.propertyId,
        propertyId: reportObj.propertyId?._id, // keep original ID
        createdByUser: reportObj.createdBy,
        propertyName: reportObj.propertyId?.name,
        propertyAddress: reportObj.propertyId?.address,
        // Optional: add computed field like days until expiry
        daysUntilExpiry: reportObj.expiryDate
          ? Math.ceil(
              (new Date(reportObj.expiryDate).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
      };
    });

    // 9. Success response with pagination metadata
    return createSuccessResponse(transformedReports, "Compliance reports retrieved successfully", {
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}