import crypto from "node:crypto";

export function generateOpaqueToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

