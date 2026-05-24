"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur px-6 sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="Toggle theme"
          className="rounded-lg"
        >
          {mounted ? (
            isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
          ) : (
            <span className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
        <Button variant="ghost" size="icon" className="rounded-lg relative">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
