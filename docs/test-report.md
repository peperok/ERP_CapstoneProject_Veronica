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
| **Kelompok C: Kredit, Piutang & Atomisitas Stok** | TC-07, TC-08, TC-09, TC-10, TC-11, TC-12, TC-13 | Selesai | **100% PASSED (7/7)** |
| **Kelompok D: Pengiriman, Pembatalan & Keamanan** | TC-15, TC-16, TC-20 | Selesai | **100% PASSED (3/3)** |

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

### Detail Hasil Pengujian: Kelompok C

#### 11. TC-07: Penolakan konfirmasi pesanan di bawah harga pokok oleh Staf Penjualan (BR-04)

- **Pelaku**: Staf Penjualan (`rina@sinarabadi.test`)
- **Tindakan**: Rina mencoba mengonfirmasi pesanan draf `SO-00044` yang memuat item Gula Pasir dengan diskon 10% sehingga harga jual satuan menjadi Rp325.800 (di bawah HPP Rp341.000).
- **Hasil yang Diharapkan**: Konfirmasi ditolak dengan pesan: *"Harga di bawah batas, minta persetujuan Manajer"*.
- **Hasil Aktual**:
  - Stored Procedure `konfirmasi_pesanan_jual` memeriksa kondisi `subtotal < (harga_pokok * jumlah)`.
  - Karena pelaku berstatus peran `penjualan`, transaksi ditolak dengan pesan standar PRD: `"Harga di bawah batas, minta persetujuan Manajer."`
- **Verdict**: **PASSED ✅**

#### 12. TC-08: Persetujuan pesanan di bawah harga pokok oleh Manajer (BR-04)

- **Pelaku**: Manajer (`hendra@sinarabadi.test`)
- **Tindakan**: Hendra membuka draf pesanan `SO-00044` dan melakukan konfirmasi pesanan jual.
- **Hasil yang Diharapkan**: Konfirmasi berhasil diproses, status berubah menjadi `dikonfirmasi`, stok berkurang dari gudang.
- **Hasil Aktual**:
  - Manajer berhasil melakukan otorisasi pesanan di bawah HPP.
  - Status pesanan berhasil berubah menjadi `dikonfirmasi`.
  - Stok Gula Pasir terpotong 1 unit dan kartu stok mencatat mutasi keluar untuk dokumen `SO-00044`.
- **Verdict**: **PASSED ✅**

#### 13. TC-09: Penolakan konfirmasi jika melebihi batas kredit (BR-05)

- **Pelaku**: Staf Penjualan Dimas Prasetyo (`dimas@sinarabadi.test`)
- **Tindakan**: Dimas mengonfirmasi pesanan draf `SO-00041` untuk pelanggan Toko Rejeki Lancar (Batas Kredit: Rp8.000.000, Total Piutang Berjalan: Rp7.564.000, Nilai Pesanan Baru: Rp1.086.000, total baru = Rp8.650.000).
- **Hasil yang Diharapkan**: Konfirmasi ditolak karena total piutang baru melebihi batas kredit pelanggan.
- **Hasil Aktual**:
  - Sistem menghitung `v_total_piutang_berjalan + v_pesanan.total = Rp8.650.000 > Rp8.000.000`.
  - Transaksi digagalkan dengan pesan: `"Konfirmasi ditolak: Total piutang (Rp7564000) ditambah pesanan (Rp1086000) melebihi batas kredit (Rp8000000)."`.
- **Verdict**: **PASSED ✅**

#### 14. TC-10: Penolakan konfirmasi akibat tagihan lewat jatuh tempo (BR-05)

- **Pelaku**: Staf Penjualan Rina Kartika (`rina@sinarabadi.test`)
- **Tindakan**: Rina mengonfirmasi pesanan draf `SO-00042` untuk pelanggan Toko Maju Bersama yang masih memiliki faktur `SO-00015` jatuh tempo 30 September 2026 yang belum dilunasi.
- **Hasil yang Diharapkan**: Konfirmasi ditolak dengan peringatan bahwa pelanggan memiliki tagihan yang telah lewat jatuh tempo.
- **Hasil Aktual**:
  - Query pengecekan `status = 'dikirim' AND jatuh_tempo < CURRENT_DATE` mendeteksi adanya tagihan menunggak.
  - Transaksi ditolak dengan pesan: `"Konfirmasi ditolak: Pelanggan memiliki tagihan yang telah lewat jatuh tempo."`.
