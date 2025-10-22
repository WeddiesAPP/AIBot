"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  getSessionCookieName,
  verifyCredentials,
} from "@/lib/auth";

export type LoginFormState = {
  error?: string;
};

export async function authenticateAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const username = formData.get("username")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!username || !password) {
    return { error: "Vul zowel gebruikersnaam als wachtwoord in." };
  }

  const user = verifyCredentials(username, password);
  if (!user) {
    return { error: "Ongeldige gebruikersnaam of wachtwoord." };
  }

  const session = await createSessionToken(user.username);
  if (!session) {
    return { error: "Authenticatie is niet geconfigureerd." };
  }

  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieName(), session.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.expiresAt),
  });

  redirect("/");
}
