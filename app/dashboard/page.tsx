import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getSessionCookieName,
  verifySessionToken,
} from "@/lib/auth";

export const metadata = {
  title: "Usage Dashboard",
  description:
    "Track OpenAI usage costs, token consumption, and request volumes for your ChatKit assistant.",
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(getSessionCookieName())?.value;
  const user = await verifySessionToken(sessionCookie);

  if (user) {
    redirect(user.dashboard);
  }

  redirect("/login");
}
