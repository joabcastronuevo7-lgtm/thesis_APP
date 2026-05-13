import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { pdfRepository } from "@/repositories/pdf.repository";
import { Header } from "@/components/dashboard/header";
import { QuizBuilder } from "@/components/quiz/quiz-builder";

export default async function NewQuizPage() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "EDUCATOR"].includes(session.user.role)) {
    redirect("/login");
  }

  const { data: pdfs } = await pdfRepository.findMany({
    page: 1,
    pageSize: 100,
    uploadedById: session.user.id,
    status: "PROCESSED",
  });

  return (
    <div>
      <Header
        title="Generate New Quiz"
        description="AI will generate questions grounded exclusively in your PDF content"
      />
      <div className="p-6 max-w-3xl">
        <QuizBuilder pdfs={pdfs} />
      </div>
    </div>
  );
}
