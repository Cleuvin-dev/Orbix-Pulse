"use client";

import {
  Avatar,
  AvatarFallback,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@orbix/ui";
import { ROLES } from "@orbix/types";
import { ChevronDown } from "lucide-react";

import { ROLE_LABELS, useDevSession } from "@/lib/dev-session";

import { SyncStatusIndicator } from "./sync-status-indicator";
import { ThemeToggle } from "./theme-toggle";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar() {
  const { user, setRole } = useDevSession();

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-background px-4">
      <div>
        <p className="text-sm font-medium">{user.tenantName}</p>
        <p className="text-xs text-muted-foreground">{user.branchName}</p>
      </div>

      <div className="flex items-center gap-3">
        <SyncStatusIndicator />
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium hover:bg-accent">
            <Badge variant="outline">mock</Badge>
            Ver como: {ROLE_LABELS[user.role]}
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Pré-visualizar papel (dev)</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ROLES.map((role) => (
              <DropdownMenuItem key={role} onClick={() => setRole(role)}>
                {ROLE_LABELS[role]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
