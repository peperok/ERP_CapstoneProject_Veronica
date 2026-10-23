# Laporan Hasil Pengujian Aturan Bisnis (Test Report)

## ERP Distribusi CV Sinar Abadi Niaga

Dokumen ini mendokumentasikan hasil eksekusi pengujian komprehensif terhadap **20 Test Case Aturan Bisnis (TC-01 s/d TC-20)** sesuai rancangan [test-plan.md](file:///d:/Bootcamp/Capstone%20Project/Capstone_ERP_Veronica%20Regina%20Mambu/ERP-Veronica%20Regina%20Mambu/docs/test-plan.md).

---

### Informasi Lingkungan Pengujian

- **Aplikasi**: ERP Distribusi Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Database**: Supabase PostgreSQL (Production-grade with RPC, RLS, Indexes, & Foreign Key Constraints)
- **Akun Uji Terlibat**:
  - `hendra@sinarabadi.test` (Manajer)
  - `rina@sinarabadi.test` (Staf Penjualan 1)
  - `dimas@sinarabadi.test` (Staf Penjualan 2 - Uji Bersamaan / Race Condition)
  - `joko@sinarabadi.test` (Staf Gudang)
  - `agus@sinarabadi.test` (Staf Penjualan - Akun Nonaktif)
- **Kata Sandi Standar**: `Latihan#2026`

---

### Ringkasan Status Eksekusi

| Kelompok Pengujian                                | Cakupan Test Case                               | Status Kelompok |    Hasil / Verdict    |
| ------------------------------------------------- | ----------------------------------------------- | :-------------: | :-------------------: |
| **Kelompok A: Master Barang & Pengadaan (PO)**    | TC-01, TC-02, TC-03, TC-17, TC-18, TC-19        |     Selesai     | **100% PASSED (6/6)** |
| **Kelompok B: Validasi & Diskon Sales Order**     | TC-04, TC-05, TC-06, TC-14                      |     Selesai     | **100% PASSED (4/4)** |
| **Kelompok C: Kredit, Piutang & Atomisitas Stok** | TC-07, TC-08, TC-09, TC-10, TC-11, TC-12, TC-13 |    Menunggu     |           -           |
| **Kelompok D: Pengiriman, Pembatalan & Keamanan** | TC-15, TC-16, TC-20                             |    Menunggu     |           -           |

---

### Detail Hasil Pengujian: Kelompok A

#### 1. TC-01: Penambahan barang baru oleh non-Manajer (BR-01)

- **Pelaku**: Staf Gudang (`joko@sinarabadi.test`)
- **Tindakan**: Mencoba mengakses dan mengirimkan perintah penambahan master barang baru.
- **Hasil yang Diharapkan**: Tombol form disembunyikan/dinonaktifkan untuk selain Manajer, dan akses ditolak.
- **Hasil Aktual**: Akses pembuatan master barang diblokir untuk peran `gudang`. Form modal dan handler membatasi izin secara ketat hanya untuk pengguna berstatus `manajer`.
- **Verdict**: **PASSED ✅**

#### 2. TC-02: Validasi keunikan kode barang & harga jual > 0 (BR-01)

- **Pelaku**: Manajer (`hendra@sinarabadi.test`)
- **Tindakan**:
  1. Input barang baru dengan kode `BRG-001` (kode yang telah ada).
  2. Input barang baru dengan harga jual Rp0.
- **Hasil yang Diharapkan**: Kode duplikat ditolak PostgreSQL constraint (Unique), harga Rp0 ditolak validasi bisnis.
- **Hasil Aktual**: Kode duplikat `BRG-001` ditolak oleh basis data dengan error code `23505` (_unique_violation_). Form secara aktif menolak input harga jual Rp0 dengan pesan _"Harga jual harus lebih dari Rp0"_.
- **Verdict**: **PASSED ✅**

#### 3. TC-03: Tampilan penanda stok menipis otomatis (BR-01)

- **Pelaku**: Semua peran
- **Tindakan**: Pengecekan status visual pada barang Saus Sambal 340 ml (`BRG-008`).
- **Data Aktual**: Sisa stok = 8 dus, Stok minimum = 8 dus (`stok <= stok_minimum`).
- **Hasil yang Diharapkan**: Menampilkan badge visual penanda stok menipis berwarna oranye/peringatan.
- **Hasil Aktual**: Badge status **"Stok Menipis"** aktif secara otomatis saat stok <= stok minimum. Diperkuat dengan fitur notifikasi email low stock (`/api/notify-low-stock`).
- **Verdict**: **PASSED ✅**

#### 4. TC-17: Pengajuan & persetujuan pembelian (Purchase Order) (BR-09)

- **Pelaku**: Joko Susanto (Gudang) & Hendra Wijaya (Manajer)
- **Tindakan**:
  1. Joko mengajukan Purchase Order baru sebanyak 10 dus.
  2. Hendra meninjau, menyetujui, dan menginput harga beli satuan Rp150.000.
- **Hasil yang Diharapkan**: Status PO awal `diajukan`; setelah disetujui Manajer status berubah `disetujui` dan harga beli tersimpan rahasia.
- **Hasil Aktual**: PO terbuat dengan status awal `diajukan`. Manajer berhasil menyetujui PO dengan mencatat `diputuskan_oleh`, waktu persetujuan, dan `harga_beli_satuan` Rp150.000 (status berubah menjadi `disetujui`).
- **Verdict**: **PASSED ✅**

#### 5. TC-18: Penerimaan barang PO bertambah ke stok & tolak penerimaan kedua (BR-10)

- **Pelaku**: Staf Gudang (`joko@sinarabadi.test`)
- **Tindakan**:
  1. Uji terima 11 dus (melebihi jumlah PO 10 dus).
  2. Uji terima valid sejumlah 10 dus.
  3. Uji penerimaan ulang kedua kali pada nomor PO yang sama.
- **Hasil yang Diharapkan**: Penerimaan melebihi pesanan ditolak; penerimaan valid menambah stok fisik & memperbarui HPP secara atomic (_weighted average_); penerimaan kedua ditolak.
- **Hasil Aktual**:
  - Percobaan terima 11 dus langsung ditolak RPC: _"Jumlah diterima harus antara 1 sampai jumlah dipesan"_.
  - Penerimaan 10 dus berhasil secara atomis: stok fisik bertambah +10 (dari 80 menjadi 90), HPP diperbarui, status PO berubah menjadi `diterima`.
  - Percobaan kedua pada PO yang sama ditolak: _"Penerimaan barang hanya dapat dilakukan untuk pembelian berstatus disetujui"_.
- **Verdict**: **PASSED ✅**

#### 6. TC-19: Penyesuaian stok fisik (Stock Opname) wajib alasan min. 10 karakter (BR-11)

- **Pelaku**: Staf Gudang (`joko@sinarabadi.test`)
- **Tindakan**:
  1. Mencoba opname stok dengan alasan pendek `"Rusak"` (5 karakter).
  2. Melakukan opname stok dengan alasan valid: `"Kemasan rusak terkena air gudang"` (32 karakter).
- **Hasil yang Diharapkan**: Alasan < 10 karakter ditolak; alasan >= 10 karakter berhasil memperbarui stok dan mencatat riwayat kartu stok (_mutasi_stok_).
- **Hasil Aktual**:
  - Alasan < 10 karakter ditolak validasi bisnis: _"Alasan penyesuaian fisik wajib minimal 10 karakter"_.
  - Alasan valid >= 10 karakter berhasil memperbarui stok dan tercatat ke tabel `mutasi_stok` (jenis: `penyesuaian`) lengkap dengan nomor dokumen penyesuaian, kuantitas selisih, dan audit log.
- **Verdict**: **PASSED ✅**

---

### Detail Hasil Pengujian: Kelompok B

#### 7. TC-04: Pembatasan 1 sampai 20 baris per pesanan & barang duplikat (BR-02)

- **Pelaku**: Staf Penjualan (`rina@sinarabadi.test`)
- **Tindakan**:
  1. Memasukkan barang yang sama pada dua baris berbeda dalam satu draf pesanan.
  2. Mencoba menambahkan baris hingga melebihi batas 20 baris.
- **Hasil yang Diharapkan**: Barang duplikat ditolak oleh sistem; baris dibatasi minimal 1 dan maksimal 20 baris.
- **Hasil Aktual**:
  - Duplikasi barang dalam 1 pesanan langsung ditolak oleh PostgreSQL Unique Constraint `uq_pesanan_barang` (error `23505`) dan UI form menolak pemilihan barang duplikat.
  - Form membatasi baris antara 1 sampai 20 baris; tombol tambah baris otomatis dinonaktifkan saat baris ke-20 tercapai.
- **Verdict**: **PASSED ✅**

#### 8. TC-05: Batas diskon Staf Penjualan maksimal 10% (BR-03)

- **Pelaku**: Staf Penjualan (`rina@sinarabadi.test`)
- **Tindakan**:
  1. Memasukkan diskon 10% pada item pesanan.
  2. Mencoba memasukkan diskon 11% pada item pesanan.
- **Hasil yang Diharapkan**: Diskon 10% diterima; diskon 11% ditolak dengan peringatan bahwa diskon melebihi wewenang staf penjualan (maksimal 10%).
- **Hasil Aktual**:
  - Diskon 10% berhasil diterima dan subtotal terhitung akurat sesuai rumus potongan harga.
  - Diskon 11% diblokir oleh validasi form (`diskon > maxDiskonAllowed` di mana batas untuk peran `penjualan` adalah 10%).
- **Verdict**: **PASSED ✅**

#### 9. TC-06: Batas diskon Manajer maksimal 25% (BR-03)

- **Pelaku**: Manajer (`hendra@sinarabadi.test`)
- **Tindakan**:
  1. Memasukkan diskon 20% pada pesanan jual.
  2. Memasukkan diskon 26% pada pesanan jual.
- **Hasil yang Diharapkan**: Diskon 20% diterima; diskon 26% ditolak form dan ditolak oleh batasan integrity database (_CHECK constraint_ `diskon_persen <= 25`).
- **Hasil Aktual**:
  - Diskon 20% berhasil diproses untuk peran Manajer.
  - Diskon 26% diblokir oleh form dan bila diinjeksi ke basis data langsung ditolak oleh constraint PostgreSQL `item_pesanan_jual_diskon_persen_check`.
- **Verdict**: **PASSED ✅**

#### 10. TC-14: Pembatasan pembatalan draf hanya oleh pembuat (BR-07)

- **Pelaku**: Dimas Prasetyo (Sales) & Rina Kartika (Sales) & Hendra Wijaya (Manajer)
- **Tindakan**:
  1. Dimas membuka draf pesanan yang dibuat oleh Rina dan mencoba membatalkannya.
  2. Rina membuka draf pesanan miliknya sendiri untuk membatalkan.
  3. Hendra (Manajer) membuka draf untuk pembatalan supervisi.
- **Hasil yang Diharapkan**: Dimas tidak memiliki hak/tombol untuk membatalkan draf milik Rina; Rina dapat membatalkan draf miliknya sendiri; Manajer dapat membatalkan.
- **Hasil Aktual**: Tombol batalkan draf hanya aktif jika `order.dibuat_oleh === currentUserId` atau pengguna adalah `manajer`. Aksi pembatalan oleh Dimas diblokir, sedangkan Rina dan Hendra berhasil.
- **Verdict**: **PASSED ✅**

---

_(Dokumen akan diperbarui secara berkesinambungan saat Kelompok C dan D dijalankan)_
