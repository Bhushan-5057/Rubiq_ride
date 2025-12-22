import {
    addBankAccount,
    getAllBankAccountsForAdmin,
    getBankAccountForAdmin,
    getOwnBankAccount,
    verifyBankAccount,
    updateBankAccount,
} from "../../services/bankAccount/bankAccount.service.js";

//----------------- Add Bank Account (Driver/Passenger) -----------------//
export const addBankAccountController = async (req, res, next) => {
    try {
        const { _id, role } = req.user;

        if (!["driver", "passenger"].includes(role)) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const bankAccount = await addBankAccount({
            ...req.body,
            userId: _id,
            userType: role,
        });

        res.status(201).json({
            success: true,
            message: "Bank account added successfully",
            data: bankAccount,
        });
    } catch (error) {
        next(error);
    }
};

//----------------- Get Own Bank Account (Driver/Passenger) -----------------//
export const getOwnBankAccountController = async (req, res, next) => {
    try {
        const { _id: userId, role } = req.user;

        if (!["driver", "passenger"].includes(role)) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const bankAccount = await getOwnBankAccount(userId, role);

        if (!bankAccount) {
            return res.status(404).json({
                success: false,
                message: "Bank account not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Bank account fetched successfully",
            data: bankAccount,
        });
    } catch (error) {
        next(error);
    }
};

//----------------- Get Bank Account (Admin) -----------------//
export const getBankAccountForAdminController = async (req, res, next) => {
    try {
        const { userId, userType } = req.params;
        const bankAccount = await getBankAccountForAdmin(userId, userType);
        res.status(200).json({
            success: true,
            message: "Bank account fetched successfully",
            bankAccount
        });
    }
    catch (error) {
        next(error);
    }
}

//----------------- Get All Bank Account (Admin) -----------------//
export const getAllBankAccountsForAdminController = async (req, res, next) => {
    try {
        const filter = req.query || {};
        const options = {};
        const bankAccounts = await getAllBankAccountsForAdmin(filter, options);
        res.status(200).json({
            success: true,
            message: "Bank accounts fetched successfully",
            bankAccounts
    });
    }
    catch (error) {
        next(error);
    }
}

//----------------- Verify Bank Account (Admin) -----------------//
export const verifyBankAccountController = async (req, res, next) => {
    try {
        const { userId, userType } = req.params;
        const { isVerified, verificationRemarks } = req.body;
        const bankAccount = await verifyBankAccount(userId, userType, isVerified, verificationRemarks);
        res.status(200).json({
            success: true,
            message: "Bank account verified successfully",
            bankAccount
        });
    }
    catch (error) {
        next(error);
    }
}

//----------------- Update Own Bank Account (Driver/Passenger) -----------------//
export const updateBankAccountController = async (req, res, next) => {
    try {
        const { _id: userId, role } = req.user;

        if (!["driver", "passenger"].includes(role)) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const updateData = req.body;

        const bankAccount = await updateBankAccount(
            userId,
            role,
            updateData
        );

        res.status(200).json({
            success: true,
            message: "Bank account updated successfully",
            data: bankAccount,
        });
    } catch (error) {
        next(error);
    }
};
