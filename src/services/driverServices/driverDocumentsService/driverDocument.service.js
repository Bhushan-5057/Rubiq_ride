import { Driver } from "../../../models/driver/driver.model.js";
import { documentStatus, requiredFields, requiredDocs } from "../../../common/utlis.js"

// shared helper: check if a required field is filled/valid
const isFilled = (key, val) => {
  if (key === "dateOfBirth") {
    if (!val) return false;
    const d = new Date(val);
    return !isNaN(d.getTime());
  }
  if (typeof val === "string") return val.trim().length > 0;
  return Boolean(val);
};

export async function verifyDriverDocuments(driverId, verificationData = {}) {
  const driver = await Driver.findById(driverId);
  if (!driver) throw new Error("Driver not found");

  const docs = driver.documents || {};

  const maybeDocStatuses = verificationData.docStatuses && typeof verificationData.docStatuses === "object" ? verificationData.docStatuses : null;

  let statusKeys = documentStatus;

  if (!driver.documents) driver.documents = {};
  if (maybeDocStatuses) {
    for (const [k, v] of Object.entries(maybeDocStatuses)) {
      if (statusKeys.includes(k) && v) driver.documents[k] = String(v).toLowerCase();
    }
  }
  for (const k of statusKeys) {
    if (verificationData[k]) driver.documents[k] = String(verificationData[k]).toLowerCase();
  }
  const allDocsUploaded =
    docs.aadhaarFront &&
    docs.aadhaarBack &&
    docs.panFront &&
    docs.licenseFront &&
    docs.licenseBack &&
    docs.rcFront &&
    docs.rcBack &&
    docs.insurance;
  if (verificationData.remarks) {
    driver.verificationRemarks = verificationData.remarks.trim();
  }

  // After applying incoming statuses, derive state from current doc statuses
  const cur = driver.documents || {};
  const values = [
    cur.aadhaarStatus,
    cur.panStatus,
    cur.licenseStatus,
    cur.rcStatus,
    cur.insuranceStatus,
  ];
  const anyRejected = values.some((v) => v === "rejected");
  const allApproved = values.every((v) => v === "approved");

  // Always infer approvalStatus from document statuses; admin must not send approvalStatus
  if (anyRejected) {
    driver.approvalStatus = "rejected";
    driver.documentsVerified = false;
    driver.status = "suspended";

    const trimmedRemark = verificationData.remarks && verificationData.remarks.trim();
    if (!trimmedRemark) {
      throw new Error("Remarks are required when rejecting documents.");
    }
    driver.verificationRemarks = trimmedRemark;
  } else if (allApproved) {
    driver.approvalStatus = "approved";
    driver.documentsVerified = true;
    driver.status = "active";
    driver.verificationRemarks = "All documents verified successfully.";
  } else {
    driver.approvalStatus = "pending";
    driver.documentsVerified = false;
    driver.status = "suspended";
    driver.verificationRemarks = "All documents uploaded; awaiting admin review.";
  }

  const allFieldsFilled = requiredFields.every((field) => isFilled(field, driver[field]));
  const dStatuses = driver.documents || {};
  const allDocsUploadedStrict = requiredDocs.every((docKey) => Boolean(dStatuses[docKey]));
  const allDocsApprovedStrict = [
    dStatuses.aadhaarStatus,
    dStatuses.panStatus,
    dStatuses.licenseStatus,
    dStatuses.rcStatus,
    dStatuses.insuranceStatus,
  ].every((v) => v === "approved");
  console.log("All fields filled:", allFieldsFilled);
  console.log("All docs uploaded (strict):", allDocsUploadedStrict);
  console.log("All docs approved (strict):", allDocsApprovedStrict);
  driver.profileCompleted = allFieldsFilled && allDocsUploadedStrict && allDocsApprovedStrict;
  console.log("Profile completion status:", driver.profileCompleted);

  driver.updatedAt = new Date();
  await driver.save();

  return {
    success: true,
    message:
      driver.approvalStatus === "approved"
        ? "Driver approved successfully."
        : driver.approvalStatus === "rejected"
          ? "Driver verification failed."
          : "Driver verification updated; awaiting admin review.",
    driver: {
      id: driver._id,
      name: driver.name,
      approvalStatus: driver.approvalStatus,
      documentsVerified: driver.documentsVerified,
      status: driver.status,
      remarks: driver.verificationRemarks,
      documents: driver.documents,
    },
  };
}