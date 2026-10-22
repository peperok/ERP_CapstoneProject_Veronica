"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { formatRupiah, formatDate } from "@/lib/utils";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  FileSpreadsheet,
  FileText,
  Printer,
  CheckCircle2,
  FileDown,
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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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
  // 5. FITUR EKSPOR EXCEL MULTI-SHEET (.XLSX)
  // ============================================================================
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Ringkasan Kinerja & Tren 8 Minggu
      const summaryRows = [
        ["LAPORAN KINERJA FINANSIAL & PIUTANG - CV SINAR ABADI NIAGA"],
        [`Tanggal Unduh: ${new Date().toLocaleDateString("id-ID")} ${new Date().toLocaleTimeString("id-ID")}`],
        [""],
        ["METRIK UTAMA", "NILAI"],
        ["Total Omzet Penjualan Bersih", totalOmzet],
        ["Total Biaya Pokok (HPP Modal)", totalHPP],
        ["Total Laba Kotor (Gross Margin)", totalMargin],
        ["Margin Rata-rata (%)", `${marginPersen.toFixed(2)}%`],
        ["Total Piutang Berjalan", totalPiutang],
        [""],
        ["TREN OMZET & MARGIN 8 MINGGU TERAKHIR"],
        ["Periode Minggu", "Omzet Bersih (Rp)", "Laba Kotor (Rp)", "Margin (%)"],
        ...weeklyData.map((w) => [
          w.label,
          w.omzet,
          w.margin,
          w.omzet > 0 ? `${((w.margin / w.omzet) * 100).toFixed(1)}%` : "0%",
        ]),
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary["!cols"] = [{ wch: 35 }, { wch: 25 }, { wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan & Tren");

      // Sheet 2: Top 10 Barang Margin
      const topBarangRows = [
        ["TOP 10 BARANG PENYUMBANG MARGIN TERTINGGI - CV SINAR ABADI NIAGA"],
        [""],
        ["Peringkat", "Kode Barang", "Nama Barang", "Volume Terjual", "Satuan", "Total Omzet (Rp)", "Total Margin (Rp)", "Margin (%)"],
        ...topBarangData.map((b, idx) => [
          idx + 1,
          b.kode,
          b.nama,
          b.qty,
          b.satuan,
          b.omzet,
          b.margin,
          b.omzet > 0 ? `${((b.margin / b.omzet) * 100).toFixed(1)}%` : "0%",
        ]),
      ];
      const wsTopBarang = XLSX.utils.aoa_to_sheet(topBarangRows);
      wsTopBarang["!cols"] = [
        { wch: 10 },
        { wch: 12 },
        { wch: 35 },
        { wch: 15 },
        { wch: 10 },
        { wch: 20 },
        { wch: 20 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, wsTopBarang, "Top 10 Barang Margin");

      // Sheet 3: Aging Schedule Piutang Pelanggan
      const agingRows = [
        ["AGING SCHEDULE PIUTANG PELANGGAN (UMUR PIUTANG) - CV SINAR ABADI NIAGA"],
        [""],
        ["Kode", "Toko Pelanggan", "Termin", "Plafon Kredit (Rp)", "Lancar / Belum JT (Rp)", "1-30 Hari (Rp)", "31-60 Hari (Rp)", ">60 Hari (Rp)", "Total Piutang (Rp)", "Status Tagihan"],
        ...agingData.map((p) => [
          p.kode,
          p.nama_toko,
          `${p.termin_hari} Hari`,
          p.batas_kredit,
          p.current,
          p.d1to30,
          p.d31to60,
          p.dOver60,
          p.totalPiutang,
          p.hasOverdue ? "Ada Tunggakan" : p.totalPiutang > 0 ? "Lancar" : "Lunas",
        ]),
      ];
      const wsAging = XLSX.utils.aoa_to_sheet(agingRows);
      wsAging["!cols"] = [
        { wch: 10 },
        { wch: 30 },
        { wch: 12 },
        { wch: 20 },
        { wch: 22 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 20 },
        { wch: 16 },
      ];
      XLSX.utils.book_append_sheet(wb, wsAging, "Aging Piutang");

      // Download file
      const fileName = `Laporan_Keuangan_CV_Sinar_Abadi_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Buku kerja Excel (.xlsx) dengan 3 sheet berhasil diunduh!");
      setIsExportModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat file Excel.");
    }
  };

  // ============================================================================
  // 6. FITUR CETAK / EKSPOR PDF RESMI (KOP SURAT A4)
  // ============================================================================
  const handlePrintPDF = () => {
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Gagal membuka jendela cetak. Pastikan pop-up diizinkan browser.");
        return;
      }

      const currentDate = new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Laporan Keuangan & Piutang - CV Sinar Abadi Niaga</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: Arial, sans-serif; color: #1e293b; line-height: 1.4; font-size: 11px; }
            .header-kop { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-end; }
            .kop-title { font-size: 16px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
            .kop-sub { font-size: 10px; color: #475569; margin-top: 2px; }
            .doc-info { text-align: right; font-size: 9px; color: #64748b; }
            h2 { font-size: 12px; margin-top: 15px; margin-bottom: 6px; color: #0f172a; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 15px; }
            .kpi-box { border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 8px; background: #f8fafc; }
            .kpi-label { font-size: 9px; color: #64748b; font-weight: bold; }
            .kpi-value { font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px; }
            th { background: #f1f5f9; color: #0f172a; font-weight: bold; text-align: left; padding: 5px 6px; border: 1px solid #cbd5e1; }
            td { padding: 4px 6px; border: 1px solid #cbd5e1; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .badge-warning { background: #fee2e2; color: #991b1b; padding: 1px 4px; border-radius: 3px; font-weight: bold; font-size: 8px; }
            .badge-success { background: #dcfce7; color: #166534; padding: 1px 4px; border-radius: 3px; font-weight: bold; font-size: 8px; }
            .footer-ttd { display: flex; justify-content: flex-end; margin-top: 30px; }
            .ttd-box { text-align: center; width: 200px; font-size: 10px; }
            .ttd-space { height: 50px; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header-kop">
            <div>
              <div class="kop-title">CV Sinar Abadi Niaga</div>
              <div class="kop-sub">Distributor Bahan Pokok & FMCG | Sistem Informasi ERP Terpadu</div>
            </div>
            <div class="doc-info">
              <div><strong>LAPORAN RESMI KEUANGAN</strong></div>
              <div>Tanggal: ${currentDate}</div>
              <div>Klasifikasi: RAHASIA MANAJER (BR-12)</div>
            </div>
          </div>

          <!-- KPI METRICS -->
          <div class="kpi-grid">
            <div class="kpi-box">
              <div class="kpi-label">TOTAL OMZET BERSIH</div>
              <div class="kpi-value">${formatRupiah(totalOmzet)}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-label">TOTAL BIAYA HPP MODAL</div>
              <div class="kpi-value">${formatRupiah(totalHPP)}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-label">TOTAL LABA KOTOR (MARGIN)</div>
              <div class="kpi-value" style="color: #15803d;">${formatRupiah(totalMargin)} (${marginPersen.toFixed(1)}%)</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-label">TOTAL PIUTANG BERJALAN</div>
              <div class="kpi-value" style="color: #1d4ed8;">${formatRupiah(totalPiutang)}</div>
            </div>
          </div>

          <!-- TABEL 1: TOP 10 PRODUK MARGIN -->
          <h2>1. 10 Barang Penyumbang Margin Keuntungan Tertinggi</h2>
          <table>
            <thead>
              <tr>
                <th class="text-center" style="width: 30px;">No</th>
                <th>Kode</th>
                <th>Nama Barang</th>
                <th class="text-center">Volume</th>
                <th class="text-right">Total Omzet</th>
                <th class="text-right">Total Laba Kotor</th>
                <th class="text-center">Margin %</th>
              </tr>
            </thead>
            <tbody>
              ${topBarangData
                .map(
                  (b, idx) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td>${b.kode}</td>
                  <td><strong>${b.nama}</strong></td>
                  <td class="text-center">${b.qty} ${b.satuan}</td>
                  <td class="text-right">${formatRupiah(b.omzet)}</td>
                  <td class="text-right" style="font-weight: bold; color: #15803d;">${formatRupiah(b.margin)}</td>
                  <td class="text-center">${b.omzet > 0 ? ((b.margin / b.omzet) * 100).toFixed(1) : 0}%</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <!-- TABEL 2: AGING SCHEDULE PIUTANG -->
          <h2>2. Aging Schedule Piutang Dagang Pelanggan</h2>
          <table>
            <thead>
              <tr>
                <th>Toko Pelanggan</th>
                <th class="text-right">Plafon Kredit</th>
                <th class="text-right">Lancar (Belum JT)</th>
                <th class="text-right">1 - 30 Hari</th>
                <th class="text-right">31 - 60 Hari</th>
                <th class="text-right">&gt; 60 Hari</th>
                <th class="text-right">Total Piutang</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${agingData
                .map(
                  (p) => `
                <tr>
                  <td><strong>${p.nama_toko}</strong> (${p.termin_hari} hr)</td>
                  <td class="text-right">${formatRupiah(p.batas_kredit)}</td>
                  <td class="text-right" style="color: #15803d;">${p.current > 0 ? formatRupiah(p.current) : "-"}</td>
                  <td class="text-right">${p.d1to30 > 0 ? formatRupiah(p.d1to30) : "-"}</td>
                  <td class="text-right">${p.d31to60 > 0 ? formatRupiah(p.d31to60) : "-"}</td>
                  <td class="text-right" style="color: #b91c1c; font-weight: bold;">${p.dOver60 > 0 ? formatRupiah(p.dOver60) : "-"}</td>
                  <td class="text-right" style="font-weight: bold;">${p.totalPiutang > 0 ? formatRupiah(p.totalPiutang) : "Rp0"}</td>
                  <td class="text-center">
                    ${
                      p.hasOverdue
                        ? '<span class="badge-warning">TUNGGAKAN</span>'
                        : p.totalPiutang > 0
                        ? '<span class="badge-success">LANCAR</span>'
                        : '<span style="color: #94a3b8;">LUNAS</span>'
                    }
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <!-- TANDA TANGAN -->
          <div class="footer-ttd">
            <div class="ttd-box">
              <div>Bekasi, ${currentDate}</div>
              <div>Disetujui oleh,</div>
              <div class="ttd-space"></div>
              <div style="font-weight: bold; text-decoration: underline;">Hendra Wijaya</div>
              <div style="color: #64748b;">Manajer Operasional & Keuangan</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      setIsExportModalOpen(false);
      toast.success("Jendela cetak / Simpan PDF resmi telah dibuka.");
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses dokumen PDF.");
    }
  };

  // ============================================================================
  // 7. FITUR EKSPOR CSV
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
      setIsExportModalOpen(false);
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
          onClick={() => setIsExportModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm flex items-center gap-2"
        >
          <Download className="h-4 w-4" /> Ekspor & Cetak Laporan
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

      {/* ========================================================================= */}
      {/* MODAL POP-UP PILIHAN FORMAT EKSPOR & CETAK LAPORAN                       */}
      {/* ========================================================================= */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 text-base">
              <Download className="w-5 h-5 text-blue-600" />
              Pilih Format Ekspor & Cetak Laporan
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pilih salah satu format laporan di bawah sesuai dengan kebutuhan analisis Anda (Data bersifat Rahasia Manajer - BR-12).
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 py-3">
            {/* KARTU 1: EXCEL (.XLSX) */}
            <div
              onClick={handleExportExcel}
              className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/40 transition-all cursor-pointer group flex items-start gap-3 shadow-2xs"
            >
              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-900 group-hover:text-emerald-900">
                    Microsoft Excel (.xlsx)
                  </h3>
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    Multi-Sheet
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Buku kerja Excel dengan 3 sheet terpisah: <strong>Ringkasan KPI</strong>, <strong>Top 10 Barang</strong>, dan <strong>Aging Piutang</strong> yang sudah terformat rapi.
                </p>
              </div>
            </div>

            {/* KARTU 2: PDF RESMI (A4 PRINT) */}
            <div
              onClick={handlePrintPDF}
              className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/40 transition-all cursor-pointer group flex items-start gap-3 shadow-2xs"
            >
              <div className="p-2.5 rounded-lg bg-blue-100 text-blue-800 group-hover:scale-105 transition-transform">
                <Printer className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-900 group-hover:text-blue-900">
                    Dokumen Resmi PDF / Cetak (A4)
                  </h3>
                  <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    Siap Cetak
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Format dokumen siap cetak atau <em>Save as PDF</em> lengkap dengan <strong>Kop Surat CV Sinar Abadi Niaga</strong>, tabel formal, dan kolom tanda tangan manajer.
                </p>
              </div>
            </div>

            {/* KARTU 3: CSV TABULAR */}
            <div
              onClick={handleExportCSV}
              className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-500 hover:bg-slate-50 transition-all cursor-pointer group flex items-start gap-3 shadow-2xs"
            >
              <div className="p-2.5 rounded-lg bg-slate-100 text-slate-800 group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-900 group-hover:text-slate-950">
                    Data Tabular CSV (.csv)
                  </h3>
                  <span className="text-[10px] font-black bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                    Kompatibel
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Format teks tabular standar yang ringan dan mudah diintegrasikan dengan sistem pengolahan data lain.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsExportModalOpen(false)}
              className="border-slate-300 text-slate-800 font-bold hover:bg-slate-100"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
