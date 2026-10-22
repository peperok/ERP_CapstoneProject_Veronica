"use client";

import { useState, useMemo } from "react";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Download,
  Clock,
  Package,
  Calendar,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  barang_id: string;
  jumlah: number;
  harga_satuan: number;
  diskon_persen: number;
  subtotal: number;
  hpp_satuan: number;
  barang?: {
    id: string;
    kode: string;
    nama: string;
    satuan: string;
  };
}

interface OrderReport {
  id: string;
  nomor: string;
  pelanggan_id: string;
  status: "draf" | "dikonfirmasi" | "dikirim" | "lunas" | "dibatalkan";
  total: number;
  dibuat_pada: string;
  dikirim_pada: string | null;
  jatuh_tempo: string | null;
  dilunasi_pada: string | null;
  pelanggan?: {
    id: string;
    kode: string;
    nama_toko: string;
    termin_hari: number;
    batas_kredit: number;
  };
  items?: OrderItem[];
}

interface Pelanggan {
  id: string;
  kode: string;
  nama_toko: string;
  termin_hari: number;
  batas_kredit: number;
  telepon: string;
}

interface LaporanClientViewProps {
  orders: OrderReport[];
  pelangganList: Pelanggan[];
}

export function LaporanClientView({
  orders,
  pelangganList,
}: LaporanClientViewProps) {
  const [activeTab, setActiveTab] = useState<"omzet" | "topBarang" | "aging">("omzet");

  // ============================================================================
  // 1. KALKULASI METRIK EKSEKUTIF UTAMA
  // ============================================================================
  const { totalOmzet, totalHPP, totalMargin, marginPersen, totalPiutang } =
    useMemo(() => {
      let omzet = 0;
      let hpp = 0;
      let piutang = 0;

      orders.forEach((o) => {
        // Omzet dan margin dihitung dari pesanan yang dikirim & lunas
        if (o.status === "dikirim" || o.status === "lunas") {
          omzet += o.total;

          o.items?.forEach((item) => {
            const itemHPP = (item.hpp_satuan || 0) * item.jumlah;
            hpp += itemHPP;
          });
        }

        // Piutang aktif dihitung dari pesanan yang berstatus 'dikirim' (belum lunas)
        if (o.status === "dikirim") {
          piutang += o.total;
        }
      });

      const margin = omzet - hpp;
      const pct = omzet > 0 ? (margin / omzet) * 100 : 0;

      return {
        totalOmzet: omzet,
        totalHPP: hpp,
        totalMargin: margin,
        marginPersen: pct,
        totalPiutang: piutang,
      };
    }, [orders]);

  // ============================================================================
  // 2. KALKULASI GRAFIK MINGGUAN (8 MINGGU TERAKHIR)
  // ============================================================================
  const weeklyData = useMemo(() => {
    // Kelompokkan 8 minggu (W1 sampai W8)
    // Rentang data seed: 1 September 2026 s/d 23 Oktober 2026 (sekitar 8 minggu)
    const weeks: {
      [key: string]: { label: string; omzet: number; hpp: number; margin: number };
    } = {};

    // Inisialisasi 8 bucket minggu
    for (let i = 7; i >= 0; i--) {
      const d = new Date("2026-10-23T00:00:00Z");
      d.setDate(d.getDate() - i * 7);
      const weekKey = `W-${8 - i}`;
      const dayFormatted = d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
      weeks[weekKey] = {
        label: `Mgg ${8 - i} (${dayFormatted})`,
        omzet: 0,
        hpp: 0,
        margin: 0,
      };
    }

    orders.forEach((o) => {
      if (o.status === "dikirim" || o.status === "lunas") {
        const orderDate = new Date(o.dibuat_pada);
        const refDate = new Date("2026-10-23T00:00:00Z");
        const diffDays = Math.floor(
          (refDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const weekIndex = Math.min(7, Math.max(0, Math.floor(diffDays / 7)));
        const weekKey = `W-${8 - weekIndex}`;

        if (weeks[weekKey]) {
          weeks[weekKey].omzet += o.total;
          let oHpp = 0;
          o.items?.forEach((item) => {
            oHpp += (item.hpp_satuan || 0) * item.jumlah;
          });
          weeks[weekKey].hpp += oHpp;
          weeks[weekKey].margin += o.total - oHpp;
        }
      }
    });

    return Object.values(weeks);
  }, [orders]);

  const maxWeeklyOmzet = Math.max(...weeklyData.map((w) => w.omzet), 1);

  // ============================================================================
  // 3. KALKULASI TOP 10 BARANG PENYUMBANG MARGIN TERTINGGI
  // ============================================================================
  const topBarangData = useMemo(() => {
    const barangMap: {
      [key: string]: {
        kode: string;
        nama: string;
        satuan: string;
        qty: number;
        omzet: number;
        hpp: number;
        margin: number;
      };
    } = {};

    orders.forEach((o) => {
      if (o.status === "dikirim" || o.status === "lunas") {
        o.items?.forEach((item) => {
          const bId = item.barang_id;
          if (!barangMap[bId]) {
            barangMap[bId] = {
              kode: item.barang?.kode || "BRG-???",
              nama: item.barang?.nama || "Barang",
              satuan: item.barang?.satuan || "unit",
              qty: 0,
              omzet: 0,
              hpp: 0,
              margin: 0,
            };
          }
          const itemHppTotal = (item.hpp_satuan || 0) * item.jumlah;
          barangMap[bId].qty += item.jumlah;
          barangMap[bId].omzet += item.subtotal;
          barangMap[bId].hpp += itemHppTotal;
          barangMap[bId].margin += item.subtotal - itemHppTotal;
        });
      }
    });

    return Object.values(barangMap)
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 10);
  }, [orders]);

  // ============================================================================
  // 4. KALKULASI AGING SCHEDULE PIUTANG (UMUR PIUTANG PELANGGAN)
  // ============================================================================
  const agingData = useMemo(() => {
    const today = new Date("2026-10-23T00:00:00Z");

    return pelangganList.map((p) => {
      // Cari semua pesanan toko ini yang berstatus 'dikirim' (belum lunas)
      const pendingOrders = orders.filter(
        (o) => o.pelanggan_id === p.id && o.status === "dikirim"
      );

      let current = 0; // Belum jatuh tempo
      let d1to30 = 0; // Lewat 1-30 hari
      let d31to60 = 0; // Lewat 31-60 hari
      let dOver60 = 0; // Lewat >60 hari

      pendingOrders.forEach((o) => {
        if (!o.jatuh_tempo) {
          current += o.total;
          return;
        }

        const dueDate = new Date(o.jatuh_tempo);
        const diffTime = today.getTime() - dueDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          current += o.total;
        } else if (diffDays <= 30) {
          d1to30 += o.total;
        } else if (diffDays <= 60) {
          d31to60 += o.total;
        } else {
          dOver60 += o.total;
        }
      });

      const totalPiutangToko = current + d1to30 + d31to60 + dOver60;

      return {
        ...p,
        current,
        d1to30,
        d31to60,
        dOver60,
        totalPiutang: totalPiutangToko,
        hasOverdue: d1to30 + d31to60 + dOver60 > 0,
      };
    });
  }, [pelangganList, orders]);

  // ============================================================================
  // 5. FITUR EKSPOR CSV
  // ============================================================================
  const handleExportCSV = () => {
    try {
      let csvContent = "data:text/csv;charset=utf-8,";

      // Bagian 1: Ringkasan Eksekutif
      csvContent += "RINGKASAN KINERJA KEUANGAN CV SINAR ABADI NIAGA\n";
      csvContent += `Tanggal Cetak,${new Date().toLocaleDateString("id-ID")}\n`;
      csvContent += `Total Omzet Bersih,${totalOmzet}\n`;
      csvContent += `Total Laba Kotor (Margin),${totalMargin}\n`;
      csvContent += `Margin Laba Kotor,${marginPersen.toFixed(2)}%\n`;
      csvContent += `Total Piutang Berjalan,${totalPiutang}\n\n`;

      // Bagian 2: Top Barang Margin
      csvContent += "TOP 10 BARANG PENYUMBANG MARGIN TERTINGGI\n";
      csvContent += "Kode Barang,Nama Barang,Qty Terjual,Omzet (Rp),Margin (Rp),Margin (%)\n";
      topBarangData.forEach((b) => {
        const pct = b.omzet > 0 ? ((b.margin / b.omzet) * 100).toFixed(1) : "0";
        csvContent += `"${b.kode}","${b.nama}",${b.qty},${b.omzet},${b.margin},${pct}%\n`;
      });
      csvContent += "\n";

      // Bagian 3: Aging Schedule Piutang
      csvContent += "AGING SCHEDULE PIUTANG PELANGGAN (UMUR PIUTANG)\n";
      csvContent += "Kode,Toko Pelanggan,Plafon Kredit,Belum Jatuh Tempo,1-30 Hari,31-60 Hari,>60 Hari,Total Piutang\n";
      agingData.forEach((p) => {
        csvContent += `"${p.kode}","${p.nama_toko}",${p.batas_kredit},${p.current},${p.d1to30},${p.d31to60},${p.dOver60},${p.totalPiutang}\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `Laporan_Keuangan_ERP_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Laporan Keuangan & Piutang berhasil diekspor ke CSV!");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengekspor laporan.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Laporan Keuangan & Kinerja Bisnis
            </h1>
            <Badge className="bg-emerald-600 text-white font-bold text-[11px]">
              Khusus Manajer (BR-12)
            </Badge>
          </div>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Analisis profitabilitas, tren margin mingguan, kontribusi produk, dan jadwal umur piutang pelanggan.
          </p>
        </div>

        <Button
          onClick={handleExportCSV}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm flex items-center gap-2"
        >
          <Download className="h-4 w-4" /> Ekspor Laporan CSV
        </Button>
      </div>

      {/* 4 KARTU METRIK EKSEKUTIF */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Total Omzet Bersih</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-black text-slate-900">{formatRupiah(totalOmzet)}</p>
          <p className="text-[11px] text-slate-500 font-medium">Dari pesanan terkirim & lunas</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Total Laba Kotor (Margin)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700">{formatRupiah(totalMargin)}</p>
          <p className="text-[11px] text-emerald-600 font-bold">Omzet dikurangi HPP modal</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Margin Rata-rata</span>
            <BarChart3 className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-700">{marginPersen.toFixed(1)}%</p>
          <p className="text-[11px] text-slate-500 font-medium">Persentase profitabilitas</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Total Piutang Berjalan</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-black text-blue-900">{formatRupiah(totalPiutang)}</p>
          <p className="text-[11px] text-blue-700 font-bold">Pesanan dikirim belum lunas</p>
        </div>
      </div>

      {/* TABS NAVIGASI ANALISIS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("omzet")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === "omzet"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Tren Omzet & Margin (8 Minggu)
        </button>
        <button
          onClick={() => setActiveTab("topBarang")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === "topBarang"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Top 10 Barang Penyumbang Margin
        </button>
        <button
          onClick={() => setActiveTab("aging")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === "aging"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Aging Schedule Piutang Pelanggan
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GRAFIK MINGGUAN (8 MINGGU)                                         */}
      {/* ========================================================================= */}
      {activeTab === "omzet" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Tren Perbandingan Omzet vs Laba Kotor (8 Minggu Terakhir)
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Visualisasi batang perbandingan nilai penjualan bersih dan margin keuntungan kotor.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-600 inline-block"></span>
                <span className="text-slate-700">Omzet Bersih</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
                <span className="text-slate-700">Laba Kotor (Margin)</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Visual */}
          <div className="grid grid-cols-8 gap-3 pt-6 pb-2 items-end min-h-[260px] border-b border-slate-200">
            {weeklyData.map((week, idx) => {
              const omzetHeight = Math.max(8, Math.round((week.omzet / maxWeeklyOmzet) * 180));
              const marginHeight = Math.max(6, Math.round((week.margin / maxWeeklyOmzet) * 180));
              const pct = week.omzet > 0 ? ((week.margin / week.omzet) * 100).toFixed(0) : "0";

              return (
                <div key={idx} className="flex flex-col items-center gap-1.5 group">
                  <span className="text-[10px] font-black text-emerald-700 opacity-80 group-hover:opacity-100">
                    {pct}%
                  </span>

                  <div className="w-full flex items-end justify-center gap-1 h-[190px]">
                    {/* Batang Omzet */}
                    <div
                      style={{ height: `${omzetHeight}px` }}
                      className="w-1/2 max-w-[28px] bg-blue-600 rounded-t-md transition-all group-hover:bg-blue-700 relative"
                      title={`Omzet: ${formatRupiah(week.omzet)}`}
                    />
                    {/* Batang Margin */}
                    <div
                      style={{ height: `${marginHeight}px` }}
                      className="w-1/2 max-w-[28px] bg-emerald-500 rounded-t-md transition-all group-hover:bg-emerald-600 relative"
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
            {weeklyData.slice(-4).map((w, i) => (
              <div key={i} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 block">{w.label}</span>
                <span className="text-xs font-black text-slate-900 block mt-0.5">
                  Omzet: {formatRupiah(w.omzet)}
                </span>
                <span className="text-xs font-bold text-emerald-700 block">
                  Laba: {formatRupiah(w.margin)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TOP 10 BARANG PENYUMBANG MARGIN                                     */}
      {/* ========================================================================= */}
      {activeTab === "topBarang" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              10 Barang Penyumbang Margin Laba Terbesar
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Diurutkan berdasarkan kontribusi nominal laba kotor tertinggi dari seluruh pesanan terkirim.
            </p>
          </div>

          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-slate-900 text-xs w-12 text-center">No</TableHead>
                <TableHead className="font-bold text-slate-900 text-xs">Kode & Nama Barang</TableHead>
                <TableHead className="font-bold text-slate-900 text-xs text-center">Volume Terjual</TableHead>
                <TableHead className="font-bold text-slate-900 text-xs text-right">Total Omzet</TableHead>
                <TableHead className="font-bold text-slate-900 text-xs text-right">Total Laba Kotor (Margin)</TableHead>
                <TableHead className="font-bold text-slate-900 text-xs text-center">Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topBarangData.map((b, idx) => {
                const marginPct = b.omzet > 0 ? (b.margin / b.omzet) * 100 : 0;
                return (
                  <TableRow key={idx} className="hover:bg-slate-50">
                    <TableCell className="text-center font-bold text-slate-500 text-xs">
                      #{idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-xs text-slate-900">{b.nama}</div>
                      <div className="text-[11px] font-medium text-slate-500">{b.kode}</div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs text-slate-800">
                      {b.qty} {b.satuan}
                    </TableCell>
                    <TableCell className="text-right font-medium text-xs text-slate-800">
                      {formatRupiah(b.omzet)}
                    </TableCell>
                    <TableCell className="text-right font-black text-xs text-emerald-700">
                      {formatRupiah(b.margin)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-black bg-emerald-100 text-emerald-800">
                        {marginPct.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AGING SCHEDULE PIUTANG PELANGGAN                                   */}
      {/* ========================================================================= */}
      {activeTab === "aging" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Aging Schedule Piutang Pelanggan (Umur Piutang)
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pengelompokan piutang berjalan berdasarkan ketepatan jatuh tempo pembayaran.
            </p>
          </div>

          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-slate-900 text-xs">Toko Pelanggan</TableHead>
                <TableHead className="font-bold text-slate-900 text-xs text-right">Plafon Kredit</TableHead>
                <TableHead className="font-bold text-slate-900 text-xs text-right text-emerald-700">
                  Lancar (Belum JT)
                </TableHead>
                <TableHead className="font-bold text-slate-900 text-xs text-right text-amber-600">
                  1 - 30 Hari
                </TableHead>
                <TableHead className="font-bold text-slate-900 text-xs text-right text-orange-600">
                  31 - 60 Hari
                </TableHead>
                <TableHead className="font-bold text-slate-900 text-xs text-right text-red-600">
                  &gt; 60 Hari
                </TableHead>
                <TableHead className="font-bold text-slate-900 text-xs text-right">Total Piutang</TableHead>
                <TableHead className="font-bold text-slate-900 text-xs text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agingData.map((p) => (
                <TableRow key={p.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="font-bold text-xs text-slate-900">{p.nama_toko}</div>
                    <div className="text-[11px] text-slate-500">Termin: {p.termin_hari} hari</div>
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold text-slate-600">
                    {formatRupiah(p.batas_kredit)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-bold text-emerald-700">
                    {p.current > 0 ? formatRupiah(p.current) : "-"}
                  </TableCell>
                  <TableCell className="text-right text-xs font-bold text-amber-700">
                    {p.d1to30 > 0 ? formatRupiah(p.d1to30) : "-"}
                  </TableCell>
                  <TableCell className="text-right text-xs font-bold text-orange-700">
                    {p.d31to60 > 0 ? formatRupiah(p.d31to60) : "-"}
                  </TableCell>
                  <TableCell className="text-right text-xs font-black text-red-600">
                    {p.dOver60 > 0 ? formatRupiah(p.dOver60) : "-"}
                  </TableCell>
                  <TableCell className="text-right text-xs font-black text-blue-900">
                    {p.totalPiutang > 0 ? formatRupiah(p.totalPiutang) : "Rp0"}
                  </TableCell>
                  <TableCell className="text-center">
                    {p.hasOverdue ? (
                      <Badge variant="destructive" className="text-[10px] font-bold">
                        Ada Tunggakan
                      </Badge>
                    ) : p.totalPiutang > 0 ? (
                      <Badge className="bg-blue-600 text-white text-[10px] font-bold">
                        Lancar
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500 text-[10px] font-semibold">
                        Nol (Lunas)
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
