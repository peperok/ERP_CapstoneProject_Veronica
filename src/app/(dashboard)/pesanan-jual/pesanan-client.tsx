"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
  Search,
  Plus,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Truck,
  Ban,
  Eye,
  Calendar,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Printer,
  QrCode,
  Copy,
  Check,
  MessageSquare,
  ExternalLink,
} from "lucide-react";

export interface ItemPesanan {
  id: string;
  barang_id: string;
  jumlah: number;
  harga_satuan: number;
  diskon_persen: number;
  subtotal: number;
  barang?: {
    id: string;
    kode: string;
    nama: string;
    satuan: string;
  };
}

export interface PesananItem {
  id: string;
  nomor: string;
  pelanggan_id: string;
  dibuat_oleh: string;
  total: number;
  status: "draf" | "dikonfirmasi" | "dikirim" | "lunas" | "dibatalkan";
  dibuat_pada: string;
  dikirim_pada: string | null;
  jatuh_tempo: string | null;
  dilunasi_pada: string | null;
  alasan_batal: string | null;
  pelanggan?: {
    id: string;
    kode: string;
    nama_toko: string;
    telepon?: string;
    alamat?: string;
    termin_hari: number;
    batas_kredit: number;
  };
  pembuat?: {
    id: string;
    nama_lengkap: string;
  };
  items?: ItemPesanan[];
}

interface PesananClientViewProps {
  initialOrders: PesananItem[];
  userRole: "manajer" | "penjualan" | "gudang";
  currentUserId: string;
}

