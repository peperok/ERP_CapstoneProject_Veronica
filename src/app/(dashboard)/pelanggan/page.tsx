import { createClient } from "@/lib/supabase/server";
import { PelangganClientView } from "./pelanggan-client";

export const dynamic = "force-dynamic";

export default async function PelangganPage() {
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

  // Ambil daftar pelanggan
  const { data: pelangganList } = await supabase
    .from("pelanggan")
    .select("id, kode, nama_toko, telepon, alamat, batas_kredit, termin_hari, aktif, dibuat_pada")
    .order("kode", { ascending: true });

  // Ambil total piutang berjalan per pelanggan (SO dikonfirmasi & dikirim: BR-05)
  const { data: piutangData } = await supabase
    .from("pesanan_jual")
    .select("pelanggan_id, total, status, jatuh_tempo")
    .in("status", ["dikonfirmasi", "dikirim"]);

  const piutangMap: Record<string, { total: number; hasOverdue: boolean }> = {};

  if (piutangData) {
    const todayStr = new Date().toISOString().split("T")[0];
    piutangData.forEach((so) => {
      if (!piutangMap[so.pelanggan_id]) {
        piutangMap[so.pelanggan_id] = { total: 0, hasOverdue: false };
      }
      piutangMap[so.pelanggan_id].total += Number(so.total);

      // Cek jatuh tempo untuk status dikirim (BR-05)
      if (so.status === "dikirim" && so.jatuh_tempo && so.jatuh_tempo < todayStr) {
        piutangMap[so.pelanggan_id].hasOverdue = true;
      }
    });
  }

  const enrichedPelanggan = (pelangganList || []).map((p) => ({
    ...p,
    piutang_berjalan: piutangMap[p.id]?.total || 0,
    has_overdue: piutangMap[p.id]?.hasOverdue || false,
  }));

  return (
    <PelangganClientView
      initialPelanggan={enrichedPelanggan}
      userRole={profile?.peran || "penjualan"}
      currentUserId={user.id}
    />
  );
}
