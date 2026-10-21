import { createClient } from "@/lib/supabase/server";
import { BarangClientView } from "./barang-client";

export const dynamic = "force-dynamic";

export default async function BarangPage() {
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

  const isManajer = profile?.peran === "manajer";
  const isGudang = profile?.peran === "gudang";

  // Ambil data barang dari database
  // Jika Manajer: ambil semua kolom termasuk harga_pokok
  // Jika non-manajer: harga_pokok akan disaring oleh RLS / view publik (BR-12)
  const { data: rawBarang } = await supabase
    .from("barang")
    .select("*")
    .order("kode", { ascending: true });

  const barangList = (rawBarang || []).map((b: any) => ({
    id: b.id,
    kode: b.kode,
    nama: b.nama,
    satuan: b.satuan,
    harga_jual: Number(b.harga_jual),
    harga_pokok: isManajer ? Number(b.harga_pokok) : undefined,
    stok: Number(b.stok),
    stok_minimum: Number(b.stok_minimum),
    aktif: Boolean(b.aktif),
    diperbarui_pada: b.diperbarui_pada,
  }));

  return (
    <BarangClientView
      initialBarang={barangList || []}
      userRole={profile?.peran || "penjualan"}
      currentUserId={user.id}
    />
  );
}
