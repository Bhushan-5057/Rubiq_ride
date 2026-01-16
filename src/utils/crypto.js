import dotenv from "dotenv"
dotenv.config()
import crypto from "node:crypto"

const ALGO = "aes-256-gcm"
const KEY = Buffer.from(process.env.CONFIG_MASTER_KEY, "hex")

export const encrypt = (text) => {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv(ALGO, KEY, iv)

    let encrypted = cipher.update(text, "utf8", "hex")
    encrypted += cipher.final("hex")

    const tag = cipher.getAuthTag().toString("hex")

    return iv.toString("hex") + ":" + tag + ":" + encrypted
}

export const decrypt = (data) => {
    const [ivHex, tagHex, encrypted] = data.split(":")

    const decipher = crypto.createDecipheriv(
        ALGO,
        KEY,
        Buffer.from(ivHex, "hex")
    )

    decipher.setAuthTag(Buffer.from(tagHex, "hex"))

    let decrypted = decipher.update(encrypted, "hex", "utf8")
    decrypted += decipher.final("utf8")

    return decrypted
}