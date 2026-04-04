// app/api/compliance/[id]/route.ts

import { createErrorResponse, createSuccessResponse, handleApiError, isValidObjectId, parseRequestBody, withRoleAndDB } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { complianceReportSchema } from "@/lib/validations";
import { Property } from "@/models";
import { ComplianceReport } from "@/models/ComplianceReport";
import { ComplianceStatus, UserRole } from "@/types";
import { NextRequest } from "next/server";

export const GET = withRoleAndDB([UserRole.ADMIN, UserRole.MANAGER])(
  async (
    user,
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) =>{
  try {
    // Connect to database
    await connectDB();

    // Get session
    const session = await auth();
    if (!session?.user) {
      return createErrorResponse("Unauthorized", 401);
    }


    const user = session.user;
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return createErrorResponse("Invalid compliance report ID", 400);
    }

    // Find the compliance report
    const complianceReport = await ComplianceReport.findById(id)
      .populate(
        "propertyId",
        "name address ownerId managerId"
      )
      .populate("createdBy", "firstName lastName email phone avatar role");

    if (!complianceReport) {
      return createErrorResponse("Compliance report not found", 404);
    }

    // Transform the data to match frontend expectations
    const reportObj = complianceReport.toObject
      ? complianceReport.toObject()
      : complianceReport;

    // Optional: Find unit information if unitId exists (if you add unitId later)
    let unit = null;
    if (reportObj.unitId && reportObj.propertyId?.units) {
      unit = reportObj.propertyId.units.find(
        (u: any) => u._id.toString() === reportObj.unitId.toString()
      );
    }

    const transformedReport = {
      ...reportObj,
      property: reportObj.propertyId,
      createdBy: reportObj.createdBy
        ? {
          user: reportObj.createdBy,
        }
        : null,
      // Optional computed field (if your frontend expects it)
      daysUntilExpiry: reportObj.expiryDate
        ? Math.ceil(
          (new Date(reportObj.expiryDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
        )
        : null,
    };

    return createSuccessResponse(
      transformedReport,
      "Compliance report retrieved successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
})


export const PUT = withRoleAndDB([UserRole.ADMIN, UserRole.MANAGER])(
  async (
    user,
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      // 1. Connect to database
      await connectDB();

      // 2. Authentication
      const session = await auth();
      if (!session?.user) {
        return createErrorResponse("Unauthorized", 401);
      }

      const user = session.user;
      const { id } = await params;

      // 4. Parse and validate body
      const { success, data: body, error } = await parseRequestBody(request);
      if (!success) {
        return createErrorResponse(error || "Invalid request body", 400);
      }

      const validation = complianceReportSchema.safeParse(body);
      if (!validation.success) {
        return createErrorResponse(
          validation.error.errors.map((e) => e.message).join(", "),
          400
        );
      }

      const updateData = validation.data;
      // 5. Verify the report exists
      const existingReport = await ComplianceReport.findById(id);
      if (!existingReport) {
        return createErrorResponse("Compliance report not found", 404);
      }

      // 6. Verify property exists (if being changed)
      if (updateData.propertyId && updateData.propertyId !== existingReport.propertyId?.toString()) {
        const property = await Property.findById(updateData.propertyId);
        if (!property) {
          return createErrorResponse("Property not found", 404);
        }
      }

      // 7. Perform the update
      const updatedReport = await ComplianceReport.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );


      // 9. Transform response to match frontend expectations (same shape as GET)
      const reportObj = updatedReport.toObject
        ? updatedReport.toObject()
        : updatedReport;

      const transformedReport = {
        ...reportObj,
        property: reportObj.propertyId,
        propertyId: reportObj.propertyId?._id, // preserve original ID
        createdByUser: reportObj.createdBy,
        propertyName: reportObj.propertyId?.name,
        propertyAddress: reportObj.propertyId?.address,
        daysUntilExpiry: reportObj.expiryDate
          ? Math.ceil(
            (new Date(reportObj.expiryDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
          )
          : null,
      };

      // 10. Success response
      return createSuccessResponse(
        transformedReport,
        "Compliance report updated successfully"
      );
    } catch (error) {
      return handleApiError(error);
    }
  });


export const DELETE = withRoleAndDB([UserRole.ADMIN, UserRole.MANAGER])(
  async (
    user,
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
  try {
    // Connect to database
    await connectDB();

    // Get session
    const session = await auth();
    if (!session?.user) {
      return createErrorResponse("Unauthorized", 401);
    }

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return createErrorResponse("Invalid maintenance request ID", 400);
    }

    // Find the maintenance request
    const maintenanceRequest = await ComplianceReport.findById(id);
    if (!maintenanceRequest) {
      return createErrorResponse("Maintenance request not found", 404);
    }

    // Prevent deleting completed requests
    if (maintenanceRequest.status === ComplianceStatus.COMPLETED) {
      return createErrorResponse(
        "Cannot delete completed maintenance request.",
        409
      );
    }

    // Perform soft delete
    maintenanceRequest.deletedAt = new Date();
    await maintenanceRequest.save();

    return createSuccessResponse(
      { id: maintenanceRequest._id },
      "Compliance request deleted successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
})