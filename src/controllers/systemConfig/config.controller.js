import {
    createConfigService,
    updateConfigService,
    getAllConfigsService,
    getConfigByKeyService,
    updateConfigStatusService
} from "../../services/systemConfig/config.service.js"


//----------------- Create Config -----------------
export const createConfigController = async (req, res) => {
    try {
        const adminId = req.admin._id;
        const data = await createConfigService(req.body, adminId);
        res.json(data)

    } catch (error) {
        console.error("Create Config Error:", error.message);
        res.status(500).json({ message: error.message });
    }
}

//----------------- Update Config -----------------

export const updateConfigController = async (req, res) => {
    try {
        const adminId = req.admin._id;
        const data = await updateConfigService(
            req.params.key,
            req.body,
            adminId
        );
        res.json(data);
    } catch (error) {
        console.error("Update Config Error:", error.message);
        res.status(400).json({ message: error.message });
    }
};

//----------------- Get Config -----------------

export const getConfigController = async (req, res) => {
    try {
        const value = await getConfigByKeyService(req.params.key);
        res.json({ key: req.params.key, value });
    } catch (error) {
        console.error("Get Config Error:", error.message);
        res.status(404).json({ message: error.message });
    }
};

//----------------- Get All Config -----------------

export const getAllConfigsController = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 5,
            search = "",
            category,
            createdBy,
            updatedBy,
            isActive
        } = req.query;

        const data = await getAllConfigsService({
            page: Number(page),
            limit: Number(limit),
            search,
            category,
            createdBy,
            updatedBy,
            isActive
        });
        res.json(data);
    } catch (error) {
        console.error("Get All Configs Error:", error.message);
        res.status(500).json({ message: error.message });
    }
};

//--------------------- Update Config Status --------------------- 

export const updateConfigStatusController = async (req, res) => {
    try {
        const adminId = req.admin._id;
        const { isActive } = req.body;   // true or false
        const { key } = req.params;

        if (typeof isActive !== "boolean") {
            return res.status(400).json({ message: "isActive must be true or false" });
        }

        const data = await updateConfigStatusService(key, isActive, adminId);

        res.json({
            message: `Config ${isActive ? "activated" : "deactivated"} successfully`,
            data
        });
    } catch (error) {
        console.error("Update Config Status Error:", error.message);
        res.status(400).json({ message: error.message });
    }
};
