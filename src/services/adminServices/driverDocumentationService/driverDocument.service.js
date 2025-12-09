import { Driver } from "../../../models/driver/driver.model.js";
import { documentStatus, requiredFields, requiredDocs,requiredDocsNumber } from "../../../common/utlis.js"

// ------------------ Helper For Field is Filled ------------------
const isFilled = (key, val) => {
  if (key === "dateOfBirth") {
    if (!val) return false;
    const d = new Date(val);
    return !isNaN(d.getTime());
  }
  if (typeof val === "string") return val.trim().length > 0;
  return Boolean(val);
};

//-------------------- Verify Documents -------------------- 
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

  if (verificationData.remarks) {
    driver.verificationRemarks = verificationData.remarks.trim();
  }

  // After applying incoming statuses, derive state from current doc statuses
  const current = driver.documents || {};
  const values = [
    current.aadhaarStatus,
    current.panStatus,
    current.licenseStatus,
    current.rcStatus,
    current.insuranceStatus,
  ];

  const anyNotUploaded = values.some((v) => !v || v === "not_uploaded");
  const anyRejected = values.some((v) => v === "rejected");
  const allApproved = values.length > 0 && values.every((v) => v === "approved");

  if (anyRejected) {
    driver.approvalStatus = "rejected";
    driver.activationStatus = "not_ready";
    driver.documentsVerified = false;
    driver.status = "pending";

    const trimmedRemark = verificationData.remarks && verificationData.remarks.trim();
    if (!trimmedRemark) {
      throw new Error("Remarks are required when rejecting documents.");
    }
    driver.verificationRemarks = trimmedRemark;
  } else if (anyNotUploaded) {
    driver.approvalStatus = "incompleted";
    driver.activationStatus = "not_ready";
    driver.documentsVerified = false;
    driver.status = "pending";
    driver.verificationRemarks = "Documents are still not uploaded.";
  } else if (allApproved) {
    driver.approvalStatus = "approved";
    driver.activationStatus = "ready";
    driver.documentsVerified = true;
    driver.status = "active";
    driver.verificationRemarks = "All documents verified successfully.";
  } else {
    driver.approvalStatus = "pending";
    driver.activationStatus = "not_ready";
    driver.documentsVerified = false;
    driver.status = "pending";
    driver.verificationRemarks = "All documents uploaded; awaiting admin review.";
  }

  const allFieldsFilled = requiredFields.every((field) => isFilled(field, driver[field]));
  const dStatuses = driver.documents || {};
  const allDocsUploadedStrict = requiredDocs.every((docKey) => Boolean(dStatuses[docKey]));

  driver.profileCompleted = allFieldsFilled && allDocsUploadedStrict;

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