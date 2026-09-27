import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ error: "회원 목록은 로그인 후 가족 그룹 안에서 확인할 수 있습니다." }, { status: 410 });
}
