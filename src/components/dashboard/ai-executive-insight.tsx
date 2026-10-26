"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Lightbulb,
  ShieldAlert,
  ArrowRight,
  X,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIInsightData {
  roleTitle: string;
  summary: string;
  highlights: {
    type: "success" | "warning" | "danger" | "info";
    title: string;
    desc: string;
  }[];
  recommendations: string[];
  timestamp: string;
}

export function AIExecutiveInsight() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AIInsightData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-insight", {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Gagal menghasilkan analisis AI");
      }
      setData(result.insights);
    } catch (err: any) {
      setError(err?.message || "Terjadi kendala saat memproses AI");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDrawer = () => {
    setIsOpen(true);
    if (!data && !loading) {
      fetchInsights();
    }
  };

  // Drawer Portal Content rendered directly into document.body
  const drawerContent = isOpen && mounted ? (
    createPortal(
      <div className="fixed inset-0 z-[99999] pointer-events-auto">
        {/* Backdrop Overlay */}
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300"
        />

        {/* Full-Height Slide-Over Panel (Kanan Layar) */}
        <aside
          className="fixed top-0 right-0 bottom-0 w-full sm:w-[500px] md:w-[540px] max-w-full bg-white shadow-2xl flex flex-col h-screen z-10 transition-transform duration-300 ease-out"
        >
          {/* Header Panel */}
          <div className="relative border-b border-indigo-950/20 bg-gradient-to-r from-indigo-950 via-indigo-900 to-purple-950 p-5 text-white flex items-center justify-between overflow-hidden shrink-0">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-purple-500/20 blur-2xl" />

            <div className="flex items-center gap-3 relative z-10">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-amber-300 backdrop-blur-md shadow-inner border border-white/10">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black tracking-tight text-white">
                    {data?.roleTitle || "AI Copilot Operasional"}
                  </h3>
                  <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold">
                    Live Data
                  </span>
                </div>
                <p className="text-xs text-indigo-200 mt-0.5">
                  CV Sinar Abadi Niaga &bull; Sistem Analisis Cerdas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 relative z-10">
              <button
                onClick={fetchInsights}
                disabled={loading}
                title="Refresh Analisis"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Tutup Panel"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body Panel (Scrollable Full Viewport Height) */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-slate-50">
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {loading && (
              <div className="space-y-4 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 animate-spin">
                  <RefreshCw className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Sedang Mensintesis Data ERP...
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Mengevaluasi transaksi berjalan, batas limit kredit toko, dan buffer safety stock gudang.
                  </p>
                </div>
              </div>
            )}

            {data && !loading && (
              <div className="space-y-4 pb-6">
                {/* Executive Summary Card */}
                <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-xs">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🎯</span>
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-950">
                        Ringkasan Operasional & Kinerja
                      </h4>
                      <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-slate-700 font-medium">
                        {data.summary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Highlights List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                    Parameter Kritis Operasional
                  </h4>
                  {data.highlights.map((h, idx) => {
                    let badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
                    let icon = <TrendingUp className="h-4 w-4 text-blue-600" />;

                    if (h.type === "success") {
                      badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      icon = <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
                    } else if (h.type === "warning") {
                      badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
                      icon = <AlertCircle className="h-4 w-4 text-amber-600" />;
                    } else if (h.type === "danger") {
                      badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
                      icon = <ShieldAlert className="h-4 w-4 text-rose-600" />;
                    }

                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-2xs hover:border-indigo-200 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-xl border ${badgeClass}`}>
                            {icon}
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {h.title}
                          </span>
                        </div>
                        <p className="mt-2.5 text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                          {h.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Actionable Recommendations */}
                <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50/80 to-indigo-50/70 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-purple-700" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-purple-950">
                      Rekomendasi Tindakan Cepat (Actionable Steps)
                    </h4>
                  </div>
                  <ul className="space-y-2.5 text-xs sm:text-[13px] text-slate-700 font-medium">
                    {data.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <ArrowRight className="h-4 w-4 shrink-0 text-purple-600 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Footer Panel */}
          <div className="border-t border-slate-200 bg-white p-4 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span className="font-medium">
              {data ? `Sinkronisasi: ${data.timestamp} WIB` : "Status: Siap Analisis"}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="rounded-xl h-8 px-4 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Tutup Panel
            </Button>
          </div>
        </aside>
      </div>,
      document.body
    )
  ) : null;

  return (
    <>
      {/* Tombol AI Copilot di Header */}
      <button
        onClick={handleOpenDrawer}
        className="group relative flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:from-indigo-700 hover:to-purple-700 hover:shadow-md transition-all active:scale-95 cursor-pointer"
        title="Buka AI Copilot"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
        </span>
        <Sparkles className="h-3.5 w-3.5 text-amber-200 group-hover:rotate-12 transition-transform" />
        <span className="tracking-tight">AI Copilot</span>
      </button>

      {/* Render Slide-over Drawer Portal */}
      {drawerContent}
    </>
  );
}
