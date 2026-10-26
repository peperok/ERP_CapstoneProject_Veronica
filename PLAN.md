# Rencana Kerja Bertahap (Implementation Plan)

## Aplikasi ERP Distribusi CV Sinar Abadi Niaga

Dokumen ini memuat tahapan terstruktur pengerjaan Capstone Project sesuai petunjuk teknis, PRD, dan standar penilaian. Setiap tahap dikerjakan secara modular dan bertahap dengan status checklist yang diperbarui.

---

### Tahap 1: Inisialisasi Proyek, Pondasi Frontend & Dokumentasi Acuan

- [x] **1.1. Inisialisasi Next.js (App Router, TypeScript, Tailwind CSS)**
  - Inisialisasi proyek Next.js di direktori workspace dengan konfigurasi TypeScript, ESLint, dan Tailwind CSS.
  - Setup dependensi esensial (`lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`, `@supabase/ssr`, `@supabase/supabase-js`, `sonner`).
- [x] **1.2. Setup shadcn/ui & Komponen Dasar**
  - Pasang komponen UI: `button`, `input`, `table`, `badge`, `dialog`, `select`, `dropdown-menu`, `card`, `sonner` (toast).
  - Konfigurasi token tema dan font antarmuka.
- [x] **1.3. Pembuatan Struktur Folder Modular**
  - Buat folder modular: `src/components/ui`, `src/components/layout`, `src/app/(auth)`, `src/app/(dashboard)`, `src/lib/supabase`, `src/types`.
  - Buat helper klien/server Supabase dan tipe domain (`src/types/erp.ts`, `src/types/database.ts`).
  - Siapkan shell layout dasar (`sidebar.tsx`, `header.tsx`, `role-gate.tsx`).
- [x] **1.4. Dokumentasi & Konfigurasi Lingkungan**
  - Buat file `.env.example` dan pastikan `.env.local` terdaftar di `.gitignore`.
  - Buat `README.md` profesional (deskripsi sistem, arsitektur tech stack, 3 peran akun uji, panduan setup lokal, checklist).
  - Buat `docs/test-plan.md` berisi 20 test case aturan bisnis (BR-01 s/d BR-12) lengkap dengan akun uji dan kondisi batas.

---

### Tahap 2: Database Schema & Keamanan Database (Supabase / PostgreSQL)

- [x] **2.1. DDL Schema Tables**
  - Tabel: `profiles`, `pemasok`, `pelanggan`, `barang`, `pembelian`, `pesanan_jual`, `item_pesanan_jual`, `mutasi_stok`, `audit_log`.
- [x] **2.2. Row Level Security (RLS) & Kolom Rahasia**
  - Proteksi kolom harga pokok/margin agar tidak bocor ke Staf Penjualan / Staf Gudang (BR-12).
- [x] **2.3. PostgreSQL Functions / Triggers Transaksional**
  - RPC konfirmasi pesanan dengan `FOR UPDATE` untuk mencegah stok minus pada konkurensi (BR-06).
  - Validasi limit kredit dan jatuh tempo (BR-05).
  - Trigger pencatatan mutasi stok dan audit log (BR-11, BR-12).
- [x] **2.4. Seeding Data Contoh**
  - Impor data dari `Data_Contoh_ERP.xlsx` (16 barang, 4 pemasok, 10 pelanggan, data transaksi 1 Sept - 14 Okt 2026).

---

### Tahap 3: Autentikasi, Role Guard & Layout Dashboard

- [x] **3.1. Halaman Login & Autentikasi Supabase**
  - Login dengan email & kata sandi akun uji.
  - Penolakan akun nonaktif (Agus Salim) (BR non-fungsional).
- [x] **3.2. Middleware & Role-Based Route Guard**
  - Proteksi rute halaman via Next.js Middleware dan database role check.
- [x] **3.3. Dashboard Berbasis Peran**
  - Tampilan khusus Manajer (Omzet, margin, piutang, barang menipis, grafik mingguan).
  - Tampilan khusus Staf Penjualan (Pesanan saya, tagihan jatuh tempo).
  - Tampilan khusus Staf Gudang (Pesanan siap kirim, stok menipis, PO menunggu barang).

---

### Tahap 4: Modul Master Data (Barang, Pemasok, Pelanggan)

- [x] **4.1. Modul Barang & Stok**
  - Pencarian, filter, penanda stok menipis (BR-01).
  - Hak ubah non-harga untuk Gudang; Hak tambah & harga jual untuk Manajer; Kartu mutasi stok (BR-11).
  - Form penyesuaian stok fisik (alasan min. 10 karakter).
