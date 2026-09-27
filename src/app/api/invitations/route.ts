import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { inviteToken, tokenHash, validInviteToken } from "@/lib/invitations";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), householdId: z.string().uuid() }),
  z.object({ action: z.literal("claim"), token: z.string().refine(validInviteToken) }),
  z.object({ action: z.literal("respond"), invitationId: z.string().uuid(), accept: z.boolean() }),
  z.object({ action: z.literal("revoke"), invitationId: z.string().uuid() }),
]);
async function admin(userId: string, householdId: string) {
  const r = await db().from("members").select("id").eq("auth_user_id", userId).eq("household_id", householdId).eq("active", true).eq("role", "admin").maybeSingle();
  if (r.error) throw r.error;
  if (!r.data) throw Object.assign(new Error("가족 관리자만 초대할 수 있습니다."), { status: 403 });
  return r.data.id;
}
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const id = z.string().uuid().parse(new URL(request.url).searchParams.get("householdId"));
    await admin(user.id, id);
    const r = await db().from("family_invitations").select("id,status,expires_at,created_at").eq("household_id", id).order("created_at", { ascending: false }).limit(50);
    if (r.error) throw r.error;
    return NextResponse.json({ invitations: r.data });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await request.json());
    const client = db();
    if (input.action === "create") {
      const memberId = await admin(user.id, input.householdId);
      const token = inviteToken();
      const result = await client.from("family_invitations").insert({ household_id: input.householdId, sender_member_id: memberId, token_hash: tokenHash(token) });
      if (result.error) throw result.error;
      return NextResponse.json({ token }, { status: 201 });
    }
    if (input.action === "claim") {
      const r = await client.rpc("claim_family_invite", { p_user: user.id, p_hash: tokenHash(input.token) });
      if (r.error) throw r.error;
    } else if (input.action === "respond") {
      const r = await client.rpc("respond_family_invite", { p_user: user.id, p_invite: input.invitationId, p_accept: input.accept });
      if (r.error) throw r.error;
    } else {
      const invite = await client.from("family_invitations").select("household_id").eq("id", input.invitationId).maybeSingle();
      if (invite.error) throw invite.error;
      if (!invite.data) throw Object.assign(new Error("초대를 찾을 수 없습니다."), { status: 404 });
      await admin(user.id, invite.data.household_id);
      const r = await client.from("family_invitations").update({ status: "revoked" }).eq("id", input.invitationId).eq("status", "pending");
      if (r.error) throw r.error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
