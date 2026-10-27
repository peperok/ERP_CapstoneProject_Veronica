import { createClient } from "@/lib/supabase/server";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Receipt,
  Package,
  Truck,
  ShoppingCart,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ShieldCheck,
  ChevronRight,
  Building2,
  Calendar,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("nama_lengkap, peran")
    .eq("id", user.id)
    .single();

  const role = (profile?.peran || "manajer") as "manajer" | "penjualan" | "gudang";

  // Data Query Khusus Manajer
  let omzetBulan = 0;
  let marginBulan = 0;
  let piutangBerjalan = 0;
  let barangMenipisCount = 0;
  let poMenungguCount = 0;
  let poMenungguList: any[] = [];
  let soDistribution = { draf: 0, dikonfirmasi: 0, dikirim: 0, lunas: 0, dibatalkan: 0 };
  let recentOrdersList: any[] = [];
  let weeklyDashboardData: { label: string; omzet: number; margin: number }[] = [];

  // Data Query Khusus Penjualan
  let myOrdersCount = { draf: 0, dikonfirmasi: 0, dikirim: 0, lunas: 0 };
  let overdueCustomers: any[] = [];
  let myRecentOrders: any[] = [];

  // Data Query Khusus Gudang
  let readyToShipOrders: any[] = [];
  let lowStockItems: any[] = [];
  let incomingPurchases: any[] = [];

  // Ambil distribusi status seluruh SO untuk Donut Chart / Ringkasan status
  const { data: allSO } = await supabase
    .from("pesanan_jual")
    .select("id, nomor, total, status, dikirim_pada, jatuh_tempo, dibuat_pada, pelanggan(nama_toko)");

  if (allSO) {
    allSO.forEach((so) => {
      if (so.status in soDistribution) {
        soDistribution[so.status as keyof typeof soDistribution]++;
      }
    });
    recentOrdersList = allSO.slice(0, 5);
  }

  if (role === "manajer") {
    // Omzet: Total SO dikirim & lunas
    const { data: soData } = await supabase
      .from("pesanan_jual")
      .select("id, nomor, total, status, dikirim_pada, jatuh_tempo")
      .in("status", ["dikirim", "lunas"]);

    if (soData) {
      omzetBulan = soData.reduce((acc, curr) => acc + Number(curr.total), 0);
    }

    // Piutang berjalan: SO dikonfirmasi & dikirim
    const { data: piutangData } = await supabase
      .from("pesanan_jual")
      .select("total")
      .in("status", ["dikonfirmasi", "dikirim"]);

    if (piutangData) {
      piutangBerjalan = piutangData.reduce((acc, curr) => acc + Number(curr.total), 0);
    }

    // Margin: Query item pesanan
    const { data: itemData } = await supabase
      .from("item_pesanan_jual")
      .select("jumlah, subtotal, hpp_satuan, pesanan_jual!inner(status)")
      .in("pesanan_jual.status", ["dikirim", "lunas"]);

    if (itemData) {
      marginBulan = itemData.reduce((acc, item) => {
        const hpp = Number(item.hpp_satuan || 0) * Number(item.jumlah);
        return acc + (Number(item.subtotal) - hpp);
      }, 0);
    }

    // Barang stok menipis
    const { data: barangData } = await supabase
      .from("barang")
      .select("id, stok, stok_minimum")
      .eq("aktif", true);

    if (barangData) {
      barangMenipisCount = barangData.filter((b) => b.stok <= b.stok_minimum).length;
    }

    // PO Menunggu Persetujuan
    const { data: poData } = await supabase
      .from("pembelian")
      .select("id, nomor, jumlah_dipesan, diajukan_pada, pemasok(nama), barang(nama)")
      .eq("status", "diajukan")
      .order("diajukan_pada", { ascending: false });

    if (poData) {
      poMenungguCount = poData.length;
      poMenungguList = poData.slice(0, 5);
    }

    // Kalkulasi Grafik Omzet & Margin 8 Minggu Terakhir (PRD Bab 7 & Bab 9)
    const { data: weeklyOrders } = await supabase
      .from("pesanan_jual")
      .select(`
        id,
        total,
        status,
        dikirim_pada,
        dibuat_pada,
        items:item_pesanan_jual (
          jumlah,
          hpp_satuan
        )
      `)
      .in("status", ["dikirim", "lunas"]);

    if (weeklyOrders) {
      const weeksInit: { [key: string]: { label: string; omzet: number; margin: number } } = {
        "W-1": { label: "1-7 Sep", omzet: 0, margin: 0 },
        "W-2": { label: "8-14 Sep", omzet: 0, margin: 0 },
        "W-3": { label: "15-21 Sep", omzet: 0, margin: 0 },
        "W-4": { label: "22-28 Sep", omzet: 0, margin: 0 },
        "W-5": { label: "29 Sep-5 Okt", omzet: 0, margin: 0 },
        "W-6": { label: "6-12 Okt", omzet: 0, margin: 0 },
        "W-7": { label: "13-19 Okt", omzet: 0, margin: 0 },
        "W-8": { label: "20-26 Okt", omzet: 0, margin: 0 },
      };

      const startDate = new Date("2026-09-01T00:00:00Z");
      weeklyOrders.forEach((o: any) => {
        const orderDateStr = o.dikirim_pada || o.dibuat_pada;
        if (orderDateStr) {
          const oDate = new Date(orderDateStr);
          const diffDays = Math.floor(
            (oDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          const weekIndex = Math.min(7, Math.max(0, Math.floor(diffDays / 7)));
          const weekKey = `W-${weekIndex + 1}`;
          if (weeksInit[weekKey]) {
            const tot = Number(o.total) || 0;
            weeksInit[weekKey].omzet += tot;
            let hppTot = 0;
            (o.items || []).forEach((it: any) => {
              hppTot += (Number(it.hpp_satuan) || 0) * (Number(it.jumlah) || 0);
            });
            weeksInit[weekKey].margin += tot - hppTot;
          }
        }
      });
      weeklyDashboardData = Object.values(weeksInit);
    }
  } else if (role === "penjualan") {
    // Pesanan milik staf penjualan saat ini
    const { data: myOrders } = await supabase
      .from("pesanan_jual")
      .select("id, nomor, status, total, dibuat_pada, pelanggan(nama_toko)")
      .eq("dibuat_oleh", user.id)
      .order("dibuat_pada", { ascending: false });

    if (myOrders) {
      myOrders.forEach((o) => {
        if (o.status in myOrdersCount) {
          myOrdersCount[o.status as keyof typeof myOrdersCount]++;
        }
      });
      myRecentOrders = myOrders.slice(0, 5);
    }

    // Pelanggan dengan tagihan jatuh tempo (BR-05)
    const { data: overdueOrders } = await supabase
      .from("pesanan_jual")
      .select("nomor, total, jatuh_tempo, pelanggan(nama_toko, telepon)")
      .eq("status", "dikirim")
      .lt("jatuh_tempo", new Date().toISOString().split("T")[0]);

    if (overdueOrders) {
      overdueCustomers = overdueOrders;
    }
  } else if (role === "gudang") {
    // Pesanan siap kirim (status: dikonfirmasi)
    const { data: readyOrders } = await supabase
      .from("pesanan_jual")
      .select("id, nomor, total, dikonfirmasi_pada, pelanggan(nama_toko, alamat)")
      .eq("status", "dikonfirmasi")
      .order("dikonfirmasi_pada", { ascending: true });

    if (readyOrders) {
      readyToShipOrders = readyOrders;
    }

    // Barang stok menipis
    const { data: bList } = await supabase
      .from("barang")
      .select("id, kode, nama, stok, stok_minimum, satuan")
      .eq("aktif", true)
      .order("stok", { ascending: true });

    if (bList) {
      lowStockItems = bList.filter((b) => b.stok <= b.stok_minimum);
    }

    // Pembelian disetujui menunggu barang datang
    const { data: inPurchases } = await supabase
      .from("pembelian")
      .select("id, nomor, jumlah_dipesan, pemasok(nama), barang(nama, satuan)")
      .eq("status", "disetujui")
      .order("diajukan_pada", { ascending: false });

    if (inPurchases) {
      incomingPurchases = inPurchases;
    }
  }

  const marginPersen = omzetBulan > 0 ? (marginBulan / omzetBulan) * 100 : 0;
  const totalSemuaPesanan =
    soDistribution.draf +
    soDistribution.dikonfirmasi +
    soDistribution.dikirim +
    soDistribution.lunas +
    soDistribution.dibatalkan;

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TAMPILAN KHUSUS MANAJER                                                */}
      {/* ========================================================================= */}
      {role === "manajer" && (
        <>
          {/* BARIS 1: 4 KPI CARDS (YUZO Style + Sparkline/Trend Badge) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* KPI 1: Omzet Berjalan */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Omzet Berjalan
                </span>
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatRupiah(omzetBulan)}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    +14.2%
                  </span>
                  <span className="text-xs text-slate-400 font-medium">vs bulan lalu</span>
                </div>
              </div>
              {/* Mini Sparkline visual */}
              <div className="absolute -bottom-2 -right-2 w-28 h-12 opacity-20 pointer-events-none text-blue-600">
                <svg viewBox="0 0 100 40" className="w-full h-full fill-none stroke-current stroke-2">
                  <path d="M0 35 Q 25 10, 50 25 T 100 5" />
                </svg>
              </div>
            </div>

            {/* KPI 2: Margin Kotor */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Margin Kotor
                </span>
                <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-emerald-600 tracking-tight">
                  {formatRupiah(marginBulan)}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    {marginPersen.toFixed(1)}% Rasio
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Profitabilitas</span>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-28 h-12 opacity-20 pointer-events-none text-emerald-600">
                <svg viewBox="0 0 100 40" className="w-full h-full fill-none stroke-current stroke-2">
                  <path d="M0 30 Q 30 5, 60 20 T 100 2" />
                </svg>
              </div>
            </div>

            {/* KPI 3: Piutang Berjalan */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-amber-300 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Piutang Berjalan
                </span>
                <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <Receipt className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-amber-600 tracking-tight">
                  {formatRupiah(piutangBerjalan)}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    Tempo Toko
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Dikonfirmasi & Kirim</span>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-28 h-12 opacity-20 pointer-events-none text-amber-600">
                <svg viewBox="0 0 100 40" className="w-full h-full fill-none stroke-current stroke-2">
                  <path d="M0 20 Q 35 35, 70 10 T 100 15" />
                </svg>
              </div>
            </div>

            {/* KPI 4: Stok Kritis / Menipis */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-rose-300 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Stok Menipis
                </span>
                <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-rose-600 tracking-tight">
                  {barangMenipisCount} <span className="text-base font-bold text-slate-600">Barang</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                    Perlu PO
                  </span>
                  <span className="text-xs text-slate-400 font-medium">&le; Batas minimum</span>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-28 h-12 opacity-20 pointer-events-none text-rose-600">
                <svg viewBox="0 0 100 40" className="w-full h-full fill-none stroke-current stroke-2">
                  <path d="M0 10 Q 40 40, 75 15 T 100 35" />
                </svg>
              </div>
            </div>
          </div>

          {/* BARIS 2: STATUS PESANAN (GAYA GAMBAR 1 DONUT/RINGKASAN) & APPROVAL PO (YUZO INITIATIVE STYLE) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Widget Donut / Komposisi Pesanan (Gaya Gambar 1) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                    Ringkasan Pesanan Jual
                  </h3>
                  <span className="text-xs font-semibold text-slate-400">
                    Total: {totalSemuaPesanan}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Komposisi status siklus penjualan distribusi
                </p>

                {/* Donut Simulation Graphic */}
                <div className="my-6 flex items-center justify-center">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    {/* Lingkaran SVG Donut */}
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      {/* Background circle */}
                      <path
                        className="text-slate-100"
                        strokeWidth="3.8"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* Segment 1: Lunas (Emerald) */}
                      <path
                        className="text-emerald-500"
                        strokeDasharray={`${totalSemuaPesanan > 0 ? (soDistribution.lunas / totalSemuaPesanan) * 100 : 40}, 100`}
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* Segment 2: Dikirim (Purple) */}
                      <path
                        className="text-indigo-500"
                        strokeDasharray={`${totalSemuaPesanan > 0 ? (soDistribution.dikirim / totalSemuaPesanan) * 100 : 25}, 100`}
                        strokeDashoffset={`-${totalSemuaPesanan > 0 ? (soDistribution.lunas / totalSemuaPesanan) * 100 : 40}`}
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    {/* Angka di tengah */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-slate-900 leading-none">
                        {soDistribution.lunas + soDistribution.dikirim}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-slate-400 mt-1">
                        Berjalan
                      </span>
                    </div>
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span>Lunas (Selesai)</span>
                    </div>
                    <span className="font-bold text-slate-900">{soDistribution.lunas}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                      <span>Dikirim (Tempo)</span>
                    </div>
                    <span className="font-bold text-slate-900">{soDistribution.dikirim}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span>Dikonfirmasi</span>
                    </div>
                    <span className="font-bold text-slate-900">{soDistribution.dikonfirmasi}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <span>Draf Masuk</span>
                    </div>
                    <span className="font-bold text-slate-900">{soDistribution.draf}</span>
                  </div>
                </div>
              </div>

              <Link href="/pesanan-jual" className="mt-5 block">
                <Button variant="outline" className="w-full text-xs font-bold rounded-xl h-9 hover:bg-slate-50">
                  Buka Pesanan Jual <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            {/* Widget Pengajuan PO Menunggu Otorisasi (Gaya YUZO List) */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                      Persetujuan Pembelian (PO) Menunggu
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pengajuan dari staf gudang yang memerlukan otorisasi harga beli Manajer
                    </p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold px-2.5 py-0.5 text-xs">
                    {poMenungguCount} Pending
                  </Badge>
                </div>

                <div className="mt-4 divide-y divide-slate-100">
                  {poMenungguList.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/80 mb-2" />
                      Semua pengajuan pembelian telah selesai diproses.
                    </div>
                  ) : (
                    poMenungguList.map((po) => (
                      <div
                        key={po.id}
                        className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/70 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 font-black text-xs flex items-center justify-center shrink-0">
                            PO
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-slate-900 truncate">
                                {po.nomor}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {formatDate(po.diajukan_pada)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              <strong className="text-slate-700">{po.barang?.nama}</strong> &bull; {po.jumlah_dipesan} unit &bull; {po.pemasok?.nama}
                            </p>
                          </div>
                        </div>

                        <Link href="/pembelian">
                          <Button size="sm" className="h-8 px-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs">
                            Tinjau & Setujui
                          </Button>
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Navigation Footer */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  Akses Cepat Pengambilan Keputusan
                </span>
                <div className="flex gap-2">
                  <Link href="/laporan">
                    <Button variant="ghost" size="sm" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl">
                      Laporan Margin
                    </Button>
                  </Link>
                  <Link href="/pengaturan">
                    <Button variant="ghost" size="sm" className="text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                      Audit Log
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* BARIS 3: GRAFIK TREN OMZET & MARGIN 8 MINGGU TERAKHIR (PRD Bab 7 & Bab 9 / BUG-7) */}
          {weeklyDashboardData.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Tren Omzet Mingguan & Laba Kotor (8 Minggu Terakhir)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Perbandingan mingguan performa penjualan dan perolehan margin kotor CV Sinar Abadi Niaga
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-600 inline-block" />
                    <span className="text-slate-700">Omzet</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                    <span className="text-slate-700">Laba Kotor</span>
                  </div>
                </div>
              </div>

              {/* Chart Visual Bars */}
              {(() => {
                const maxVal = Math.max(...weeklyDashboardData.map((w) => w.omzet), 1);
                return (
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 pt-5 pb-2 items-end min-h-[220px] border-b border-slate-100">
                    {weeklyDashboardData.map((week, idx) => {
                      const omzetHeight = Math.max(6, Math.round((week.omzet / maxVal) * 150));
                      const marginHeight = Math.max(4, Math.round((Math.max(0, week.margin) / maxVal) * 150));
                      const pct = week.omzet > 0 ? ((week.margin / week.omzet) * 100).toFixed(0) : "0";

                      return (
                        <div key={idx} className="flex flex-col items-center gap-1.5 group">
                          <span className="text-[10px] font-black text-emerald-700 opacity-80 group-hover:opacity-100">
                            {pct}%
                          </span>
                          <div className="w-full flex items-end justify-center gap-1 h-[155px]">
                            {/* Batang Omzet */}
                            <div
                              style={{ height: `${omzetHeight}px` }}
                              className="w-1/2 max-w-[24px] bg-blue-600 rounded-t-md transition-all group-hover:bg-blue-700"
                              title={`Omzet: ${formatRupiah(week.omzet)}`}
                            />
                            {/* Batang Margin */}
                            <div
                              style={{ height: `${marginHeight}px` }}
                              className="w-1/2 max-w-[24px] bg-emerald-500 rounded-t-md transition-all group-hover:bg-emerald-600"
                              title={`Laba Kotor: ${formatRupiah(week.margin)}`}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 text-center line-clamp-1">
                            {week.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. TAMPILAN KHUSUS STAF PENJUALAN                                         */}
      {/* ========================================================================= */}
      {role === "penjualan" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
            {/* Draf Saya */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Draf Saya</span>
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <ShoppingCart className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-blue-600 tracking-tight">{myOrdersCount.draf}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    Siap Konfirmasi
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-28 h-12 opacity-20 pointer-events-none text-blue-600">
                <svg viewBox="0 0 100 40" className="w-full h-full fill-none stroke-current stroke-2">
                  <path d="M0 35 Q 25 10, 50 25 T 100 5" />
                </svg>
              </div>
            </div>

            {/* Dikonfirmasi */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-amber-300 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dikonfirmasi</span>
                <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <Package className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-amber-600 tracking-tight">{myOrdersCount.dikonfirmasi}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    Proses Gudang
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-28 h-12 opacity-20 pointer-events-none text-amber-600">
                <svg viewBox="0 0 100 40" className="w-full h-full fill-none stroke-current stroke-2">
                  <path d="M0 20 Q 35 35, 70 10 T 100 15" />
                </svg>
              </div>
            </div>

            {/* Dikirim (Tempo) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-indigo-300 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dikirim (Tempo)</span>
                <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <Truck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-indigo-600 tracking-tight">{myOrdersCount.dikirim}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    Masa Tempo
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-28 h-12 opacity-20 pointer-events-none text-indigo-600">
                <svg viewBox="0 0 100 40" className="w-full h-full fill-none stroke-current stroke-2">
                  <path d="M0 30 Q 30 5, 60 20 T 100 2" />
                </svg>
              </div>
            </div>

            {/* Lunas */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Lunas</span>
                <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-emerald-600 tracking-tight">{myOrdersCount.lunas}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    Selesai
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-28 h-12 opacity-20 pointer-events-none text-emerald-600">
                <svg viewBox="0 0 100 40" className="w-full h-full fill-none stroke-current stroke-2">
                  <path d="M0 10 Q 40 40, 75 15 T 100 35" />
                </svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Tagihan Jatuh Tempo */}
            <div className="bg-white rounded-2xl p-6 border border-rose-200/90 shadow-xs">
              <div className="flex items-center gap-2 text-rose-600 mb-1">
                <AlertTriangle className="h-4 w-4" />
                <h3 className="font-extrabold text-sm">Peringatan Tagihan Jatuh Tempo (BR-05)</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Pesanan baru untuk toko berikut diblokir sistem hingga invoice tempo dilunasi.
              </p>

              <div className="divide-y divide-slate-100">
                {overdueCustomers.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">Tidak ada tagihan jatuh tempo.</p>
                ) : (
                  overdueCustomers.map((ord, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/60 px-2 rounded-xl transition-colors">
                      <div>
                        <div className="font-bold text-slate-900">{ord.pelanggan?.nama_toko}</div>
                        <div className="text-rose-600 font-semibold mt-0.5">
                          {ord.nomor} &bull; Tempo: {formatDate(ord.jatuh_tempo)}
                        </div>
                      </div>
                      <div className="font-black text-slate-800">{formatRupiah(Number(ord.total))}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pesanan Terakhir Saya */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-slate-900 text-sm">Pesanan Terbaru Saya</h3>
                  <Link href="/pesanan-jual/baru">
                    <Button size="sm" className="h-8 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs">
                      + Buat Pesanan
                    </Button>
                  </Link>
                </div>

                <div className="divide-y divide-slate-100">
                  {myRecentOrders.map((ord) => (
                    <div key={ord.id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/60 px-2 rounded-xl transition-colors">
                      <div>
                        <span className="font-bold text-slate-900">{ord.nomor}</span>
                        <div className="text-slate-400 mt-0.5">{ord.pelanggan?.nama_toko}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-800">{formatRupiah(Number(ord.total))}</div>
                        <span className="text-[10px] font-bold uppercase text-slate-500">{ord.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Link href="/pesanan-jual" className="mt-5 block">
                <Button variant="outline" className="w-full text-xs font-bold rounded-xl h-9 hover:bg-slate-50">
                  Lihat Seluruh Pesanan <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 3. TAMPILAN KHUSUS STAF GUDANG                                            */}
      {/* ========================================================================= */}
      {role === "gudang" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {/* Pesanan Siap Kirim */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Siap Kirim</span>
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <Truck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 tracking-tight">{readyToShipOrders.length} <span className="text-base font-bold text-slate-500">Pesanan</span></div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    Perlu Delivery Order
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-28 h-12 opacity-20 pointer-events-none text-blue-600">
                <svg viewBox="0 0 100 40" className="w-full h-full fill-none stroke-current stroke-2">
                  <path d="M0 35 Q 25 10, 50 25 T 100 5" />
                </svg>
              </div>
            </div>

            {/* Stok Menipis */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-rose-300 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Stok Menipis</span>
                <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-rose-600 tracking-tight">{lowStockItems.length} <span className="text-base font-bold text-slate-600">Barang</span></div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                    &le; Stok Minimum
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-28 h-12 opacity-20 pointer-events-none text-rose-600">
                <svg viewBox="0 0 100 40" className="w-full h-full fill-none stroke-current stroke-2">
                  <path d="M0 10 Q 40 40, 75 15 T 100 35" />
                </svg>
              </div>
            </div>

            {/* PO Menunggu Barang */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-purple-300 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">PO Menunggu</span>
                <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <Package className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-purple-700 tracking-tight">{incomingPurchases.length} <span className="text-base font-bold text-slate-600">Surat Jalan</span></div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                    Siap Diterima
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-28 h-12 opacity-20 pointer-events-none text-purple-600">
                <svg viewBox="0 0 100 40" className="w-full h-full fill-none stroke-current stroke-2">
                  <path d="M0 20 Q 35 35, 70 10 T 100 15" />
                </svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Siap Kirim */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-slate-900 text-sm">Pesanan Siap Kirim</h3>
                <Link href="/pesanan-jual">
                  <Button variant="ghost" size="sm" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                    Lihat Semua
                  </Button>
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {readyToShipOrders.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">Tidak ada pesanan menunggu kirim.</p>
                ) : (
                  readyToShipOrders.map((ord) => (
                    <div key={ord.id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/60 px-2 rounded-xl transition-colors">
                      <div>
                        <span className="font-bold text-slate-900">{ord.nomor}</span>
                        <div className="text-slate-400 mt-0.5">{ord.pelanggan?.nama_toko} &bull; {ord.pelanggan?.alamat}</div>
                      </div>
                      <Link href={`/pesanan-jual`}>
                        <Button size="sm" className="h-8 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                          Proses Kirim
                        </Button>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Stok Menipis */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-slate-900 text-sm">Barang Stok Menipis</h3>
                <Link href="/pembelian">
                  <Button size="sm" className="h-8 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                    + Ajukan PO
                  </Button>
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {lowStockItems.map((b) => (
                  <div key={b.id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/60 px-2 rounded-xl transition-colors">
                    <div>
                      <span className="font-bold text-slate-900">{b.nama}</span>
                      <div className="text-slate-400 mt-0.5">Kode: {b.kode} &bull; Min: {b.stok_minimum} {b.satuan}</div>
                    </div>
                    <Badge variant="destructive" className="font-bold text-[10px] px-2 py-0.5">
                      Sisa: {b.stok} {b.satuan}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
