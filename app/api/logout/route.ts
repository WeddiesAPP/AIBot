import { NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/auth";

const CHATKIT_SESSION_COOKIE = "chatkit_session_id";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set({
    name: getSessionCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });

  response.cookies.set({
    name: CHATKIT_SESSION_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export function GET(): NextResponse {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
