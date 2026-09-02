"use client";

import { cn } from "@orbix/ui";
import { Orbit } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { navModulesForRole } from "@/lib/nav-modules";
import { useSession } from "@/lib/session";

export function Sidebar() {
  const { user } = useSession();
  const pathname = usePathname();
  const modules = user ? navModulesForRole(user.role) : [];

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-gradient">
          <Orbit className="h-4 w-4 text-white" />
        </span>
        <span className="bg-brand-gradient bg-clip-text text-lg font-semibold text-transparent">
          Orbix Pulse
        </span>
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
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
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
