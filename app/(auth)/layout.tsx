import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12">
        <Link href="/" className="flex items-center gap-2 text-primary-foreground">
          <GraduationCap className="h-7 w-7" />
          <span className="text-xl font-bold">ExamGen RAG</span>
        </Link>
        <div>
          <blockquote className="text-primary-foreground/90 text-2xl font-light leading-relaxed italic">
            &ldquo;Generate exam questions grounded entirely in your course materials — powered by AI, validated by context.&rdquo;
          </blockquote>
          <p className="mt-6 text-primary-foreground/70 text-sm">
            Upload PDFs → AI extracts knowledge → Questions generated → Exams administered — all in one platform.
          </p>
        </div>
        <div className="text-primary-foreground/50 text-xs">
          © 2025 ExamGen RAG · Thesis Research Project
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col justify-center items-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">ExamGen RAG</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
