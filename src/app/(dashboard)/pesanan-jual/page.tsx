import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PesananClientView } from "./pesanan-client";

export const dynamic = "force-dynamic";

export default async function PesananJualPage() {
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

  // Query pesanan jual
  // Gudang hanya melihat status selain 'draf' (PRD Bab 7)
  let query = supabase
    .from("pesanan_jual")
    .select(`
      id,
      nomor,
      pelanggan_id,
      dibuat_oleh,
      total,
      status,
      dibuat_pada,
      dikirim_pada,
      jatuh_tempo,
      dilunasi_pada,
      alasan_batal,
      pelanggan:pelanggan_id (id, kode, nama_toko, termin_hari, batas_kredit),
      pembuat:dibuat_oleh (id, nama_lengkap),
      items:item_pesanan_jual (
        id,
        barang_id,
        jumlah,
        harga_satuan,
        diskon_persen,
        subtotal,
        barang:barang_id (id, kode, nama, satuan)
      )
    `)
    .order("dibuat_pada", { ascending: false });

  if (userRole === "gudang") {
    query = query.neq("status", "draf");
  }

  const { data: rawOrders } = await query;

  return (
    <PesananClientView
      initialOrders={(rawOrders as any[]) || []}
      userRole={userRole}
      currentUserId={user.id}
    />
  );
}
