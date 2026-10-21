"use client";

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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/erp";

interface SidebarProps {
  userRole?: UserRole;
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
    title: "Laporan",
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

export function Sidebar({ userRole = "Manajer" }: SidebarProps) {
  const pathname = usePathname();

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 leading-tight">CV Sinar Abadi</h1>
          <p className="text-xs text-slate-500 font-medium">Sistem ERP Distribusi</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Menu Utama
        </div>
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
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  isActive ? "text-blue-600" : "text-slate-400"
                )}
              />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Footer Role Indicator */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60">
        <div className="text-xs text-slate-500">Peran Aktif:</div>
        <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
          {userRole}
        </div>
      </div>
    </aside>
  );
}
