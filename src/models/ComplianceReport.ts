// models/ComplianceReport.ts
import mongoose from "mongoose";

const complianceReportSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    complianceType: {
      type: String,
      required: true,
      enum: [
        "fire-safety",
        "electrical",
        "structural",
        "elevator",
        "pest-control",
        "health-hygiene",
        "general",
        // add more as needed
      ],
    },
    issueDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      maxlength: 1500,
    },
    estimatedCost: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "expired", "pending", "revoked"],
      default: "active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    documents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document", // if you have a Document model for uploads
    }],
  },
  {
    timestamps: true,
  }
);

export const ComplianceReport = mongoose.models.ComplianceReport || mongoose.model("ComplianceReport", complianceReportSchema);