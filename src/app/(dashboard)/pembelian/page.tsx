import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PembelianClientView } from "./pembelian-client";

export const dynamic = "force-dynamic";

export default async function PembelianPage() {
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

  const userRole = profile?.peran as "manajer" | "penjualan" | "gudang";

  // Staf Penjualan DILARANG mengakses modul pembelian (PRD Bab 7 & BR-12)
  if (userRole === "penjualan") {
    redirect("/");
  }

  const isManajer = userRole === "manajer";

  // Query seluruh data dokumen pembelian
  // Catatan Keamanan BR-12: Kolom harga_beli_satuan disaring bila bukan manajer
  const selectQuery = `
    id,
    nomor,
    pemasok_id,
    barang_id,
    jumlah_dipesan,
    jumlah_diterima,
    harga_beli_satuan,
    status,
    alasan_tolak,
    alasan_batal,
    diajukan_oleh,
    diajukan_pada,
    diputuskan_oleh,
    diputuskan_pada,
    diterima_oleh,
    diterima_pada,
    pemasok:pemasok_id (id, kode, nama),
    barang:barang_id (id, kode, nama, satuan, stok, stok_minimum),
    pemohon:diajukan_oleh (nama_lengkap)
  `;

  const { data: rawPurchases } = await supabase
    .from("pembelian")
    .select(selectQuery as "*")
    .order("diajukan_pada", { ascending: false });

  // Ambil daftar barang aktif dan pemasok aktif untuk form pengajuan modal/helper
  const { data: barangList } = await supabase
    .from("barang")
    .select("id, kode, nama, satuan, stok, stok_minimum")
    .eq("aktif", true)
    .order("nama", { ascending: true });

  const { data: pemasokList } = await supabase
    .from("pemasok")
    .select("id, kode, nama")
    .eq("aktif", true)
    .order("nama", { ascending: true });

  return (
    <PembelianClientView
      initialPurchases={(rawPurchases as any[]) || []}
      barangList={barangList || []}
      pemasokList={pemasokList || []}
      userRole={userRole}
      currentUserId={user.id}
    />
  );
}
