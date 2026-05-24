"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard, FileText, BookOpen, Users, BarChart3,
  LogOut, GraduationCap, Brain, ClipboardList, MonitorCheck,
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
  { label: "Monitor", href: "/educator/monitoring", icon: MonitorCheck },
  { label: "Analytics", href: "/educator/analytics", icon: BarChart3 },
];

const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/student", icon: LayoutDashboard },
  { label: "My Exams", href: "/student/exams", icon: ClipboardList },
  { label: "Results", href: "/student/results", icon: BarChart3 },
  { label: "Analytics", href: "/student/analytics", icon: Brain },
];

const roleConfig = {
  admin: {
    label: "Admin",
    badge: "destructive" as const,
    avatarClass: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  educator: {
    label: "Educator",
    badge: "default" as const,
    avatarClass: "bg-primary/10 text-primary",
  },
  student: {
    label: "Student",
    badge: "secondary" as const,
    avatarClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
};

export function Sidebar() {
  const { user, logout, isAdmin, isEducator } = useAuth();
  const pathname = usePathname();

  const navItems = isAdmin ? adminNav : isEducator ? educatorNav : studentNav;
  const role = isAdmin ? roleConfig.admin : isEducator ? roleConfig.educator : roleConfig.student;

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b px-6">
        <div className="rounded-lg bg-primary p-1.5 shrink-0">
          <GraduationCap className="h-4.5 w-4.5 text-primary-foreground" style={{ height: "1.125rem", width: "1.125rem" }} />
        </div>
        <span className="font-bold text-base tracking-tight">ExamGen RAG</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
          return (
            <Link key={item.href} href={item.href}>
              <span
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                {item.label}
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t p-4 space-y-3">
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <Avatar className={cn("h-8 w-8", role.avatarClass)}>
            <AvatarFallback className={cn("text-xs font-semibold", role.avatarClass)}>
              {user?.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <Badge variant={role.badge} className="text-xs mt-0.5 px-1.5 py-0">
              {role.label}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
