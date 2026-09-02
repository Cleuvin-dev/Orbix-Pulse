"use client";

import { Orbit } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession } from "@/lib/session";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

function FullPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40">
      <Orbit className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated" && pathname !== "/login") {
      router.replace("/login");
    }
    if (status === "authenticated" && pathname === "/login") {
      router.replace("/");
    }
  }, [status, pathname, router]);

  if (status === "loading") {
    return <FullPageLoading />;
  }

  if (status === "unauthenticated" || pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-secondary/40 p-6">{children}</main>
      </div>
    </div>
  );
}
