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
  AlertTriangle,
  History,
  Edit2,
  SlidersHorizontal,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface BarangItem {
  id: string;
  kode: string;
  nama: string;
  satuan: string;
  harga_jual: number;
  harga_pokok?: number;
  stok: number;
  stok_minimum: number;
  aktif: boolean;
  diperbarui_pada: string;
}

interface BarangClientViewProps {
  initialBarang: BarangItem[];
  userRole: "manajer" | "penjualan" | "gudang";
  currentUserId: string;
}

export function BarangClientView({
  initialBarang,
  userRole,
  currentUserId,
}: BarangClientViewProps) {
  const router = useRouter();
  const supabase = createClient();

  const isManajer = userRole === "manajer";
  const isGudang = userRole === "gudang";
  const canEditGeneral = isManajer || isGudang;

  const [searchTerm, setSearchTerm] = useState("");
  const [filterMenipis, setFilterMenipis] = useState(false);
  const [barangList, setBarangList] = useState<BarangItem[]>(initialBarang);

  // Dialog Tambah Barang (Khusus Manajer: BR-01)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    kode: "",
    nama: "",
    satuan: "",
    harga_jual: "",
    stok_minimum: "",
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Dialog Edit Barang
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedBarang, setSelectedBarang] = useState<BarangItem | null>(null);
  const [editForm, setEditForm] = useState({
    nama: "",
    satuan: "",
    harga_jual: "",
    stok_minimum: "",
    aktif: true,
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Dialog Penyesuaian Stok Opname (Gudang & Manajer: BR-11)
  const [isOpnameOpen, setIsOpnameOpen] = useState(false);
  const [opnameForm, setOpnameForm] = useState({
    stok_baru: "",
    alasan: "",
  });
  const [submittingOpname, setSubmittingOpname] = useState(false);

  // Filter Data
  const filteredBarang = barangList.filter((b) => {
    const matchSearch =
      b.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.kode.toLowerCase().includes(searchTerm.toLowerCase());
    const isMenipis = b.stok <= b.stok_minimum;
    if (filterMenipis) {
      return matchSearch && isMenipis;
    }
    return matchSearch;
  });

  // Fungsi pembantu generate kode barang berikutnya (misal: BRG-016 -> BRG-017)
  const getNextKodeBarang = () => {
    const existingNumbers = barangList
      .map((b) => {
        const match = b.kode.match(/BRG-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));

    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNum = maxNum + 1;
    return `BRG-${String(nextNum).padStart(3, "0")}`;
  };

  const openAddModal = () => {
    setAddForm({
      kode: getNextKodeBarang(),
      nama: "",
      satuan: "",
      harga_jual: "",
      stok_minimum: "",
    });
    setIsAddOpen(true);
  };

  // Handler: Tambah Barang Baru (BR-01)
  const handleAddBarang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManajer) {
      toast.error("Hanya Manajer yang berhak menambah barang baru (BR-01).");
      return;
    }

    const hargaJual = Number(addForm.harga_jual);
    const stokMin = Number(addForm.stok_minimum);

    if (hargaJual <= 0) {
      toast.error("Harga jual harus lebih dari Rp0 (BR-01).");
      return;
    }

    if (stokMin < 0) {
      toast.error("Stok minimum tidak boleh negatif.");
      return;
    }

    setSubmittingAdd(true);
    try {
      const { data, error } = await supabase
        .from("barang")
        .insert({
          kode: addForm.kode.trim().toUpperCase(),
          nama: addForm.nama.trim(),
          satuan: addForm.satuan.trim(),
          harga_jual: hargaJual,
          harga_pokok: 0, // HPP otomatis terisi nanti dari penerimaan PO (BR-10)
          stok: 0,
          stok_minimum: stokMin,
          aktif: true,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error(`Kode barang ${addForm.kode} sudah digunakan!`);
        } else {
          toast.error(error.message);
        }
        setSubmittingAdd(false);
        return;
      }

      toast.success("Barang baru berhasil ditambahkan!");
      setBarangList((prev) => [...prev, data]);
      setIsAddOpen(false);
      setAddForm({
        kode: "",
        nama: "",
        satuan: "dus",
        harga_jual: "",
        stok_minimum: "10",
      });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan barang.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Buka Dialog Edit
  const openEditModal = (b: BarangItem) => {
    setSelectedBarang(b);
    setEditForm({
      nama: b.nama,
      satuan: b.satuan,
      harga_jual: String(b.harga_jual),
      stok_minimum: String(b.stok_minimum),
      aktif: b.aktif,
    });
    setIsEditOpen(true);
  };

  // Handler: Edit Barang (BR-01, BR-12)
  const handleEditBarang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarang) return;

    const hargaJual = Number(editForm.harga_jual);
    const stokMin = Number(editForm.stok_minimum);

    if (isManajer && hargaJual <= 0) {
      toast.error("Harga jual harus lebih dari Rp0 (BR-01).");
      return;
    }

    setSubmittingEdit(true);
    try {
      const payload: any = {
        nama: editForm.nama.trim(),
        satuan: editForm.satuan.trim(),
        stok_minimum: stokMin,
        aktif: editForm.aktif,
        diperbarui_pada: new Date().toISOString(),
      };

      // Hanya Manajer yang boleh update harga jual (BR-01)
      if (isManajer) {
        payload.harga_jual = hargaJual;
      }

      const { data, error } = await supabase
        .from("barang")
        .update(payload)
        .eq("id", selectedBarang.id)
        .select()
        .single();

      if (error) {
        toast.error(error.message);
        setSubmittingEdit(false);
        return;
      }

      // Catat ke Audit Log jika Manajer mengubah harga jual (BR-12)
      if (isManajer && selectedBarang.harga_jual !== hargaJual) {
        await supabase.from("audit_log").insert({
          pelaku_id: currentUserId,
          aksi: "ubah_harga_jual",
          nama_tabel: "barang",
          data_id: selectedBarang.id,
          nilai_lama: { harga_jual: selectedBarang.harga_jual },
          nilai_baru: { harga_jual: hargaJual },
        });
      }

      toast.success("Data barang berhasil diperbarui!");
      setBarangList((prev) =>
        prev.map((item) => (item.id === selectedBarang.id ? { ...item, ...data } : item))
      );
      setIsEditOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui barang.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Buka Dialog Opname
  const openOpnameModal = (b: BarangItem) => {
    setSelectedBarang(b);
    setOpnameForm({
      stok_baru: String(b.stok),
      alasan: "",
    });
    setIsOpnameOpen(true);
  };

  // Handler: Penyesuaian Hitung Fisik Gudang (BR-11)
  const handleOpnameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarang) return;

    if (!isManajer && !isGudang) {
      toast.error("Hanya Staf Gudang atau Manajer yang berhak melakukan penyesuaian stok.");
      return;
    }

    const stokBaru = parseInt(opnameForm.stok_baru, 10);
    const alasan = opnameForm.alasan.trim();

    if (isNaN(stokBaru) || stokBaru < 0) {
      toast.error("Stok hasil penyesuaian tidak boleh negatif (BR-11).");
      return;
    }

    if (alasan.length < 10) {
      toast.error("Alasan penyesuaian fisik wajib minimal 10 karakter (BR-11).");
      return;
    }

    const selisih = stokBaru - selectedBarang.stok;
    if (selisih === 0) {
      toast.info("Angka stok sama dengan stok sistem, tidak ada perubahan.");
      setIsOpnameOpen(false);
      return;
    }

    setSubmittingOpname(true);
    try {
      // 1. Update stok di tabel barang
      const { error: updateError } = await supabase
        .from("barang")
        .update({
          stok: stokBaru,
          diperbarui_pada: new Date().toISOString(),
        })
        .eq("id", selectedBarang.id);

      if (updateError) {
        toast.error(updateError.message);
        setSubmittingOpname(false);
        return;
      }

      // 2. Catat ke kartu stok / mutasi_stok (BR-11)
      const nomorDokumen = `ADJ-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}`;
      await supabase.from("mutasi_stok").insert({
        barang_id: selectedBarang.id,
        jenis: "penyesuaian",
        jumlah: Math.abs(selisih),
        stok_sesudah: stokBaru,
        nomor_dokumen: nomorDokumen,
        alasan: alasan,
        dibuat_oleh: currentUserId,
      });

      // 3. Catat audit log (BR-12)
      await supabase.from("audit_log").insert({
        pelaku_id: currentUserId,
        aksi: "penyesuaian_stok",
        nama_tabel: "barang",
        data_id: selectedBarang.id,
        nilai_lama: { stok: selectedBarang.stok },
        nilai_baru: { stok: stokBaru, alasan: alasan },
      });

      toast.success("Stok fisik berhasil disesuaikan dan kartu stok dicatat!");
      setBarangList((prev) =>
        prev.map((item) =>
          item.id === selectedBarang.id ? { ...item, stok: stokBaru } : item
        )
      );
      setIsOpnameOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses penyesuaian stok.");
    } finally {
      setSubmittingOpname(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Katalog Barang & Stok Gudang
          </h2>
          <p className="text-sm text-slate-500">
            Pantau stok fisik real-time, batas minimum, dan riwayat kartu mutasi barang.
          </p>
        </div>

        {/* Tombol Tambah Barang (Khusus Manajer: BR-01) */}
        {isManajer && (
          <Button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Tambah Barang Baru
          </Button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari kode atau nama barang..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={filterMenipis ? "destructive" : "outline"}
            size="sm"
            onClick={() => setFilterMenipis(!filterMenipis)}
            className={`text-xs h-9 font-bold flex items-center gap-1.5 transition-all ${
              filterMenipis
                ? "bg-red-600 hover:bg-red-700 text-white border-red-700 shadow-sm"
                : "bg-white hover:bg-amber-50 text-amber-700 border-amber-300 hover:border-amber-400"
            }`}
          >
            <AlertTriangle className={`h-4 w-4 ${filterMenipis ? "text-white" : "text-amber-600"}`} />
            {filterMenipis ? "Tampilkan Semua Barang" : "Filter: Stok Menipis"}
          </Button>
        </div>
      </div>

      {/* Tabel Barang */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Kode</TableHead>
              <TableHead>Nama Barang</TableHead>
              <TableHead className="text-right">Harga Jual</TableHead>
              {/* Kolom Harga Pokok: Rahasia Manajer (BR-12) */}
              {isManajer && <TableHead className="text-right">Harga Pokok (HPP)</TableHead>}
              <TableHead className="text-center">Stok Fisik</TableHead>
              <TableHead className="text-center">Min. Stok</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBarang.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isManajer ? 8 : 7}
                  className="h-32 text-center text-slate-500 text-sm"
                >
                  Tidak ada barang yang cocok dengan pencarian Anda.
                </TableCell>
              </TableRow>
            ) : (
              filteredBarang.map((b) => {
                const isMenipis = b.stok <= b.stok_minimum;
                return (
                  <TableRow key={b.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-semibold text-slate-900 text-xs">
                      {b.kode}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900 text-xs">{b.nama}</div>
                      <div className="text-[11px] text-slate-400">Satuan: {b.satuan}</div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-800 text-xs">
                      {formatRupiah(b.harga_jual)}
                    </TableCell>
                    {/* HPP hanya terlihat jika isManajer */}
                    {isManajer && (
                      <TableCell className="text-right text-xs font-mono text-slate-600 bg-slate-50/50">
                        {b.harga_pokok ? formatRupiah(b.harga_pokok) : "-"}
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <span
                        className={`font-bold text-xs ${
                          b.stok === 0
                            ? "text-red-600"
                            : isMenipis
                            ? "text-amber-600"
                            : "text-slate-800"
                        }`}
                      >
                        {b.stok} {b.satuan}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs text-slate-500">
                      {b.stok_minimum} {b.satuan}
                    </TableCell>
                    <TableCell className="text-center">
                      {!b.aktif ? (
                        <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-500">
                          Nonaktif
                        </Badge>
                      ) : isMenipis ? (
                        <Badge variant="warning" className="text-[10px] font-semibold">
                          Stok Menipis
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px] font-semibold">
                          Aman
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Tombol Kartu Stok (BR-11) */}
                        <Link href={`/barang/${b.id}/kartu-stok`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Lihat Kartu Stok"
                            className="h-8 px-2 text-xs text-slate-600 hover:text-blue-600"
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>
                        </Link>

                        {/* Tombol Stock Opname (Gudang & Manajer: BR-11) */}
                        {(isManajer || isGudang) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Penyesuaian Fisik (Opname)"
                            onClick={() => openOpnameModal(b)}
                            className="h-8 px-2 text-xs text-slate-600 hover:text-amber-600"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {/* Tombol Edit Data */}
                        {canEditGeneral && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Ubah Data Barang"
                            onClick={() => openEditModal(b)}
                            className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
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
      {/* DIALOG TAMBAH BARANG (MANAJER SAJA: BR-01)                                */}
      {/* ========================================================================= */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Barang Baru</DialogTitle>
            <DialogDescription>
              Hanya Manajer yang berhak menambahkan barang baru ke katalog distributor (BR-01).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddBarang} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900">Kode Barang *</label>
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded border border-blue-200">
                    Otomatis
                  </span>
                </div>
                <Input
                  required
                  placeholder="BRG-017"
                  value={addForm.kode}
                  onChange={(e) => setAddForm({ ...addForm, kode: e.target.value })}
                  className="font-bold text-blue-900 bg-slate-50 border-slate-300"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900">Satuan Barang *</label>
                <Input
                  required
                  placeholder="dus / bks / karton"
                  value={addForm.satuan}
                  onChange={(e) => setAddForm({ ...addForm, satuan: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900">Nama Barang *</label>
              <Input
                required
                placeholder="Contoh: Kopi Bubuk 250g isi 20"
                value={addForm.nama}
                onChange={(e) => setAddForm({ ...addForm, nama: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900">Harga Jual Satuan (Rp) *</label>
                <Input
                  type="number"
                  required
                  min="1"
                  placeholder="Contoh: 150000"
                  value={addForm.harga_jual}
                  onChange={(e) => setAddForm({ ...addForm, harga_jual: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900">Batas Stok Minimum *</label>
                <Input
                  type="number"
                  required
                  min="0"
                  placeholder="Contoh: 10"
                  value={addForm.stok_minimum}
                  onChange={(e) => setAddForm({ ...addForm, stok_minimum: e.target.value })}
                  className="font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              * Sesuai aturan <strong>BR-01 & BR-10</strong>: Stok awal bernilai 0. Stok dan Harga Pokok (HPP) akan diperbarui otomatis saat barang diterima dari pemasok lewat dokumen Pembelian (PO).
            </p>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                disabled={submittingAdd}
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
                {submittingAdd ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Barang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG EDIT BARANG                                                        */}
      {/* ========================================================================= */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Data Barang ({selectedBarang?.kode})</DialogTitle>
            <DialogDescription>
              {isManajer
                ? "Manajer dapat mengubah nama, harga jual, stok minimum, dan status aktif."
                : "Staf Gudang hanya boleh mengubah nama, satuan, dan stok minimum (BR-01)."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditBarang} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Nama Barang</label>
              <Input
                required
                value={editForm.nama}
                onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Satuan</label>
                <Input
                  required
                  value={editForm.satuan}
                  onChange={(e) => setEditForm({ ...editForm, satuan: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Stok Minimum</label>
                <Input
                  type="number"
                  required
                  min="0"
                  value={editForm.stok_minimum}
                  onChange={(e) => setEditForm({ ...editForm, stok_minimum: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Field Harga Jual: Khusus Manajer (BR-01) */}
            {isManajer ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900">
                    Harga Jual Satuan (Rp) *
                  </label>
                  <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    Khusus Manajer (BR-01)
                  </span>
                </div>
                <Input
                  type="number"
                  required
                  min="1"
                  value={editForm.harga_jual}
                  onChange={(e) => setEditForm({ ...editForm, harga_jual: e.target.value })}
                />
              </div>
            ) : (
              <div className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-300">
                Harga Jual: <span className="font-bold text-slate-900">{formatRupiah(Number(editForm.harga_jual))}</span>{" "}
                <span className="text-slate-500">(Hanya dapat diubah oleh Manajer)</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="aktifCheckbox"
                checked={editForm.aktif}
                onChange={(e) => setEditForm({ ...editForm, aktif: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="aktifCheckbox" className="text-xs font-medium text-slate-700">
                Barang Berstatus Aktif (Bisa dipesan & dijual)
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                disabled={submittingEdit}
                className="border-slate-300 text-slate-800 font-bold hover:bg-slate-100"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                disabled={submittingEdit}
              >
                {submittingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG PENYESUAIAN STOK FISIK / OPNAME (BR-11)                            */}
      {/* ========================================================================= */}
      <Dialog open={isOpnameOpen} onOpenChange={setIsOpnameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Penyesuaian Stok Fisik ({selectedBarang?.nama})</DialogTitle>
            <DialogDescription>
              Hasil hitung fisik gudang akan langsung mengubah stok dan tercatat di kartu stok (BR-11).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOpnameSubmit} className="space-y-3.5 py-2">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-600">Stok Sistem Saat Ini:</span>
              <span className="font-bold text-slate-900">
                {selectedBarang?.stok} {selectedBarang?.satuan}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Stok Fisik Sebenarnya (Hasil Hitung) *
              </label>
              <Input
                type="number"
                required
                min="0"
                placeholder="Masukkan angka stok hasil opname"
                value={opnameForm.stok_baru}
                onChange={(e) => setOpnameForm({ ...opnameForm, stok_baru: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Alasan Penyesuaian (Wajib minimal 10 karakter) *
              </label>
              <textarea
                required
                minLength={10}
                rows={3}
                placeholder="Contoh: Kemasan sobek terkena air gudang saat bongkar muat."
                value={opnameForm.alasan}
                onChange={(e) => setOpnameForm({ ...opnameForm, alasan: e.target.value })}
                className="w-full text-xs rounded-md border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-400">
                Karakter saat ini: {opnameForm.alasan.length} / min. 10
              </p>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpnameOpen(false)}
                disabled={submittingOpname}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={submittingOpname}
              >
                {submittingOpname ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Simpan Penyesuaian Stok"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
