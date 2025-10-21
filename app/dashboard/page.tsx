import { UsageDashboard } from "@/components/UsageDashboard";

export const metadata = {
  title: "Usage Dashboard",
  description:
    "Track OpenAI usage costs, token consumption, and request volumes for your ChatKit assistant.",
};

export default function DashboardPage() {
  return <UsageDashboard />;
}
