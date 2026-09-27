import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "PIN 로그인은 종료되었습니다. 카카오로 로그인해 주세요." }, { status: 410 });
}
