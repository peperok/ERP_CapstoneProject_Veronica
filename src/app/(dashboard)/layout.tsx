import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UserRole } from "@/types/erp";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. Ambil user sesi saat ini
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Ambil profil & peran dari public.profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("nama_lengkap, peran, aktif")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.aktif) {
    redirect("/login");
  }

  // Konversi peran ke tampilan huruf kapital yang rapi
  const roleDisplayMap: Record<string, UserRole> = {
    manajer: "Manajer",
    penjualan: "Staf Penjualan",
    gudang: "Staf Gudang",
  };

  const userRole = roleDisplayMap[profile.peran] || "Manajer";

  return (
    <DashboardShell
      userName={profile.nama_lengkap}
      userEmail={user.email || ""}
      userRole={userRole}
    >
      {children}
    </DashboardShell>
  );
}
