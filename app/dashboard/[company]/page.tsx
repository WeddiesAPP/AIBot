import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { UsageDashboard } from "@/components/UsageDashboard";
import {
  findUserByCompany,
  getSessionCookieName,
  verifySessionToken,
} from "@/lib/auth";

type DashboardPageProps = {
  params: Promise<{ company: string }>;
};

export default async function CompanyDashboardPage({
  params,
}: DashboardPageProps) {
  const { company } = await params;
  const config = findUserByCompany(company);
  if (!config) {
    notFound();
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(getSessionCookieName())?.value;
  const sessionUser = await verifySessionToken(sessionCookie);

  if (!sessionUser) {
    redirect("/login");
  }

  if (sessionUser.company !== config.company) {
    redirect(sessionUser.dashboard);
  }

  return (
    <UsageDashboard
      initialProjectId={config.projectId}
      companyName={config.label}
    />
  );
}
