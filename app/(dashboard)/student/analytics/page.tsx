import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { analyticsRepository } from "@/repositories/analytics.repository";
import { Header } from "@/components/dashboard/header";
import { WeakTopics } from "@/components/analytics/weak-topics";
import { StatsCard } from "@/components/dashboard/stats-card";
import { TrendingUp, Award, Target, BookOpen } from "lucide-react";

export default async function StudentAnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [attempts, weakTopics] = await Promise.all([
    analyticsRepository.getStudentAttempts(session.user.id),
    analyticsRepository.getWeakTopics(session.user.id),
  ]);

  const completed = attempts.filter((a) => a.status === "GRADED");
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((s, a) => s + (a.percentage ?? 0), 0) / completed.length)
    : 0;
  const bestScore = completed.length > 0
    ? Math.round(Math.max(...completed.map((a) => a.percentage ?? 0)))
    : 0;
  const passRate = completed.length > 0
    ? Math.round(completed.filter((a) => (a.percentage ?? 0) >= a.quiz.passingScore).length / completed.length * 100)
    : 0;

  return (
    <div>
      <Header title="My Analytics" description="Track your performance and identify areas for improvement" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Exams Taken" value={completed.length} icon={BookOpen} />
          <StatsCard title="Average Score" value={`${avgScore}%`} icon={TrendingUp} />
          <StatsCard title="Best Score" value={`${bestScore}%`} icon={Award} />
          <StatsCard title="Pass Rate" value={`${passRate}%`} icon={Target} />
        </div>

        <WeakTopics topics={weakTopics} />
      </div>
    </div>
  );
}
