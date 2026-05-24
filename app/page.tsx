import Link from "next/link";
import { GraduationCap, Brain, Shield, BarChart3, BookOpen, Sparkles, ArrowRight, CheckCircle, Users, FileText, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Generation",
    description: "GPT-4 generates exam questions exclusively from your uploaded PDF content, eliminating hallucinations.",
    iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    icon: Shield,
    title: "Hallucination Control",
    description: "Every generated question is validated against source chunks with confidence scoring to ensure accuracy.",
    iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: BarChart3,
    title: "Deep Analytics",
    description: "Identify weak topics, track performance trends, and get difficulty-balanced reports for every student.",
    iconClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    icon: BookOpen,
    title: "Multiple Question Types",
    description: "Generate MCQ, True/False, Fill-in-the-Blank, and Matching questions — all from your documents.",
    iconClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
];

const stats = [
  { icon: FileText, label: "PDFs Processed", value: "100%" },
  { icon: Zap, label: "AI-Grounded", value: "RAG" },
  { icon: Users, label: "Role-Based", value: "3 Roles" },
  { icon: Brain, label: "LLM-Powered", value: "GPT-4" },
];

const roles = [
  {
    title: "Educators",
    gradient: "from-blue-500 to-blue-600",
    points: ["Upload PDF learning materials", "Generate AI quizzes in seconds", "Review & edit questions", "Track student performance"],
  },
  {
    title: "Students",
    gradient: "from-emerald-500 to-emerald-600",
    points: ["Take timed exams online", "Instant auto-scoring", "View detailed feedback", "See weak topic analysis"],
  },
  {
    title: "Admins",
    gradient: "from-violet-500 to-violet-600",
    points: ["Manage all users", "Monitor system activity", "View platform analytics", "Configure AI settings"],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-1.5">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">ExamGen RAG</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="shadow-sm">
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.1),transparent)] pointer-events-none" />

        <div className="relative mx-auto max-w-6xl px-4 py-28 text-center">
          <Badge variant="secondary" className="mb-5 px-4 py-1.5 text-sm font-medium shadow-sm">
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
            Powered by RAG + GPT-4
          </Badge>

          <h1 className="mt-2 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            AI Exams Grounded in{" "}
            <span className="bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent">
              Your Content
            </span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-xl text-muted-foreground leading-relaxed">
            Upload PDF learning materials and automatically generate context-accurate examinations
            using Retrieval-Augmented Generation. Every question comes directly from your documents.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="gap-2 shadow-md text-base px-8">
              <Link href="/register">
                Start for Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base px-8">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>

          {/* Mini stats */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-xl border bg-background/80 backdrop-blur p-4 text-center shadow-sm">
                  <Icon className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/40 border-y py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Everything you need for AI-powered assessments</h2>
            <p className="mt-3 text-muted-foreground text-lg">Built for educators who demand accuracy and depth</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className={`rounded-xl w-12 h-12 flex items-center justify-center mb-4 ${feature.iconClass}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Built for every role</h2>
            <p className="mt-3 text-muted-foreground text-lg">Role-based access with tailored dashboards</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map((role) => (
              <Card key={role.title} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className={`h-1.5 w-full bg-gradient-to-r ${role.gradient}`} />
                <CardContent className="p-6">
                  <h3 className="font-bold text-xl mb-4">{role.title}</h3>
                  <ul className="space-y-2.5">
                    {role.points.map((point) => (
                      <li key={point} className="flex items-center gap-2.5 text-sm">
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-violet-700 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground">Ready to transform your assessments?</h2>
          <p className="mt-4 text-primary-foreground/80 text-lg">
            Join educators using AI to create accurate, document-grounded exams in minutes.
          </p>
          <Button size="lg" variant="secondary" asChild className="mt-8 shadow-lg font-semibold">
            <Link href="/register">Create Free Account <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-1">
              <GraduationCap className="h-3.5 w-3.5 text-primary" />
            </div>
            <span>ExamGen RAG — Thesis Project</span>
          </div>
          <span>Built with Next.js · LangChain · OpenAI · Pinecone</span>
        </div>
      </footer>
    </div>
  );
}
