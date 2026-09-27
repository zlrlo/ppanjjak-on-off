import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
export async function GET() {
  try {
    const user = await requireUser();
    const client = db();
    const [profile, memberships, received] = await Promise.all([
      client.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      client.from("members").select("id, household_id, role, household:households(name)").eq("auth_user_id", user.id).eq("active", true),
      client.from("family_invitations").select("id, status, expires_at, household:households(name)").eq("recipient_user_id", user.id).order("created_at", { ascending: false }),
    ]);
    for (const r of [profile, memberships, received]) if (r.error) throw r.error;
    return NextResponse.json({ profile: profile.data, memberships: memberships.data, received: received.data });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { displayName } = z.object({ displayName: z.string().trim().min(1).max(20) }).parse(await request.json());
    const result = await db().from("profiles").upsert({ id: user.id, display_name: displayName });
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
