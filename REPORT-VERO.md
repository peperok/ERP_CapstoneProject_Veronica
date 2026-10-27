# Laporan Pengujian — ERP Distribusi CV Sinar Abadi Niaga
URL: https://erp-sinarabadi.netlify.app · Tanggal uji: 27 Okt 2026 · Acuan: PRD ERP Distribusi (Bab 3–13)
Penguji: Grok Bot (atas nama Wahyu Tama). Semua pengujian lewat UI browser + curl untuk halaman publik.
Screenshot: `/workspace/erp-sinarabadi-test/` (file `T**-*.png`). CSV ekspor: `Laporan_Keuangan_ERP_2026-10-27.csv`.

## 1. Ringkasan
Aplikasi secara umum berfungsi baik: login 4 peran, dashboard per peran, menu per peran, guard URL untuk `/pembelian`, `/laporan`, `/pengaturan`, aturan stok/kredit/jatuh tempo/HPP, alur status, kartu stok, audit log, grafik mingguan, CSV, dan noindex lulus. Namun ada **temuan serius pada kontrol akses** yang dilarang PRD:

1. **KRITIS** — Staf Gudang bisa melunasi pesanan lewat tombol "Mayar → Simulasikan Pembayaran Sukses" (SO-00053 berubah *lunas* oleh Joko). PRD: hanya Manajer yang mencatat pelunasan (BR-07/BR-12). Tombol "Mayar" juga terlihat oleh Gudang.
2. **TINGGI** — Staf Gudang bisa membuka `/pelanggan` lewat URL (menu disembunyikan, tapi halaman tidak dijaga): melihat batas kredit & piutang semua toko, bisa tambah pelanggan dan mengubah data/status aktif pelanggan. PRD: Pelanggan hanya Staf Penjualan & Manajer.
3. **TINGGI** — Form pesanan untuk Manajer memiliki kolom **Harga Satuan yang bisa diketik** (default harga jual, tersimpan: dibuat SO-00054 dengan harga Rp26). PRD BR-03: harga satuan tidak bisa diketik manual.
4. SEDANG — Laporan "Total Piutang Berjalan" (Rp46.084.400) ≠ Dashboard (Rp56.059.400): laporan hanya menghitung *dikirim*, PRD mendefinisikan dikonfirmasi + dikirim. Aging piutang menandai Toko Berkah Jaya (jatuh tempo 24 Okt) sebagai "Lancar/Belum JT" padahal sudah lewat tempo.
5. SEDANG — Audit log: filter aksi hanya 4 jenis (tidak ada ubah harga jual, ubah batas kredit, penyesuaian stok, setujui pembelian), tidak ada filter tanggal. Tidak ada UI kelola akun/ubah peran.
6. Beberapa deviasi kecil lain (pesan error BR-04 berbeda, dashboard manajer tanpa grafik, tabel 5 margin terkecil tidak ada, dll.) — lihat daftar bug.

Hasil: PASS banyak; FAIL 9 kasus; TIDAK DIUJI untuk hal yang butuh API langsung/1000 data (lihat bagian 4).

## 2. Tabel test case
Keterangan: Rina=Staf Penjualan, Dimas=Staf Penjualan, Joko=Staf Gudang, Hendra=Manajer. Screenshot "-" = tidak diambil (verifikasi lewat teks halaman).

