"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";

interface Pelanggan {
  id: string;
  kode: string;
  nama_toko: string;
  alamat: string;
  telepon: string;
  termin_hari: number;
  batas_kredit: number;
}

interface Barang {
  id: string;
  kode: string;
  nama: string;
  satuan: string;
  stok: number;
  stok_minimum: number;
  harga_jual: number;
}

interface FormRowItem {
  id: string;
  barang_id: string;
  jumlah: string;
  harga_satuan: number;
  diskon_persen: string;
}

interface FormPesananBaruClientProps {
  pelangganList: Pelanggan[];
  barangList: Barang[];
  initialNomor: string;
  userRole: "manajer" | "penjualan" | "gudang";
  currentUserId: string;
}

export function FormPesananBaruClient({
  pelangganList,
  barangList,
  initialNomor,
  userRole,
  currentUserId,
}: FormPesananBaruClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const isManajer = userRole === "manajer";
  const maxDiskonAllowed = isManajer ? 25 : 10;

  // State Form Header
  const [nomor] = useState(initialNomor);
  const [selectedPelangganId, setSelectedPelangganId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Form Multi-Baris (1 s/d 20 baris: BR-02)
  const [items, setItems] = useState<FormRowItem[]>([
    {
      id: "row-1",
      barang_id: "",
      jumlah: "",
      harga_satuan: 0,
      diskon_persen: "",
    },
  ]);

  const selectedPelanggan = pelangganList.find((p) => p.id === selectedPelangganId);

  // Handler: Tambah Baris Barang (Maksimal 20 baris: BR-02)
  const handleAddRow = () => {
    if (items.length >= 20) {
      toast.error("Maksimal 20 baris barang per pesanan jual (BR-02).");
      return;
    }
    const newRowId = `row-${Date.now()}-${items.length + 1}`;
    setItems((prev) => [
      ...prev,
      {
        id: newRowId,
        barang_id: "",
        jumlah: "",
        harga_satuan: 0,
        diskon_persen: "",
      },
    ]);
  };

  // Handler: Hapus Baris Barang (Minimal 1 baris: BR-02)
  const handleRemoveRow = (rowId: string) => {
    if (items.length <= 1) {
      toast.error("Pesanan jual wajib memiliki paling sedikit 1 baris barang (BR-02).");
      return;
    }
    setItems((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Handler: Ganti Pilihan Barang pada Baris
  const handleBarangChange = (rowId: string, newBarangId: string) => {
    // Cek duplikasi barang di baris lain (BR-02)
    if (newBarangId) {
      const isDuplicate = items.some(
        (r) => r.id !== rowId && r.barang_id === newBarangId
      );
      if (isDuplicate) {
        const dupItem = barangList.find((b) => b.id === newBarangId);
        toast.error(
          `Barang "${dupItem?.nama}" sudah dipilih di baris lain. Satu pesanan tidak boleh memiliki barang yang sama di baris berbeda (BR-02).`
        );
        return;
      }
    }

    const barangObj = barangList.find((b) => b.id === newBarangId);
    setItems((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            barang_id: newBarangId,
            harga_satuan: barangObj ? barangObj.harga_jual : 0,
          };
        }
        return r;
      })
    );
  };

  // Handler: Ubah Jumlah / Diskon / Harga Satuan pada Baris
  const handleRowChange = (
    rowId: string,
    field: "jumlah" | "diskon_persen" | "harga_satuan",
    val: string | number
  ) => {
    setItems((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            [field]: val,
          };
        }
        return r;
      })
    );
  };

  // Hitung Subtotal per baris
  const calculateRowSubtotal = (row: FormRowItem) => {
    const qty = parseInt(row.jumlah, 10) || 0;
    const price = row.harga_satuan || 0;
    const diskon = parseInt(row.diskon_persen, 10) || 0;

    const kotor = qty * price;
    const potongan = Math.round((kotor * diskon) / 100);
    return Math.max(0, kotor - potongan);
  };

  // Kalkulasi Total Keseluruhan Pesanan
  const totalQty = items.reduce((sum, r) => sum + (parseInt(r.jumlah, 10) || 0), 0);
  const totalKotor = items.reduce((sum, r) => {
    const qty = parseInt(r.jumlah, 10) || 0;
    return sum + qty * (r.harga_satuan || 0);
  }, 0);
  const grandTotal = items.reduce((sum, r) => sum + calculateRowSubtotal(r), 0);
  const totalDiskonNominal = totalKotor - grandTotal;

  // ============================================================================
  // SUBMIT FORM PENJUALAN BARU (STATUS AWAL: DRAF - BR-02, BR-03)
  // ============================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPelangganId) {
      toast.error("Silakan pilih toko pelanggan terlebih dahulu.");
      return;
    }

    // Validasi baris item
    if (items.length < 1 || items.length > 20) {
      toast.error("Jumlah baris barang harus antara 1 sampai 20 baris (BR-02).");
      return;
    }

    // Validasi setiap baris
    const checkedBarangIds = new Set<string>();
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const rowNum = i + 1;

      if (!row.barang_id) {
        toast.error(`Baris ke-${rowNum}: Silakan pilih barang terlebih dahulu.`);
        return;
      }

      // Validasi duplikasi barang (BR-02)
      if (checkedBarangIds.has(row.barang_id)) {
        const itemInfo = barangList.find((b) => b.id === row.barang_id);
        toast.error(
          `Barang "${itemInfo?.nama}" terduplikasi pada baris ke-${rowNum}. Setiap barang hanya boleh muncul 1 kali (BR-02).`
        );
        return;
      }
      checkedBarangIds.add(row.barang_id);

      const qty = parseInt(row.jumlah, 10);
      if (isNaN(qty) || qty < 1) {
        toast.error(`Baris ke-${rowNum}: Jumlah barang harus berupa angka minimal 1.`);
        return;
      }

      if (row.harga_satuan <= 0) {
        toast.error(`Baris ke-${rowNum}: Harga satuan barang harus lebih dari Rp0.`);
        return;
      }

      const diskon = parseInt(row.diskon_persen || "0", 10);
      if (isNaN(diskon) || diskon < 0) {
        toast.error(`Baris ke-${rowNum}: Diskon tidak boleh bernilai negatif.`);
        return;
      }

      // Validasi batas diskon (BR-03: Sales max 10%, Manajer max 25%)
      if (diskon > maxDiskonAllowed) {
        toast.error(
          `Baris ke-${rowNum}: Diskon ${diskon}% melampaui batas wewenang. Batas diskon untuk peran Anda adalah maksimal ${maxDiskonAllowed}% (BR-03).`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 1. Simpan header pesanan jual (status: 'draf')
      const { data: newOrder, error: orderError } = await supabase
        .from("pesanan_jual")
        .insert({
          nomor: nomor.trim(),
          pelanggan_id: selectedPelangganId,
          dibuat_oleh: currentUserId,
          total: grandTotal,
          status: "draf",
          dibuat_pada: new Date().toISOString(),
        })
        .select()
        .single();

      if (orderError) {
        toast.error(orderError.message);
        setIsSubmitting(false);
        return;
      }

      // 2. Simpan item-item baris pesanan jual
      const rowsToInsert = items.map((r) => {
        const qty = parseInt(r.jumlah, 10);
        const diskon = parseInt(r.diskon_persen || "0", 10);
        const subtotal = calculateRowSubtotal(r);
        return {
          pesanan_jual_id: newOrder.id,
          barang_id: r.barang_id,
          jumlah: qty,
          harga_satuan: r.harga_satuan,
          diskon_persen: diskon,
          subtotal: subtotal,
        };
      });

      const { error: itemsError } = await supabase
        .from("item_pesanan_jual")
        .insert(rowsToInsert);

      if (itemsError) {
        // Rollback header jika insert item gagal
        await supabase.from("pesanan_jual").delete().eq("id", newOrder.id);
        toast.error(`Gagal menyimpan rincian barang: ${itemsError.message}`);
        setIsSubmitting(false);
        return;
      }

      toast.success(
        `Draf Pesanan ${nomor} berhasil dibuat! Status saat ini: Draf (Stok belum dikurangi sampai pesanan dikonfirmasi).`
      );
      router.push("/pesanan-jual");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat pesanan jual.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Form */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/pesanan-jual">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-800 font-bold hover:bg-slate-100 h-9 w-9 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              Buat Draf Pesanan Jual Baru (Sales Order)
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              Satu pesanan dapat memuat 1 s/d 20 baris barang tanpa duplikasi item (BR-02).
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Nomor Pesanan
          </span>
          <span className="text-base font-black text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
            {nomor}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BAGIAN 1: INFORMASI PELANGGAN */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" /> Informasi Toko Pelanggan
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900">
                Pilih Toko Pelanggan *
              </label>
              <select
                required
                value={selectedPelangganId}
                onChange={(e) => setSelectedPelangganId(e.target.value)}
                className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="" disabled>
                  -- Silakan Pilih Toko Pelanggan --
                </option>
                {pelangganList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.kode} - {p.nama_toko}
                  </option>
                ))}
              </select>
            </div>

            {/* Info Kartu Pelanggan yang Terpilih */}
            {selectedPelanggan ? (
              <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Termin Pembayaran:</span>
                  <span className="font-bold text-slate-900">
                    {selectedPelanggan.termin_hari === 0
                      ? "Tunai / COD"
                      : `${selectedPelanggan.termin_hari} Hari`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Batas Plafon Kredit:</span>
                  <span className="font-black text-emerald-700">
                    {formatRupiah(selectedPelanggan.batas_kredit)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Telepon:</span>
                  <span className="font-bold text-slate-800">
                    {selectedPelanggan.telepon}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-10 px-3 bg-slate-50 border border-dashed border-slate-300 rounded-md flex items-center text-xs text-slate-500 font-medium">
                Pilih toko pelanggan di sebelah kiri untuk melihat termin bayar & batas kredit.
              </div>
            )}
          </div>
        </div>

        {/* BAGIAN 2: DAFTAR BARIS BARANG PESANAN (1 s/d 20 Baris: BR-02) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" /> Rincian Item Barang Dipesan
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Maksimal diskon untuk peran Anda:{" "}
                <strong className="text-blue-700">{maxDiskonAllowed}%</strong> (BR-03).
              </p>
            </div>

            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
              {items.length} dari 20 baris
            </span>
          </div>

          {/* Tabel Baris Input */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-bold">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">No</th>
                  <th className="py-2.5 px-3 text-left min-w-[240px]">Barang yang Dipesan *</th>
                  <th className="py-2.5 px-3 text-center w-28">Jumlah *</th>
                  <th className="py-2.5 px-3 text-right w-36">Harga Satuan (Rp)</th>
                  <th className="py-2.5 px-3 text-center w-28">Diskon (%)</th>
                  <th className="py-2.5 px-3 text-right w-40">Subtotal (Rp)</th>
                  <th className="py-2.5 px-2 text-center w-12">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((row, index) => {
                  const selectedBarang = barangList.find((b) => b.id === row.barang_id);
                  const subtotal = calculateRowSubtotal(row);
                  const isStockInsufficient =
                    selectedBarang &&
                    parseInt(row.jumlah, 10) > selectedBarang.stok;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      {/* No Baris */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                        {index + 1}
                      </td>

                      {/* Dropdown Barang */}
                      <td className="py-2.5 px-3">
                        <select
                          required
                          value={row.barang_id}
                          onChange={(e) => handleBarangChange(row.id, e.target.value)}
                          className="w-full h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                        >
                          <option value="" disabled>
                            -- Silakan Pilih Barang --
                          </option>
                          {barangList.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.kode} - {b.nama} (Stok: {b.stok} {b.satuan})
                            </option>
                          ))}
                        </select>
                        {selectedBarang && (
                          <div className="flex items-center gap-2 mt-1 text-[11px]">
                            <span className="text-slate-500">
                              Sisa Stok:{" "}
                              <strong
                                className={
                                  selectedBarang.stok === 0
                                    ? "text-red-600"
                                    : selectedBarang.stok <= selectedBarang.stok_minimum
                                    ? "text-amber-600"
                                    : "text-slate-800"
                                }
                              >
                                {selectedBarang.stok} {selectedBarang.satuan}
                              </strong>
                            </span>
                            {isStockInsufficient && (
                              <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                Catatan: Stok saat ini kurang
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Jumlah Dipesan */}
                      <td className="py-2.5 px-3">
                        <Input
                          type="number"
                          required
                          min="1"
                          placeholder="Contoh: 5"
                          value={row.jumlah}
                          onChange={(e) => handleRowChange(row.id, "jumlah", e.target.value)}
                          className="h-9 font-bold text-slate-900 text-center placeholder:text-slate-400 placeholder:font-normal"
                        />
                      </td>

                      {/* Harga Satuan */}
                      <td className="py-2.5 px-3 text-right">
                        {isManajer ? (
                          <Input
                            type="number"
                            required
                            min="1"
                            value={row.harga_satuan || ""}
                            onChange={(e) =>
                              handleRowChange(row.id, "harga_satuan", Number(e.target.value))
                            }
                            className="h-9 font-bold text-slate-900 text-right"
                          />
                        ) : (
                          <div className="h-9 px-2 bg-slate-50 border border-slate-200 rounded flex items-center justify-end font-bold text-slate-900">
                            {formatRupiah(row.harga_satuan)}
                          </div>
                        )}
                      </td>

                      {/* Diskon Persen (0 - 10% / 25%) */}
                      <td className="py-2.5 px-3">
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max={maxDiskonAllowed}
                            placeholder="0"
                            value={row.diskon_persen}
                            onChange={(e) =>
                              handleRowChange(row.id, "diskon_persen", e.target.value)
                            }
                            className="h-9 font-bold text-slate-900 text-center pr-6 placeholder:text-slate-400 placeholder:font-normal"
                          />
                          <span className="absolute right-2 top-2 text-slate-500 font-bold text-xs pointer-events-none">
                            %
                          </span>
                        </div>
                      </td>

                      {/* Subtotal */}
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 text-xs">
                        {formatRupiah(subtotal)}
                      </td>

                      {/* Tombol Hapus Baris */}
                      <td className="py-2.5 px-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={items.length <= 1}
                          onClick={() => handleRemoveRow(row.id)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 disabled:opacity-30"
                          title="Hapus baris ini"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tombol Tambah Baris */}
          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={items.length >= 20}
              onClick={handleAddRow}
              className="border-blue-300 text-blue-700 hover:bg-blue-50 font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Baris Barang (Maks. 20)
            </Button>

            <span className="text-[11px] text-slate-500 font-medium">
              * Setiap item barang wajib unik dan memiliki jumlah minimal 1 (BR-02).
            </span>
          </div>
        </div>

        {/* BAGIAN 3: RINGKASAN TOTAL NILAI & TOMBOL SIMPAN */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs w-full md:w-auto">
            <div>
              <span className="text-slate-400 block">Total Kuantitas:</span>
              <span className="text-base font-bold text-white mt-0.5 block">
                {totalQty} unit
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Total Nilai Kotor:</span>
              <span className="text-base font-bold text-slate-200 mt-0.5 block">
                {formatRupiah(totalKotor)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Total Diskon:</span>
              <span className="text-base font-bold text-amber-400 mt-0.5 block">
                - {formatRupiah(totalDiskonNominal)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-800">
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Grand Total Bersih:</span>
              <span className="text-2xl font-black text-emerald-400">
                {formatRupiah(grandTotal)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/pesanan-jual">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700 text-slate-200 hover:bg-slate-800 font-bold"
                >
                  Batal
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Simpan sebagai Draf
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
