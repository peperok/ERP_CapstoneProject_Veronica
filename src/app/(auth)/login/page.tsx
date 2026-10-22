"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Lock, Mail, AlertCircle, Loader2 } from "lucide-react";

const quickAccounts = [
  {
    role: "Manajer",
    nama: "Hendra Wijaya",
    email: "hendra@sinarabadi.test",
    pass: "Latihan#2026",
    badgeVariant: "default" as const,
  },
  {
    role: "Staf Penjualan",
    nama: "Rina Kartika",
    email: "rina@sinarabadi.test",
    pass: "Latihan#2026",
    badgeVariant: "secondary" as const,
  },
  {
    role: "Staf Gudang",
    nama: "Joko Susanto",
    email: "joko@sinarabadi.test",
    pass: "Latihan#2026",
    badgeVariant: "outline" as const,
  },
  {
    role: "Staf Nonaktif (Uji Penolakan)",
    nama: "Agus Salim",
    email: "agus@sinarabadi.test",
    pass: "Latihan#2026",
    badgeVariant: "destructive" as const,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      // 1. Sign in dengan Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

      if (authError) {
        setErrorMessage(
          authError.message === "Invalid login credentials"
            ? "Email atau kata sandi tidak cocok."
            : authError.message
        );
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setErrorMessage("Gagal mendapatkan sesi pengguna.");
        setLoading(false);
        return;
      }

      // 2. Cek status aktif di tabel public.profiles (Kebutuhan Non-Fungsional & Kriteria Selesai)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("aktif, peran, nama_lengkap")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setErrorMessage("Profil pengguna tidak ditemukan.");
        setLoading(false);
        return;
      }

      if (!profile.aktif) {
        // Penolakan akun nonaktif (Agus Salim)
        await supabase.auth.signOut();
        setErrorMessage(
          "Akun Anda berstatus nonaktif. Akses ke sistem ERP ditolak. Silakan hubungi Manajer."
        );
        setLoading(false);
        return;
      }

      // 3. Login berhasil, arahkan ke dashboard
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat masuk ke sistem.");
      setLoading(false);
    }
  };

  const fillQuickAccount = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-blue-600 items-center justify-center text-white shadow-xl shadow-blue-500/30 mb-2">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            CV Sinar Abadi Niaga
          </h1>
          <p className="text-sm text-slate-400">
            Sistem Informasi ERP Distribusi Kebutuhan Pokok
          </p>
        </div>

        {/* Card Form Login */}
        <Card className="border-slate-800 bg-white/95 backdrop-blur shadow-2xl rounded-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold text-slate-900">
              Masuk ke Aplikasi
            </CardTitle>
            <CardDescription className="text-slate-500">
              Sistem internal untuk Manajer, Staf Penjualan, dan Staf Gudang
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Email Akun
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    required
                    placeholder="nama@sinarabadi.test"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-slate-50 border-slate-200 text-sm focus-visible:ring-blue-600"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-slate-50 border-slate-200 text-sm focus-visible:ring-blue-600"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 shadow-md shadow-blue-500/25 mt-2 transition-all"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  "Masuk"
                )}
              </Button>
            </form>

            {/* Quick Fill Akun Uji Untuk Mentor & Pengujian */}
            <div className="pt-3 border-t border-slate-100">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Pilih Cepat Akun Uji:
              </div>
              <div className="grid grid-cols-2 gap-2">
                {quickAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillQuickAccount(acc.email, acc.pass)}
                    className="p-2 text-left rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">
                        {acc.nama}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {acc.role}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <p className="text-center text-xs text-slate-500">
          Aplikasi Internal CV Sinar Abadi Niaga &bull; Capstone Project 2026
        </p>
      </div>
    </div>
  );
}
