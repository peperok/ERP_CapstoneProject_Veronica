"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Calendar, ChevronRight, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/types/erp";
import { AIExecutiveInsight } from "@/components/dashboard/ai-executive-insight";

interface HeaderProps {
  userName?: string;
  userEmail?: string;
  userRole?: UserRole;
  onLogout?: () => void;
}

// Mapping rute ke judul halaman dan breadcrumb
const pageTitles: Record<string, { title: string; category: string }> = {
  "/barang": { title: "Katalog Barang & Stok Gudang", category: "Persediaan" },
  "/pesanan-jual": { title: "Daftar Pesanan Penjualan (SO)", category: "Penjualan" },
  "/pesanan-jual/baru": { title: "Buat Pesanan Baru", category: "Penjualan" },
  "/pelanggan": { title: "Daftar Toko & Pelanggan", category: "Penjualan" },
  "/pemasok": { title: "Daftar Mitra Pemasok", category: "Pembelian" },
  "/pembelian": { title: "Daftar Pembelian (PO)", category: "Pembelian" },
  "/laporan": { title: "Laporan Eksekutif", category: "Analitik" },
  "/pengaturan": { title: "Pengaturan & Audit Trail", category: "Sistem" },
};

export function Header({
  userName = "Pengguna",
  userEmail = "user@sinarabadi.test",
  userRole = "Manajer",
}: HeaderProps) {
  const pathname = usePathname();

  // Format tanggal hari ini (contoh: "Senin, 26 Okt 2026")
  const todayFormatted = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const isDashboard = pathname === "/";
  const currentNav = pageTitles[pathname] || {
    title: pathname.startsWith("/barang/")
      ? "Kartu Stok Barang"
      : pathname.split("/").filter(Boolean).pop()?.toUpperCase() || "Halaman ERP",
    category: "Modul ERP",
  };

  return (
    <header className="h-16 shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* Sisi Kiri: Dashboard Welcome Greeting ATAU Breadcrumb Navigasi Halaman */}
      <div className="flex items-center min-w-0">
        {isDashboard ? (
          <div className="flex items-center gap-2.5">
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-none">
              Selamat datang kembali, {userName.split(" ")[0]}!
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 leading-none">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>
        ) : (
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition-colors font-medium"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="text-slate-400 hidden md:inline font-medium">
              {currentNav.category}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden md:inline shrink-0" />
            <span className="font-bold text-slate-800 tracking-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md">
              {currentNav.title}
            </span>
          </nav>
        )}
      </div>

      {/* Sisi Kanan: Tanggal + Peran Badge + AI Copilot */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Date Pill Widget */}
        <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>{todayFormatted}</span>
        </div>

        {/* Role Badge */}
        <Badge
          className={
            userRole === "Manajer"
              ? "bg-purple-100 text-purple-800 border-purple-200 font-bold px-3 py-1 text-xs"
              : userRole === "Staf Penjualan"
              ? "bg-blue-100 text-blue-800 border-blue-200 font-bold px-3 py-1 text-xs"
              : "bg-amber-100 text-amber-800 border-amber-200 font-bold px-3 py-1 text-xs"
          }
        >
          {userRole}
        </Badge>

        {/* AI Copilot Button */}
        <AIExecutiveInsight />
      </div>
    </header>
  );
}
