# Test Plan Aturan Bisnis (Business Rules)
## ERP Distribusi CV Sinar Abadi Niaga

Dokumen ini memuat **20 Test Case** aturan bisnis komprehensif untuk pengujian fungsionalitas, validasi integritas data, pembatasan hak akses (Role-Based Access Control), dan keandalan sistem ERP sesuai PRD dan kriteria penilaian Capstone Project.

---

### Informasi Akun Uji
Seluruh akun uji terdaftar di database Supabase Auth dengan kata sandi spesifik masing-masing peran:

| No | Peran | Nama Pengguna | Email | Kata Sandi | Status Akun | Hak Akses Utama |
|---|---|---|---|---|---|---|
| 1 | **Manajer** | Hendra Wijaya | `hendra@sinarabadi.test` | `Latihan#2026` | Aktif | Akses penuh: Tambah barang, ubah harga jual, input HPP/harga beli, persetujuan/penolakan PO, pembatalan pesanan terkonfirmasi, pelunasan, laporan margin/laba, audit log |
| 2 | **Staf Penjualan** | Rina Kartika | `rina@sinarabadi.test` | `Latihan#2026` | Aktif | Pelanggan, buat pesanan draf, diskon maks 10%, konfirmasi draf milik sendiri, pantau stok & harga jual |
| 3 | **Staf Penjualan** | Dimas Prasetyo | `dimas@sinarabadi.test` | `Latihan#2026` | Aktif | Sama dengan Rina Kartika (digunakan untuk pengujian transaksi bersamaan / race condition) |
| 4 | **Staf Gudang** | Joko Susanto | `joko@sinarabadi.test` | `Latihan#2026` | Aktif | Pemasok, data barang (selain harga), ajukan PO, terima barang PO, kirim pesanan (status dikirim), penyesuaian stok opname |
| 5 | **Staf Penjualan (Nonaktif)** | Agus Salim | `agus@sinarabadi.test` | `Latihan#2026` | Nonaktif | Akun nonaktif: Sistem harus menolak login dan akses API |

---

### Matriks 20 Test Case Aturan Bisnis