| Kode | Aturan | Langkah | Hasil diharapkan | Hasil aktual | Status | Screenshot |
|---|---|---|---|---|---|---|
| TC-01 | NFR-2 akun nonaktif | Login agus@ (nonaktif) | Ditolak dengan pesan jelas | "Akun Anda berstatus nonaktif. Akses ke sistem ERP ditolak. Silakan hubungi Manajer." | PASS | T01 |
| TC-02 | NFR-2 wajib login | curl `/dashboard,/barang,/pelanggan,/pesanan,/pembelian,/laporan,/pengaturan,/api/items` tanpa login | Redirect ke /login | Semua HTTP 307 → /login | PASS | - |
| TC-03 | NFR-3 noindex | curl `/login`; cek meta halaman setelah login (/, /barang, /pesanan-jual) | meta robots noindex | `noindex, nofollow` di semua. (Catatan: `/robots.txt` juga redirect ke /login, tidak disajikan; header X-Robots-Tag tidak ada) | PASS | - |
| TC-04 | Kriteria 1 / Dashboard Manajer | Login Hendra | Dashboard Manajer: omzet, margin, piutang, stok menipis, grafik omzet mingguan, pengajuan PO | Kartu omzet/margin/piutang/stok menipis + donat status + daftar PO menunggu. **Grafik omzet mingguan tidak ada di dashboard** (ada di Laporan) | FAIL (sebagian) | T02 |
| TC-05 | Menu Manajer | Cek sidebar | Dashboard, Barang, Pelanggan, Pesanan, Pembelian, Laporan, Pengaturan | Sesuai | PASS | T02 |
| TC-06 | Kriteria 1 / Dashboard Penjualan | Login Rina & Dimas | Pesanan per status, pelanggan lewat tempo; tanpa margin/HPP; menu 4 item | Sesuai (Draf/Dikonfirmasi/Dikirim/Lunas + peringatan lewat tempo); menu Dashboard, Barang, Pelanggan, Pesanan Jual; tanpa angka margin | PASS | T15 |
| TC-07 | Kriteria 1 / Dashboard Gudang | Login Joko | Siap kirim, stok menipis, PO menunggu; menu tanpa Pelanggan/Laporan | Sesuai; menu Dashboard, Barang, Pesanan Jual, Pembelian | PASS | T20 |
| TC-08 | Guard halaman (NFR-4) | Rina & Dimas buka `/pembelian`, `/laporan`, `/pengaturan` | Ditolak/redirect | Redirect ke dashboard | PASS | - |
| TC-09 | Guard halaman | Joko buka `/laporan`, `/pengaturan`, `/pesanan-jual/baru` | Ditolak | Redirect ke `/` dan `/pesanan-jual` | PASS | - |
| TC-10 | Guard halaman Pelanggan (Bab 7) | Joko ketik `/pelanggan` | Ditolak (Pelanggan hanya Penjualan & Manajer) | Halaman terbuka penuh: batas kredit, piutang, tombol Tambah & Ubah; dialog edit bisa dibuka (batas kredit terkunci) | **FAIL** | T21 |
| TC-11 | BR-12 HPP disembunyikan | Rina & Joko buka Barang, Pembelian, detail pesanan | Tanpa kolom HPP/harga beli/margin | Kolom HPP & Harga Beli tidak tampil untuk Rina/Joko; detail pesanan tanpa HPP | PASS (UI) | T14 |
| TC-12 | BR-12 via API | Panggil API barang/pembelian/baris pesanan sebagai Staf Penjualan | Tanpa harga pokok | Tidak ada endpoint `/api/*` publik (404); butuh token sesi → tidak dicoba | TIDAK DIUJI | - |
| TC-13 | BR-01 kode unik | Manajer tambah barang kode BRG-001 | Ditolak | "Kode barang BRG-001 sudah digunakan!" | PASS | - |
| TC-14 | BR-01 harga>0, min stok ≥0 bulat | Harga 0, -500; min -3, 2.5 | Ditolak | Ditolak oleh validasi browser ("Value must be greater than or equal to 1") — pesan bahasa Inggris, hanya sisi klien | PASS (klien) | T04 |
| TC-15 | BR-01 tambah barang Manajer | Tambah "UJI Barang QA" harga 10.000 min 5 | Berhasil, stok 0, label menipis | BRG-018, stok 0, "Stok Menipis" | PASS | - |
| TC-16 | BR-01 Penjualan/Gudang tak boleh tambah/ubah harga | Rina & Joko buka Barang | Tak ada tombol tambah; harga tidak bisa diubah | Rina: tak ada tombol aksi ubah; Joko: dialog ubah menampilkan harga jual read-only | PASS | - |
| TC-17 | BR-01 ubah harga jual (Manajer) + audit | Ubah BRG-018 10.000→12.500 | Tersimpan; audit sebelum/sesudah | Tersimpan; audit #76 harga_jual 10000→12500 | PASS | - |
| TC-18 | BR-05 pelanggan baru batas Rp0 | Rina tambah "UJI Toko QA Rina" | Batas kredit Rp0 | PLG-011 batas Rp0, label "Batas Rp0 (Baru)" | PASS | - |
| TC-19 | BR-12 batas kredit hanya Manajer | Rina buka ubah PLG-011 | Batas kredit terkunci | Teks "Hanya Manajer yang berwenang…" | PASS | - |
| TC-20 | BR-05/BR-12 ubah batas kredit + audit | Hendra: -100 lalu 1.000.000 | Negatif ditolak; audit | Negatif ditolak (validasi klien); 1.000.000 tersimpan; audit #86 0→1000000 | PASS | - |
| TC-21 | BR-02 pelanggan/barang nonaktif | Buka form pesanan baru | Pelanggan PLG-010 & barang BRG-016/017 tak muncul | Tidak muncul di dropdown | PASS | - |
| TC-22 | BR-02 barang unik per pesanan | Rina: BRG-001 di 2 baris | Ditolak | "Barang … sudah dipilih di baris lain…" | PASS | - |
| TC-23 | BR-02 jumlah ≥1 bulat | qty 0 dan 1.5 | Ditolak | Tidak tersimpan (validasi klien) | PASS (klien) | - |
| TC-24 | BR-02 maks 20 baris | Lihat form | Batas 20 baris | Label "1 dari 20 baris", tombol "(Maks. 20)"; 21 baris tidak dicoba | TIDAK DIUJI (sebagian) | - |
| TC-25 | BR-03 harga satuan tak bisa diketik (Penjualan) | Form Rina | Harga hanya baca | Harga tampil read-only | PASS | T10 |
| TC-26 | BR-03 harga satuan tak bisa diketik (Manajer) | Hendra buka form pesanan, ubah harga | Harga hanya baca | Kolom Harga Satuan input angka aktif; nilai 26 tersimpan jadi SO-00054 total Rp26 | **FAIL** | T30 |
| TC-27 | BR-03 diskon 11% Penjualan ditolak | Rina isi diskon 11 | Ditolak | Diblokir validasi klien "less than or equal to 10"; sisi server tidak diuji | PASS (klien) | T10 |
| TC-28 | BR-03 diskon 10% & rumus | Rina: Gula 2 bal diskon 10% | Subtotal 651.600 | 651.600 (SO-00047 draf); juga Kecap 3@10% + Beras 2@5% = 650.400 benar | PASS | T11 |
| TC-29 | BR-03 Manajer 25% ok, 26% ditolak | Hendra diskon 26 / 25 | 26 ditolak, 25 diterima | 26 ditolak klien (max=25); 25% menghasilkan 36.000 untuk 48.000 | PASS | - |
| TC-30 | BR-04 di bawah HPP, Penjualan | Rina konfirmasi SO-00047 (Gula diskon 10% → di bawah HPP) | Ditolak "Harga di bawah batas, minta persetujuan Manajer" tanpa angka HPP | Ditolak: "Harga di bawah harga pokok hanya boleh disetujui Manajer." (tanpa angka, tapi teks berbeda dari PRD & menyebut "harga pokok") | FAIL (minor, teks) | - |
| TC-31 | BR-04 Manajer boleh | Hendra konfirmasi SO-00055 (Air Mineral 36.000 < HPP) | Berhasil | Dikonfirmasi | PASS | - |
| TC-32 | BR-06 stok kurang → batal total | Rina konfirmasi SO-00048 (Susu 3, stok 1) | Ditolak, stok tidak berubah | "Stok … tidak mencukupi (sisa 1, diminta 3). Seluruh konfirmasi dibatalkan." Stok tetap 1 | PASS | - |
| TC-33 | BR-06 konfirmasi sukses potong stok | Rina konfirmasi SO-00051 | Stok berkurang sekaligus | Kecap 75→72, Beras 183→181 | PASS | T12 |
| TC-34 | BR-06 konfirmasi bersamaan | Dimas: SO-00052 & SO-00053 (Susu stok 1) diklik hampir bersamaan (2 tab) | 1 berhasil, 1 gagal | SO-00053 dikonfirmasi, SO-00052 tetap draf; stok 0 (tak minus). Catatan: kebersamaan klik via 2 tab, bukan beban paralel sungguhan | PASS | - |
| TC-35 | BR-05 melewati batas kredit | Rina konfirmasi SO-00049 (118.000 vs batas 70.000) | Ditolak | "Total piutang (Rp0) ditambah pesanan (Rp118000) melebihi batas kredit (Rp70000)" — angka tidak diformat Rp | PASS (format cacat, lihat BUG-9) | - |
| TC-36 | BR-05 tagihan lewat tempo | Rina konfirmasi SO-00040 (Toko Berkah Jaya) | Ditolak | "Pelanggan memiliki tagihan yang telah lewat jatuh tempo." | PASS | - |
| TC-37 | BR-07 Penjualan hanya draf miliknya | Rina konfirmasi draf Dimas (SO-00043) | Ditolak | Ditolak server: "Staf Penjualan hanya boleh mengonfirmasi draf yang dibuat sendiri." (tapi tombol Konfirmasi tetap tampil di draf orang lain) | PASS (UI minor) | T13 |
| TC-38 | BR-07 draf batal oleh pembuat | Rina batal SO-00050 | Dibatalkan | Berhasil, namun UI mewajibkan alasan ≥10 karakter (PRD: tanpa syarat) | PASS (deviasi minor) | - |
| TC-39 | BR-07/08 Penjualan tak bisa batalkan dikonfirmasi | Lihat daftar Rina | Tombol Batal hilang | Tidak ada tombol Batal pada status dikonfirmasi | PASS | - |
| TC-40 | BR-07 Gudang kirim + jatuh tempo otomatis | Joko kirim SO-00053 (termin 7) | Jatuh tempo 3 Nov 2026 | "Jatuh tempo … 3 Nov 2026" | PASS | - |
| TC-41 | BR-07 pelunasan hanya Manajer | Joko klik Mayar → Simulasikan Pembayaran Sukses pada SO-00053 | Ditolak | **Berhasil: SO-00053 jadi Lunas oleh Staf Gudang** (audit #80 oleh Joko) | **FAIL (KRITIS)** | - |
| TC-42 | BR-07 Manajer pelunasan | Hendra kirim & lunasi SO-00055 | dikirim→lunas | Berhasil; audit "LUNAS_PESANAN" sebelum dikirim → sesudah lunas + waktu | PASS | - |
| TC-43 | BR-08 batal dikonfirmasi | Hendra batal SO-00051 alasan "pendek" lalu alasan valid | <10 karakter ditolak; stok kembali | Tombol nonaktif; valid berhasil, stok Kecap 72→75, Beras 181→183; audit #81 dengan alasan | PASS | - |
| TC-44 | Bab 6 transisi tak sah via API | Draf→dikirim, lunas→dikirim langsung via API | Ditolak | UI hanya menyediakan tombol sah; API tidak dicoba | TIDAK DIUJI | - |
| TC-45 | BR-09 ajukan PO 1–10.000 | Joko qty 0 / 10001 / 5.5 / 10 | Tiga pertama ditolak | Ditolak validasi klien; 10 berhasil (PO-00023) | PASS (klien) | - |
| TC-46 | BR-09 setujui harga >0 | Hendra: harga 0 dan -5, lalu 5000 | 0/-5 ditolak | Ditolak klien; 5000 disetujui; audit #84 | PASS | - |
| TC-47 | BR-09 tolak alasan ≥10 | Hendra tolak PO-00026 "pendek"; PO-00025 alasan valid | Pendek ditolak | Pendek tak terkirim (validasi klien); valid → ditolak, audit #85 | PASS | - |
| TC-48 | BR-09/Bab 6.2 batal oleh pengaju | Joko batal PO-00024; Hendra batal PO-00026 | Dibatalkan | Berhasil | PASS | - |
| TC-49 | BR-10 terima barang 1..dipesan, update HPP | Joko terima PO-00017 qty 0/13 lalu 10; Hendra terima PO-00023 qty 8 | 0/13 ditolak; stok + HPP update | Ditolak klien; Margarin 0→10, HPP 306.000; BRG-018 stok +8, HPP 5.000 | PASS | - |
| TC-50 | BR-10 penerimaan hanya sekali | Cari tombol terima setelah diterima | Tidak ada/ditolak | Tombol hilang (status DITERIMA). Via API tidak dicoba | PASS (UI) | - |
| TC-51 | BR-11 kartu stok = stok | BRG-011, 001, 009, 014, 015, 018 | Stok sesudah terakhir = stok sekarang | Cocok pada semua yang dicek | PASS | T05 |
| TC-52 | BR-11 penyesuaian stok | Joko: stok -5; alasan pendek; stok 25 alasan valid | Negatif/pendek ditolak | Ditolak klien; valid tersimpan, kartu stok ADJ-261027, audit #77 0→25 + alasan. (Kolom jumlah penyesuaian menampilkan "=25" bukan selisih) | PASS | - |
| TC-53 | BR-12 audit lengkap | Periksa audit: ubah harga, batas kredit, setujui, tolak, batal, penyesuaian, lunas | Semua tercatat sebelum/sesudah | Semua 7 jenis tercatat dengan nilai lama/baru. Ubah peran tidak dapat diuji (tidak ada UI) | PASS (sebagian) | - |
| TC-54 | Pengaturan filter audit | Buka filter | Filter aksi & tanggal | Hanya 4 opsi aksi, tidak ada filter tanggal | FAIL | - |
| TC-55 | Pengaturan akun & peran | Buka tab Daftar Pengguna | Kelola akun/peran | Hanya daftar baca-saja (5 akun); tidak ada tombol tambah/ubah peran/nonaktif | FAIL | - |
| TC-56 | Kriteria 11 grafik mingguan | Laporan | Grafik omzet & margin 8 minggu | Grafik batang + persen ada; Mgg 8 dari data uji menunjukkan laba negatif (-9%) wajar karena SO-00055 di bawah HPP | PASS | T31 |
| TC-57 | Laporan §9.3 tabel 10 terbesar & 5 terkecil | Tab Top 10 | Top 10 + 5 margin terkecil | Hanya Top 10; tabel 5 terkecil tidak ada | FAIL | - |
| TC-58 | §9.4 aging | Tab Aging | Belum JT / 1–30 / >30 hari | Ada kolom lancar, 1–30, 31–60, >60. Namun Toko Berkah Jaya (jatuh tempo 24 Okt) masuk "Belum JT" | FAIL | T03 |
| TC-59 | BR-05 piutang konsisten | Bandingkan Dashboard vs Laporan | Sama (dikonfirmasi+dikirim) | Dashboard Rp56.059.400, Laporan Rp46.084.400 (laporan abaikan dikonfirmasi) | FAIL | T02, T03 |
| TC-60 | Ekspor CSV Manajer | Laporan → CSV | File CSV | Terunduh, isi sesuai (omzet 118.044.400 cocok) | PASS | - |
| TC-61 | NFR-5 format uang | Cek tampilan | Rp1.250.000 | Tampil "Rp 1.250.000" (dengan spasi); pesan error kredit tanpa format (Rp118000) | FAIL (minor) | - |
| TC-62 | Daftar pesanan: filter status/pelanggan/tanggal | Lihat daftar | 3 filter | Filter status + pencarian teks (pelanggan/nomor); tidak ada filter tanggal | FAIL (minor) | T13 |
| TC-63 | Gudang hanya lihat dikonfirmasi ke atas | Joko buka Pesanan Jual | Tanpa draf | Draf (0) — benar; tetapi pesanan dibatalkan (termasuk draf dibatalkan SO-00050) tampil | PASS (catatan) | - |
| TC-64 | Detail pesanan: riwayat status | Buka Detail | Riwayat status | Dialog detail tanpa riwayat status; tidak ada halaman detail/ubah draf | FAIL (minor) | T14 |
| TC-65 | Pembelian: tab pemasok terpisah / kelola pemasok Gudang | Buka /pembelian | Tab Pemasok | Tidak ada tab/CRUD pemasok | FAIL | - |
| TC-66 | Label stok menipis konsisten | Badge filter Barang vs dashboard | Konsisten | Barang menghitung juga barang nonaktif (BRG-016/017); dashboard Gudang/Manajer tidak | FAIL (minor) | - |
| TC-67 | NFR-1 performa 1.000 pesanan | – | <2 detik | Data hanya ±55 pesanan | TIDAK DIUJI | - |
| TC-68 | NFR-4 hak akses di database/RLS | API langsung | Ditolak | Tidak dapat diuji tanpa token | TIDAK DIUJI | - |

## 3. Daftar bug (urut tingkat keparahan)

| ID | Tingkat | Bug | Bukti |
|---|---|---|---|
| BUG-1 | **Kritis** | Staf Gudang (Joko) dapat melunasi pesanan lewat dialog Mayar → "Simulasikan Pembayaran Sukses" (SO-00053 lunas), melanggar BR-07/BR-12. Tombol "Mayar" tampil untuk Gudang pada semua pesanan dikirim. Simulasi webhook melunasi tanpa pengecekan ulang ke Mayar (fitur opsional §11.3). Audit mencatat pelaku Joko. | audit #78–#80; T21 (untuk konteks peran) |
| BUG-2 | Tinggi | Halaman `/pelanggan` tidak dijaga untuk Staf Gudang: bisa lihat batas kredit/piutang, tambah dan ubah pelanggan (nama, alamat, status aktif). | T21 |
| BUG-3 | Tinggi | Manajer dapat mengetik Harga Satuan di form pesanan (nilai tersimpan, SO-00054 harga Rp26). BR-03 melarang. | T30 |
| BUG-4 | Sedang | Total Piutang Laporan (46.084.400) tidak sama dengan Dashboard (56.059.400); laporan tidak menghitung status dikonfirmasi (BR-05). | T02, T03 |
| BUG-5 | Sedang | Aging piutang: pesanan lewat jatuh tempo (SO-00030 Toko Berkah Jaya, JT 24 Okt) masuk "Belum JT/Lancar", bertentangan dengan status "Lewat Tempo" di halaman Pelanggan. Bucket 31–60/>60 vs PRD ">30". | T03 |
| BUG-6 | Sedang | Audit log: filter aksi hanya 4 jenis dan tidak ada filter tanggal; tidak ada manajemen akun/peran (BR-12 "mengelola akun dan peran"). ID target tampil UUID, bukan nomor dokumen. Penomoran header "74" vs ID terbesar #86. | – |
| BUG-7 | Sedang | Tidak ada tabel 5 barang margin terkecil; dashboard Manajer tanpa grafik omzet mingguan (hanya di Laporan). | T02, T31 |
| BUG-8 | Sedang | Tidak ada pengelolaan pemasok (tab terpisah / CRUD) untuk Gudang & Manajer; tidak ada riwayat status & edit isi draf pada detail pesanan; tidak ada filter tanggal di daftar pesanan. | – |
| BUG-9 | Rendah | Pesan penolakan BR-04 tidak sesuai PRD ("Harga di bawah batas, minta persetujuan Manajer"). Pesan kredit memakai angka mentah (Rp118000) dan membocorkan batas kredit ke Staf Penjualan (diperbolehkan) tetapi format salah. | – |
| BUG-10 | Rendah | UI: tombol "Konfirmasi" tampil pada draf milik orang lain (server menolak). Draf dibatalkan wajib alasan ≥10 karakter (PRD tidak mewajibkan). Setelah simpan draf form tidak redirect. | T13 |
| BUG-11 | Rendah | Validasi hanya sisi klien dengan pesan bahasa Inggris browser ("Value must be…"), sisi server tidak diverifikasi. | T04, T10 |
| BUG-12 | Rendah | Kartu stok: jumlah ditampilkan "--5 dus"/"=-12 dus" (format ganda), penyesuaian menampilkan stok absolut, bukan selisih. Total Biaya PO memakai jumlah dipesan (Rp50.000) bukan diterima (8 dus). Badge "stok menipis" di Barang menghitung barang nonaktif. | T05 |
| BUG-13 | Rendah | Format uang "Rp 1.250.000" (dengan spasi) vs PRD "Rp1.250.000". `/robots.txt` dialihkan ke /login. Gudang melihat pesanan dibatalkan berstatus draf. | – |

## 4. Item tidak diuji
- BR-12 / Kriteria "API": akses API langsung (Penjualan tidak boleh melihat HPP/harga beli; transisi status ilegal via API; penerimaan ganda via API; validasi server diskon >10%/25%, kuantitas dll). Tidak ada endpoint REST publik dan menggunakan token sesi tidak dilakukan.
- NFR-1 (1.000 pesanan/200 barang), NFR-4 (RLS database), NFR-6 (backup harian).
- Perubahan peran akun (tidak ada UI) dan pembuatan akun.
- Maks 20 baris pesanan (hanya label), diskon desimal, pembatalan PO disetujui oleh Manajer, penolakan penerimaan kedua via API.
- Fitur opsional (email stok menipis, surat jalan cetak, Mayar sungguhan); hanya dialog Mayar yang dilihat.
- Konkurensi sungguhan (beban paralel): hanya 2 tab hampir bersamaan.
- Login Agus tidak dicoba ulang dengan password salah; aksi "nonaktifkan akun" sengaja tidak dilakukan.

## 5. Data uji yang ditinggalkan
Sudah ada sebelum uji (bukan dari saya): SO-00046, PO-TEST-0570, audit #1–#75 (termasuk simulasi Mayar).
Dibuat saat uji:
- Barang **BRG-018 "UJI Barang QA"** (harga jual 12.500, HPP 5.000, stok 33, min 5).
- Pelanggan **PLG-011 "UJI Toko QA Rina"** (batas kredit 1.000.000, termin 7 hari).
- Pesanan: SO-00047 (draf, Rina), SO-00048 (draf), SO-00049 (draf), SO-00050 (dibatalkan), SO-00051 (dibatalkan setelah dikonfirmasi), SO-00052 (draf, Dimas), SO-00053 (lunas via simulasi Mayar oleh Joko), SO-00054 (draf, harga satuan Rp26 — bukti BUG-3), SO-00055 (lunas, di bawah HPP).
- Pembelian: PO-00023 (diterima 8 dari 10), PO-00024 (dibatalkan), PO-00025 (ditolak), PO-00026 (dibatalkan); PO-00017 (Margarin) diterima 10 dari 12 → stok BRG-015 jadi 10, HPP 306.000.
- Mutasi stok: penyesuaian BRG-018 +25 (Joko), stok berubah pada BRG-002/004/007/011/014/015/018 akibat uji; BRG-011 stok kini 0.
- Audit log baru #76–#86+ (ubah harga, penyesuaian, kirim, Mayar, batal, lunas, setuju, tolak, ubah batas kredit).
- File: CSV laporan di `/workspace/erp-sinarabadi-test/`.
Tidak ada akun dinonaktifkan dan tidak ada data dihapus permanen.
