import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import App from "./App";
import {
  getSessionCookieName,
  verifySessionToken,
} from "@/lib/auth";

export default async function Home() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(getSessionCookieName())?.value;
  const user = await verifySessionToken(sessionCookie);

  if (!user) {
    redirect("/login");
  }

  return (
    <App
      companyName={user.label}
      contactEmail="douwe.brink@gmail.com"
    />
  );
}