- **Verdict**: **PASSED ✅**

#### 15. TC-11: Pelanggan baru otomatis batas kredit Rp0 (BR-05)

- **Pelaku**: Staf Penjualan Rina Kartika (`rina@sinarabadi.test`)
- **Tindakan**:
  1. Mendaftarkan pelanggan baru melalui form pelanggan (secara otomatis limit kredit terisi Rp0 untuk peran Sales).
  2. Mencoba mengonfirmasi pesanan jual untuk pelanggan baru tersebut sebelum Manajer menaikkan batas limit kreditnya.
- **Hasil yang Diharapkan**: Pelanggan baru otomatis memiliki batas kredit Rp0 dan pesanan kredit tidak dapat dikonfirmasi.
- **Hasil Aktual**:
  - Pelanggan baru tersimpan dengan `batas_kredit: 0`.
  - Saat konfirmasi dicoba, Stored Procedure menolak transaksi dengan pesan: `"Konfirmasi ditolak: Total piutang (Rp0) ditambah pesanan (Rp78000) melebihi batas kredit (Rp0)."`.
- **Verdict**: **PASSED ✅**

#### 16. TC-12: Penolakan konfirmasi jika stok salah satu barang kosong (BR-06)

- **Pelaku**: Staf Penjualan Rina Kartika (`rina@sinarabadi.test`)
- **Tindakan**: Rina mengonfirmasi pesanan `SO-00040` yang memuat dua barang: Tepung Terigu (stok 38) dan Kopi Sachet (stok 0).
- **Hasil yang Diharapkan**: Seluruh transaksi gagal (atomik), pesan stok tidak cukup tampil, dan stok Tepung Terigu tidak boleh terpotong.
- **Hasil Aktual**:
  - Transaksi dibatalkan secara atomik oleh pengecekan stok dengan pesan: `"Stok barang Kopi Sachet 3 in 1 isi 12 renceng tidak mencukupi (sisa 0, diminta 3). Seluruh konfirmasi dibatalkan."`.
  - Stok Tepung Terigu diverifikasi tetap utuh 38 unit (tidak terjadi pemotongan parsial).
- **Verdict**: **PASSED ✅**

#### 17. TC-13: Pencegahan race condition (stok minus) pada konfirmasi bersamaan (BR-06)

- **Pelaku**: Staf Penjualan Rina Kartika & Dimas Prasetyo
- **Tindakan**:
  1. Sisa stok Susu Kental Manis (`BRG-011`) hanya tersisa 1 dus di gudang.
  2. Rina (`SO-00038`) dan Dimas (`SO-00039`) masing-masing memesan 1 dus Susu Kental Manis.
  3. Kedua staf melakukan konfirmasi pesanan secara tepat bersamaan (simultan via asynchronous concurrent call).
- **Hasil yang Diharapkan**: Tepat 1 pesanan berhasil terkonfirmasi, 1 pesanan lainnya ditolak karena stok habis, dan stok akhir tidak boleh minus (stok = 0).
- **Hasil Aktual**:
  - Karena Stored Procedure menggunakan mekanisme database row-level locking `SELECT ... FOR UPDATE OF b` pada tabel `barang`, transaksi pertama mengunci baris barang dan memotong stok dari 1 menjadi 0.
  - Transaksi kedua yang membaca baris tersebut mendapati stok telah menjadi 0 dan langsung dibatalkan atomik dengan pesan: `"Stok barang Susu Kental Manis 370 g isi 48 tidak mencukupi (sisa 0, diminta 1). Seluruh konfirmasi dibatalkan."`.
  - Hasil simultan: **Tepat 1 Berhasil, 1 Gagal**. Stok akhir barang tetap **0** (tidak minus / tidak corrupt).
- **Verdict**: **PASSED ✅**

---

### Detail Hasil Pengujian: Kelompok D

#### 18. TC-15: Alur status pengiriman & pencatatan jatuh tempo otomatis (BR-07)

- **Pelaku**: Staf Gudang Joko Susanto (`joko@sinarabadi.test`)
- **Tindakan**:
  1. Staf gudang membuka daftar pesanan berstatus `dikonfirmasi`.
  2. Menekan tombol "Kirim Pesanan" untuk pesanan pelanggan dengan termin pembayaran 14 hari.
