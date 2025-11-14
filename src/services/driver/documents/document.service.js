import { Driver } from "../../../models/driver/Driver.model.js";


export async function verifyDriverDocuments(driverId, verificationData = {}) {
  const driver = await Driver.findById(driverId);
  if (!driver) throw new Error("Driver not found");

  const docs = driver.documents || {};
  const allDocsUploaded =
    docs.aadhaarFront &&
    docs.aadhaarBack &&
    docs.panFront &&
    docs.panBack &&
    docs.licenseFront &&
    docs.licenseBack &&
    docs.rcFront &&
    docs.rcBack &&
    docs.insurance;
  if (verificationData.remarks) {
    driver.verificationRemarks = verificationData.remarks.trim();
  }

  if (verificationData.approvalStatus) {
    const status = verificationData.approvalStatus.toLowerCase();

    if (!["approved", "rejected", "pending"].includes(status)) {
      throw new Error("Invalid approval status");
    }

    driver.approvalStatus = status;
    driver.documentsVerified = status === "approved";
    driver.status = status === "approved" ? "active" : "suspended";

    if (status === "approved" && !driver.verificationRemarks) {
      driver.verificationRemarks = "All documents verified successfully.";
    }

    if (status === "rejected" && !driver.verificationRemarks) {
      driver.verificationRemarks = "Some documents are invalid or missing.";
    }
  } else {
    if (allDocsUploaded) {
      driver.approvalStatus = "fullfiled";
      driver.documentsVerified = false; 
      driver.status = "pending";
      driver.verificationRemarks ||= "All documents uploaded; awaiting admin review.";
    } else {
      driver.approvalStatus = "incompleted";
      driver.documentsVerified = false;
      driver.status = "suspended";
      driver.verificationRemarks ||= "Incomplete or missing documents.";
    }
  }

  driver.updatedAt = new Date();
  await driver.save();

  return {
    success: true,
    message:
      driver.approvalStatus === "approved"
        ? "Driver approved successfully."
        : driver.approvalStatus === "rejected"
        ? "Driver verification failed."
        : driver.approvalStatus === "fullfiled"
        ? "Driver has completed profile; waiting for admin review."
        : "Driver documents incomplete.",
    driver: {
      id: driver._id,
      name: driver.name,
      approvalStatus: driver.approvalStatus,
      documentsVerified: driver.documentsVerified,
      status: driver.status,
      remarks: driver.verificationRemarks,
    },
  };
}