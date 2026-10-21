"use client";

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Navigasi Adaptif Peran */}
      <Sidebar userRole={userRole} />

      {/* Konten Utama */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          onLogout={handleLogout}
        />
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
