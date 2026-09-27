import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "카카오 로그인 후 가족 그룹을 만들어 주세요." }, { status: 410 });
}
