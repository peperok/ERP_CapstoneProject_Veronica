"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  PackageCheck,
  Ban,
  Loader2,
  Calendar,
  AlertTriangle,
  Building2,
  Package,
} from "lucide-react";
import { toast } from "sonner";

interface PurchaseItem {
  id: string;
  nomor: string;
  pemasok_id: string;
  barang_id: string;
  jumlah_dipesan: number;
  jumlah_diterima?: number | null;
  harga_beli_satuan?: number | null;
  status: "diajukan" | "disetujui" | "ditolak" | "diterima" | "dibatalkan";
  alasan_tolak?: string | null;
  alasan_batal?: string | null;
  diajukan_oleh: string;
  diajukan_pada: string;
  diputuskan_oleh?: string | null;
  diputuskan_pada?: string | null;
  diterima_oleh?: string | null;
  diterima_pada?: string | null;
  pemasok?: { id: string; kode: string; nama: string };
  barang?: { id: string; kode: string; nama: string; satuan: string; stok: number; stok_minimum: number };
  pemohon?: { nama_lengkap: string };
}

interface PembelianClientViewProps {
  initialPurchases: PurchaseItem[];
  barangList: Array<{ id: string; kode: string; nama: string; satuan: string; stok: number; stok_minimum: number }>;
  pemasokList: Array<{ id: string; kode: string; nama: string }>;
  userRole: "manajer" | "penjualan" | "gudang";
  currentUserId: string;
}

