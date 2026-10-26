"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Truck,
  BarChart3,
  Settings,
  Building2,
  ChevronRight,
  LogOut,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/erp";

interface SidebarProps {
  userRole?: UserRole;
  userName?: string;
  userEmail?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onLogout?: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["Manajer", "Staf Penjualan", "Staf Gudang"],
  },
  {
    title: "Barang & Stok",
    href: "/barang",
    icon: Package,
    roles: ["Manajer", "Staf Penjualan", "Staf Gudang"],
  },
  {
    title: "Pelanggan",
    href: "/pelanggan",
    icon: Users,
    roles: ["Manajer", "Staf Penjualan"],
  },
  {
    title: "Pesanan Jual",
    href: "/pesanan-jual",
    icon: ShoppingCart,
    roles: ["Manajer", "Staf Penjualan", "Staf Gudang"],
  },
  {
    title: "Pembelian (PO)",
    href: "/pembelian",
    icon: Truck,
    roles: ["Manajer", "Staf Gudang"],
  },
  {
    title: "Laporan Manajer",
    href: "/laporan",
    icon: BarChart3,
    roles: ["Manajer"],
  },
  {
    title: "Pengaturan & Audit",
    href: "/pengaturan",
    icon: Settings,
    roles: ["Manajer"],
  },
];

export function Sidebar({
  userRole = "Manajer",
  userName = "Pengguna",
  userEmail = "user@sinarabadi.test",
  isCollapsed = false,
  onToggleCollapse,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNavItems = navItems.filter((item) => {
    const roleAllowed = item.roles.includes(userRole);
    if (!roleAllowed) return false;
    if (!searchQuery.trim() || isCollapsed) return true;
    return item.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className={cn(
        "border-r border-slate-200/90 bg-white flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out select-none z-40 shrink-0",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* 1. BRAND HEADER DENGAN TOMBOL CIUTKAN DI SEBELAH LOGO (PERSIS YUZO) */}
      <div className={cn(
        "h-16 px-4 border-b border-slate-100 flex items-center transition-all",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        <Link href="/" className="flex items-center gap-3 group min-w-0">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 animate-in fade-in duration-200">
              <span className="font-extrabold text-slate-900 tracking-tight text-[15px] truncate block">
                SINAR ABADI
              </span>
              <p className="text-[11px] text-slate-400 font-medium truncate">Distribusi ERP</p>
            </div>
          )}
        </Link>

        {/* Tombol Ciutkan / Perluas di sebelah logo (Gaya YUZO) */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
            className={cn(
              "p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors",
              isCollapsed && "hidden"
            )}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tombol Buka Expand saat Collapsed di atas */}
      {isCollapsed && onToggleCollapse && (
        <div className="pt-2 px-3 flex justify-center">
          <button
            onClick={onToggleCollapse}
            title="Perluas Sidebar"
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. SEARCH BAR PERSIS YUZO (Icon Kiri + Shortcut ⌘ F di Kanan) */}
      {!isCollapsed && (
        <div className="px-3.5 pt-3 pb-1 animate-in fade-in duration-200">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-12 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs rounded-xl border border-slate-200/80 focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
            />
            <span className="absolute right-2 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-md pointer-events-none shadow-2xs">
              ⌘ F
            </span>
          </div>
        </div>
      )}

      {/* 3. MENU UTAMA */}
      <nav className={cn(
        "flex-1 px-3 py-3 space-y-1 overflow-y-auto overflow-x-hidden",
        isCollapsed && "px-2"
      )}>
        {!isCollapsed && (
          <div className="px-2 pb-1.5 text-[11px] font-bold text-slate-400 tracking-wide">
            Main Menu
          </div>
        )}

        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.title : undefined}
              className={cn(
                "group flex items-center rounded-xl text-xs font-semibold transition-all duration-150 relative",
                isCollapsed
                  ? "justify-center p-3"
                  : "justify-between px-3 py-2.5",
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700",
                    isCollapsed && "h-5 w-5"
                  )}
                />
                {!isCollapsed && <span className="truncate">{item.title}</span>}
              </div>

              {!isCollapsed && isActive && (
                <ChevronRight className="h-3.5 w-3.5 text-white/80 shrink-0" />
              )}

              {/* Tooltip Hover saat Collapsed */}
              {isCollapsed && (
                <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-lg">
                  {item.title}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 4. AREA BAWAH: LOGOUT & PROFIL */}
      <div className="p-3 border-t border-slate-100 space-y-2">
        {/* Menu Logout (Menggantikan Settings persis YUZO) */}
        {onLogout && !isCollapsed && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar Akun (Logout)</span>
          </button>
        )}

        {/* 5. USER PROFILE CARD (Persis Kotak Profil Veda Ega Pratama di YUZO) */}
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2 pt-1">
            <div
              title={`${userName} (${userRole})`}
              className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs cursor-pointer"
            >
              {initials}
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Keluar Akun"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between p-2 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                  {userName}
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                  {userEmail}
                </p>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Keluar Akun"
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