| ID Test Case | Referensi Aturan | Nama Skenario & Tujuan Pengujian | Akun Pelaku | Data Uji / Kondisi Awal | Langkah Pengujian & Aksi | Hasil yang Diharapkan (Expected Result) |
|---|---|---|---|---|---|---|
| **TC-01** | **BR-01** | Penambahan barang baru oleh non-Manajer | Staf Gudang (`joko@...`) | Form tambah barang | Buka form/API tambah barang baru lalu kirim data produk. | Tombol dinonaktifkan/disembunyikan di UI, dan request API ditolak dengan error 403 Forbidden. |
| **TC-02** | **BR-01** | Validasi keunikan kode barang & harga jual > 0 | Manajer (`hendra@...`) | Kode `BRG-001` (sudah ada) atau harga jual Rp0 | Input barang baru dengan kode `BRG-001` atau harga jual Rp0. | Sistem menampilkan pesan validasi: Kode barang harus unik dan harga jual harus lebih dari Rp0. |
| **TC-03** | **BR-01** | Tampilan penanda stok menipis otomatis | Semua peran | Saus Sambal (`BRG-008`), stok = 8, min = 8 | Buka halaman daftar Barang dan lihat label status stok `BRG-008`. | Muncul badge/label **"Stok Menipis"** (warna kuning/oranye peringatan) karena stok <= stok minimum. |
| **TC-04** | **BR-02** | Pembatasan 1 sampai 20 baris per pesanan & barang duplikat | Staf Penjualan (`rina@...`) | Draf pesanan baru | 1. Tambah barang yang sama 2x pada pesanan.<br>2. Coba tambahkan lebih dari 20 item. | 1. Sistem menolak: barang hanya boleh 1 baris.<br>2. Tombol tambah baris nonaktif jika sudah 20 baris. |
| **TC-05** | **BR-03** | Batas diskon Staf Penjualan maksimal 10% | Staf Penjualan (`rina@...`) | Draf pesanan baru | 1. Berikan diskon 10% pada item.<br>2. Coba masukkan diskon 11%. | 1. Diskon 10% diterima & subtotal terhitung akurat.<br>2. Diskon 11% ditolak dengan notifikasi validasi batas maks 10%. |
| **TC-06** | **BR-03** | Batas diskon Manajer maksimal 25% | Manajer (`hendra@...`) | Draf pesanan baru | 1. Masukkan diskon 20%.<br>2. Masukkan diskon 26%. | 1. Diskon 20% diterima.<br>2. Diskon 26% ditolak (diskon di atas 25% dilarang untuk semua peran). |
| **TC-07** | **BR-04** | Penolakan konfirmasi pesanan di bawah harga pokok (Sales) | Staf Penjualan (`rina@...`) | Draf `SO-00044` (Gula diskon 10%, subtotal < modal) | Klik tombol konfirmasi pada pesanan `SO-00044`. | Konfirmasi ditolak dengan pesan: *"Harga di bawah harga pokok hanya boleh disetujui Manajer"*. |
| **TC-08** | **BR-04** | Persetujuan pesanan di bawah harga pokok oleh Manajer | Manajer (`hendra@...`) | Draf `SO-00044` | Buka `SO-00044` sebagai Manajer dan klik tombol konfirmasi. | Konfirmasi berhasil diproses, status berubah menjadi `dikonfirmasi`, stok berkurang. |
| **TC-09** | **BR-05** | Penolakan konfirmasi jika melebihi batas kredit | Staf Penjualan (`rina@...`) | Draf `SO-00041` (Toko Rejeki Lancar, piutang Rp7.564.000 / limit Rp8.000.000, pesanan Rp1.086.000) | Klik konfirmasi pesanan `SO-00041`. | Konfirmasi ditolak karena total piutang baru (Rp8.650.000) melebihi batas kredit Rp8.000.000. |
| **TC-10** | **BR-05** | Penolakan konfirmasi akibat tagihan lewat jatuh tempo | Staf Penjualan (`rina@...`) | Draf `SO-00042` (Toko Maju Bersama punya invoice tempo 30 Sept 2026 belum lunas) | Klik konfirmasi pesanan `SO-00042`. | Konfirmasi ditolak dengan pesan bahwa pelanggan memiliki tagihan yang telah lewat jatuh tempo. |
| **TC-11** | **BR-05** | Pelanggan baru otomatis batas kredit Rp0 | Staf Penjualan (`rina@...`) | Draf `SO-00045` (Toko Sumber Rezeki, pelanggan baru) | Coba konfirmasi pesanan untuk Toko Sumber Rezeki sebelum limit diubah Manajer. | Konfirmasi ditolak karena limit kredit pelanggan masih Rp0. |
| **TC-12** | **BR-06** | Penolakan konfirmasi jika stok salah satu barang kosong | Staf Penjualan (`rina@...`) | Draf `SO-00040` (Memuat Tepung Terigu dan Kopi Sachet stok 0) | Klik tombol konfirmasi pada pesanan `SO-00040`. | Seluruh konfirmasi gagal, pesan stok tidak cukup tampil, dan stok Tepung Terigu tidak boleh berkurang. |
| **TC-13** | **BR-06** | Pencegahan race condition (stok minus) pada konfirmasi bersamaan | Rina & Dimas (Sales) | Draf `SO-00038` & `SO-00039` (Keduanya pesan 1 dus Susu Kental Manis `BRG-011`, sisa stok 1) | Klik konfirmasi pada kedua pesanan secara simultan dari dua sesi browser. | Tepat 1 pesanan berhasil terkonfirmasi, 1 pesanan lainnya gagal ditolak stok habis. Stok akhir = 0 (tidak minus). |
| **TC-14** | **BR-07** | Pembatasan pembatalan draf hanya oleh pembuat | Staf Penjualan Dimas (`dimas@...`) | Draf dibuat oleh Rina Kartika | Dimas membuka draf pesanan milik Rina dan mencoba membatalkannya. | Tombol batalkan tidak tersedia bagi Dimas, dan jika via API akan mengembalikan error 403. |
| **TC-15** | **BR-07** | Alur status pengiriman & pencatatan jatuh tempo otomatis | Staf Gudang (`joko@...`) | Pesanan `dikonfirmasi` (Pelanggan termin 14 hari) | Staf gudang menekan tombol "Kirim Pesanan". | Status berubah menjadi `dikirim`, tanggal kirim tercatat hari ini, jatuh tempo otomatis = tanggal kirim + 14 hari. |
| **TC-16** | **BR-08** | Pembatalan pesanan terkonfirmasi wajib alasan min. 10 karakter & restok | Manajer (`hendra@...`) | Pesanan berstatus `dikonfirmasi` | 1. Batalkan tanpa alasan / < 10 karakter.<br>2. Batalkan dengan alasan >= 10 karakter. | 1. Ditolak: alasan minimal 10 karakter.<br>2. Berhasil batal, status jadi `dibatalkan`, stok dikembalikan ke gudang. |
| **TC-17** | **BR-09** | Pengajuan & persetujuan pembelian (Purchase Order) | Joko (Gudang) & Hendra (Manajer) | PO Baru untuk barang ke pemasok | 1. Joko mengajukan PO qty 10 dus.<br>2. Hendra approve & isi harga beli satuan Rp150.000. | 1. Status PO menjadi `diajukan`.<br>2. Status PO berubah `disetujui`, harga beli tersimpan (rahasia). |
| **TC-18** | **BR-10** | Penerimaan barang PO bertambah ke stok & tolak penerimaan kedua | Staf Gudang (`joko@...`) | `PO-00016` (Disetujui 15 dus Susu Kental Manis) | 1. Coba terima 16 dus.<br>2. Terima 15 dus.<br>3. Coba lakukan penerimaan ulang. | 1. Ditolak: terima > dipesan.<br>2. Berhasil terima, stok bertambah 15, HPP terupdate.<br>3. Penerimaan kedua ditolak. |
| **TC-19** | **BR-11** | Penyesuaian stok fisik (Stock Opname) wajib alasan min. 10 karakter | Staf Gudang (`joko@...`) | Margarin (`BRG-015`) | Lakukan penyesuaian stok fisik dengan alasan: *"Kemasan rusak terkena air gudang"*. | Stok barang terbarui, kartu stok mencatat mutasi jenis `penyesuaian` beserta alasan dan waktu pencatatan. |
| **TC-20** | **BR-12** | Kerahasiaan data HPP/margin dan integritas audit log | Rina (Sales) & Hendra (Manajer) | Halaman barang, pesanan, dan menu pengaturan | 1. Rina login: periksa kolom harga pokok & margin.<br>2. Hendra ubah harga jual barang. | 1. Kolom HPP & margin tidak tampil di layar Rina dan tidak dikirim di respons API.<br>2. Audit log mencatat riwayat perubahan harga jual (nilai lama vs baru). |

---

### Cara Menjalankan & Memverifikasi Test Plan
1. Siapkan database Supabase yang telah terisi data awal dari `Data_Contoh_ERP.xlsx`.
2. Buka 3 profil browser berbeda (atau sesi incognito):
   - Jendela 1: Login sebagai **Manajer** (`hendra@sinarabadi.test`)
   - Jendela 2: Login sebagai **Staf Penjualan** (`rina@sinarabadi.test`)
   - Jendela 3: Login sebagai **Staf Gudang** (`joko@sinarabadi.test`)
3. Jalankan masing-masing langkah uji sesuai nomor Test Case di atas.
4. Pastikan respons sistem, dialog peringatan, serta rekaman audit log di database sesuai dengan kolom *Expected Result*.
