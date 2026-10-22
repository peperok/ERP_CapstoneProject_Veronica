import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PengaturanClientView } from "./pengaturan-client";

export const dynamic = "force-dynamic";

export default async function PengaturanPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nama_lengkap, peran")
    .eq("id", user.id)
    .single();

  const userRole = profile?.peran;

  // Proteksi Akses BR-12: Halaman Audit Log HANYA untuk Manajer
  if (userRole !== "manajer") {
    redirect("/");
  }

  // Ambil data audit log beserta identitas pelakunya
  const { data: rawLogs } = await supabase
    .from("audit_log")
    .select(`
      id,
      pelaku_id,
      aksi,
      nama_tabel,
      data_id,
      nilai_lama,
      nilai_baru,
      dibuat_pada,
      pelaku:pelaku_id (id, nama_lengkap, peran)
    `)
    .order("dibuat_pada", { ascending: false })
    .limit(100);

  // Ambil daftar pengguna sistem untuk tab profil/pengguna
  const { data: userList } = await supabase
    .from("profiles")
    .select("id, nama_lengkap, peran, aktif, dibuat_pada")
    .order("nama_lengkap", { ascending: true });

  return (
    <PengaturanClientView
      initialLogs={(rawLogs as any[]) || []}
      userList={userList || []}
    />
  );
}
