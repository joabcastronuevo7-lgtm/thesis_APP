import { GraduationCap, Brain, Shield, BarChart3 } from "lucide-react";
import Link from "next/link";

const highlights = [
  { icon: Brain, text: "AI-generated questions from your own PDFs" },
  { icon: Shield, text: "Hallucination-free via RAG validation" },
  { icon: BarChart3, text: "Per-student analytics and weak-topic detection" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-primary via-primary to-violet-700">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-violet-500/20 blur-2xl pointer-events-none" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <Link href="/" className="relative flex items-center gap-2.5 text-primary-foreground">
          <div className="rounded-lg bg-white/20 p-1.5 backdrop-blur">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">ExamGen RAG</span>
        </Link>

        <div className="relative space-y-8">
          <blockquote className="text-primary-foreground/95 text-2xl font-light leading-relaxed italic">
            &ldquo;Generate exam questions grounded entirely in your course materials — powered by AI, validated by context.&rdquo;
          </blockquote>

          <ul className="space-y-3">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-primary-foreground/80 text-sm">
                <div className="rounded-md bg-white/15 p-1.5 shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                {text}
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { value: "RAG", label: "Architecture" },
              { value: "GPT-4", label: "AI Model" },
              { value: "3", label: "User Roles" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white/10 backdrop-blur p-3 text-center">
                <p className="text-lg font-bold text-primary-foreground">{stat.value}</p>
                <p className="text-xs text-primary-foreground/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-primary-foreground/40 text-xs">
          © 2025 ExamGen RAG · Thesis Research Project
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col justify-center items-center p-8 bg-muted/20">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="rounded-lg bg-primary p-1.5">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">ExamGen RAG</span>
          </Link>
          <div className="rounded-2xl border bg-background shadow-sm p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
