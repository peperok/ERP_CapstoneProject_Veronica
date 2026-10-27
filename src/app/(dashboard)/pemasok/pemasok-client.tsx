"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
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
import { Plus, Search, Edit2, Loader2, Phone, MapPin, Building } from "lucide-react";
import { toast } from "sonner";

interface PemasokItem {
  id: string;
  kode: string;
  nama: string;
  telepon: string;
  alamat: string;
  aktif: boolean;
  dibuat_pada: string;
}

interface PemasokClientViewProps {
  initialPemasok: PemasokItem[];
  userRole: "manajer" | "penjualan" | "gudang";
  currentUserId: string;
}

export function PemasokClientView({
  initialPemasok,
  userRole,
  currentUserId,
}: PemasokClientViewProps) {
  const router = useRouter();
  const supabase = createClient();

  const canManage = userRole === "manajer" || userRole === "gudang";
  const [searchTerm, setSearchTerm] = useState("");
  const [pemasokList, setPemasokList] = useState<PemasokItem[]>(initialPemasok);

  // Dialog Tambah
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    kode: "",
    nama: "",
    telepon: "",
    alamat: "",
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Dialog Edit
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPemasok, setSelectedPemasok] = useState<PemasokItem | null>(null);
  const [editForm, setEditForm] = useState({
    nama: "",
    telepon: "",
    alamat: "",
    aktif: true,
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const filteredPemasok = pemasokList.filter(
    (p) =>
      p.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.kode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.telepon.includes(searchTerm)
  );

  // Auto generate kode pemasok berikutnya (SUP-04 -> SUP-05)
  const getNextKodePemasok = () => {
    const existingNumbers = pemasokList
      .map((p) => {
        const match = p.kode.match(/SUP-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));

    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNum = maxNum + 1;
    return `SUP-${String(nextNum).padStart(2, "0")}`;
  };

  const openAddModal = () => {
    setAddForm({
      kode: getNextKodePemasok(),
      nama: "",
      telepon: "",
      alamat: "",
    });
    setIsAddOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      toast.error("Hanya Staf Gudang atau Manajer yang dapat mengelola pemasok.");
      return;
    }

    setSubmittingAdd(true);
    try {
      const { data, error } = await supabase
        .from("pemasok")
        .insert({
          kode: addForm.kode.trim().toUpperCase(),
          nama: addForm.nama.trim(),
          telepon: addForm.telepon.trim(),
          alamat: addForm.alamat.trim(),
          aktif: true,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error(`Kode pemasok ${addForm.kode} sudah terdaftar!`);
        } else {
          toast.error(error.message);
        }
        setSubmittingAdd(false);
        return;
      }

      toast.success("Pemasok baru berhasil disimpan.");
      setPemasokList((prev) => [...prev, data]);
      setIsAddOpen(false);
      setAddForm({ kode: "", nama: "", telepon: "", alamat: "" });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan pemasok.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const openEditModal = (p: PemasokItem) => {
    setSelectedPemasok(p);
    setEditForm({
      nama: p.nama,
      telepon: p.telepon,
      alamat: p.alamat,
      aktif: p.aktif,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPemasok) return;

    setSubmittingEdit(true);
    try {
      const { data, error } = await supabase
        .from("pemasok")
        .update({
          nama: editForm.nama.trim(),
          telepon: editForm.telepon.trim(),
          alamat: editForm.alamat.trim(),
          aktif: editForm.aktif,
        })
        .eq("id", selectedPemasok.id)
        .select()
        .single();

      if (error) {
        toast.error(error.message);
        setSubmittingEdit(false);
        return;
      }

      toast.success("Data pemasok berhasil diperbarui.");
      setPemasokList((prev) =>
        prev.map((item) => (item.id === selectedPemasok.id ? { ...item, ...data } : item))
      );
      setIsEditOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui pemasok.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tab Navigasi (PRD Bab 7) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Daftar Mitra Pemasok (Supplier)
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <Link
              href="/pembelian"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent transition-colors"
            >
              Dokumen Pembelian (PO)
            </Link>
            <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Data Mitra Pemasok
            </span>
          </div>
        </div>

        {canManage && (
          <Button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Tambah Pemasok
          </Button>
        )}
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari kode, nama pemasok, atau telepon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Tabel */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Kode</TableHead>
              <TableHead>Nama Pemasok</TableHead>
              <TableHead>No. Telepon</TableHead>
              <TableHead>Alamat Gudang / Kantor</TableHead>
              <TableHead className="text-center">Status</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPemasok.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-500 text-sm">
                  Tidak ada pemasok yang ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredPemasok.map((p) => (
                <TableRow key={p.id} className="hover:bg-slate-50/80">
                  <TableCell className="font-semibold text-slate-900 text-xs">
                    {p.kode}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-blue-600" /> {p.nama}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" /> {p.telepon}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 max-w-xs truncate" title={p.alamat}>
                    {p.alamat}
                  </TableCell>
                  <TableCell className="text-center">
                    {p.aktif ? (
                      <Badge variant="success" className="text-[10px]">Aktif</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-500">Nonaktif</Badge>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(p)}
                        className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* DIALOG TAMBAH */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Pemasok Baru</DialogTitle>
            <DialogDescription>
              Daftarkan pemasok resmi untuk pengajuan pembelian barang distributor.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900">Kode Pemasok *</label>
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded border border-blue-200">
                    Otomatis
                  </span>
                </div>
                <Input
                  required
                  placeholder="SUP-05"
                  value={addForm.kode}
                  onChange={(e) => setAddForm({ ...addForm, kode: e.target.value })}
                  className="font-bold text-blue-900 bg-slate-50 border-slate-300"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900">Telepon *</label>
                <Input
                  required
                  placeholder="021-xxxx xxxx"
                  value={addForm.telepon}
                  onChange={(e) => setAddForm({ ...addForm, telepon: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900">Nama Badan Usaha / Pemasok *</label>
              <Input
                required
                placeholder="PT / CV Nama Pemasok"
                value={addForm.nama}
                onChange={(e) => setAddForm({ ...addForm, nama: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900">Alamat Lengkap *</label>
              <Input
                required
                placeholder="Kawasan Industri / Alamat Kantor"
                value={addForm.alamat}
                onChange={(e) => setAddForm({ ...addForm, alamat: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={submittingAdd}>
                {submittingAdd ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Pemasok"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG EDIT */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Data Pemasok ({selectedPemasok?.kode})</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Nama Pemasok</label>
              <Input
                required
                value={editForm.nama}
                onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Telepon</label>
              <Input
                required
                value={editForm.telepon}
                onChange={(e) => setEditForm({ ...editForm, telepon: e.target.value })}
                className="text-xs"
              />
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

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="aktifPemasokCheckbox"
                checked={editForm.aktif}
                onChange={(e) => setEditForm({ ...editForm, aktif: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="aktifPemasokCheckbox" className="text-xs font-medium text-slate-700">
                Pemasok Berstatus Aktif
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={submittingEdit}>
                {submittingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
