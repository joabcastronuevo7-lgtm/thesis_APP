import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { analyticsRepository } from "@/repositories/analytics.repository";
import { Header } from "@/components/dashboard/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Users, FileText, BookOpen, ClipboardList, GraduationCap, UserCheck } from "lucide-react";

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const stats = await analyticsRepository.getAdminStats();

  return (
    <div>
      <Header
        title="Admin Dashboard"
        description="Platform overview and system metrics"
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatsCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            description="All registered accounts"
          />
          <StatsCard
            title="Educators"
            value={stats.totalEducators}
            icon={GraduationCap}
            description="Active educators"
          />
          <StatsCard
            title="Students"
            value={stats.totalStudents}
            icon={UserCheck}
            description="Enrolled students"
          />
          <StatsCard
            title="PDFs Uploaded"
            value={stats.totalPDFs}
            icon={FileText}
            description="Learning materials"
          />
          <StatsCard
            title="Quizzes Created"
            value={stats.totalQuizzes}
            icon={BookOpen}
            description="Total quizzes"
          />
          <StatsCard
            title="Exam Attempts"
            value={stats.totalAttempts}
            icon={ClipboardList}
            description="Total submissions"
          />
        </div>
      </div>
    </div>
  );
}
