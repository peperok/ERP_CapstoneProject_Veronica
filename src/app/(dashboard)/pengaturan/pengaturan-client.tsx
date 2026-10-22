"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
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
  ShieldAlert,
  Search,
  Eye,
  Clock,
  User,
  Users,
  Settings,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";

export interface AuditLogItem {
  id: number;
  pelaku_id: string;
  aksi: string;
  nama_tabel: string;
  data_id: string;
  nilai_lama: any;
  nilai_baru: any;
  dibuat_pada: string;
  pelaku?: {
    id: string;
    nama_lengkap: string;
    peran: string;
  };
}

interface UserProfile {
  id: string;
  nama_lengkap: string;
  peran: string;
  aktif: boolean;
  dibuat_pada: string;
}

interface PengaturanClientViewProps {
  initialLogs: AuditLogItem[];
  userList: UserProfile[];
}

export function PengaturanClientView({
  initialLogs,
  userList,
}: PengaturanClientViewProps) {
  const [activeTab, setActiveTab] = useState<"audit" | "users">("audit");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAksi, setFilterAksi] = useState("semua");

  // Modal Detail Diff Perubahan
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const openDetailModal = (log: AuditLogItem) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  // Filter audit log
  const filteredLogs = initialLogs.filter((log) => {
    const matchSearch =
      log.aksi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.nama_tabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.pelaku?.nama_lengkap || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchAksi = filterAksi === "semua" || log.aksi === filterAksi;

    return matchSearch && matchAksi;
  });

  const formatAksiBadge = (aksi: string) => {
    switch (aksi) {
      case "batal_pesanan_dikonfirmasi":
      case "tolak_pembelian":
      case "batal_pesanan":
        return (
          <Badge variant="destructive" className="font-bold text-[10px]">
            {aksi.replace(/_/g, " ").toUpperCase()}
          </Badge>
        );
      case "lunas_pesanan":
      case "setujui_pembelian":
        return (
          <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
            {aksi.replace(/_/g, " ").toUpperCase()}
          </Badge>
        );
      case "kirim_pesanan":
      case "terima_barang":
        return (
          <Badge className="bg-blue-600 text-white font-bold text-[10px]">
            {aksi.replace(/_/g, " ").toUpperCase()}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-bold text-[10px] text-slate-800 bg-slate-100 border-slate-300">
            {aksi.replace(/_/g, " ").toUpperCase()}
          </Badge>
        );
    }
  };

  // Helper untuk format JSON diff agar mudah dibaca
  const renderJsonDiff = (data: any) => {
    if (!data) {
      return <span className="text-slate-400 italic">Tidak ada data</span>;
    }
    if (typeof data !== "object") {
      return <span className="font-mono text-slate-800">{String(data)}</span>;
    }

    return (
      <div className="space-y-1.5 font-mono text-[11px]">
        {Object.entries(data).map(([key, val]) => (
          <div key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-1 border-b border-slate-200/60 pb-1">
            <span className="font-bold text-slate-600 sm:w-1/3">{key}:</span>
            <span className="text-slate-900 sm:w-2/3 break-all font-semibold">
              {typeof val === "object" ? JSON.stringify(val) : String(val)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Pengaturan Sistem & Audit Log
            </h1>
            <Badge className="bg-emerald-600 text-white font-bold text-[11px]">
              Khusus Manajer (BR-12)
            </Badge>
          </div>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Transparansi seluruh riwayat aktivitas sensitif, perubahan status transaksi, dan pengawasan wewenang peran (RBAC).
          </p>
        </div>
      </div>

      {/* Tabs Navigasi */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "audit"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Database className="w-3.5 h-3.5" /> Riwayat Audit Log ({initialLogs.length})
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "users"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Daftar Pengguna & Akses RBAC ({userList.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AUDIT LOG VIEWER                                                   */}
      {/* ========================================================================= */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          {/* Bar Pencarian & Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Cari aksi, tabel entitas, atau nama staf pelaku..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterAksi}
                onChange={(e) => setFilterAksi(e.target.value)}
                aria-label="Filter jenis aksi"
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="semua">Semua Jenis Aksi</option>
                <option value="batal_pesanan_dikonfirmasi">Batal Pesanan Dikonfirmasi</option>
                <option value="tolak_pembelian">Tolak Pembelian PO</option>
                <option value="kirim_pesanan">Kirim Pesanan</option>
                <option value="lunas_pesanan">Pelunasan Pesanan</option>
              </select>
            </div>
          </div>

          {/* Tabel Audit Log */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-slate-900 text-xs w-14 text-center">ID</TableHead>
                  <TableHead className="font-bold text-slate-900 text-xs">Waktu Aktivitas</TableHead>
                  <TableHead className="font-bold text-slate-900 text-xs">Pelaku</TableHead>
                  <TableHead className="font-bold text-slate-900 text-xs">Aksi Sistem</TableHead>
                  <TableHead className="font-bold text-slate-900 text-xs">Tabel Entitas</TableHead>
                  <TableHead className="font-bold text-slate-900 text-xs">Data ID / Dokumen</TableHead>
                  <TableHead className="font-bold text-slate-900 text-xs text-right">Rincian Perubahan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500 font-medium">
                      Tidak ada rekaman audit log yang cocok dengan filter pencarian.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const timeFormatted = new Date(log.dibuat_pada).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <TableRow key={log.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="text-center font-bold text-slate-500 text-xs">
                          #{log.id}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                          {timeFormatted}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-xs text-slate-900">
                            {log.pelaku?.nama_lengkap || "Sistem"}
                          </div>
                          <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                            {log.pelaku?.peran || "Otomatis"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatAksiBadge(log.aksi)}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-slate-700">
                          {log.nama_tabel}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-600 truncate max-w-[150px]" title={log.data_id}>
                          {log.data_id}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetailModal(log)}
                            className="h-8 px-2.5 text-xs text-slate-800 hover:text-blue-700 border-slate-300 font-bold flex items-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" /> Lihat Diff
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DAFTAR PENGGUNA & RBAC                                             */}
      {/* ========================================================================= */}
      {activeTab === "users" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Daftar Akun Pengguna & Hak Akses (Role-Based Access Control)
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Struktur pembagian wewenang peran sesuai ketentuan PRD Bab 7.
            </p>
          </div>

          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-slate-900 text-xs">Nama Lengkap</TableHead>
                <TableHead className="font-bold text-slate-900 text-xs">Peran (Role)</TableHead>
                <TableHead className="font-bold text-slate-900 text-xs">Wewenang Utama</TableHead>
                <TableHead className="font-bold text-slate-900 text-xs text-center">Status Akun</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userList.map((u) => {
                let wewenangDesc = "";
                let roleBadgeColor = "";

                if (u.peran === "manajer") {
                  roleBadgeColor = "bg-emerald-600 text-white";
                  wewenangDesc = "Hak penuh: ubah harga beli/jual, approval PO, override diskon 25%, batalkan pesanan, pelunasan, audit log & laporan.";
                } else if (u.peran === "penjualan") {
                  roleBadgeColor = "bg-blue-600 text-white";
                  wewenangDesc = "Buat pesanan jual, diskon maks 10%, tambah pelanggan (kredit Rp0), dilarang melihat HPP & laporan keuangan.";
                } else {
                  roleBadgeColor = "bg-amber-500 text-white";
                  wewenangDesc = "Pengajuan PO ke pemasok, catat barang masuk, kirim pesanan, stock opname fisik, dilarang melihat HPP & harga beli.";
                }

                return (
                  <TableRow key={u.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="font-bold text-xs text-slate-900">{u.nama_lengkap}</div>
                      <div className="text-[10px] font-mono text-slate-500 truncate max-w-[200px]">{u.id}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider ${roleBadgeColor}`}>
                        {u.peran}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-md leading-relaxed font-medium">
                      {wewenangDesc}
                    </TableCell>
                    <TableCell className="text-center">
                      {u.aktif ? (
                        <Badge variant="success" className="font-bold text-[10px]">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="font-bold text-[10px]">
                          Nonaktif (Diblokir)
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DIALOG: JSON DIFF PERUBAHAN (BEFORE / AFTER VALUES: BR-12)           */}
      {/* ========================================================================= */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Database className="w-5 h-5 text-blue-600" />
              Detail Audit Log #{selectedLog?.id} ({selectedLog?.aksi})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Perubahan pada tabel <strong>{selectedLog?.nama_tabel}</strong> oleh <strong>{selectedLog?.pelaku?.nama_lengkap}</strong> ({selectedLog?.pelaku?.peran})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Info Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[11px]">Waktu:</span>
                <span className="font-bold text-slate-900">
                  {selectedLog ? new Date(selectedLog.dibuat_pada).toLocaleString("id-ID") : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Aksi:</span>
                <span className="font-bold text-blue-700 uppercase">
                  {selectedLog?.aksi}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Target Data ID:</span>
                <span className="font-mono text-slate-700 truncate block font-bold" title={selectedLog?.data_id}>
                  {selectedLog?.data_id}
                </span>
              </div>
            </div>

            {/* Kolom Perbandingan Diff: Nilai Lama vs Nilai Baru */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Kolom Kiri: Nilai Lama */}
              <div className="rounded-xl border border-red-200 bg-red-50/40 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-red-800 font-bold text-xs border-b border-red-200 pb-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
                  Nilai Sebelum Perubahan (Lama)
                </div>
                <div className="p-2 bg-white rounded-lg border border-red-100 min-h-[90px] overflow-x-auto">
                  {renderJsonDiff(selectedLog?.nilai_lama)}
                </div>
              </div>

              {/* Kolom Kanan: Nilai Baru */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs border-b border-emerald-200 pb-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                  Nilai Sesudah Perubahan (Baru)
                </div>
                <div className="p-2 bg-white rounded-lg border border-emerald-100 min-h-[90px] overflow-x-auto">
                  {renderJsonDiff(selectedLog?.nilai_baru)}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
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
