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
  Edit2,
  ShieldAlert,
  Loader2,
  CreditCard,
  Phone,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";

interface PelangganItem {
  id: string;
  kode: string;
  nama_toko: string;
  telepon: string;
  alamat: string;
  batas_kredit: number;
  termin_hari: number;
  aktif: boolean;
  dibuat_pada: string;
  piutang_berjalan: number;
  has_overdue: boolean;
}

interface PelangganClientViewProps {
  initialPelanggan: PelangganItem[];
  userRole: "manajer" | "penjualan" | "gudang";
  currentUserId: string;
}

export function PelangganClientView({
  initialPelanggan,
  userRole,
  currentUserId,
}: PelangganClientViewProps) {
  const router = useRouter();
  const supabase = createClient();

  const isManajer = userRole === "manajer";
  const [searchTerm, setSearchTerm] = useState("");
  const [pelangganList, setPelangganList] = useState<PelangganItem[]>(initialPelanggan);

  // Dialog Tambah Pelanggan
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    kode: "",
    nama_toko: "",
    telepon: "",
    alamat: "",
    termin_hari: "14",
    batas_kredit: "0",
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Dialog Edit Batas Kredit / Pelanggan
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPelanggan, setSelectedPelanggan] = useState<PelangganItem | null>(null);
  const [editForm, setEditForm] = useState({
    nama_toko: "",
    telepon: "",
    alamat: "",
    termin_hari: "14",
    batas_kredit: "0",
    aktif: true,
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const filteredPelanggan = pelangganList.filter((p) => {
    return (
      p.nama_toko.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.kode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.telepon.includes(searchTerm)
    );
  });

  // Auto generate kode pelanggan berikutnya (PLG-010 -> PLG-011)
  const getNextKodePelanggan = () => {
    const existingNumbers = pelangganList
      .map((p) => {
        const match = p.kode.match(/PLG-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));

    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNum = maxNum + 1;
    return `PLG-${String(nextNum).padStart(3, "0")}`;
  };

  const openAddModal = () => {
    setAddForm({
      kode: getNextKodePelanggan(),
      nama_toko: "",
      telepon: "",
      alamat: "",
      termin_hari: "14",
      batas_kredit: "0",
    });
    setIsAddOpen(true);
  };

  // Handler: Tambah Pelanggan Baru (BR-05)
  const handleAddPelanggan = async (e: React.FormEvent) => {
    e.preventDefault();

    // Aturan BR-05: Pelanggan baru yang dibuat Staf Penjualan otomatis batas kredit Rp0
    const batasKredit = isManajer ? Number(addForm.batas_kredit) : 0;
    const termin = Number(addForm.termin_hari);

    setSubmittingAdd(true);
    try {
      const { data, error } = await supabase
        .from("pelanggan")
        .insert({
          kode: addForm.kode.trim().toUpperCase(),
          nama_toko: addForm.nama_toko.trim(),
          telepon: addForm.telepon.trim(),
          alamat: addForm.alamat.trim(),
          termin_hari: termin,
          batas_kredit: batasKredit,
          aktif: true,
          dibuat_oleh: currentUserId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error(`Kode pelanggan ${addForm.kode} sudah terdaftar!`);
        } else {
          toast.error(error.message);
        }
        setSubmittingAdd(false);
        return;
      }

      toast.success(
        isManajer
          ? "Pelanggan baru berhasil ditambahkan."
          : "Pelanggan baru berhasil didaftarkan (Batas kredit awal Rp0 sesuai aturan BR-05)."
      );

      setPelangganList((prev) => [
        ...prev,
        { ...data, piutang_berjalan: 0, has_overdue: false },
      ]);
      setIsAddOpen(false);
      setAddForm({
        kode: "",
        nama_toko: "",
        telepon: "",
        alamat: "",
        termin_hari: "14",
        batas_kredit: "0",
      });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data pelanggan.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Buka Dialog Edit
  const openEditModal = (p: PelangganItem) => {
    setSelectedPelanggan(p);
    setEditForm({
      nama_toko: p.nama_toko,
      telepon: p.telepon,
      alamat: p.alamat,
      termin_hari: String(p.termin_hari),
      batas_kredit: String(p.batas_kredit),
      aktif: p.aktif,
    });
    setIsEditOpen(true);
  };

  // Handler: Edit Pelanggan (BR-05 & BR-12)
  const handleEditPelanggan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPelanggan) return;

    const batasKreditBaru = Number(editForm.batas_kredit);
    const terminBaru = Number(editForm.termin_hari);

    setSubmittingEdit(true);
    try {
      const payload: any = {
        nama_toko: editForm.nama_toko.trim(),
        telepon: editForm.telepon.trim(),
        alamat: editForm.alamat.trim(),
        termin_hari: terminBaru,
        aktif: editForm.aktif,
      };

      // Hanya Manajer yang boleh mengubah batas kredit (BR-05)
      if (isManajer) {
        payload.batas_kredit = batasKreditBaru;
      }

      const { data, error } = await supabase
        .from("pelanggan")
        .update(payload)
        .eq("id", selectedPelanggan.id)
        .select()
        .single();

      if (error) {
        toast.error(error.message);
        setSubmittingEdit(false);
        return;
      }

      // Catat ke Audit Log jika Manajer mengubah batas kredit (BR-12)
      if (isManajer && selectedPelanggan.batas_kredit !== batasKreditBaru) {
        await supabase.from("audit_log").insert({
          pelaku_id: currentUserId,
          aksi: "ubah_batas_kredit",
          nama_tabel: "pelanggan",
          data_id: selectedPelanggan.id,
          nilai_lama: { batas_kredit: selectedPelanggan.batas_kredit },
          nilai_baru: { batas_kredit: batasKreditBaru },
        });
      }

      toast.success("Data pelanggan berhasil diperbarui!");
      setPelangganList((prev) =>
        prev.map((item) =>
          item.id === selectedPelanggan.id ? { ...item, ...data } : item
        )
      );
      setIsEditOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui data pelanggan.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Daftar Pelanggan (Toko & Minimarket)
          </h2>
          <p className="text-sm text-slate-500">
            Kelola data toko pelanggan, plafon batas kredit tempo, dan pantau status tagihan piutang berjalan.
          </p>
        </div>

        <Button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Tambah Pelanggan Baru
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari kode, nama toko, atau telepon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Tabel Pelanggan */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Kode</TableHead>
              <TableHead>Nama Toko & Kontak</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead className="text-center">Termin</TableHead>
              <TableHead className="text-right">Batas Kredit</TableHead>
              <TableHead className="text-right">Piutang Berjalan</TableHead>
              <TableHead className="text-center">Status Kelayakan (BR-05)</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPelanggan.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-slate-500 text-sm">
                  Tidak ada pelanggan yang cocok dengan pencarian Anda.
                </TableCell>
              </TableRow>
            ) : (
              filteredPelanggan.map((p) => {
                const sisaKredit = p.batas_kredit - p.piutang_berjalan;
                const kreditOver = p.piutang_berjalan >= p.batas_kredit && p.batas_kredit > 0;
                const isZeroLimit = p.batas_kredit === 0;

                return (
                  <TableRow key={p.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-semibold text-slate-900 text-xs">
                      {p.kode}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-900 text-xs">{p.nama_toko}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 text-slate-400" /> {p.telepon}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-slate-600" title={p.alamat}>
                      {p.alamat}
                    </TableCell>
                    <TableCell className="text-center text-xs font-medium">
                      {p.termin_hari === 0 ? (
                        <Badge variant="outline" className="text-[10px]">Tunai / COD</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] font-semibold">
                          {p.termin_hari} Hari
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900 text-xs">
                      {formatRupiah(p.batas_kredit)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-bold text-slate-800">
                      {formatRupiah(p.piutang_berjalan)}
                    </TableCell>
                    <TableCell className="text-center">
                      {!p.aktif ? (
                        <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-500">
                          Nonaktif
                        </Badge>
                      ) : p.has_overdue ? (
                        <Badge variant="destructive" className="text-[10px] font-semibold">
                          Lewat Tempo (Ditolak)
                        </Badge>
                      ) : isZeroLimit ? (
                        <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
                          Batas Rp0 (Baru)
                        </Badge>
                      ) : kreditOver ? (
                        <Badge variant="destructive" className="text-[10px] font-semibold">
                          Kredit Penuh
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px] font-semibold">
                          Layak Pesan
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Ubah Data / Batas Kredit"
                        onClick={() => openEditModal(p)}
                        className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ========================================================================= */}
      {/* DIALOG TAMBAH PELANGGAN                                                   */}
      {/* ========================================================================= */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Toko Pelanggan Baru</DialogTitle>
            <DialogDescription>
              {isManajer
                ? "Manajer dapat langsung menentukan plafon batas kredit pelanggan baru."
                : "Pelanggan baru yang dibuat Staf Penjualan otomatis mendapat batas kredit Rp0 sampai diubah Manajer (BR-05)."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddPelanggan} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900">Kode Pelanggan *</label>
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded border border-blue-200">
                    Otomatis
                  </span>
                </div>
                <Input
                  required
                  placeholder="PLG-011"
                  value={addForm.kode}
                  onChange={(e) => setAddForm({ ...addForm, kode: e.target.value })}
                  className="font-bold text-blue-900 bg-slate-50 border-slate-300"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900">No. Telepon / HP *</label>
                <Input
                  required
                  placeholder="0812-xxxx-xxxx"
                  value={addForm.telepon}
                  onChange={(e) => setAddForm({ ...addForm, telepon: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900">Nama Toko / Minimarket *</label>
              <Input
                required
                placeholder="Contoh: Toko Sejahtera Makmur"
                value={addForm.nama_toko}
                onChange={(e) => setAddForm({ ...addForm, nama_toko: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900">Alamat Toko *</label>
              <Input
                required
                placeholder="Jl. Raya Jatiasih No. 8, Bekasi"
                value={addForm.alamat}
                onChange={(e) => setAddForm({ ...addForm, alamat: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900">Termin Bayar (Hari) *</label>
                <select
                  value={addForm.termin_hari}
                  onChange={(e) => setAddForm({ ...addForm, termin_hari: e.target.value })}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent cursor-pointer"
                >
                  <option value="0" className="text-slate-900 font-medium py-1">0 Hari (Tunai / COD)</option>
                  <option value="7" className="text-slate-900 font-medium py-1">7 Hari</option>
                  <option value="14" className="text-slate-900 font-medium py-1">14 Hari</option>
                  <option value="30" className="text-slate-900 font-medium py-1">30 Hari</option>
                </select>
              </div>

              {isManajer ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-900">
                    Batas Kredit (Rp) *
                  </label>
                  <Input
                    type="number"
                    required
                    min="0"
                    placeholder="10000000"
                    value={addForm.batas_kredit}
                    onChange={(e) => setAddForm({ ...addForm, batas_kredit: e.target.value })}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">
                    Batas Kredit Awal
                  </label>
                  <div className="h-9 px-3 bg-slate-100 border border-slate-300 rounded-md flex items-center text-xs text-slate-700 font-bold">
                    Rp0 (Menunggu persetujuan Manajer)
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                disabled={submittingAdd}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={submittingAdd}
              >
                {submittingAdd ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Pelanggan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG EDIT PELANGGAN & BATAS KREDIT (BR-05)                              */}
      {/* ========================================================================= */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Data Pelanggan ({selectedPelanggan?.kode})</DialogTitle>
            <DialogDescription>
              {isManajer
                ? "Manajer memiliki hak eksklusif mengubah batas kredit toko pelanggan (BR-05)."
                : "Staf Penjualan hanya dapat memperbarui kontak dan alamat toko."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditPelanggan} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Nama Toko</label>
              <Input
                required
                value={editForm.nama_toko}
                onChange={(e) => setEditForm({ ...editForm, nama_toko: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">No. Telepon</label>
                <Input
                  required
                  value={editForm.telepon}
                  onChange={(e) => setEditForm({ ...editForm, telepon: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900">Termin Bayar</label>
                <select
                  value={editForm.termin_hari}
                  onChange={(e) => setEditForm({ ...editForm, termin_hari: e.target.value })}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent cursor-pointer"
                >
                  <option value="0" className="text-slate-900 font-medium py-1">0 Hari (Tunai / COD)</option>
                  <option value="7" className="text-slate-900 font-medium py-1">7 Hari</option>
                  <option value="14" className="text-slate-900 font-medium py-1">14 Hari</option>
                  <option value="30" className="text-slate-900 font-medium py-1">30 Hari</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Alamat</label>
              <Input
                required
                value={editForm.alamat}
                onChange={(e) => setEditForm({ ...editForm, alamat: e.target.value })}
                className="text-xs"
              />
            </div>

            {/* Field Batas Kredit: Hanya Manajer (BR-05) */}
            {isManajer ? (
              <div className="space-y-1.5 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-blue-600" /> Plafon Batas Kredit (Rp) &bull; Khusus Manajer
                </label>
                <Input
                  type="number"
                  required
                  min="0"
                  value={editForm.batas_kredit}
                  onChange={(e) => setEditForm({ ...editForm, batas_kredit: e.target.value })}
                  className="text-xs bg-white font-semibold"
                />
                <p className="text-[10px] text-blue-700">
                  Perubahan batas kredit akan otomatis dicatat pada Audit Log sistem (BR-12).
                </p>
              </div>
            ) : (
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                Batas Kredit: <span className="font-semibold text-slate-900">{formatRupiah(Number(editForm.batas_kredit))}</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  (Hanya Manajer yang berwenang mengubah batas kredit)
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="aktifPelangganCheckbox"
                checked={editForm.aktif}
                onChange={(e) => setEditForm({ ...editForm, aktif: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="aktifPelangganCheckbox" className="text-xs font-medium text-slate-700">
                Pelanggan Berstatus Aktif (Dapat dilayani transaksi baru)
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                disabled={submittingEdit}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={submittingEdit}
              >
                {submittingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
