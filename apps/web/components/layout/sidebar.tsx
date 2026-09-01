"use client";

import { cn } from "@orbix/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useDevSession } from "@/lib/dev-session";
import { navModulesForRole } from "@/lib/nav-modules";

export function Sidebar() {
  const { user } = useDevSession();
  const pathname = usePathname();
  const modules = navModulesForRole(user.role);

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <span className="text-lg font-semibold text-primary">Orbix Pulse</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {modules.map((module) => {
          const isActive = pathname === module.href;
          const Icon = module.icon;
          return (
            <Link
              key={module.key}
              href={module.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {module.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
