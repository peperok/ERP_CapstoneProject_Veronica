"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building2,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  ShoppingCart,
  Warehouse,
  Zap,
} from "lucide-react";

// ── Akun demo untuk penguji / juri ──────────────────────────────────────────
const DEMO_ACCOUNTS = [
  {
    role: "Manajer",
    name: "Hendra Wijaya",
    email: "hendra@sinarabadi.test",
    password: "Latihan#2026",
    icon: ShieldCheck,
    btnClass:
      "bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/30 text-white",
    badgeClass: "bg-blue-100 text-blue-700",
  },
  {
    role: "Staf Penjualan",
    name: "Rina Kartika",
    email: "rina@sinarabadi.test",
    password: "Latihan#2026",
    icon: ShoppingCart,
    btnClass:
      "bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/30 text-white",
    badgeClass: "bg-emerald-100 text-emerald-700",
  },
  {
    role: "Staf Gudang",
    name: "Joko Susanto",
    email: "joko@sinarabadi.test",
    password: "Latihan#2026",
    icon: Warehouse,
    btnClass:
      "bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/30 text-white",
    badgeClass: "bg-amber-100 text-amber-700",
  },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  // ── Logika login terpusat — dipakai form manual & tombol demo ─────────────
  const performLogin = async (
    loginEmail: string,
    loginPassword: string
  ): Promise<string | null> => {
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

    if (authError) {
      return authError.message === "Invalid login credentials"
        ? "Email atau kata sandi tidak cocok."
        : authError.message;
    }
    if (!authData.user) return "Gagal mendapatkan sesi pengguna.";

    // Cek status aktif di tabel public.profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("aktif, peran, nama_lengkap")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      return "Profil pengguna tidak ditemukan.";
    }
    if (!profile.aktif) {
      await supabase.auth.signOut();
      return "Akun Anda berstatus nonaktif. Akses ke sistem ERP ditolak. Silakan hubungi Manajer.";
    }

    router.push("/");
    router.refresh();
    return null; // null = sukses
  };

  // ── Handler form login manual ─────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      const err = await performLogin(email, password);
      if (err) setErrorMessage(err);
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat masuk ke sistem.");
    } finally {
      setLoading(false);
    }
  };

  // ── Handler tombol demo cepat ─────────────────────────────────────────────
  const handleQuickLogin = async (
    loginEmail: string,
    loginPassword: string,
    role: string
  ) => {
    setErrorMessage(null);
    setLoadingRole(role);
    try {
      const err = await performLogin(loginEmail, loginPassword);
      if (err) setErrorMessage(err);
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat masuk ke sistem.");
    } finally {
      setLoadingRole(null);
    }
  };

  const isAnyLoading = loading || loadingRole !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-5">

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
                    disabled={isAnyLoading}
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
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 bg-slate-50 border-slate-200 text-sm focus-visible:ring-blue-600"
                    disabled={isAnyLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 focus:outline-none transition-colors"
                    aria-label={
                      showPassword
                        ? "Sembunyikan kata sandi"
                        : "Tampilkan kata sandi"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 shadow-md shadow-blue-500/25 mt-2 transition-all"
                disabled={isAnyLoading}
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
          </CardContent>
        </Card>

        {/* ── Demo Login Cepat ────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400 shrink-0" />
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Login Demo Cepat — Penguji & Juri
            </p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Klik salah satu tombol di bawah untuk masuk langsung sebagai peran yang dipilih.
          </p>

          <div className="grid grid-cols-1 gap-2">
            {DEMO_ACCOUNTS.map((account) => {
              const Icon = account.icon;
              const isThisLoading = loadingRole === account.role;
              return (
                <button
                  key={account.role}
                  onClick={() =>
                    handleQuickLogin(account.email, account.password, account.role)
                  }
                  disabled={isAnyLoading}
                  className={`
                    flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium text-sm
                    transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                    ${account.btnClass}
                  `}
                >
                  {isThisLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <Icon className="h-4 w-4 shrink-0" />
                  )}
                  <div className="flex flex-col items-start leading-tight">
                    <span className="font-semibold">{account.role}</span>
                    <span className="text-xs opacity-80">{account.name}</span>
                  </div>
                  {!isThisLoading && (
                    <span className="ml-auto text-xs opacity-70 font-mono hidden sm:block">
                      {account.email}
                    </span>
                  )}
                  {isThisLoading && (
                    <span className="ml-auto text-xs opacity-80">
                      Masuk...
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-slate-500">
          Hak Cipta &copy; {new Date().getFullYear()} CV Sinar Abadi Niaga. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </div>
  );
}
