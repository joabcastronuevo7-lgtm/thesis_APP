import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AnalyticsRedirectPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role === "ADMIN") redirect("/admin/analytics");
  if (session.user.role === "EDUCATOR") redirect("/educator/analytics");

  redirect("/student/analytics");
}
