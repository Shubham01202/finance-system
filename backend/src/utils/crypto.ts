import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

// Must be 32 characters
const SECRET_KEY =
  process.env.SMTP_SECRET_KEY || "12345678901234567890123456789012";

// Must be 16 characters
const IV = process.env.SMTP_IV || "1234567890123456";

export const encrypt = (text: string): string => {
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(SECRET_KEY),
    Buffer.from(IV)
  );

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return encrypted;
};

export const decrypt = (encryptedText: string): string => {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(SECRET_KEY),
    Buffer.from(IV)
  );

  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};