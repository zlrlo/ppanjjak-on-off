import { NextResponse } from "next/server";
import { ZodError } from "zod";
const errors: Record<string, string> = {
  PROFILE_REQUIRED: "먼저 가입 정보를 입력해 주세요.",
  INVITE_UNAVAILABLE: "만료되었거나 사용할 수 없는 초대입니다.",
  ALREADY_MEMBER: "이미 참여한 가족 그룹입니다.",
  MEMBER_INACTIVE: "이 가족 그룹의 관리자에게 문의해 주세요.",
};
export function apiError(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: "입력 내용을 확인해 주세요." }, { status: 400 });
  const raw = typeof error === "object" && error && "message" in error ? String(error.message) : "";
  if (errors[raw]) return NextResponse.json({ error: errors[raw] }, { status: 409 });
  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 500;
  return NextResponse.json({ error: status < 500 && error instanceof Error ? error.message : "처리 중 문제가 발생했습니다. 서버 설정과 DB 마이그레이션을 확인해 주세요." }, { status });
}
