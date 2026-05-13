import Link from "next/link";
import { GraduationCap, Brain, Shield, BarChart3, BookOpen, Sparkles, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Generation",
    description: "GPT-4 generates exam questions exclusively from your uploaded PDF content, eliminating hallucinations.",
  },
  {
    icon: Shield,
    title: "Hallucination Control",
    description: "Every generated question is validated against source chunks with confidence scoring to ensure accuracy.",
  },
  {
    icon: BarChart3,
    title: "Deep Analytics",
    description: "Identify weak topics, track performance trends, and get difficulty-balanced reports for every student.",
  },
  {
    icon: BookOpen,
    title: "Multiple Question Types",
    description: "Generate MCQ, True/False, Fill-in-the-Blank, and Matching questions — all from your documents.",
  },
];

const roles = [
  {
    title: "Educators",
    color: "bg-blue-500",
    points: ["Upload PDF learning materials", "Generate AI quizzes in seconds", "Review & edit questions", "Track student performance"],
  },
  {
    title: "Students",
    color: "bg-green-500",
    points: ["Take timed exams online", "Instant auto-scoring", "View detailed feedback", "See weak topic analysis"],
  },
  {
    title: "Admins",
    color: "bg-purple-500",
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
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">ExamGen RAG</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-24 text-center">
        <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm">
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Powered by RAG + GPT-4
        </Badge>
        <h1 className="mt-4 text-5xl font-bold tracking-tight sm:text-6xl">
          AI Exams Grounded in{" "}
          <span className="text-primary">Your Content</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-xl text-muted-foreground leading-relaxed">
          Upload PDF learning materials and automatically generate context-accurate examinations
          using Retrieval-Augmented Generation. Every question comes directly from your documents.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild className="gap-2">
            <Link href="/register">
              Start for Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Everything you need for AI-powered assessments</h2>
            <p className="mt-3 text-muted-foreground text-lg">Built for educators who demand accuracy and depth</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
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
            <h2 className="text-3xl font-bold">Built for every role</h2>
            <p className="mt-3 text-muted-foreground">Role-based access with tailored dashboards</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map((role) => (
              <Card key={role.title} className="overflow-hidden">
                <div className={`h-2 ${role.color}`} />
                <CardContent className="p-6">
                  <h3 className="font-bold text-xl mb-4">{role.title}</h3>
                  <ul className="space-y-2">
                    {role.points.map((point) => (
                      <li key={point} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
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
      <section className="bg-primary py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground">Ready to transform your assessments?</h2>
          <p className="mt-4 text-primary-foreground/80 text-lg">
            Join educators using AI to create accurate, document-grounded exams in minutes.
          </p>
          <Button size="lg" variant="secondary" asChild className="mt-8">
            <Link href="/register">Create Free Account →</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span>ExamGen RAG — Thesis Project</span>
          </div>
          <span>Built with Next.js · LangChain · OpenAI · Pinecone</span>
        </div>
      </footer>
    </div>
  );
}
