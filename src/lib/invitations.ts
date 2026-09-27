import { createHash, randomBytes } from "node:crypto";
export function inviteToken() { return randomBytes(24).toString("hex"); }
export function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function validInviteToken(token: string) { return /^[a-f0-9]{48}$/.test(token); }
