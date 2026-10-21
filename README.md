# Sistem ERP Distribusi CV Sinar Abadi Niaga
> **Capstone Project - AI Web Programming**  
> Peserta: **Veronica Regina Mambu**  
> Tenggat Waktu: **Selasa, 27 Oktober 2026**  
> LMS: [innovators.iodacademy.id](https://innovators.iodacademy.id)

---

## 1. Deskripsi Sistem

**CV Sinar Abadi Niaga** adalah distributor kebutuhan pokok toko kelontong di area Bekasi dan Jakarta Timur. Perusahaan mendistribusikan barang dari 4 pemasok utama (minyak goreng, tepung terigu, mi instan, kopi sachet, susu kental manis, dll.) ke sekitar 60 toko kelontong dengan metode penjualan tempo/kredit.

Aplikasi ERP Distribusi ini dibangun untuk menggantikan sistem lama (nota kertas manual dan spreadsheet bersama) yang kerap menimbulkan masalah:
- **Stok ganda / stok minus**: Dua staf penjualan menjanjikan stok yang sama pada waktu bersamaan.
- **Kredit macet**: Toko yang melewati batas kredit (*credit limit*) atau memiliki invoice jatuh tempo tetap dilayani.
- **Kebocoran margin**: Staf penjualan melihat harga modal/beli dan memberikan diskon berlebihan di bawah harga pokok.
- **Rekap manual**: Pemilik bisnis lambat mengetahui omzet bulanan, margin kotor, dan posisi piutang berjalan.

Sistem ini memastikan:
1. **Integritas Stok Real-Time**: Stok divalidasi ketat dengan penguncian baris (`FOR UPDATE`) di level database untuk mencegah *race condition*.
2. **Kepatuhan Aturan Bisnis**: Otomatisasi pembatasan kredit (BR-05), verifikasi diskon (BR-03), dan persetujuan khusus harga di bawah HPP (BR-04).
3. **Kerahasiaan Data (RBAC)**: Harga beli, HPP, dan margin hanya dapat diakses oleh Manajer (BR-12).
4. **Audit Trail Lengkap**: Seluruh mutasi stok dan manipulasi data krusial tercatat di kartu stok dan audit log (BR-11, BR-12).

---

## 2. Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [Lucide React Icons](https://lucide.dev/)
- **Notifikasi**: [Sonner](https://sonner.emilkowal.ski/)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL dengan RLS, Stored Procedures transaksional, triggers, dan Auth)
- **Deployment Target**: [Netlify](https://www.netlify.com/) (dengan header `X-Robots-Tag: noindex, nofollow` untuk aplikasi internal)
- **Integrasi Eksternal (Opsional)**: [Mayar Sandbox](https://mayar.id/) untuk tautan bayar tagihan piutang

---

## 3. Daftar Akun Uji & Peran

Aplikasi ini adalah **sistem internal** (tanpa registrasi mandiri publik). Masing-masing akun uji telah dikonfigurasi dengan kata sandi latihan khusus per peran:

| Peran | Nama | Email | Kata Sandi | Status | Hak Akses Utama |
|---|---|---|---|---|---|
| **Manajer** | Hendra Wijaya | `hendra@sinarabadi.test` | `hendramanajer1` | Aktif | Akses seluruh fitur; tambah barang; ubah harga jual; approve/reject PO; input HPP; batalkan SO terkonfirmasi (alasan min. 10 karakter); pelunasan tagihan; laporan laba/margin; audit log; kelola akun pengguna. |
| **Staf Penjualan** | Rina Kartika | `rina@sinarabadi.test` | `rinastafjual1` | Aktif | Input pelanggan; buat draf pesanan jual; beri diskon maks 10%; konfirmasi draf milik sendiri; pantau stok & harga jual. *(HPP & margin disembunyikan)*. |
| **Staf Penjualan** | Dimas Prasetyo | `dimas@sinarabadi.test` | `dimasstafjual2` | Aktif | Sama dengan Rina Kartika (disediakan untuk menguji transaksi pemesanan bersamaan/konkurensi). |
| **Staf Gudang** | Joko Susanto | `joko@sinarabadi.test` | `jokogudang1` | Aktif | Edit data barang selain harga; kelola data pemasok; ajukan pembelian; catat penerimaan barang PO; ubah pesanan menjadi dikirim; catat penyesuaian stok opname fisik. |
| **Nonaktif (Uji)** | Agus Salim | `agus@sinarabadi.test` | `agustafjualnon3` | Nonaktif | Akun nonaktif: Sistem harus menolak upaya login dan memblokir akses rute. |

---

## 4. Instruksi Menjalankan Secara Lokal

### Prasyarat
- **Node.js** v20+ atau v24+
- **npm** v10+ atau v11+
- Proyek **Supabase** aktif

### Langkah Instalasi
1. **Clone repository**:
   ```bash
   git clone <URL_REPO_ANDA>
   cd "ERP-Veronica Regina Mambu"
   ```

2. **Instal dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variables**:
   Salin template `.env.example` menjadi `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Buka file `.env.local` dan isi URL serta Kunci API Supabase Anda:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh......
   SUPABASE_SERVICE_ROLE_KEY=eyJh......
   ```

4. **Setup Database**:
   - Jalankan migrasi skema tabel Supabase DDL.
   - Buat 5 akun di Supabase Auth sesuai daftar akun uji di atas.
   - Impor data awal dari `Data_Contoh_ERP.xlsx`.

5. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```
   Buka browser di `http://localhost:3000`.

---

## 5. Rencana & Kasus Uji (Test Plan)

Dokumentasi lengkap **20 Test Case Aturan Bisnis** (BR-01 s/d BR-12) tersedia pada berkas:
👉 [`docs/test-plan.md`](./docs/test-plan.md)

Kasus batas yang diuji mencakup:
- Konfirmasi pesanan bersamaan untuk stok tersisa 1 dus (`SO-00038` vs `SO-00039`).
- Penolakan konfirmasi pesanan untuk stok kosong (`SO-00040`).
- Penolakan konfirmasi jika melebihi plafon kredit (`SO-00041`).
- Penolakan konfirmasi jika memiliki invoice lewat jatuh tempo (`SO-00042`).
- Penolakan pesanan di bawah harga pokok untuk Staf Penjualan (`SO-00044`).
- Penolakan penerimaan berlebih dan penerimaan ganda pada PO (`PO-00016`).

---

## 6. Checklist Penyelesaian & Kesiapan Rilis

- [x] Inisialisasi Proyek Next.js App Router, TypeScript, dan Tailwind CSS
- [x] Instalasi dependensi UI (Lucide React, Radix UI, Sonner Toast, Supabase SSR)
- [x] Struktur folder modular (`components/ui`, `components/layout`, `app/(auth)`, `app/(dashboard)`, `lib/supabase`, `types`)
- [x] Dokumentasi `README.md`, `.env.example`, dan `docs/test-plan.md`
- [ ] Database Schema DDL & Row Level Security (RLS) di Supabase
- [ ] Stored Procedure / Trigger transaksional atomik (`FOR UPDATE`)
- [ ] Seeding data master dan riwayat transaksi dari Excel
- [ ] Halaman Otentikasi & Route Guard berbasis peran
- [ ] Modul Dashboard khusus untuk ketiga peran
- [ ] Modul Master Data Barang, Pemasok, dan Pelanggan
- [ ] Modul Pembelian (Pengajuan, Persetujuan Manajer, dan Penerimaan Gudang)
- [ ] Modul Pesanan Jual (Draf, Konfirmasi multi-rule, Pengiriman, dan Pelunasan)
- [ ] Modul Laporan (Grafik Mingguan Omzet & Margin, Aging Piutang, Ekspor CSV)
- [ ] Modul Pengaturan (Kelola Akun & Audit Log Perubahan Data)
- [ ] Fitur Nilai Tambah: Cetak Surat Jalan Pengemudi & Sandbox Mayar
- [ ] Deployment ke Netlify dengan tag `noindex`
- [ ] Perekaman Video Demo 3-5 Menit untuk Pengumpulan Capstone
