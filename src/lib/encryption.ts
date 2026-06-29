import crypto from "crypto";

// 加密密钥 — 必须从环境变量读取，未设置时拒绝启动
const rawKey = process.env.ENCRYPTION_KEY;
if (!rawKey || rawKey.length < 32) {
  throw new Error(
    "ENCRYPTION_KEY 环境变量未设置或长度不足 32 字节，请在 .env 中配置后重启。可用 `openssl rand -base64 32` 生成。"
  );
}
const ENCRYPTION_KEY = rawKey;
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY.slice(0, 32), "utf8"), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");
  const iv = Buffer.from(parts.shift() || "", "hex");
  const encrypted = Buffer.from(parts.join(":"), "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY.slice(0, 32), "utf8"), iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
