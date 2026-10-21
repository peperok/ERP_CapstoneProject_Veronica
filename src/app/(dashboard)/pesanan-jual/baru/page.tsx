import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FormPesananBaruClient } from "./form-client";

export const dynamic = "force-dynamic";

export default async function PesananBaruPage() {
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

  const userRole = (profile?.peran as "manajer" | "penjualan" | "gudang") || "penjualan";

  // Staf Gudang DILARANG membuat pesanan jual (PRD Bab 7)
  if (userRole === "gudang") {
    redirect("/pesanan-jual");
  }

  // Ambil daftar pelanggan aktif
  const { data: pelangganList } = await supabase
    .from("pelanggan")
    .select("id, kode, nama_toko, alamat, telepon, termin_hari, batas_kredit")
    .eq("aktif", true)
    .order("nama_toko", { ascending: true });

  // Ambil daftar barang aktif
  const { data: barangList } = await supabase
    .from("barang")
    .select("id, kode, nama, satuan, stok, stok_minimum, harga_jual")
    .eq("aktif", true)
    .order("nama", { ascending: true });

  // Ambil nomor pesanan terakhir untuk nomor otomatis (misal SO-00045 -> SO-00046)
  const { data: latestOrder } = await supabase
    .from("pesanan_jual")
    .select("nomor")
    .order("nomor", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextNomor = "SO-00001";
  if (latestOrder?.nomor) {
    const match = latestOrder.nomor.match(/SO-(\d+)/i);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      nextNomor = `SO-${String(nextNum).padStart(5, "0")}`;
    }
  }

  return (
    <FormPesananBaruClient
      pelangganList={pelangganList || []}
      barangList={barangList || []}
      initialNomor={nextNomor}
      userRole={userRole}
      currentUserId={user.id}
    />
  );
}
