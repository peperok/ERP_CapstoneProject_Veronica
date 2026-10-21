"use client";

import { LogOut, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/types/erp";

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
  onLogout,
}: HeaderProps) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30">
      <div>
        <span className="text-sm font-medium text-slate-500">
          Selamat datang kembali,
        </span>{" "}
        <span className="text-sm font-semibold text-slate-900">{userName}</span>
      </div>

      <div className="flex items-center gap-4">
        <Badge
          variant={
            userRole === "Manajer"
              ? "default"
              : userRole === "Staf Penjualan"
              ? "secondary"
              : "outline"
          }
          className="text-xs font-semibold px-2.5 py-1"
        >
          {userRole}
        </Badge>

        <div className="h-4 w-px bg-slate-200" />

        <div className="flex items-center gap-2 text-slate-700">
          <UserCircle className="h-5 w-5 text-slate-400" />
          <span className="text-xs text-slate-600 hidden sm:inline-block">
            {userEmail}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="text-slate-600 hover:text-red-600 hover:bg-red-50 flex items-center gap-1.5"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Keluar</span>
        </Button>
      </div>
    </header>
  );
}