export function PesananClientView({
  initialOrders,
  userRole,
  currentUserId,
}: PesananClientViewProps) {
  const router = useRouter();
  const supabase = createClient();

  const isManajer = userRole === "manajer";
  const isPenjualan = userRole === "penjualan";
  const canCreate = isManajer || isPenjualan;

  const [orders, setOrders] = useState<PesananItem[]>(initialOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("semua");

  // Modal Detail Items
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PesananItem | null>(null);

  // Modal Konfirmasi Pesanan (Langkah 6.2: BR-04, BR-05, BR-06)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [orderToConfirm, setOrderToConfirm] = useState<PesananItem | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Modal Pengiriman Pesanan (Langkah 6.3: BR-07)
  const [isShipOpen, setIsShipOpen] = useState(false);
  const [orderToShip, setOrderToShip] = useState<PesananItem | null>(null);
  const [isShipping, setIsShipping] = useState(false);

  // Modal Pelunasan Pesanan (Langkah 6.3: BR-07)
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [orderToSettle, setOrderToSettle] = useState<PesananItem | null>(null);
  const [isSettling, setIsSettling] = useState(false);

  // Modal Pembatalan Pesanan (Langkah 6.3: BR-08)
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<PesananItem | null>(null);
  const [alasanBatal, setAlasanBatal] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Modal Mayar Sandbox (Fitur Nilai Tambah #3: Bab 11 PRD)
  const [isMayarOpen, setIsMayarOpen] = useState(false);
  const [orderToMayar, setOrderToMayar] = useState<PesananItem | null>(null);
  const [isSimulatingMayar, setIsSimulatingMayar] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [realInvoiceUrl, setRealInvoiceUrl] = useState<string | null>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  const openConfirmModal = (order: PesananItem) => {
    setOrderToConfirm(order);
    setIsConfirmOpen(true);
  };

  const handleConfirmOrder = async () => {
    if (!orderToConfirm) return;

    setIsConfirming(true);
    try {
      // Panggil Stored Procedure Atomik: konfirmasi_pesanan_jual (BR-04, BR-05, BR-06)
      const { data, error } = await supabase.rpc("konfirmasi_pesanan_jual", {
        p_pesanan_id: orderToConfirm.id,
        p_pelaku_id: currentUserId,
      });

      if (error) {
        toast.error(error.message);
        setIsConfirming(false);
        return;
      }

      if (data && typeof data === "object") {
        if (!data.success) {
          toast.error(data.message || "Gagal mengonfirmasi pesanan.");
          setIsConfirming(false);
          return;
        }
      }

      toast.success(
        `Pesanan ${orderToConfirm.nomor} berhasil dikonfirmasi! Stok barang telah dipotong dan pesanan kini siap dikirim gudang.`
      );

      // Perbarui status pesanan di local state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderToConfirm.id
            ? { ...o, status: "dikonfirmasi" as const }
            : o
        )
      );

      setIsConfirmOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat konfirmasi pesanan.");
    } finally {
      setIsConfirming(false);
    }
  };

  // STEP 6.3: HANDLER PENGIRIMAN PESANAN (BR-07)
  const openShipModal = (order: PesananItem) => {
    setOrderToShip(order);
    setIsShipOpen(true);
  };

  const handleShipOrder = async () => {
    if (!orderToShip) return;

    setIsShipping(true);
    try {
      const termin = orderToShip.pelanggan?.termin_hari ?? 0;
      const today = new Date();
      const jatuhTempoDate = new Date(today);
      jatuhTempoDate.setDate(today.getDate() + termin);
      const jatuhTempoStr = jatuhTempoDate.toISOString().split("T")[0];

      const { error } = await supabase
        .from("pesanan_jual")
        .update({
          status: "dikirim",
          dikirim_pada: new Date().toISOString(),
          jatuh_tempo: jatuhTempoStr,
        })
        .eq("id", orderToShip.id);

      if (error) {
        toast.error(error.message);
        setIsShipping(false);
        return;
      }

      // Catat ke Audit Log sistem (BR-12)
      await supabase.from("audit_log").insert({
        pelaku_id: currentUserId,
        aksi: "kirim_pesanan",
        nama_tabel: "pesanan_jual",
        data_id: orderToShip.id,
        nilai_lama: { status: "dikonfirmasi" },
        nilai_baru: { status: "dikirim", jatuh_tempo: jatuhTempoStr },
      });

      toast.success(
        `Pesanan ${orderToShip.nomor} telah dikirim! Jatuh tempo pembayaran diatur ${termin} hari (tanggal ${formatDate(jatuhTempoStr)}).`
      );

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderToShip.id
            ? {
                ...o,
                status: "dikirim" as const,
                dikirim_pada: new Date().toISOString(),
                jatuh_tempo: jatuhTempoStr,
              }
            : o
        )
      );

      setIsShipOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal mencatat pengiriman pesanan.");
    } finally {
      setIsShipping(false);
    }
  };

  // STEP 6.3: HANDLER PELUNASAN PESANAN (BR-07 - Khusus Manajer)
  const openSettleModal = (order: PesananItem) => {
    setOrderToSettle(order);
    setIsSettleOpen(true);
  };

  const handleSettleOrder = async () => {
    if (!orderToSettle || !isManajer) return;

    setIsSettling(true);
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("pesanan_jual")
        .update({
          status: "lunas",
          dilunasi_pada: nowIso,
        })
        .eq("id", orderToSettle.id);

      if (error) {
        toast.error(error.message);
        setIsSettling(false);
        return;
      }

      // Catat ke Audit Log sistem (BR-12)
      await supabase.from("audit_log").insert({
        pelaku_id: currentUserId,
        aksi: "lunas_pesanan",
        nama_tabel: "pesanan_jual",
        data_id: orderToSettle.id,
        nilai_lama: { status: orderToSettle.status },
        nilai_baru: { status: "lunas", dilunasi_pada: nowIso },
      });

      toast.success(`Pembayaran pesanan ${orderToSettle.nomor} berhasil dicatat LUNAS!`);

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderToSettle.id
            ? { ...o, status: "lunas" as const, dilunasi_pada: nowIso }
            : o
        )
      );

      setIsSettleOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal mencatat pelunasan pesanan.");
    } finally {
      setIsSettling(false);
    }
  };

  // STEP 6.3: HANDLER PEMBATALAN PESANAN (BR-08 - Khusus Manajer untuk Dikonfirmasi)
  const openCancelModal = (order: PesananItem) => {
    setOrderToCancel(order);
    setAlasanBatal("");
    setIsCancelOpen(true);
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel) return;

    const alasan = alasanBatal.trim();
    if (alasan.length < 10) {
      toast.error("Alasan pembatalan wajib diisi paling sedikit 10 karakter.");
      return;
    }

    setIsCancelling(true);
    try {
      if (orderToCancel.status === "dikonfirmasi") {
        // Panggil Stored Procedure batalkan_pesanan_dikonfirmasi (mengembalikan stok ke gudang: BR-08)
        const { data, error } = await supabase.rpc("batalkan_pesanan_dikonfirmasi", {
          p_pesanan_id: orderToCancel.id,
          p_pelaku_id: currentUserId,
          p_alasan: alasan,
        });

        if (error) {
          toast.error(error.message);
          setIsCancelling(false);
          return;
        }

        if (data && typeof data === "object" && !data.success) {
          toast.error(data.message || "Gagal membatalkan pesanan.");
          setIsCancelling(false);
          return;
        }

        toast.success(
          `Pesanan ${orderToCancel.nomor} telah dibatalkan. Seluruh stok barang telah dikembalikan ke gudang.`
        );
      } else {
        // Jika masih draf, batalkan langsung
        const { error } = await supabase
          .from("pesanan_jual")
          .update({
            status: "dibatalkan",
            alasan_batal: alasan,
            dibatalkan_pada: new Date().toISOString(),
          })
          .eq("id", orderToCancel.id);

        if (error) {
          toast.error(error.message);
          setIsCancelling(false);
          return;
        }

        toast.success(`Draf pesanan ${orderToCancel.nomor} telah dibatalkan.`);
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderToCancel.id
            ? { ...o, status: "dibatalkan" as const, alasan_batal: alasan }
            : o
        )
      );

      setIsCancelOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal membatalkan pesanan.");
    } finally {
      setIsCancelling(false);
    }
  };

  // FITUR NILAI TAMBAH #3: MAYAR SANDBOX (Bab 11 PRD)
  const openMayarModal = async (order: PesananItem) => {
    setOrderToMayar(order);
    setCopiedLink(false);
    setRealInvoiceUrl(null);
    setIsMayarOpen(true);
    setIsGeneratingInvoice(true);

    try {
      const res = await fetch("/api/mayar/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pesananId: order.id }),
      });
      
      let resData: any = {};
      try {
        resData = await res.json();
      } catch {
        resData = { message: `Server HTTP ${res.status}: ${res.statusText}` };
      }

      if (res.ok && resData.success && resData.invoiceUrl) {
        setRealInvoiceUrl(resData.invoiceUrl);
        toast.success(`Invoice resmi Mayar untuk ${order.nomor} berhasil dibuat di server Mayar!`);
      } else {
        toast.error(resData.message || "Gagal membuat invoice real Mayar.");
        // Fallback ke tautan format Mayar akun jika terjadi limit/timeout
        setRealInvoiceUrl(`https://takechanceveve.mayar.link/${order.nomor.toLowerCase()}`);
      }
    } catch (err: any) {
      toast.error(`Koneksi API Mayar: ${err.message}`);
      setRealInvoiceUrl(`https://takechanceveve.mayar.link/${order.nomor.toLowerCase()}`);
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const getMayarLink = (order: PesananItem | null) => {
    if (realInvoiceUrl) return realInvoiceUrl;
    if (!order) return "";
    return `https://takechanceveve.mayar.link/${order.nomor.toLowerCase()}`;
  };

  const handleCopyLink = () => {
    if (!orderToMayar) return;
    const link = getMayarLink(orderToMayar);
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success("Tautan pembayaran Mayar berhasil disalin ke clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendWhatsAppBill = () => {
    if (!orderToMayar) return;
    const toko = orderToMayar.pelanggan?.nama_toko || "Pelanggan";
    const phone = orderToMayar.pelanggan?.telepon || "";
    const cleanPhone = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    const link = getMayarLink(orderToMayar);
    const jatuhTempo = orderToMayar.jatuh_tempo ? formatDate(orderToMayar.jatuh_tempo) : "-";

    const msg = `Halo ${toko}, berikut rincian tagihan pesanan Anda dari CV Sinar Abadi Niaga:%0A%0A` +
      `📄 *No. Faktur:* ${orderToMayar.nomor}%0A` +
      `💰 *Total Tagihan:* ${formatRupiah(orderToMayar.total)}%0A` +
      `📅 *Jatuh Tempo:* ${jatuhTempo}%0A%0A` +
      `Silakan lakukan pembayaran instan via QRIS / Virtual Account Mayar pada tautan resmi berikut:%0A${link}%0A%0A` +
      `Terima kasih atas kerja samanya!`;

    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${msg}`
      : `https://wa.me/?text=${msg}`;

    window.open(waUrl, "_blank");
  };

  // Simulasi Pelunasan Instan via Mayar Webhook (payment.received)
  const handleSimulateMayarPayment = async () => {
    if (!orderToMayar) return;

    setIsSimulatingMayar(true);
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("pesanan_jual")
        .update({
          status: "lunas",
          dilunasi_pada: nowIso,
        })
        .eq("id", orderToMayar.id);

      if (error) {
        toast.error(error.message);
        setIsSimulatingMayar(false);
        return;
      }

      // Catat ke Audit Log sistem (BR-12)
      await supabase.from("audit_log").insert({
        pelaku_id: currentUserId,
        aksi: "pelunasan_mayar_sandbox",
        nama_tabel: "pesanan_jual",
        data_id: orderToMayar.id,
        nilai_lama: { status: "dikirim" },
        nilai_baru: {
          status: "lunas",
          metode: "mayar_qris_sandbox",
          dilunasi_pada: nowIso,
        },
      });

      toast.success(
        `[Mayar Sandbox Webhook] Pembayaran ${formatRupiah(orderToMayar.total)} diterima! Faktur ${orderToMayar.nomor} otomatis Lunas.`
      );

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderToMayar.id
            ? { ...o, status: "lunas" as const, dilunasi_pada: nowIso }
            : o
        )
      );

      setIsMayarOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses pelunasan.");
    } finally {
      setIsSimulatingMayar(false);
    }
  };

  const handlePrintSuratJalan = (order: PesananItem) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Gagal membuka jendela cetak. Pastikan pop-up diizinkan.");
      return;
    }

    const tanggalFormatted = order.dikirim_pada
      ? formatDate(order.dikirim_pada)
      : formatDate(order.dibuat_pada);

    const itemsHtml = (order.items || [])
      .map(
        (item, idx) => `
      <tr>
        <td style="text-align: center; padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${idx + 1}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold; color: #1e293b;">${item.barang?.kode || "-"}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: 600; color: #0f172a;">${item.barang?.nama || "-"}</td>
        <td style="text-align: center; padding: 8px; border: 1px solid #cbd5e1; font-weight: 800; font-size: 13px; color: #0f172a;">${item.jumlah}</td>
        <td style="text-align: center; padding: 8px; border: 1px solid #cbd5e1; color: #475569;">${item.barang?.satuan || "PCS"}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; color: #64748b; font-size: 11px; text-align: center;">[ &nbsp; ] Sesuai &amp; Baik</td>
      </tr>
    `
      )
      .join("");

    const printHtml = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>Surat Jalan - ${order.nomor}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 15mm 15mm 15mm;
            }
            * {
              box-sizing: border-box;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            body {
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 10px;
              font-size: 12px;
              line-height: 1.4;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 15px;
            }
            .company-title {
              font-size: 18px;
              font-weight: 900;
              color: #1e3a8a;
              letter-spacing: 0.5px;
            }
            .company-sub {
              font-size: 11px;
              color: #475569;
              margin-top: 2px;
            }
            .doc-badge {
              text-align: right;
            }
            .doc-title {
              font-size: 16px;
              font-weight: 900;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .doc-no {
              font-size: 12px;
              font-weight: bold;
              color: #2563eb;
              margin-top: 2px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 18px;
              padding: 10px 14px;
              background: #f8fafc;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
            }
            .info-block p {
              margin: 3px 0;
              font-size: 11.5px;
            }
            .info-label {
              display: inline-block;
              width: 110px;
              color: #64748b;
              font-weight: 600;
            }
            .info-val {
              font-weight: 700;
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              margin-bottom: 18px;
            }
            th {
              background-color: #f1f5f9;
              color: #0f172a;
              font-weight: 800;
              font-size: 11px;
              text-transform: uppercase;
              padding: 8px;
              border: 1px solid #cbd5e1;
            }
            .notice-box {
              background-color: #fffbeb;
              border: 1px dashed #f59e0b;
              padding: 10px 14px;
              border-radius: 6px;
              font-size: 11px;
              color: #92400e;
              margin-bottom: 25px;
            }
            .notice-box ul {
              margin: 4px 0 0 18px;
              padding: 0;
            }
            .signatures {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
              margin-top: 30px;
              text-align: center;
            }
            .sign-col {
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 10px 8px;
              background: #ffffff;
            }
            .sign-title {
              font-size: 11px;
              font-weight: 800;
              color: #334155;
              text-transform: uppercase;
              margin-bottom: 60px;
            }
            .sign-line {
              font-weight: 800;
              color: #0f172a;
              border-top: 1px solid #0f172a;
              padding-top: 4px;
              display: inline-block;
              width: 80%;
            }
            .sign-sub {
              font-size: 10px;
              color: #64748b;
              margin-top: 2px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company-title">CV. SINAR ABADI NIAGA</div>
              <div class="company-sub">Distributor Utama Perlengkapan Bahan Bangunan & Alat Teknik</div>
              <div class="company-sub">Jl. Industri Raya No. 45, Manado, Sulawesi Utara | Telp: (0431) 889211</div>
            </div>
            <div class="doc-badge">
              <div class="doc-title">Surat Jalan</div>
              <div class="doc-no">SJ-${order.nomor}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Ref SO: ${order.nomor}</div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-block">
              <p><span class="info-label">Kepada Toko:</span> <span class="info-val">${order.pelanggan?.nama_toko || "-"}</span></p>
              <p><span class="info-label">Alamat Kirim:</span> <span class="info-val">${order.pelanggan?.alamat || "-"}</span></p>
              <p><span class="info-label">Telepon Toko:</span> <span class="info-val">${order.pelanggan?.telepon || "-"}</span></p>
            </div>
            <div class="info-block">
              <p><span class="info-label">Tanggal Kirim:</span> <span class="info-val">${tanggalFormatted}</span></p>
              <p><span class="info-label">Sales Pembuat:</span> <span class="info-val">${order.pembuat?.nama_lengkap || "-"}</span></p>
              <p><span class="info-label">Status Dokumen:</span> <span class="info-val" style="text-transform: capitalize;">${order.status}</span></p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">No</th>
                <th style="width: 120px;">Kode Barang</th>
                <th>Deskripsi / Nama Barang</th>
                <th style="width: 80px; text-align: center;">Jumlah</th>
                <th style="width: 70px; text-align: center;">Satuan</th>
                <th style="width: 120px; text-align: center;">Verifikasi Fisik</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="notice-box">
            <strong>Perhatian Serah Terima Barang:</strong>
            <ul>
              <li>Barang diterima dalam jumlah fisik utuh, segel baik, dan tidak ada cacat tampak.</li>
              <li>Klaim kekurangan atau kerusakan wajib dicatat pada kolom catatan lembar ini sebelum ditandatangani.</li>
              <li>Surat jalan rangkap 3: Lembar 1 (Toko), Lembar 2 (Finance/Gudang), Lembar 3 (Sopir/Arsip).</li>
            </ul>
          </div>

          <div class="signatures">
            <div class="sign-col">
              <div class="sign-title">Diserahkan Oleh (Gudang)</div>
              <div class="sign-line">( ................................ )</div>
              <div class="sign-sub">Tgl: &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;</div>
            </div>
            <div class="sign-col">
              <div class="sign-title">Dibawa Oleh (Pengemudi/Sopir)</div>
              <div class="sign-line">( ................................ )</div>
              <div class="sign-sub">No Pol: &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;</div>
            </div>
            <div class="sign-col">
              <div class="sign-title">Diterima Oleh (Toko / Cap)</div>
              <div class="sign-line">${order.pelanggan?.nama_toko ? `( ${order.pelanggan.nama_toko} )` : "( ................................ )"}</div>
              <div class="sign-sub">Tanda Tangan & Cap Toko</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.nomor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.pelanggan?.nama_toko || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.pembuat?.nama_lengkap || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === "semua" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Statistik Ringkasan
  const countDraf = orders.filter((o) => o.status === "draf").length;
  const countDikonfirmasi = orders.filter((o) => o.status === "dikonfirmasi").length;
  const countDikirim = orders.filter((o) => o.status === "dikirim").length;
  const countLunas = orders.filter((o) => o.status === "lunas").length;

  const openDetailModal = (order: PesananItem) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const getStatusBadge = (status: PesananItem["status"]) => {
    switch (status) {
      case "draf":
        return (
          <Badge variant="outline" className="text-slate-800 bg-slate-100 border-slate-300 font-bold text-[11px]">
            <Clock className="w-3 h-3 mr-1" /> Draf
          </Badge>
        );
      case "dikonfirmasi":
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px]">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Dikonfirmasi
          </Badge>
        );
      case "dikirim":
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px]">
            <Truck className="w-3 h-3 mr-1" /> Dikirim
          </Badge>
        );
      case "lunas":
        return (
          <Badge variant="success" className="font-bold text-[11px]">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Lunas
          </Badge>
        );
      case "dibatalkan":
        return (
          <Badge variant="destructive" className="font-bold text-[11px]">
            <Ban className="w-3 h-3 mr-1" /> Dibatalkan
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Pesanan Jual (Sales Order)
            </h1>
            <span className="text-xs bg-blue-100 text-blue-900 font-bold px-2.5 py-0.5 rounded-full">
              {filteredOrders.length} Pesanan
            </span>
          </div>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Pengelolaan alur penjualan barang, validasi plafon kredit, pengiriman gudang, dan pelunasan faktur.
          </p>
        </div>

        {canCreate && (
          <Link href="/pesanan-jual/baru">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm flex items-center gap-2">
              <Plus className="h-4 w-4" /> Buat Pesanan Baru
            </Button>
          </Link>
        )}
      </div>

      {/* Kartu Ringkasan Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter("draf")}
          className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
            statusFilter === "draf"
              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${statusFilter === "draf" ? "text-slate-300" : "text-slate-500"}`}>
              Draf (Belum Kunci Stok)
            </span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <p className={`text-xl font-black mt-1 ${statusFilter === "draf" ? "text-white" : "text-slate-900"}`}>
            {countDraf}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter("dikonfirmasi")}
          className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
            statusFilter === "dikonfirmasi"
              ? "bg-amber-500 text-white border-amber-500 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${statusFilter === "dikonfirmasi" ? "text-amber-100" : "text-amber-700"}`}>
              Siap Kirim Gudang
            </span>
            <CheckCircle2 className="w-4 h-4 text-amber-500" />
          </div>
          <p className={`text-xl font-black mt-1 ${statusFilter === "dikonfirmasi" ? "text-white" : "text-amber-600"}`}>
            {countDikonfirmasi}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter("dikirim")}
          className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
            statusFilter === "dikirim"
              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${statusFilter === "dikirim" ? "text-blue-100" : "text-blue-700"}`}>
              Dikirim (Piutang)
            </span>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <p className={`text-xl font-black mt-1 ${statusFilter === "dikirim" ? "text-white" : "text-blue-600"}`}>
            {countDikirim}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter("lunas")}
          className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
            statusFilter === "lunas"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${statusFilter === "lunas" ? "text-emerald-100" : "text-emerald-700"}`}>
              Lunas Terbayar
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className={`text-xl font-black mt-1 ${statusFilter === "lunas" ? "text-white" : "text-emerald-600"}`}>
            {countLunas}
          </p>
        </div>
      </div>

      {/* Filter & Pencarian Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Cari nomor pesanan, nama toko pelanggan, atau sales pembuat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter status pesanan"
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          >
            <option value="semua">Semua Status ({orders.length})</option>
            <option value="draf">Draf ({countDraf})</option>
            <option value="dikonfirmasi">Dikonfirmasi ({countDikonfirmasi})</option>
            <option value="dikirim">Dikirim ({countDikirim})</option>
            <option value="lunas">Lunas ({countLunas})</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>
        </div>
      </div>

      {/* Tabel Data Pesanan Jual */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-bold text-slate-900 text-xs">Nomor Pesanan</TableHead>
              <TableHead className="font-bold text-slate-900 text-xs">Tanggal Pesan</TableHead>
              <TableHead className="font-bold text-slate-900 text-xs">Toko Pelanggan</TableHead>
              <TableHead className="font-bold text-slate-900 text-xs">Sales</TableHead>
              <TableHead className="font-bold text-slate-900 text-xs text-center">Items</TableHead>
              <TableHead className="font-bold text-slate-900 text-xs text-right">Total Nilai</TableHead>
              <TableHead className="font-bold text-slate-900 text-xs text-center">Status</TableHead>
              <TableHead className="font-bold text-slate-900 text-xs">Jatuh Tempo</TableHead>
              <TableHead className="font-bold text-slate-900 text-xs text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-slate-500 font-medium">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <ShoppingCart className="h-6 w-6 text-slate-400" />
                    <span>Tidak ada data pesanan jual yang cocok dengan pencarian.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => {
                const itemCount = order.items?.length || 0;
                return (
                  <TableRow key={order.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-black text-blue-900 text-xs">
                      {order.nomor}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-700">
                      {formatDate(order.dibuat_pada)}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-xs text-slate-900">
                        {order.pelanggan?.nama_toko || "-"}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Termin: {order.pelanggan?.termin_hari ?? 0} hari
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-700">
                      {order.pembuat?.nama_lengkap || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800">
                        {itemCount} baris
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-black text-xs text-slate-900">
                      {formatRupiah(order.total)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-700">
                      {order.jatuh_tempo ? (
                        formatDate(order.jatuh_tempo)
                      ) : (
                        <span className="text-slate-400 font-normal italic">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* AKSI 1: Konfirmasi Pesanan (Draf -> Dikonfirmasi) */}
                        {order.status === "draf" && canCreate && (
                          <Button
                            size="sm"
                            onClick={() => openConfirmModal(order)}
                            className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Konfirmasi
                          </Button>
                        )}

                        {/* AKSI 2: Kirim Pesanan oleh Gudang / Manajer (Dikonfirmasi -> Dikirim: BR-07) */}
                        {order.status === "dikonfirmasi" && (userRole === "gudang" || isManajer) && (
                          <Button
                            size="sm"
                            onClick={() => openShipModal(order)}
                            className="h-8 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1 shadow-xs"
                          >
                            <Truck className="h-3.5 w-3.5" /> Kirim
                          </Button>
                        )}

                        {/* AKSI 3: Pelunasan oleh Manajer (Dikirim -> Lunas: BR-07) */}
                        {order.status === "dikirim" && isManajer && (
                          <Button
                            size="sm"
                            onClick={() => openSettleModal(order)}
                            className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Pelunasan
                          </Button>
                        )}

                        {/* Fitur Nilai Tambah #3: Tautan Bayar Mayar & QRIS (Bab 11 PRD) */}
                        {order.status === "dikirim" && (
                          <Button
                            size="sm"
                            onClick={() => openMayarModal(order)}
                            className="h-8 px-2.5 text-xs bg-violet-600 hover:bg-violet-700 text-white font-bold flex items-center gap-1 shadow-xs"
                            title="Buka Tagihan & QRIS Mayar"
                          >
                            <QrCode className="h-3.5 w-3.5" /> Mayar
                          </Button>
                        )}

                        {/* AKSI 4: Batalkan Pesanan (Draf oleh sales/manajer, atau Dikonfirmasi oleh Manajer: BR-08) */}
                        {((order.status === "draf" && (order.dibuat_oleh === currentUserId || isManajer)) ||
                          (order.status === "dikonfirmasi" && isManajer)) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openCancelModal(order)}
                            className="h-8 px-2 text-xs text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50 font-bold flex items-center gap-0.5"
                          >
                            <Ban className="h-3.5 w-3.5 mr-0.5" /> Batal
                          </Button>
                        )}

                        {/* Fitur Nilai Tambah #2: Cetak Surat Jalan Pengemudi (Delivery Order tanpa harga - BR-12) */}
                        {["dikonfirmasi", "dikirim", "lunas"].includes(order.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintSuratJalan(order)}
                            title="Cetak Surat Jalan Pengemudi (Delivery Order)"
                            className="h-8 px-2 text-xs text-blue-700 border-blue-300 hover:bg-blue-50 font-bold flex items-center gap-1 shadow-xs"
                          >
                            <Printer className="h-3.5 w-3.5" /> Surat Jalan
                          </Button>
                        )}

                        {/* Tombol Detail Selalu Ada */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetailModal(order)}
                          className="h-8 px-2.5 text-xs text-slate-800 hover:text-blue-700 border-slate-300 font-bold flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> Detail
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Detail Items Pesanan */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-4">
              <span>Detail Pesanan: {selectedOrder?.nomor}</span>
              {selectedOrder && getStatusBadge(selectedOrder.status)}
            </DialogTitle>
            <DialogDescription>
              Toko Pelanggan: <strong>{selectedOrder?.pelanggan?.nama_toko}</strong> | Dibuat oleh: {selectedOrder?.pembuat?.nama_lengkap}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500">Tanggal Pesan:</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {selectedOrder ? formatDate(selectedOrder.dibuat_pada) : "-"}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Tanggal Kirim:</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {selectedOrder?.dikirim_pada ? formatDate(selectedOrder.dikirim_pada) : "Belum dikirim"}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Jatuh Tempo:</span>
                <p className="font-bold text-blue-700 mt-0.5">
                  {selectedOrder?.jatuh_tempo ? formatDate(selectedOrder.jatuh_tempo) : "-"}
                </p>
              </div>
            </div>

            {selectedOrder?.alasan_batal && (
              <div className="bg-red-50 p-3 rounded-xl border border-red-200 text-xs text-red-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Alasan Pembatalan:</span>
                  <p className="mt-0.5">{selectedOrder.alasan_batal}</p>
                </div>
              </div>
            )}

            {/* Tabel Baris Barang */}
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-900">Barang</TableHead>
                    <TableHead className="text-xs font-bold text-slate-900 text-center">Jumlah</TableHead>
                    <TableHead className="text-xs font-bold text-slate-900 text-right">Harga Satuan</TableHead>
                    <TableHead className="text-xs font-bold text-slate-900 text-center">Diskon</TableHead>
                    <TableHead className="text-xs font-bold text-slate-900 text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOrder?.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs">
                        <div className="font-bold text-slate-900">{item.barang?.nama}</div>
                        <div className="text-[11px] text-slate-500">{item.barang?.kode}</div>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-center text-slate-900">
                        {item.jumlah} {item.barang?.satuan}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium text-slate-800">
                        {formatRupiah(item.harga_satuan)}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-center text-amber-700">
                        {item.diskon_persen > 0 ? `${item.diskon_persen}%` : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-black text-slate-900">
                        {formatRupiah(item.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Total Nilai */}
            <div className="flex justify-end p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-right">
                <span className="text-xs font-medium text-slate-500">Total Nilai Pesanan:</span>
                <p className="text-lg font-black text-blue-900">
                  {selectedOrder ? formatRupiah(selectedOrder.total) : "Rp0"}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <div className="flex items-center gap-2">
              {selectedOrder && ["dikonfirmasi", "dikirim", "lunas"].includes(selectedOrder.status) && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handlePrintSuratJalan(selectedOrder)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4" /> Cetak Surat Jalan
                </Button>
              )}

              {selectedOrder && selectedOrder.status === "dikirim" && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setIsDetailOpen(false);
                    openMayarModal(selectedOrder);
                  }}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <QrCode className="w-4 h-4" /> Bayar Mayar (QRIS)
                </Button>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDetailOpen(false)}
              className="border-slate-300 text-slate-800 font-bold hover:bg-slate-100"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL KONFIRMASI PESANAN JUAL (LANGKAH 6.2: BR-04, BR-05, BR-06)          */}
      {/* ========================================================================= */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Konfirmasi Pesanan Jual ({orderToConfirm?.nomor})
            </DialogTitle>
            <DialogDescription>
              Pesanan draf akan diubah menjadi status terkonfirmasi dan alokasi stok fisik barang akan langsung dikunci di gudang.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Toko Pelanggan:</span>
                <span className="font-bold text-slate-900">{orderToConfirm?.pelanggan?.nama_toko}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Batas Plafon Kredit:</span>
                <span className="font-bold text-slate-900">{formatRupiah(orderToConfirm?.pelanggan?.batas_kredit || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jumlah Baris Item:</span>
                <span className="font-bold text-slate-900">{orderToConfirm?.items?.length || 0} barang</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-700 font-bold">Total Nilai Pesanan:</span>
                <span className="font-black text-blue-900 text-sm">
                  {orderToConfirm ? formatRupiah(orderToConfirm.total) : "Rp0"}
                </span>
              </div>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 space-y-1 text-[11px]">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <ShieldAlert className="w-4 h-4 text-amber-600" /> Verifikasi Otomatis Sistem:
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-amber-900">
                <li>Memeriksa status riwayat tagihan jatuh tempo pelanggan.</li>
                <li>Memeriksa ketersediaan sisa plafon batas kredit pelanggan.</li>
                <li>Memeriksa ketersediaan stok fisik barang di gudang secara real-time.</li>
                {!isManajer && (
                  <li>Harga di bawah batas minimum pokok barang memerlukan wewenang Manajer.</li>
                )}
              </ul>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isConfirming}
              onClick={() => setIsConfirmOpen(false)}
              className="border-slate-300 text-slate-800 font-bold hover:bg-slate-100"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isConfirming}
              onClick={handleConfirmOrder}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
            >
              {isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Ya, Konfirmasi Pesanan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: PENGIRIMAN PESANAN OLEH GUDANG (LANGKAH 6.3: BR-07)              */}
      {/* ========================================================================= */}
      <Dialog open={isShipOpen} onOpenChange={setIsShipOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Truck className="w-5 h-5 text-blue-600" />
              Catat Pengiriman Barang ({orderToShip?.nomor})
            </DialogTitle>
            <DialogDescription>
              Staf Gudang mencatat barang telah diberangkatkan ke toko pelanggan. Tanggal jatuh tempo akan otomatis dihitung sesuai termin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Toko Pelanggan:</span>
                <span className="font-bold text-slate-900">{orderToShip?.pelanggan?.nama_toko}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Termin Pembayaran:</span>
                <span className="font-bold text-blue-800">
                  {orderToShip?.pelanggan?.termin_hari === 0
                    ? "0 Hari (Tunai / COD)"
                    : `${orderToShip?.pelanggan?.termin_hari} Hari`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Tagihan:</span>
                <span className="font-black text-slate-900">
                  {orderToShip ? formatRupiah(orderToShip.total) : "Rp0"}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-blue-900 text-[11px] space-y-1">
              <div className="font-bold">Kalkulasi Otomatis Jatuh Tempo:</div>
              <p>
                Tanggal kirim hari ini + termin bayar ({orderToShip?.pelanggan?.termin_hari || 0} hari). Piutang toko ini akan tercatat aktif dalam sistem.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isShipping}
              onClick={() => setIsShipOpen(false)}
              className="border-slate-300 text-slate-800 font-bold hover:bg-slate-100"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isShipping}
              onClick={handleShipOrder}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
            >
              {isShipping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Mengirim...
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4" /> Konfirmasi Pengiriman
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: PELUNASAN PESANAN OLEH MANAJER                                   */}
      {/* ========================================================================= */}
      <Dialog open={isSettleOpen} onOpenChange={setIsSettleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Catat Pelunasan Pembayaran ({orderToSettle?.nomor})
            </DialogTitle>
            <DialogDescription>
              Wewenang Manajer untuk memverifikasi dan mencatat penerimaan pembayaran faktur dari pelanggan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Toko Pelanggan:</span>
                <span className="font-bold text-slate-900">{orderToSettle?.pelanggan?.nama_toko}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status Saat Ini:</span>
                <span className="font-bold text-blue-700 uppercase tracking-wider text-[11px]">
                  {orderToSettle?.status}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-700 font-bold">Total Nilai yang Dilunasi:</span>
                <span className="font-black text-emerald-700 text-sm">
                  {orderToSettle ? formatRupiah(orderToSettle.total) : "Rp0"}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
              Setelah dicatat lunas, piutang pelanggan untuk transaksi ini akan terhapus dan batas plafon kredit toko akan pulih otomatis.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSettling}
              onClick={() => setIsSettleOpen(false)}
              className="border-slate-300 text-slate-800 font-bold hover:bg-slate-100"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSettling}
              onClick={handleSettleOrder}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
            >
              {isSettling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Ya, Catat Lunas
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: PEMBATALAN PESANAN                                               */}
      {/* ========================================================================= */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="w-5 h-5" />
              Batalkan Pesanan ({orderToCancel?.nomor})
            </DialogTitle>
            <DialogDescription>
              {orderToCancel?.status === "dikonfirmasi"
                ? "Pesanan terkonfirmasi yang dibatalkan akan otomatis mengembalikan alokasi stok barang ke gudang."
                : "Draf pesanan akan dibatalkan."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCancelOrder();
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Toko Pelanggan:</span>
                <span className="font-bold text-slate-900">{orderToCancel?.pelanggan?.nama_toko}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Nilai:</span>
                <span className="font-black text-slate-900">
                  {orderToCancel ? formatRupiah(orderToCancel.total) : "Rp0"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900">
                Alasan Pembatalan (Wajib minimal 10 karakter) *
              </label>
              <textarea
                required
                minLength={10}
                rows={3}
                placeholder="Contoh: Toko membatalkan pesanan karena kendala tempat penyimpanan."
                value={alasanBatal}
                onChange={(e) => setAlasanBatal(e.target.value)}
                className="w-full text-xs font-medium text-slate-900 rounded-md border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-red-600 placeholder:text-slate-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Panjang: {alasanBatal.trim().length} / min. 10 karakter</span>
                {alasanBatal.trim().length < 10 && (
                  <span className="text-red-600 font-semibold">Kurang {10 - alasanBatal.trim().length} karakter lagi</span>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isCancelling}
                onClick={() => setIsCancelOpen(false)}
                className="border-slate-300 text-slate-800 font-bold hover:bg-slate-100"
              >
                Kembali
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCancelling || alasanBatal.trim().length < 10}
                className="bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Membatalkan...
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" /> Konfirmasi Pembatalan
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 5: TAUTAN BAYAR & QRIS MAYAR SANDBOX (Bab 11 PRD)                   */}
      {/* ========================================================================= */}
      <Dialog open={isMayarOpen} onOpenChange={setIsMayarOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-5">
          <DialogHeader className="pb-1">
            <DialogTitle className="flex items-center gap-2 text-slate-900 text-base">
              <div className="h-7 w-7 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700 font-black text-xs">
                M
              </div>
              Tagihan Digital Mayar ({orderToMayar?.nomor})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tautan pembayaran instan & QRIS Dinamis Mayar Sandbox untuk toko pelanggan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {/* Kartu Ringkasan Tagihan */}
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50/50 p-3 rounded-xl border border-violet-100 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Pelanggan:</span>
                <span className="font-bold text-slate-900">{orderToMayar?.pelanggan?.nama_toko}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Jatuh Tempo:</span>
                <span className="font-semibold text-slate-800">
                  {orderToMayar?.jatuh_tempo ? formatDate(orderToMayar.jatuh_tempo) : "-"}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-violet-200/60 pt-1.5">
                <span className="text-violet-900 font-bold">Total Pembayaran:</span>
                <span className="font-black text-violet-700 text-sm">
                  {orderToMayar ? formatRupiah(orderToMayar.total) : "Rp0"}
                </span>
              </div>
            </div>

            {/* Mock QRIS Mayar (Compact Size) */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center shadow-xs">
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg mb-1.5 flex items-center justify-center">
                <svg
                  className="w-24 h-24 text-slate-900"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="5" height="5" x="3" y="3" rx="1" />
                  <rect width="5" height="5" x="16" y="3" rx="1" />
                  <rect width="5" height="5" x="3" y="16" rx="1" />
                  <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                  <path d="M21 21v.01" />
                  <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                  <path d="M3 12h.01" />
                  <path d="M12 3h.01" />
                  <path d="M12 16v.01" />
                  <path d="M16 12h1" />
                  <path d="M21 12v.01" />
                  <path d="M12 21v-1" />
                </svg>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 border border-violet-200">
                <QrCode className="w-2.5 h-2.5" /> QRIS Mayar Dinamis
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Scan via BCA, Mandiri, GoPay, OVO, atau ShopeePay
              </p>
            </div>

            {/* Input Link Mayar & Action Buttons */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-900">Tautan Pembayaran Resmi Mayar:</label>
                {isGeneratingInvoice && (
                  <span className="text-[10px] text-violet-600 flex items-center gap-1 font-semibold animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" /> Menghubungkan ke server Mayar...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={getMayarLink(orderToMayar)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600 font-mono select-all focus:outline-none"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="h-7 px-2 text-xs flex items-center gap-1 font-bold border-slate-200 text-slate-700"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copiedLink ? "Tersalin" : "Salin"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => window.open(getMayarLink(orderToMayar), "_blank")}
                  className="h-7 px-2 text-xs flex items-center gap-1 font-bold bg-violet-600 hover:bg-violet-700 text-white"
                  title="Buka Halaman Bayar Mayar"
                >
                  <ExternalLink className="w-3 h-3" /> Buka
                </Button>
              </div>
            </div>

            {/* Tombol Kirim Tagihan via WhatsApp */}
            <Button
              type="button"
              onClick={handleSendWhatsAppBill}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 flex items-center justify-center gap-1.5 shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Kirim Tagihan & Link ke WhatsApp Toko
            </Button>

            {/* Simulasi Webhook Sandbox (BR-11 / Bab 11 PRD) */}
            <div className="pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                disabled={isSimulatingMayar}
                onClick={handleSimulateMayarPayment}
                className="w-full border-dashed border-violet-300 bg-violet-50/70 hover:bg-violet-100 text-violet-800 font-bold text-xs h-8 flex items-center justify-center gap-1.5"
              >
                {isSimulatingMayar ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memproses Webhook Mayar...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-3.5 h-3.5 text-violet-600" />
                    Simulasikan Pembayaran Sukses (Webhook Sandbox)
                  </>
                )}
              </Button>
              <p className="text-[10px] text-slate-400 text-center mt-1">
                *Mensimulasikan respons <code>payment.received</code> dari server Mayar Sandbox langsung melunasi faktur.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMayarOpen(false)}
              className="h-8 border-slate-300 text-slate-800 font-bold hover:bg-slate-100"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
