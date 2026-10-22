import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LaporanClientView } from "./laporan-client";

export const dynamic = "force-dynamic";

export default async function LaporanPage() {
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

  // Proteksi Akses BR-12: Modul Laporan dengan margin & HPP HANYA untuk Manajer
  if (userRole !== "manajer") {
    redirect("/");
  }

  // 1. Ambil seluruh pesanan jual yang sudah dikonfirmasi, dikirim, atau lunas
  // beserta rincian item, harga pokok (HPP), dan pelanggannya
  const { data: orders } = await supabase
    .from("pesanan_jual")
    .select(`
      id,
      nomor,
      pelanggan_id,
      status,
      total,
      dibuat_pada,
      dikirim_pada,
      jatuh_tempo,
      dilunasi_pada,
      pelanggan:pelanggan_id (id, kode, nama_toko, termin_hari, batas_kredit),
      items:item_pesanan_jual (
        id,
        barang_id,
        jumlah,
        harga_satuan,
        diskon_persen,
        subtotal,
        hpp_satuan,
        barang:barang_id (id, kode, nama, satuan)
      )
    `)
    .in("status", ["dikirim", "lunas", "dikonfirmasi"])
    .order("dibuat_pada", { ascending: false });

  // 2. Ambil seluruh pelanggan untuk kompilasi Aging Schedule Piutang
  const { data: pelangganList } = await supabase
    .from("pelanggan")
    .select("id, kode, nama_toko, termin_hari, batas_kredit, telepon")
    .eq("aktif", true)
    .order("nama_toko", { ascending: true });

  return (
    <LaporanClientView
      orders={(orders as any[]) || []}
      pelangganList={pelangganList || []}
    />
  );
}
