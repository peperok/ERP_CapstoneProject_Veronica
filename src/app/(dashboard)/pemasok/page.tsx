import { createClient } from "@/lib/supabase/server";
import { PemasokClientView } from "./pemasok-client";

export const dynamic = "force-dynamic";

export default async function PemasokPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nama_lengkap, peran")
    .eq("id", user.id)
    .single();

  // Ambil data pemasok
  const { data: pemasokList } = await supabase
    .from("pemasok")
    .select("id, kode, nama, telepon, alamat, aktif, dibuat_pada")
    .order("kode", { ascending: true });

  return (
    <PemasokClientView
      initialPemasok={pemasokList || []}
      userRole={profile?.peran || "penjualan"}
      currentUserId={user.id}
    />
  );
}
