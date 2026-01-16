import systemConfig from "../models/masterConfig/systemConfig.model.js";
import { decrypt } from "../utils/crypto.js";

const cache = new Map()
let loaded = false

const load = async () => {
    const configs = await systemConfig.find({ isActive: true }).lean()

    cache.clear()
    configs.forEach(cfg => {
        cache.set(cfg.key, cfg.value)
    })
    loaded = true
}

const get = (key, fallback = undefined) => {
    if (!loaded) {
        if (process.env[key] !== undefined) {
            return process.env[key]
        }
        return fallback
    }

 if (cache.has(key)) {
    try {
      const encryptedValue = cache.get(key);
      return decrypt(encryptedValue);
    } catch (err) {
      console.error(`Failed to decrypt key ${key}:`, err);
      return fallback;
    }
  }

    if (process.env[key] !== undefined) {
        return process.env[key]
    }

    return fallback
}


const has = (key) => {
    return cache.has(key)
}

const reload = async () => {
    loaded = false
    return load()
}

export default {
    load,
    get,
    has,
    reload
}