import { Driver } from "../../../models/driver/driver.model.js";
import {
  documentStatus,
  isDriverProfileComplete,
} from "../../../common/utils.js";
import {
  DRIVER_APPROVAL_STATUS,
  USER_STATUS,
} from "../../../constants/userStatus.constants.js";
import { normalizeDriverMediaUrls } from "../../../utils/mediaUrl.js";

const DOCUMENT_STATUS_VALUES = new Set([
  "not_uploaded",
  "pending",
  "approved",
  "rejected",
]);

const normalizeStatus = (value) => String(value).trim().toLowerCase();

//-------------------- Verify Documents --------------------
export async function verifyDriverDocuments(driverId, verificationData = {}) {
  const driver = await Driver.findById(driverId);
  if (!driver) throw new Error("Driver not found");

  const maybeDocStatuses =
    verificationData.docStatuses &&
    typeof verificationData.docStatuses === "object"
      ? verificationData.docStatuses
      : null;

  const statusKeys = documentStatus;

  if (!driver.documents) driver.documents = {};

  if (maybeDocStatuses) {
    for (const [k, v] of Object.entries(maybeDocStatuses)) {
      if (!statusKeys.includes(k) || v == null || v === "") continue;
      const normalized = normalizeStatus(v);
      if (!DOCUMENT_STATUS_VALUES.has(normalized)) {
        throw new Error(`Invalid document status for ${k}: ${v}`);
      }
      driver.documents[k] = normalized;
    }
  }

  for (const k of statusKeys) {
    if (verificationData[k] == null || verificationData[k] === "") continue;
    const normalized = normalizeStatus(verificationData[k]);
    if (!DOCUMENT_STATUS_VALUES.has(normalized)) {
      throw new Error(`Invalid document status for ${k}: ${verificationData[k]}`);
    }
    driver.documents[k] = normalized;
  }

  if (verificationData.remarks) {
    driver.verificationRemarks = verificationData.remarks.trim();
  }

  const current = driver.documents || {};
  const values = statusKeys.map((key) => current[key]);

  const anyNotUploaded = values.some((v) => !v || v === "not_uploaded");
  const anyRejected = values.some((v) => v === "rejected");
  const allApproved =
    values.length > 0 && values.every((v) => v === "approved");

  if (anyRejected) {
    driver.approvalStatus = DRIVER_APPROVAL_STATUS.REJECTED;
    driver.documentsVerified = false;
    driver.status = USER_STATUS.PENDING;

    const trimmedRemark =
      verificationData.remarks && verificationData.remarks.trim();
    if (!trimmedRemark) {
      throw new Error("Remarks are required when rejecting documents.");
    }
    driver.verificationRemarks = trimmedRemark;
  } else if (anyNotUploaded) {
    driver.approvalStatus = DRIVER_APPROVAL_STATUS.INCOMPLETED;
    driver.documentsVerified = false;
    driver.status = USER_STATUS.PENDING;
    driver.verificationRemarks = "Documents are still not uploaded.";
  } else if (allApproved) {
    driver.approvalStatus = DRIVER_APPROVAL_STATUS.APPROVED;
    driver.documentsVerified = true;
    driver.status = USER_STATUS.ACTIVE;
    driver.verificationRemarks = "All documents verified successfully.";
  } else {
    driver.approvalStatus = DRIVER_APPROVAL_STATUS.PENDING;
    driver.documentsVerified = false;
    driver.status = USER_STATUS.PENDING;
    driver.verificationRemarks =
      "All documents uploaded; awaiting admin review.";
  }

  // Shared completion rule used by profile updates and ride eligibility.
  driver.profileCompleted = isDriverProfileComplete(driver);
  console.log("[verifyDriverDocuments] after status update", {
    driverId: driver._id.toString(),
    approvalStatus: driver.approvalStatus,
    documentsVerified: driver.documentsVerified,
    status: driver.status,
    profileCompleted: driver.profileCompleted,
    documentStatuses: {
      aadhaarStatus: driver.documents?.aadhaarStatus,
      panStatus: driver.documents?.panStatus,
      licenseStatus: driver.documents?.licenseStatus,
      rcStatus: driver.documents?.rcStatus,
    },
    documentNumbers: {
      aadhaarNumber: driver.documents?.aadhaarNumber || null,
      panNumber: driver.documents?.panNumber || null,
      licenseNumber: driver.documents?.licenseNumber || null,
      rcNumber: driver.documents?.rcNumber || null,
    },
    documentFiles: {
      aadhaarFront: Boolean(driver.documents?.aadhaarFront),
      aadhaarBack: Boolean(driver.documents?.aadhaarBack),
      panFront: Boolean(driver.documents?.panFront),
      licenseFront: Boolean(driver.documents?.licenseFront),
      licenseBack: Boolean(driver.documents?.licenseBack),
      rcFront: Boolean(driver.documents?.rcFront),
      rcBack: Boolean(driver.documents?.rcBack),
    },
  });

  driver.updatedAt = new Date();
  await driver.save();
  const normalizedDriver = normalizeDriverMediaUrls(driver.toObject());

  return {
    status: true,
    message:
      driver.approvalStatus === DRIVER_APPROVAL_STATUS.APPROVED
        ? "Driver approved successfully."
        : driver.approvalStatus === DRIVER_APPROVAL_STATUS.REJECTED
          ? "Driver verification failed."
          : "Driver verification updated; awaiting admin review.",
    driver: {
      id: driver._id,
      name: driver.name,
      approvalStatus: driver.approvalStatus,
      documentsVerified: driver.documentsVerified,
      status: driver.status,
      remarks: driver.verificationRemarks,
      documents: normalizedDriver.documents,
    },
  };
}
