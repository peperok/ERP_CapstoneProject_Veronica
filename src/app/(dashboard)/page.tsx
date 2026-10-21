import { createClient } from "@/lib/supabase/server";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Receipt,
  Package,
  Truck,
  ShoppingCart,
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { UserRole } from "@/types/erp";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("nama_lengkap, peran")
    .eq("id", user.id)
    .single();

  const role = profile?.peran as "manajer" | "penjualan" | "gudang";

  // 1. Data Query Khusus Manajer
  let omzetBulan = 0;
  let marginBulan = 0;
  let piutangBerjalan = 0;
  let barangMenipisCount = 0;
  let poMenungguCount = 0;
  let topMarginItems: any[] = [];
  let poMenungguList: any[] = [];

  // 2. Data Query Khusus Penjualan
  let myOrdersCount = { draf: 0, dikonfirmasi: 0, dikirim: 0, lunas: 0 };
  let overdueCustomers: any[] = [];
  let myRecentOrders: any[] = [];

  // 3. Data Query Khusus Gudang
  let readyToShipOrders: any[] = [];
  let lowStockItems: any[] = [];
  let incomingPurchases: any[] = [];

  if (role === "manajer") {
    // Omzet: Total SO dikirim & lunas
    const { data: soData } = await supabase
      .from("pesanan_jual")
      .select("id, nomor, total, status, dikirim_pada, jatuh_tempo")
      .in("status", ["dikirim", "lunas"]);

    if (soData) {
      omzetBulan = soData.reduce((acc, curr) => acc + Number(curr.total), 0);
    }

    // Piutang berjalan: SO dikonfirmasi & dikirim
    const { data: piutangData } = await supabase
      .from("pesanan_jual")
      .select("total")
      .in("status", ["dikonfirmasi", "dikirim"]);

    if (piutangData) {
      piutangBerjalan = piutangData.reduce((acc, curr) => acc + Number(curr.total), 0);
    }

    // Margin: Query item pesanan
    const { data: itemData } = await supabase
      .from("item_pesanan_jual")
      .select("jumlah, subtotal, hpp_satuan, pesanan_jual!inner(status)")
      .in("pesanan_jual.status", ["dikirim", "lunas"]);

    if (itemData) {
      marginBulan = itemData.reduce((acc, item) => {
        const hpp = Number(item.hpp_satuan || 0) * Number(item.jumlah);
        return acc + (Number(item.subtotal) - hpp);
      }, 0);
    }

    // Barang stok menipis
    const { data: barangData } = await supabase
      .from("barang")
      .select("id, stok, stok_minimum")
      .eq("aktif", true);

    if (barangData) {
      barangMenipisCount = barangData.filter((b) => b.stok <= b.stok_minimum).length;
    }

    // PO Menunggu Persetujuan
    const { data: poData } = await supabase
      .from("pembelian")
      .select("id, nomor, jumlah_dipesan, diajukan_pada, pemasok(nama), barang(nama)")
      .eq("status", "diajukan")
      .order("diajukan_pada", { ascending: false });

    if (poData) {
      poMenungguCount = poData.length;
      poMenungguList = poData.slice(0, 5);
    }
  } else if (role === "penjualan") {
    // Pesanan milik staf penjualan saat ini
    const { data: myOrders } = await supabase
      .from("pesanan_jual")
      .select("id, nomor, status, total, dibuat_pada, pelanggan(nama_toko)")
      .eq("dibuat_oleh", user.id)
      .order("dibuat_pada", { ascending: false });

    if (myOrders) {
      myOrders.forEach((o) => {
        if (o.status in myOrdersCount) {
          myOrdersCount[o.status as keyof typeof myOrdersCount]++;
        }
      });
      myRecentOrders = myOrders.slice(0, 5);
    }

    // Pelanggan dengan tagihan jatuh tempo (BR-05)
    const { data: overdueOrders } = await supabase
      .from("pesanan_jual")
      .select("nomor, total, jatuh_tempo, pelanggan(nama_toko, telepon)")
      .eq("status", "dikirim")
      .lt("jatuh_tempo", new Date().toISOString().split("T")[0]);

    if (overdueOrders) {
      overdueCustomers = overdueOrders;
    }
  } else if (role === "gudang") {
    // Pesanan siap kirim (status: dikonfirmasi)
    const { data: readyOrders } = await supabase
      .from("pesanan_jual")
      .select("id, nomor, total, dikonfirmasi_pada, pelanggan(nama_toko, alamat)")
      .eq("status", "dikonfirmasi")
      .order("dikonfirmasi_pada", { ascending: true });

    if (readyOrders) {
      readyToShipOrders = readyOrders;
    }

    // Barang stok menipis
    const { data: bList } = await supabase
      .from("barang")
      .select("id, kode, nama, stok, stok_minimum, satuan")
      .eq("aktif", true)
      .order("stok", { ascending: true });

    if (bList) {
      lowStockItems = bList.filter((b) => b.stok <= b.stok_minimum);
    }

    // Pembelian disetujui menunggu barang datang
    const { data: inPurchases } = await supabase
      .from("pembelian")
      .select("id, nomor, jumlah_dipesan, pemasok(nama), barang(nama, satuan)")
      .eq("status", "disetujui")
      .order("diajukan_pada", { ascending: false });

    if (inPurchases) {
      incomingPurchases = inPurchases;
    }
  }

  const marginPersen = omzetBulan > 0 ? (marginBulan / omzetBulan) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Page Title & Peran */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard {profile?.nama_lengkap}
          </h2>
          <p className="text-sm text-slate-500">
            {role === "manajer" && "Ringkasan performa finansial, omzet, margin, dan approval transaksi."}
            {role === "penjualan" && "Pantau draf pesanan jual Anda dan peringatan limit tagihan pelanggan."}
            {role === "gudang" && "Pantau pesanan yang harus dikirim hari ini dan stok barang menipis."}
          </p>
        </div>
        <Badge variant="outline" className="w-fit text-xs px-3 py-1 bg-white">
          Peran: {role === "manajer" ? "Manajer" : role === "penjualan" ? "Staf Penjualan" : "Staf Gudang"}
        </Badge>
      </div>

      {/* ========================================================================= */}
      {/* 1. TAMPILAN KHUSUS MANAJER                                                */}
      {/* ========================================================================= */}
      {role === "manajer" && (
        <div className="space-y-6">
          {/* 4 Kartu KPI Utama */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
                  Omzet Berjalan
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-slate-900">{formatRupiah(omzetBulan)}</div>
                <p className="text-[11px] text-slate-500 mt-1">Total pesanan dikirim & lunas</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
                  Margin Kotor
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-emerald-700">{formatRupiah(marginBulan)}</div>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">
                  Profit: {marginPersen.toFixed(1)}% dari omzet
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
                  Piutang Berjalan
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Receipt className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-amber-700">{formatRupiah(piutangBerjalan)}</div>
                <p className="text-[11px] text-slate-500 mt-1">Status dikonfirmasi & dikirim</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
                  Stok Menipis
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-red-700">{barangMenipisCount} Barang</div>
                <p className="text-[11px] text-slate-500 mt-1">Stok &le; batas minimum gudang</p>
              </CardContent>
            </Card>
          </div>

          {/* Section Approval PO & Aksi Cepat */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Pengajuan Pembelian Menunggu Persetujuan
                  </CardTitle>
                  <CardDescription>
                    {poMenungguCount} pengajuan pembelian dari Staf Gudang membutuhkan approval harga beli
                  </CardDescription>
                </div>
                <Link href="/pembelian">
                  <Button variant="outline" size="sm" className="text-xs">
                    Kelola PO <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {poMenungguList.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-sm">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2 opacity-80" />
                    Tidak ada pengajuan pembelian yang menunggu persetujuan.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {poMenungguList.map((po) => (
                      <div key={po.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{po.nomor}</div>
                          <div className="text-xs text-slate-500">
                            {po.barang?.nama} &bull; {po.jumlah_dipesan} unit &bull; {po.pemasok?.nama}
                          </div>
                        </div>
                        <Link href="/pembelian">
                          <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700">
                            Periksa
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Akses Cepat Manajer
                </CardTitle>
                <CardDescription>Navigasi cepat ke modul analitik & otorisasi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <Link href="/laporan" className="block">
                  <Button variant="outline" className="w-full justify-between h-11 text-xs font-semibold">
                    <span>Laporan Omzet & Margin Mingguan</span>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </Button>
                </Link>
                <Link href="/pesanan-jual" className="block">
                  <Button variant="outline" className="w-full justify-between h-11 text-xs font-semibold">
                    <span>Daftar Pesanan Jual & Pelunasan</span>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </Button>
                </Link>
                <Link href="/pengaturan" className="block">
                  <Button variant="outline" className="w-full justify-between h-11 text-xs font-semibold">
                    <span>Audit Log & Kelola Hak Akun</span>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TAMPILAN KHUSUS STAF PENJUALAN                                         */}
      {/* ========================================================================= */}
      {role === "penjualan" && (
        <div className="space-y-6">
          {/* Status Pesanan Saya */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-sm bg-blue-50/40">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase">Draf Milik Saya</div>
                <div className="text-2xl font-bold text-blue-700 mt-1">{myOrdersCount.draf}</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Siap dikonfirmasi</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm bg-amber-50/40">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase">Dikonfirmasi</div>
                <div className="text-2xl font-bold text-amber-700 mt-1">{myOrdersCount.dikonfirmasi}</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Menunggu pengiriman gudang</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm bg-purple-50/40">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase">Dikirim (Tempo)</div>
                <div className="text-2xl font-bold text-purple-700 mt-1">{myOrdersCount.dikirim}</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Dalam masa pembayaran</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm bg-emerald-50/40">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase">Lunas</div>
                <div className="text-2xl font-bold text-emerald-700 mt-1">{myOrdersCount.lunas}</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Transaksi selesai</p>
              </CardContent>
            </Card>
          </div>

          {/* Peringatan Tagihan Jatuh Tempo (BR-05) & Pesanan Terbaru */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-red-200 shadow-sm bg-red-50/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  <CardTitle className="text-base font-semibold">
                    Pelanggan Tagihan Lewat Jatuh Tempo (BR-05)
                  </CardTitle>
                </div>
                <CardDescription>
                  Pesanan baru untuk toko berikut akan otomatis DITOLAK oleh sistem sampai tagihan dilunasi.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {overdueCustomers.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-sm">
                    Tidak ada pelanggan dengan tagihan lewat jatuh tempo.
                  </div>
                ) : (
                  <div className="divide-y divide-red-100">
                    {overdueCustomers.map((ord, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {ord.pelanggan?.nama_toko}
                          </div>
                          <div className="text-xs text-red-600 font-medium">
                            {ord.nomor} &bull; Tempo: {formatDate(ord.jatuh_tempo)}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-slate-800">
                          {formatRupiah(Number(ord.total))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Pesanan Terakhir Saya
                  </CardTitle>
                  <CardDescription>Daftar pesanan terbaru yang Anda inputkan</CardDescription>
                </div>
                <Link href="/pesanan-jual/baru">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs">
                    + Buat Pesanan
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-slate-100">
                  {myRecentOrders.map((ord) => (
                    <div key={ord.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{ord.nomor}</div>
                        <div className="text-xs text-slate-500">
                          {ord.pelanggan?.nama_toko} &bull; {formatDate(ord.dibuat_pada)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-800">
                          {formatRupiah(Number(ord.total))}
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                          {ord.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAMPILAN KHUSUS STAF GUDANG                                            */}
      {/* ========================================================================= */}
      {role === "gudang" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Truck className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{readyToShipOrders.length}</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">Pesanan Siap Kirim</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-700">{lowStockItems.length}</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">Stok Menipis</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-700">{incomingPurchases.length}</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">PO Menunggu Barang</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pesanan Siap Kirim */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Daftar Pesanan Siap Kirim
                  </CardTitle>
                  <CardDescription>Tandai terkirim agar tanggal jatuh tempo tercatat otomatis</CardDescription>
                </div>
                <Link href="/pesanan-jual">
                  <Button variant="outline" size="sm" className="text-xs">
                    Lihat Semua
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {readyToShipOrders.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-sm">
                    Tidak ada pesanan yang menunggu pengiriman.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {readyToShipOrders.map((ord) => (
                      <div key={ord.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{ord.nomor}</div>
                          <div className="text-xs text-slate-500">
                            {ord.pelanggan?.nama_toko} &bull; {ord.pelanggan?.alamat}
                          </div>
                        </div>
                        <Link href={`/pesanan-jual/${ord.id}`}>
                          <Button size="sm" variant="secondary" className="text-xs">
                            Proses Kirim
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Barang Stok Menipis */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Barang Stok Menipis (&le; Min)
                  </CardTitle>
                  <CardDescription>Segera ajukan pembelian ke pemasok untuk barang berikut</CardDescription>
                </div>
                <Link href="/pembelian/baru">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs">
                    + Ajukan PO
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-slate-100">
                  {lowStockItems.map((b) => (
                    <div key={b.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{b.nama}</div>
                        <div className="text-xs text-slate-500">
                          Kode: {b.kode} &bull; Min: {b.stok_minimum} {b.satuan}
                        </div>
                      </div>
                      <Badge variant="destructive" className="font-semibold text-xs">
                        Sisa: {b.stok} {b.satuan}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
