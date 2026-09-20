import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const households = await db().from("households").select("id, name").limit(1);
    if (households.error) throw households.error;
    const household = households.data[0];
    if (!household) return NextResponse.json({ needsSetup: true, members: [] });
    const members = await db()
      .from("members")
      .select("id, display_name")
      .eq("household_id", household.id)
      .eq("active", true)
      .order("created_at");
    if (members.error) throw members.error;
    return NextResponse.json({
      needsSetup: false,
      householdName: household.name,
      members: members.data.map((m) => ({ id: m.id, displayName: m.display_name })),
    });
  } catch (error) {
    return apiError(error);
  }
}
