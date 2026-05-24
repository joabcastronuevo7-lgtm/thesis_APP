"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, Search, Send, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { parseJsonResponse } from "@/lib/api-response";

interface Student {
  id: string;
  name: string;
  email: string;
}

interface AssignStudentsPanelProps {
  quizId: string;
  status: string;
  students: Student[];
  assignments: { studentId: string; dueAt: string | Date | null }[];
}

export function AssignStudentsPanel({
  quizId,
  status,
  students,
  assignments,
}: AssignStudentsPanelProps) {
  const router = useRouter();
  const isPublished = status === "PUBLISHED";
  const assignedStudentIds = assignments.map((assignment) => assignment.studentId);
  const assignedSet = useMemo(
    () => new Set(assignedStudentIds),
    [assignedStudentIds]
  );
  const studentNameMap = useMemo(
    () => new Map(students.map((student) => [student.id, student.name])),
    [students]
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assigning, setAssigning] = useState(false);

  const availableStudents = students.filter((student) => !assignedSet.has(student.id));
  const filteredStudents = availableStudents.filter((student) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      student.name.toLowerCase().includes(term) ||
      student.email.toLowerCase().includes(term)
    );
  });

  function toggleStudent(studentId: string) {
    setSelectedIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  }

  async function assignStudents() {
    if (selectedIds.length === 0) {
      toast.error("Select at least one student");
      return;
    }

    setAssigning(true);
    try {
      const response = await fetch(`/api/quizzes/${quizId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: selectedIds,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        }),
      });
      const result = await parseJsonResponse<{ success: boolean; error?: string; message?: string }>(response);
      if (!result.success) throw new Error(result.error);

      toast.success(result.message ?? "Students assigned");
      setSelectedIds([]);
      setDueAt("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Assignment failed");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Assign Students
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Published exams appear in selected students&apos; My Exams page.
            </p>
          </div>
          <Badge variant={isPublished ? "default" : "secondary"}>
            {isPublished ? "Ready" : "Publish first"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isPublished ? (
          <div className="rounded-md border border-dashed bg-muted/30 p-5">
            <p className="text-sm font-medium">Assignment unlocks after publishing.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Review the preview questions, publish the exam, then select students here.
            </p>
          </div>
        ) : students.length === 0 ? (
          <div className="rounded-md border border-dashed bg-muted/30 p-5">
            <p className="text-sm font-medium">No student accounts yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Students need accounts before this exam can be assigned.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search students"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Button onClick={assignStudents} disabled={assigning || selectedIds.length === 0}>
                {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Assign {selectedIds.length > 0 ? selectedIds.length : ""}
              </Button>
            </div>

            <div className="rounded-md border bg-muted/20 p-3">
              <label className="flex items-center gap-2 text-sm font-medium" htmlFor="assignment-due-at">
                <CalendarClock className="h-4 w-4 text-primary" />
                Exam access deadline
              </label>
              <Input
                id="assignment-due-at"
                className="mt-2"
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Optional. Students can start the exam until this date and time.
              </p>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {filteredStudents.length === 0 ? (
                <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground md:col-span-2">
                  All matching students are already assigned.
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const selected = selectedIds.includes(student.id);

                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => toggleStudent(student.id)}
                      className={`flex items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors ${
                        selected ? "border-primary bg-primary/5" : "hover:bg-muted"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{student.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{student.email}</p>
                      </div>
                      {selected ? (
                        <UserCheck className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <span className="h-4 w-4 shrink-0 rounded-full border" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {assignments.length > 0 && (
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Already assigned to {assignments.length} student{assignments.length === 1 ? "" : "s"}.
                </p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {assignments.slice(0, 6).map((assignment) => (
                    <div key={assignment.studentId} className="rounded border bg-background px-3 py-2 text-xs">
                      <p className="font-medium">
                        {studentNameMap.get(assignment.studentId) ?? "Student"}
                      </p>
                      <p className="text-muted-foreground">
                        {assignment.dueAt
                          ? `Closes ${new Date(assignment.dueAt).toLocaleString()}`
                          : "No access deadline"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
