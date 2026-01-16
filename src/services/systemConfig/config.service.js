import SystemConfig from "../../models/masterConfig/systemConfig.model.js";
import { encrypt, decrypt } from "../../utils/crypto.js"

//------------------------ Create Configuration ------------------------  

export const createConfigService = async (payload, adminId) => {
    const encryptedValue = encrypt(payload.value)
    return await SystemConfig.create({
        key: payload.key,
        value: encryptedValue,
        category: payload.category,
        createdBy: adminId
    })
}

//------------------------ Update Configuration ------------------------

export const updateConfigService = async (oldKey, payload, adminId) => {
  try {
    const { key: newKey, value, category } = payload;

    if (!newKey && !value && !category) {
      throw new Error("Nothing to update");
    }

    const updateData = {
      updatedBy: adminId
    };

    if (newKey) updateData.key = newKey;
    if (value) updateData.value = encrypt(value);
    if (category) updateData.category = category;

    const updated = await SystemConfig.findOneAndUpdate(
      { key: oldKey },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updated) {
      throw new Error("Config key not found");
    }

    return updated;
  } catch (err) {
    console.error("Update Config Error:", err.message);
    throw new Error("Failed to update configuration");
  }
};


//------------------------ Get Configuration By Key ------------------------

export const getConfigByKeyService = async (key) => {
    const config = await SystemConfig.findOne({ key, isActive: true })
        .populate("createdBy", "name email role")
        .populate("updatedBy", "name email role");

    if (!config) throw new Error("Config not found");
    
    return {
        key: config.key,
        value: decrypt(config.value),
        category: config.category,
        isActive:config.isActive,
        createdBy: config.createdBy,
        updatedBy: config.updatedBy,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
    };
}

//------------------------ Get all Configuration ------------------------

export const getAllConfigsService = async ({
    page,
    limit,
    search,
    category,
    createdBy,
    updatedBy,
    isActive
}) => {
    const skip = (page - 1) * limit;

    const filter = { };

        if (isActive !== undefined) {
        filter.isActive = isActive === "true";
    }

    if (search) {
        filter.key = { $regex: search, $options: "i" };
    }

    if (category) filter.category = category;
    if (createdBy) filter.createdBy = createdBy;
    if (updatedBy) filter.updatedBy = updatedBy;

    const [configs, total] = await Promise.all([
        SystemConfig.find(filter)
            .populate("createdBy", "name email role")
            .populate("updatedBy", "name email role")
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit),

        SystemConfig.countDocuments(filter)
    ]);
    return {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
        data: configs.map(config => ({
            key: config.key,
            category: config.category,
            value: config.value.slice(0, 3) + "********" + config.value.slice(-3),

            isActive: config.isActive,
            createdBy: config.createdBy
                ? {
                    id: config.createdBy._id,
                    name: config.createdBy.name,
                    email: config.createdBy.email,
                    role: config.createdBy.role
                }
                : null,

            updatedBy: config.updatedBy
                ? {
                    id: config.updatedBy._id,
                    name: config.updatedBy.name,
                    email: config.updatedBy.email,
                    role: config.updatedBy.role
                }
                : null,

            createdAt: config.createdAt,
            updatedAt: config.updatedAt
        })) 
    };
}; 

//----------------- Update Config Status -----------------

export const updateConfigStatusService = async (key, isActive, adminId) => {
  const updated = await SystemConfig.findOneAndUpdate(
    { key },
    {
      isActive,
      updatedBy: adminId
    },
    { new: true }
  );

  if (!updated) {
    throw new Error("Config key not found");
  }

  return updated;
};

