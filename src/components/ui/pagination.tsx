"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-200 text-xs text-slate-600 rounded-b-xl">
      {/* Kiri: Info Jumlah Data & Pilihan Baris per Halaman */}
      <div className="flex items-center gap-3">
        <span>
          Menampilkan <strong className="text-slate-900">{startItem}</strong> -{" "}
          <strong className="text-slate-900">{endItem}</strong> dari{" "}
          <strong className="text-slate-900">{totalItems}</strong> data
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span className="text-slate-500">Baris:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 text-xs rounded-md border border-slate-300 bg-white px-2 py-0.5 font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / hal
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Kanan: Navigasi Halaman */}
      <div className="flex items-center gap-1">
        <span className="text-slate-500 mr-2">
          Halaman <strong className="text-slate-900">{currentPage}</strong> dari{" "}
          <strong className="text-slate-900">{Math.max(1, totalPages)}</strong>
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="h-7 w-7 p-0 border-slate-300 hover:bg-slate-100 disabled:opacity-40"
          title="Halaman Pertama"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-7 w-7 p-0 border-slate-300 hover:bg-slate-100 disabled:opacity-40"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        {/* Nomor halaman mini */}
        <div className="flex items-center gap-1 px-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => {
              // Tampilkan max 5 tombol halaman di sekitar halaman aktif
              return (
                p === 1 ||
                p === totalPages ||
                (p >= currentPage - 1 && p <= currentPage + 1)
              );
            })
            .map((p, idx, arr) => {
              const prev = arr[idx - 1];
              return (
                <div key={p} className="flex items-center gap-1">
                  {prev && p - prev > 1 && (
                    <span className="px-1 text-slate-400">...</span>
                  )}
                  <Button
                    variant={p === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(p)}
                    className={`h-7 min-w-7 px-2 text-xs font-bold ${
                      p === currentPage
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {p}
                  </Button>
                </div>
              );
            })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="h-7 w-7 p-0 border-slate-300 hover:bg-slate-100 disabled:opacity-40"
          title="Halaman Berikutnya"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="h-7 w-7 p-0 border-slate-300 hover:bg-slate-100 disabled:opacity-40"
          title="Halaman Terakhir"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
