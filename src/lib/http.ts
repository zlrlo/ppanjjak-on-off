import { NextResponse } from "next/server";

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "처리 중 문제가 발생했습니다.";
  const status = typeof error === "object" && error && "status" in error
    ? Number((error as { status: number }).status)
    : 500;
  return NextResponse.json({ error: message }, { status });
}