export function PembelianClientView({
  initialPurchases,
  barangList,
  pemasokList,
  userRole,
  currentUserId,
}: PembelianClientViewProps) {
  const router = useRouter();
  const supabase = createClient();

  const isManajer = userRole === "manajer";
  const isGudang = userRole === "gudang";

  const [purchases, setPurchases] = useState<PurchaseItem[]>(initialPurchases);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("semua");

  // State Modal Pengajuan PO Baru (Step 5.1)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    nomor: "",
    pemasok_id: "",
    barang_id: "",
    jumlah_dipesan: "",
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // State Modal Setujui PO (Step 5.2 - Khusus Manajer: Isi Harga Beli > 0)
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseItem | null>(null);
  const [hargaBeliInput, setHargaBeliInput] = useState("");
  const [submittingApprove, setSubmittingApprove] = useState(false);

  // State Modal Tolak PO (Step 5.2 - Khusus Manajer: Alasan min 10 karakter)
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [alasanTolak, setAlasanTolak] = useState("");
  const [submittingReject, setSubmittingReject] = useState(false);

  // State Modal Terima Barang PO (Step 5.3 - Penerimaan 1 s/d Dipesan, Update HPP & Stok)
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [jumlahDiterimaInput, setJumlahDiterimaInput] = useState("");
  const [submittingReceive, setSubmittingReceive] = useState(false);

  // State Modal Batal PO (Pengaju batal sebelum disetujui, atau Manajer batal PO disetujui)
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Filter Data PO
  const filteredPurchases = purchases.filter((po) => {
    const matchSearch =
      po.nomor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.barang?.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.pemasok?.nama.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === "semua" || po.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Auto-generate nomor PO berikutnya (misal PO-00019 -> PO-00020)
  const getNextPONumber = () => {
    const existingNumbers = purchases
      .map((po) => {
        const match = po.nomor.match(/PO-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));

    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNum = maxNum + 1;
    return `PO-${String(nextNum).padStart(5, "0")}`;
  };

  const openAddModal = () => {
    setAddForm({
      nomor: getNextPONumber(),
      pemasok_id: "",
      barang_id: "",
      jumlah_dipesan: "",
    });
    setIsAddOpen(true);
  };

  // ============================================================================
  // STEP 5.1: HANDLER PENGAJUAN PEMBELIAN (BR-09)
  // ============================================================================
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!addForm.pemasok_id) {
      toast.error("Silakan pilih pemasok terlebih dahulu.");
      return;
    }

    if (!addForm.barang_id) {
      toast.error("Silakan pilih barang yang dipesan terlebih dahulu.");
      return;
    }

    const qty = parseInt(addForm.jumlah_dipesan, 10);

    // Validasi BR-09: Jumlah 1 sampai 10.000
    if (isNaN(qty) || qty < 1 || qty > 10000) {
      toast.error("Jumlah dipesan harus bilangan bulat antara 1 sampai 10.000 (BR-09).");
      return;
    }

    setSubmittingAdd(true);
    try {
      const { data, error } = await supabase
        .from("pembelian")
        .insert({
          nomor: addForm.nomor.trim(),
          pemasok_id: addForm.pemasok_id,
          barang_id: addForm.barang_id,
          jumlah_dipesan: qty,
          status: "diajukan",
          diajukan_oleh: currentUserId,
        })
        .select(`
          id, nomor, pemasok_id, barang_id, jumlah_dipesan, jumlah_diterima,
          status, diajukan_oleh, diajukan_pada,
          pemasok:pemasok_id (id, kode, nama),
          barang:barang_id (id, kode, nama, satuan, stok, stok_minimum),
          pemohon:diajukan_oleh (nama_lengkap)
        `)
        .single();

      if (error) {
        toast.error(error.message);
        setSubmittingAdd(false);
        return;
      }

      toast.success(`Pengajuan pembelian ${addForm.nomor} berhasil dibuat!`);
      setPurchases((prev) => [data as any, ...prev]);
      setIsAddOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat pengajuan pembelian.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  // ============================================================================
  // STEP 5.2: HANDLER PERSETUJUAN OLEH MANAJER (BR-09)
  // ============================================================================
  const openApproveModal = (po: PurchaseItem) => {
    setSelectedPO(po);
    setHargaBeliInput("");
    setIsApproveOpen(true);
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO || !isManajer) return;

    const hargaBeli = Number(hargaBeliInput);

    // Validasi BR-09: Harga beli satuan harus lebih dari 0
    if (isNaN(hargaBeli) || hargaBeli <= 0) {
      toast.error("Manajer wajib mengisi harga beli satuan lebih dari Rp0 (BR-09).");
      return;
    }

    setSubmittingApprove(true);
    try {
      const { error } = await supabase
        .from("pembelian")
        .update({
          status: "disetujui",
          harga_beli_satuan: hargaBeli,
          diputuskan_oleh: currentUserId,
          diputuskan_pada: new Date().toISOString(),
        })
        .eq("id", selectedPO.id);

      if (error) {
        toast.error(error.message);
        setSubmittingApprove(false);
        return;
      }

      // Catat ke Audit Log sistem (BR-12)
      await supabase.from("audit_log").insert({
        pelaku_id: currentUserId,
        aksi: "setujui_pembelian",
        nama_tabel: "pembelian",
        data_id: selectedPO.id,
        nilai_lama: { status: "diajukan" },
        nilai_baru: { status: "disetujui", harga_beli_satuan: hargaBeli },
      });

      toast.success(`Pembelian ${selectedPO.nomor} berhasil disetujui!`);
      setPurchases((prev) =>
        prev.map((item) =>
          item.id === selectedPO.id
            ? {
                ...item,
                status: "disetujui",
                harga_beli_satuan: hargaBeli,
                diputuskan_pada: new Date().toISOString(),
              }
            : item
        )
      );
      setIsApproveOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyetujui pembelian.");
    } finally {
      setSubmittingApprove(false);
    }
  };

  // ============================================================================
  // STEP 5.2: HANDLER PENOLAKAN OLEH MANAJER (BR-09)
  // ============================================================================
  const openRejectModal = (po: PurchaseItem) => {
    setSelectedPO(po);
    setAlasanTolak("");
    setIsRejectOpen(true);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO || !isManajer) return;

    const alasan = alasanTolak.trim();

    // Validasi BR-09: Alasan tolak minimal 10 karakter
    if (alasan.length < 10) {
      toast.error("Alasan penolakan wajib diisi paling sedikit 10 karakter (BR-09).");
      return;
    }

    setSubmittingReject(true);
    try {
      const { error } = await supabase
        .from("pembelian")
        .update({
          status: "ditolak",
          alasan_tolak: alasan,
          diputuskan_oleh: currentUserId,
          diputuskan_pada: new Date().toISOString(),
        })
        .eq("id", selectedPO.id);

      if (error) {
        toast.error(error.message);
        setSubmittingReject(false);
        return;
      }

      // Catat ke Audit Log sistem (BR-12)
      await supabase.from("audit_log").insert({
        pelaku_id: currentUserId,
        aksi: "tolak_pembelian",
        nama_tabel: "pembelian",
        data_id: selectedPO.id,
        nilai_lama: { status: "diajukan" },
        nilai_baru: { status: "ditolak", alasan_tolak: alasan },
      });

      toast.success(`Pengajuan pembelian ${selectedPO.nomor} telah ditolak.`);
      setPurchases((prev) =>
        prev.map((item) =>
          item.id === selectedPO.id
            ? {
                ...item,
                status: "ditolak",
                alasan_tolak: alasan,
                diputuskan_pada: new Date().toISOString(),
              }
            : item
        )
      );
      setIsRejectOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menolak pembelian.");
    } finally {
      setSubmittingReject(false);
    }
  };

  // ============================================================================
  // STEP 5.3: HANDLER PENERIMAAN BARANG (BR-10 & STORED PROCEDURE ATOMIK)
  // ============================================================================
  const openReceiveModal = (po: PurchaseItem) => {
    setSelectedPO(po);
    setJumlahDiterimaInput("");
    setIsReceiveOpen(true);
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    const qtyDiterima = parseInt(jumlahDiterimaInput, 10);

    // Validasi BR-10: Jumlah diterima 1 sampai jumlah dipesan
    if (isNaN(qtyDiterima) || qtyDiterima < 1 || qtyDiterima > selectedPO.jumlah_dipesan) {
      toast.error(
        `Jumlah diterima harus antara 1 sampai ${selectedPO.jumlah_dipesan} unit (BR-10).`
      );
      return;
    }

    setSubmittingReceive(true);
    try {
      // Panggil Stored Procedure yang sudah kita buat di Tahap 2: terima_barang_pembelian
      const { data, error } = await supabase.rpc("terima_barang_pembelian", {
        p_pembelian_id: selectedPO.id,
        p_pelaku_id: currentUserId,
        p_jumlah_diterima: qtyDiterima,
      });

      if (error) {
        toast.error(error.message);
        setSubmittingReceive(false);
        return;
      }

      if (data && !data.success) {
        toast.error(data.message);
        setSubmittingReceive(false);
        return;
      }

      toast.success(
        `Barang berhasil diterima! Stok fisik bertambah +${qtyDiterima} dan HPP telah diperbarui (BR-10).`
      );

      setPurchases((prev) =>
        prev.map((item) =>
          item.id === selectedPO.id
            ? {
                ...item,
                status: "diterima",
                jumlah_diterima: qtyDiterima,
                diterima_pada: new Date().toISOString(),
              }
            : item
        )
      );
      setIsReceiveOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses penerimaan barang.");
    } finally {
      setSubmittingReceive(false);
    }
  };

  // ============================================================================
  // STEP 5.2: HANDLER PEMBATALAN PEMBELIAN
  // ============================================================================
  const openCancelModal = (po: PurchaseItem) => {
    setSelectedPO(po);
    setIsCancelOpen(true);
  };

  const handleCancelSubmit = async () => {
    if (!selectedPO) return;

    setSubmittingCancel(true);
    try {
      const { error } = await supabase
        .from("pembelian")
        .update({
          status: "dibatalkan",
          alasan_batal: "Dibatalkan oleh pengguna",
        })
        .eq("id", selectedPO.id);

      if (error) {
        toast.error(error.message);
        setSubmittingCancel(false);
        return;
      }

      toast.success(`Pembelian ${selectedPO.nomor} berhasil dibatalkan.`);
      setPurchases((prev) =>
        prev.map((item) =>
          item.id === selectedPO.id ? { ...item, status: "dibatalkan" } : item
        )
      );
      setIsCancelOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal membatalkan pembelian.");
    } finally {
      setSubmittingCancel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Daftar Pembelian (Purchase Order)
          </h2>
          <p className="text-sm text-slate-500">
            Kelola alur pengadaan barang ke pemasok, persetujuan harga beli oleh Manajer, dan pencatatan barang tiba di gudang.
          </p>
        </div>

        {/* Tombol Ajukan PO Baru (Staf Gudang & Manajer: BR-09) */}
        <Button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Ajukan Pembelian Baru
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari nomor PO, nama barang, atau pemasok..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Filter Status:</span>
          {["semua", "diajukan", "disetujui", "diterima", "ditolak", "dibatalkan"].map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(st)}
              className={`text-xs h-8 capitalize font-bold ${
                statusFilter === st
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100"
              }`}
            >
              {st}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabel Dokumen Pembelian */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Nomor PO</TableHead>
              <TableHead>Pemasok</TableHead>
              <TableHead>Barang & Jumlah</TableHead>
              {/* Kolom Harga Beli Satuan: RAHASIA KHUSUS MANAJER (BR-12) */}
              {isManajer && <TableHead className="text-right">Harga Beli (Satuan)</TableHead>}
              {isManajer && <TableHead className="text-right">Total Biaya</TableHead>}
              <TableHead className="text-center">Status Alur</TableHead>
              <TableHead>Pemohon</TableHead>
              <TableHead className="text-right">Aksi Alur Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPurchases.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isManajer ? 8 : 6}
                  className="h-32 text-center text-slate-500 text-sm"
                >
                  Tidak ada dokumen pembelian yang cocok dengan filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredPurchases.map((po) => {
                const totalBiaya =
                  po.harga_beli_satuan && po.jumlah_dipesan
                    ? po.harga_beli_satuan * po.jumlah_dipesan
                    : null;

                // Cek hak pembatalan PO diajukan (oleh pengajunya)
                const canCancelDiajukan =
                  po.status === "diajukan" && (po.diajukan_oleh === currentUserId || isManajer);

                // Cek hak pembatalan PO disetujui (khusus Manajer)
                const canCancelDisetujui = po.status === "disetujui" && isManajer;

                return (
                  <TableRow key={po.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-bold text-slate-900 text-xs">
                      {po.nomor}
                      <div className="text-[11px] text-slate-400 font-normal">
                        {formatDate(po.diajukan_pada)}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        {po.pemasok?.nama}
                      </div>
                      <div className="text-[11px] text-slate-400">{po.pemasok?.kode}</div>
                    </TableCell>

                    <TableCell>
                      <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        {po.barang?.nama}
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                        Pesan: <span className="font-bold text-slate-900">{po.jumlah_dipesan} {po.barang?.satuan}</span>
                        {po.status === "diterima" && po.jumlah_diterima !== null && (
                          <span className="text-emerald-700 ml-1 font-bold">
                            &bull; Diterima: {po.jumlah_diterima} {po.barang?.satuan}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Kolom Harga Beli: Khusus Manajer (BR-12) */}
                    {isManajer && (
                      <TableCell className="text-right text-xs font-mono font-bold text-slate-800 bg-slate-50/40">
                        {po.harga_beli_satuan ? formatRupiah(po.harga_beli_satuan) : "-"}
                      </TableCell>
                    )}
                    {isManajer && (
                      <TableCell className="text-right text-xs font-mono font-bold text-blue-900 bg-slate-50/40">
                        {totalBiaya ? formatRupiah(totalBiaya) : "-"}
                      </TableCell>
                    )}

                    <TableCell className="text-center">
                      {po.status === "diajukan" && (
                        <Badge variant="warning" className="text-[10px] font-bold uppercase">
                          Diajukan
                        </Badge>
                      )}
                      {po.status === "disetujui" && (
                        <Badge variant="default" className="text-[10px] font-bold uppercase bg-blue-600">
                          Disetujui
                        </Badge>
                      )}
                      {po.status === "diterima" && (
                        <Badge variant="success" className="text-[10px] font-bold uppercase bg-emerald-600">
                          Diterima
                        </Badge>
                      )}
                      {po.status === "ditolak" && (
                        <Badge variant="destructive" className="text-[10px] font-bold uppercase" title={po.alasan_tolak || ""}>
                          Ditolak
                        </Badge>
                      )}
                      {po.status === "dibatalkan" && (
                        <Badge variant="outline" className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                          Dibatalkan
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-slate-700">
                      {po.pemohon?.nama_lengkap || "-"}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* AKSI 1: Setujui PO (Khusus Manajer saat status 'diajukan': BR-09) */}
                        {po.status === "diajukan" && isManajer && (
                          <Button
                            size="sm"
                            onClick={() => openApproveModal(po)}
                            className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-sm"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Setujui
                          </Button>
                        )}

                        {/* AKSI 2: Tolak PO (Khusus Manajer saat status 'diajukan': BR-09) */}
                        {po.status === "diajukan" && isManajer && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openRejectModal(po)}
                            className="h-8 px-2 text-xs font-bold flex items-center gap-1"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Tolak
                          </Button>
                        )}

                        {/* AKSI 3: Terima Barang (Staf Gudang & Manajer saat status 'disetujui': BR-10) */}
                        {po.status === "disetujui" && (
                          <Button
                            size="sm"
                            onClick={() => openReceiveModal(po)}
                            className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-sm"
                          >
                            <PackageCheck className="h-3.5 w-3.5" /> Terima Barang
                          </Button>
                        )}

                        {/* AKSI 4: Batalkan PO */}
                        {(canCancelDiajukan || canCancelDisetujui) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openCancelModal(po)}
                            className="h-8 px-2 text-xs text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50 font-bold"
                          >
                            <Ban className="h-3.5 w-3.5 mr-0.5" /> Batal
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: FORM PENGAJUAN PEMBELIAN BARU (STEP 5.1: BR-09)                  */}
      {/* ========================================================================= */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajukan Pembelian Baru (PO ke Pemasok)</DialogTitle>
            <DialogDescription>
              Staf Gudang dan Manajer dapat mengajukan pembelian untuk satu barang ke satu pemasok (BR-09).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900">Nomor PO *</label>
                <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded border border-blue-200">
                  Otomatis
                </span>
              </div>
              <Input
                required
                value={addForm.nomor}
                onChange={(e) => setAddForm({ ...addForm, nomor: e.target.value })}
                className="font-bold text-blue-900 bg-slate-50 border-slate-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900">Pilih Pemasok *</label>
              <select
                required
                value={addForm.pemasok_id}
                onChange={(e) => setAddForm({ ...addForm, pemasok_id: e.target.value })}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="" disabled>-- Silakan Pilih Pemasok --</option>
                {pemasokList.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.kode} - {sup.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900">Pilih Barang yang Dipesan *</label>
              <select
                required
                value={addForm.barang_id}
                onChange={(e) => setAddForm({ ...addForm, barang_id: e.target.value })}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="" disabled>-- Silakan Pilih Barang --</option>
                {barangList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.kode} - {b.nama} (Sisa Stok: {b.stok} {b.satuan})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900">
                Jumlah Dipesan (1 sampai 10.000 unit) *
              </label>
              <Input
                type="number"
                required
                min="1"
                max="10000"
                placeholder="Contoh: 10"
                value={addForm.jumlah_dipesan}
                onChange={(e) => setAddForm({ ...addForm, jumlah_dipesan: e.target.value })}
                className="font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>

            <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              * Sesuai aturan <strong>BR-09</strong>: Harga beli belum diisi di form ini. Harga beli satuan akan diisi oleh <strong>Manajer</strong> saat menyetujui pengajuan.
            </p>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                className="border-slate-300 text-slate-800 font-bold hover:bg-slate-100"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                disabled={submittingAdd}
              >
                {submittingAdd ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirim Pengajuan PO"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: PERSETUJUAN PO OLEH MANAJER (STEP 5.2: BR-09)                    */}
      {/* ========================================================================= */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setujui Pembelian ({selectedPO?.nomor})</DialogTitle>
            <DialogDescription>
              Hanya Manajer yang berhak menyetujui pembelian sambil mengisi harga beli satuan lebih dari Rp0 (BR-09).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApproveSubmit} className="space-y-4 py-2">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div>
                <span className="text-slate-500">Pemasok:</span>{" "}
                <span className="font-bold text-slate-900">{selectedPO?.pemasok?.nama}</span>
              </div>
              <div>
                <span className="text-slate-500">Barang:</span>{" "}
                <span className="font-bold text-slate-900">{selectedPO?.barang?.nama}</span>
              </div>
              <div>
                <span className="text-slate-500">Jumlah Dipesan:</span>{" "}
                <span className="font-bold text-blue-700">
                  {selectedPO?.jumlah_dipesan} {selectedPO?.barang?.satuan}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900">
                Harga Beli Satuan dari Pemasok (Rp) *
              </label>
              <Input
                type="number"
                required
                min="1"
                placeholder="Contoh: 145000"
                value={hargaBeliInput}
                onChange={(e) => setHargaBeliInput(e.target.value)}
              />
              <p className="text-[11px] text-blue-700">
                Harga beli ini bersifat rahasia dan akan menjadi Harga Pokok (HPP) saat barang diterima gudang (BR-10).
              </p>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsApproveOpen(false)}
                className="border-slate-300 text-slate-800 font-bold hover:bg-slate-100"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                disabled={submittingApprove}
              >
                {submittingApprove ? <Loader2 className="h-4 w-4 animate-spin" /> : "Setujui Pembelian"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: PENOLAKAN PO OLEH MANAJER (STEP 5.2: BR-09)                      */}
      {/* ========================================================================= */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Pengajuan Pembelian ({selectedPO?.nomor})</DialogTitle>
            <DialogDescription>
              Penolakan wajib disertai alasan paling sedikit 10 karakter (BR-09).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRejectSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900">
                Alasan Penolakan (Minimal 10 karakter) *
              </label>
              <textarea
                required
                minLength={10}
                rows={3}
                placeholder="Contoh: Stok masih mencukupi untuk kebutuhan 2 minggu ke depan."
                value={alasanTolak}
                onChange={(e) => setAlasanTolak(e.target.value)}
                className="w-full text-xs font-medium text-slate-900 rounded-md border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
              <p className="text-[10px] text-slate-500">
                Karakter: {alasanTolak.length} / min. 10
              </p>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRejectOpen(false)}
                className="border-slate-300 text-slate-800 font-bold hover:bg-slate-100"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
                disabled={submittingReject}
              >
                {submittingReject ? <Loader2 className="h-4 w-4 animate-spin" /> : "Konfirmasi Penolakan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: PENERIMAAN BARANG PO DI GUDANG (STEP 5.3: BR-10)                 */}
      {/* ========================================================================= */}
      <Dialog open={isReceiveOpen} onOpenChange={setIsReceiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catat Penerimaan Barang ({selectedPO?.nomor})</DialogTitle>
            <DialogDescription>
              Penerimaan hanya satu kali. Stok gudang akan bertambah dan HPP barang akan otomatis diperbarui (BR-10).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReceiveSubmit} className="space-y-4 py-2">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div>
                <span className="text-slate-500">Barang:</span>{" "}
                <span className="font-bold text-slate-900">{selectedPO?.barang?.nama}</span>
              </div>
              <div>
                <span className="text-slate-500">Jumlah yang Dipesan:</span>{" "}
                <span className="font-bold text-slate-900">
                  {selectedPO?.jumlah_dipesan} {selectedPO?.barang?.satuan}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900">
                  Jumlah Barang Fisik yang Diterima *
                </label>
                {selectedPO && (
                  <button
                    type="button"
                    onClick={() => setJumlahDiterimaInput(String(selectedPO.jumlah_dipesan))}
                    className="text-[11px] text-blue-700 hover:text-blue-800 font-bold underline cursor-pointer"
                  >
                    Terima Semua ({selectedPO.jumlah_dipesan} unit)
                  </button>
                )}
              </div>
              <Input
                type="number"
                required
                min="1"
                max={selectedPO?.jumlah_dipesan}
                placeholder={`Contoh: ${selectedPO?.jumlah_dipesan || 10}`}
                value={jumlahDiterimaInput}
                onChange={(e) => setJumlahDiterimaInput(e.target.value)}
                className="font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
              />
              <p className="text-[11px] text-slate-500">
                * Jumlah diterima 1 sampai {selectedPO?.jumlah_dipesan} unit. Kekurangan dari pemasok tidak ditunggu. Penerimaan kedua untuk PO yang sama akan ditolak sistem (BR-10).
              </p>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsReceiveOpen(false)}
                className="border-slate-300 text-slate-800 font-bold hover:bg-slate-100"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                disabled={submittingReceive}
              >
                {submittingReceive ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Penerimaan Barang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 5: KONFIRMASI BATAL PO                                              */}
      {/* ========================================================================= */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan Dokumen Pembelian ({selectedPO?.nomor})</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin membatalkan dokumen pembelian ini? Status akhir akan menjadi dibatalkan.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCancelOpen(false)}
              className="border-slate-300 text-slate-800 font-bold hover:bg-slate-100"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={handleCancelSubmit}
              disabled={submittingCancel}
            >
              {submittingCancel ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Batalkan PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
