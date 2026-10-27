import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
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
import { ArrowLeft, History, Package } from "lucide-react";
import Link from "next/link";

interface KartuStokPageProps {
  params: Promise<{ id: string }>;
}

export default async function KartuStokPage({ params }: KartuStokPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Ambil info barang
  const { data: barang } = await supabase
    .from("barang")
    .select("id, kode, nama, satuan, stok, stok_minimum")
    .eq("id", id)
    .single();

  if (!barang) {
    notFound();
  }

  // 2. Ambil riwayat kartu mutasi stok (BR-11)
  const { data: mutasiList } = await supabase
    .from("mutasi_stok")
    .select(
      "id, jenis, jumlah, stok_sesudah, nomor_dokumen, alasan, dibuat_pada, profiles(nama_lengkap)"
    )
    .eq("barang_id", id)
    .order("dibuat_pada", { ascending: false });

  return (
    <div className="space-y-6">
      {/* Tombol Kembali & Info Barang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/barang">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Kartu Stok: {barang.nama}
              </h2>
              <Badge variant="outline" className="font-mono text-xs">
                {barang.kode}
              </Badge>
            </div>
          </div>
        </div>

        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <Package className="h-5 w-5 text-blue-600" />
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">
              Stok Saat Ini
            </div>
            <div className="text-sm font-bold text-slate-900">
              {barang.stok} {barang.satuan}
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Mutasi Stok */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Waktu</TableHead>
              <TableHead>Jenis Mutasi</TableHead>
              <TableHead>No. Dokumen</TableHead>
              <TableHead className="text-right">Jumlah Perubahan</TableHead>
              <TableHead className="text-center">Stok Sesudah</TableHead>
              <TableHead>Pelaku</TableHead>
              <TableHead>Keterangan / Alasan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!mutasiList || mutasiList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-slate-500 text-sm">
                  Belum ada catatan mutasi stok untuk barang ini.
                </TableCell>
              </TableRow>
            ) : (
              mutasiList.map((m: any) => {
                let badgeVariant: "default" | "destructive" | "warning" | "secondary" = "secondary";
                let prefix = "";
                if (m.jenis === "masuk" || m.jenis === "batal") {
                  badgeVariant = "default";
                  prefix = "+";
                } else if (m.jenis === "keluar") {
                  badgeVariant = "destructive";
                  prefix = "-";
                } else if (m.jenis === "penyesuaian") {
                  badgeVariant = "warning";
                  prefix = "=";
                }

                const absQty = Math.abs(Number(m.jumlah) || 0);
                const displaySign = Number(m.jumlah) > 0 ? "+" : Number(m.jumlah) < 0 ? "-" : "";

                return (
                  <TableRow key={m.id} className="text-xs hover:bg-slate-50">
                    <TableCell className="text-slate-600 whitespace-nowrap">
                      {formatDate(m.dibuat_pada)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant} className="text-[10px] uppercase font-semibold">
                        {m.jenis}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">
                      {m.nomor_dokumen}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      <span
                        className={
                          m.jenis === "masuk" || m.jenis === "batal" || displaySign === "+"
                            ? "text-emerald-600"
                            : m.jenis === "keluar" || displaySign === "-"
                            ? "text-red-600"
                            : "text-amber-600"
                        }
                      >
                        {m.jenis === "penyesuaian" ? (displaySign ? `${displaySign}${absQty}` : `${absQty}`) : `${prefix}${absQty}`}{" "}
                        {barang.satuan}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-bold text-slate-900">
                      {m.stok_sesudah} {barang.satuan}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {m.profiles?.nama_lengkap || "-"}
                    </TableCell>
                    <TableCell className="text-slate-500 max-w-xs truncate" title={m.alasan || ""}>
                      {m.alasan || "-"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
