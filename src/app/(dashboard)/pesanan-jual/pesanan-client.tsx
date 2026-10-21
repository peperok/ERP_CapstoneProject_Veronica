"use client";

import { useState } from "react";
import Link from "next/link";
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
}: PesananClientViewProps) {
  const isManajer = userRole === "manajer";
  const isPenjualan = userRole === "penjualan";
  const canCreate = isManajer || isPenjualan;

  const [orders] = useState<PesananItem[]>(initialOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("semua");

  // Modal Detail Items
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PesananItem | null>(null);

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
            Pengelolaan alur penjualan barang, konfirmasi plafon kredit, pengiriman gudang, dan pelunasan (BR-02 s/d BR-08).
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetailModal(order)}
                        className="h-8 px-2.5 text-xs text-slate-800 hover:text-blue-700 border-slate-300 font-bold flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> Detail
                      </Button>
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

          <DialogFooter>
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
    </div>
  );
}
