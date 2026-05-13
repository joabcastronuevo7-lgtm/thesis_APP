"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard, FileText, BookOpen, Users, BarChart3,
  Settings, LogOut, GraduationCap, Brain, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "PDFs", href: "/admin/pdfs", icon: FileText },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
];

const educatorNav: NavItem[] = [
  { label: "Dashboard", href: "/educator", icon: LayoutDashboard },
  { label: "PDF Library", href: "/educator/pdfs", icon: FileText },
  { label: "Quizzes", href: "/educator/quizzes", icon: BookOpen },
  { label: "Analytics", href: "/educator/analytics", icon: BarChart3 },
];

const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/student", icon: LayoutDashboard },
  { label: "My Exams", href: "/student/exams", icon: ClipboardList },
  { label: "Results", href: "/student/results", icon: BarChart3 },
  { label: "Analytics", href: "/student/analytics", icon: Brain },
];

export function Sidebar() {
  const { user, logout, isAdmin, isEducator } = useAuth();
  const pathname = usePathname();

  const navItems = isAdmin ? adminNav : isEducator ? educatorNav : studentNav;
  const roleLabel = isAdmin ? "Admin" : isEducator ? "Educator" : "Student";
  const roleColor = isAdmin ? "destructive" : isEducator ? "default" : "secondary";

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <GraduationCap className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg">ExamGen RAG</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <span
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs">
              {user?.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <Badge variant={roleColor as "default" | "destructive" | "secondary"} className="text-xs mt-0.5">
              {roleLabel}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start gap-2 text-muted-foreground">
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
