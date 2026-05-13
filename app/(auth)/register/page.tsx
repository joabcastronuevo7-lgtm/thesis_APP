import { RegisterForm } from "@/components/auth/register-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account — ExamGen RAG",
};

export default function RegisterPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-2 text-muted-foreground">
          Join ExamGen RAG and start creating AI-powered exams
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
