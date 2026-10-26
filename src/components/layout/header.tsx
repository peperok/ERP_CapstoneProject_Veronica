"use client";

import { Bell, Calendar, Download, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/types/erp";
import { AIExecutiveInsight } from "@/components/dashboard/ai-executive-insight";

interface HeaderProps {
  userName?: string;
  userEmail?: string;
  userRole?: UserRole;
  onLogout?: () => void;
}

export function Header({
  userName = "Pengguna",
  userEmail = "user@sinarabadi.test",
  userRole = "Manajer",
}: HeaderProps) {
  // Format tanggal hari ini (contoh: "Today | 23 Okt 2026")
  const todayFormatted = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="h-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
      {/* Sapaan Personal (Gaya Gambar 1: Welcome back, ...) */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Selamat datang kembali, {userName.split(" ")[0]}!
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
        </div>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Berikut ringkasan operasional distribusi kebutuhan pokok hari ini.
        </p>
      </div>

      {/* Widget Sisi Kanan: Tanggal + Peran Badge + AI Copilot */}
      <div className="flex items-center gap-2.5">
        {/* Date Pill Widget (Gaya Gambar 1) */}
        <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>{todayFormatted}</span>
        </div>

        {/* Role Badge (Clean Pill) */}
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

        {/* AI Copilot Button (Tersedia untuk semua peran: Manajer, Penjualan, Gudang) */}
        <AIExecutiveInsight />
      </div>
    </header>
  );
}
