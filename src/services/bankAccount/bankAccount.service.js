import { BankAccount } from "../../models/bankAccount/bankAccount.model.js";
import { Passenger } from "../../models/passenger/passenger.model.js";
import { Driver } from "../../models/driver/driver.model.js";

//----------------- Add Bank Account (Driver/Passenger) -----------------//
export const addBankAccount = async ({
  userId,
  userType,
  accountHolderName,
  bankName,
  accountNumber,
  ifscCode,
  branchName
}) => {
  const bankAccount = await BankAccount.create({
    userId,
    userType,
    accountHolderName,
    bankName,
    accountNumber,
    ifscCode,
    branchName,
    isVerified:"pending",
    verificationRemarks:null
  });

  if (userType === "passenger") {
    await Passenger.findByIdAndUpdate(userId, {
      bankDetails: bankAccount._id,
    });
  }

  if (userType === "driver") {
    await Driver.findByIdAndUpdate(userId, {
      bankDetails: bankAccount._id,
    });
  }

  return bankAccount;
};
 

//----------------- Get Own Bank Account (Driver/Passenger) -----------------//
export const getOwnBankAccount = async (userId, userType) => {
    return await BankAccount.findOne({ userId, userType });
} 

//----------------- Update Own Bank Account (Driver/Passenger) -----------------//
export const updateBankAccount = async (userId, userType, updateData) => {
    const bankAccount = await BankAccount.findOneAndUpdate(
        { userId, userType },
        {
            $set: {
                ...updateData,
                isVerified: "pending",
                verificationRemarks: null,
                updatedAt: new Date(),
            },
        },
        { new: true }
    );

    if (!bankAccount) {
        throw new Error("Bank account not found for this user");
    }

    // Ensure reference exists in user document (same as add logic)
    if (userType === "passenger") {
        await Passenger.findByIdAndUpdate(userId, {
            bankDetails: bankAccount._id,
        });
    }

    if (userType === "driver") {
        await Driver.findByIdAndUpdate(userId, {
            bankDetails: bankAccount._id,
        });
    }

    return bankAccount;
};


//----------------- Admin Services -----------------//
export const getBankAccountForAdmin = async (userId, userType) => {
    return await BankAccount.findOne({ userId, userType });
} 

//----------------- Get All Bank Accounts for Admin -----------------//
export const getAllBankAccountsForAdmin = async (filter = {}, options = {}) => {
    return await BankAccount.find(filter, null, options);

} 

//----------------- Verify Bank Account (Admin) -----------------//
export const verifyBankAccount = async (userId, userType, isVerified, verificationRemarks) => {
    return await BankAccount.findOneAndUpdate(
        { userId, userType },
        { $set: { isVerified, verificationRemarks } },
        { new: true }
    )
} 