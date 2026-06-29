import crypto from "crypto";

const rawKey = process.env.ENCRYPTION_KEY;
if (!rawKey || Buffer.byteLength(rawKey, "utf8") < 32) {
  throw new Error(
    "ENCRYPTION_KEY 环境变量未设置或长度不足 32 字节，请在 .env 中配置后重启。可用 `openssl rand -base64 32` 生成。"
  );
}

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;
const encryptionKey = rawKey;

function getEncryptionKey() {
  const keyBytes = Buffer.from(encryptionKey, "utf8").subarray(0, 32);
  return crypto.createSecretKey(new Uint8Array(keyBytes));
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), new Uint8Array(iv));
  const encrypted = cipher.update(text, "utf8", "hex") + cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, encryptedHex] = encryptedText.split(":");
  if (!ivHex || !encryptedHex) {
    throw new Error("加密文本格式无效");
  }

  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), new Uint8Array(iv));

  return decipher.update(encryptedHex, "hex", "utf8") + decipher.final("utf8");
}