- **Hasil yang Diharapkan**: Status pesanan berubah menjadi `dikirim`, tanggal pengiriman tercatat saat ini, dan tanggal jatuh tempo pembayaran terhitung secara otomatis (`tanggal_kirim + termin_hari`).
- **Hasil Aktual**:
  - Status pesanan berhasil diperbarui menjadi `dikirim`.
  - Kolom `dikirim_pada` terisi timestamp pengiriman.
  - Kolom `jatuh_tempo` terisi otomatis tanggal hari pengiriman + 14 hari.
  - Aksi pengiriman tercatat ke tabel `audit_log` dengan aksi `kirim_pesanan`.
- **Verdict**: **PASSED ✅**

#### 19. TC-16: Pembatalan pesanan terkonfirmasi wajib alasan min. 10 karakter & restok (BR-08)

- **Pelaku**: Manajer Hendra Wijaya (`hendra@sinarabadi.test`)
- **Tindakan**:
  1. Mencoba membatalkan pesanan terkonfirmasi tanpa mengisi alasan atau alasan < 10 karakter (misal: `"Batal"`).
  2. Membatalkan pesanan terkonfirmasi dengan alasan >= 10 karakter (misal: `"Pelanggan membatalkan pesanan secara sepihak"`).
- **Hasil yang Diharapkan**:
  - Alasan < 10 karakter ditolak oleh sistem.
  - Alasan >= 10 karakter berhasil membatalkan pesanan, status berubah menjadi `dibatalkan`, dan stok barang otomatis dikembalikan ke gudang (restok).
- **Hasil Aktual**:
  - Stored Procedure `batalkan_pesanan_dikonfirmasi` menolak input alasan pendek dengan pesan: `"Alasan pembatalan wajib diisi paling sedikit 10 karakter."`.
  - Pembatalan dengan alasan valid berhasil diproses; status pesanan menjadi `dibatalkan`, alasan tersimpan di `alasan_batal`.
  - Stok fisik barang di gudang otomatis bertambah kembali sesuai jumlah pesanan (+2 unit), dan kartu stok mencatat mutasi jenis `batal`.
- **Verdict**: **PASSED ✅**

#### 20. TC-20: Kerahasiaan data HPP/margin dan integritas audit log (BR-12)

- **Pelaku**: Rina Kartika (Staf Penjualan) & Hendra Wijaya (Manajer)
- **Tindakan**:
  1. Rina login ke sistem dan memeriksa daftar master barang serta rincian pesanan.
  2. Hendra (Manajer) melakukan perubahan harga jual pada master barang.
- **Hasil yang Diharapkan**:
  - Kolom HPP dan margin keuntungan tidak pernah ditampilkan kepada non-Manajer (disaring di layer Next.js SSR / database view).
  - Setiap perubahan harga jual oleh Manajer wajib tercatat secara lengkap di `audit_log` (memuat pelaku, nilai lama, nilai baru, dan waktu).
- **Hasil Aktual**:
  - Akses non-Manajer terhadap HPP disaring pada query SSR (`harga_pokok: isManajer ? Number(b.harga_pokok) : undefined`). Kolom HPP dan Margin tidak dirender di browser Sales maupun Gudang.
  - Perubahan harga jual master barang oleh Manajer sukses tercatat di tabel `audit_log` dengan aksi `ubah_harga_jual`, mencatat `nilai_lama.harga_jual` dan `nilai_baru.harga_jual` secara presisi.
- **Verdict**: **PASSED ✅**

---

### Kesimpulan Akhir Pengujian

Seluruh **20 Test Case Aturan Bisnis (TC-01 s/d TC-20)** pada sistem ERP Distribusi CV Sinar Abadi Niaga telah diuji dan diverifikasi secara menyeluruh dengan hasil **100% PASSED (20/20)**:
- **Integritas Transaksi & Stok**: Keandalan transaksi terbukti bebas dari risiko *race condition*, pemotongan stok minus, maupun inkonsistensi parsial berkat implementasi Stored Procedure PostgreSQL dengan *row locking* (`FOR UPDATE`).
- **Keamanan & Otorisasi Hak Akses (RBAC)**: Pembatasan hak akses antar peran (Manajer, Sales, Gudang) berjalan efektif pada layer UI, API, dan Database RLS.
- **Auditabilitas**: Seluruh mutasi stok dan manipulasi harga/status terekam dengan jejak audit yang lengkap.