- [x] **4.2. Modul Pelanggan & Batas Kredit**
  - CRUD pelanggan, batas kredit awal Rp0, termin bayar (0, 7, 14, 30 hari).
  - Hak ubah batas kredit khusus Manajer (BR-05).
- [x] **4.3. Modul Pemasok**
  - Manajemen data 4 pemasok aktif.

---

### Tahap 5: Modul Pembelian (Purchase Order)

- [x] **5.1. Pengajuan Pembelian**
  - Form pengajuan barang ke pemasok (1 s/d 10.000) oleh Gudang/Manajer (BR-09).
- [x] **5.2. Persetujuan & Penolakan oleh Manajer**
  - Form approval (isi harga beli satuan > 0) atau tolak (alasan min. 10 karakter) (BR-09).
- [x] **5.3. Penerimaan Barang**
  - Pencatatan barang tiba (1 s/d jumlah dipesan), penyesuaian HPP, penolakan penerimaan kedua (BR-10).

---

### Tahap 6: Modul Pesanan Jual (Sales Order) & Alur Transaksi

- [x] **6.1. Pembuatan Draf Pesanan**
  - Form dinamis multi-baris (1-20 baris), validasi diskon per baris (Sales max 10%, Manajer max 25%) (BR-02, BR-03).
- [x] **6.2. Konfirmasi Pesanan**
  - Validasi limit kredit & tagihan jatuh tempo (BR-05).
  - Validasi harga di bawah harga pokok (BR-04).
  - Pengurangan stok atomik & perlindungan race condition (BR-06).
- [x] **6.3. Pengiriman & Pelunasan**
  - Pengiriman pesanan oleh Gudang (menghitung jatuh tempo otomatis) (BR-07).
  - Pembatalan pesanan terkonfirmasi oleh Manajer (alasan min. 10 karakter & stok kembali) (BR-08).
  - Pencatatan pelunasan oleh Manajer (BR-07).

---

### Tahap 7: Modul Laporan, Audit Log & Fitur Nilai Tambah

- [x] **7.1. Laporan Manajer**
  - Grafik omzet & margin 8 minggu terakhir, tabel top margin barang, tabel aging piutang, modal ekspor multi-sheet Excel (.xlsx), PDF resmi A4, & CSV.
- [x] **7.2. Audit Log Sistem**
  - Daftar riwayat perubahan data sensitif dengan filter aksi, badge peran, format waktu WIB, dan modal JSON diff before/after values (BR-12).
- [x] **7.3. Fitur Nilai Tambah**
  - [x] Cetak surat jalan pengemudi (Delivery Order tanpa harga, tabel verifikasi fisik & 3 blok tanda tangan: Gudang, Sopir, Toko - BR-12).
  - [x] Notifikasi email stok menipis via Resend API (alert button di master barang, email HTML responsif, rincian defisit stok).
  - [x] Tautan bayar piutang via Mayar Sandbox & QRIS Dinamis (modal pop-up QRIS, tombol salin tautan, pengiriman faktur otomatis via WhatsApp toko, dan simulator webhook `payment.received` - Bab 11 PRD).
  - [x] **AI Executive & Operations Copilot (Diferensiator Bootcamp AI)**: Asisten cerdas real-time pada Header untuk semua peran (Manajer: analisis laba, mitigasi piutang macet & PO kritis; Penjualan: prospek plafon kredit & limit warning; Gudang: fulfillment velocity & stok opname).

---

### Tahap 8: Pengujian (20 Test Case), Polish & Deployment ke Netlify

- [x] **8.1. Eksekusi 20 Test Case Aturan Bisnis**
  - Verifikasi seluruh skenario pengujian di `docs/test-plan.md` dan pembukuan hasil di `docs/test-report.md` (100% PASSED: TC-01 s/d TC-20).
- [x] **8.2. Audit Keamanan & SEO**
  - Tag meta `robots: { index: false, follow: false }` pada `layout.tsx` untuk sistem ERP internal, perlindungan kredensial `.env.local` / `.gitignore`, dan penyaringan HPP untuk non-Manajer.
- [x] **8.3. Deployment ke Netlify & Pengujian Akhir URL Live**
  - Aplikasi berhasil di-deploy ke Netlify oleh pengguna dengan build Next.js 16 App Router sukses dan database Supabase aktif.
