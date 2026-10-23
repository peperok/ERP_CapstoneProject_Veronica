"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { UserRole } from "@/types/erp";

interface DashboardShellProps {
  userName: string;
  userEmail: string;
  userRole: UserRole;
  children: React.ReactNode;
}

export function DashboardShell({
  userName,
  userEmail,
  userRole,
  children,
}: DashboardShellProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <div className="flex min-h-screen bg-white antialiased text-slate-900">
      {/* Sidebar Navigasi Collapsible (Full / Mini Icon Mode) */}
      <Sidebar
        userRole={userRole}
        userName={userName}
        userEmail={userEmail}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        onLogout={handleLogout}
      />

      {/* Konten Utama */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Header
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          onLogout={handleLogout}
        />
        <main className="flex-1 p-5 sm:p-7 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
