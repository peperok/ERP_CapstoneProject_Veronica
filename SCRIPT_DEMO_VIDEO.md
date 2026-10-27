# 🎬 Script Voice Over (VO) & Panduan Rekaman Video Demo ERP
**Sesuai:** Bab 10 Petunjuk Capstone Project (Halaman 11)  
**Klien:** CV Sinar Abadi Niaga (Distributor Barang Konsumsi Bekasi)  
**Pengembang:** Veronica Regina Mambu  
**Durasi Target:** 3.5 – 4.5 Menit (Maksimal 5 Menit)  
**Lingkungan:** Direkam langsung di URL Netlify (`https://...netlify.app`)

---

## 💡 Persiapan Browser Sebelum Rekam (PENTING)
Agar durasi hemat dan tidak buang waktu login-logout:
- **Buka 3 Jendela / Tab Browser Berdampingan**:
  - **Jendela 1 (Gudang):** Login sebagai `joko@sinarabadi.test` / `Latihan#2026`
  - **Jendela 2 (Manajer):** Login sebagai `hendra@sinarabadi.test` / `Latihan#2026`
  - **Jendela 3 (Penjualan):** Login sebagai `rina@sinarabadi.test` / `Latihan#2026`
- **Siapkan 1 Tab Gmail:** Untuk pembuktian notifikasi email stok menipis (Resend).

---

## 4 Fitur Nilai Tambah yang Didemokan:
1. **Cetak Surat Jalan Otomatis** (Format resmi logistik 2 kolom tanda tangan)
2. **Notifikasi Email Stok Menipis** (Integrasi Resend API)
3. **Tautan Pembayaran Piutang & QRIS Mayar Sandbox** (Webhook `payment.received` -> Otomatis Lunas)
4. **AI Copilot Insight Operasional** (Analisis cerdas kesehatan bisnis real-time)

---

# 🎙️ Naskah Voice Over & Alur Video (Berurutan)

---

### 1. PEMBUKA (± 15 Detik)
- **Tampilan Layar:** Tunjukkan Dashboard aplikasi ERP di URL Netlify.
- **Voice Over (VO):**
  > "Halo semuanya! Perkenalkan saya Veronica Regina Mambu. Pada video ini saya akan mendemonstrasikan aplikasi **Sistem ERP Distribusi** untuk klien **CV Sinar Abadi Niaga** yang telah di-deploy dan berjalan secara live di Netlify. Sistem ini mencakup alur logistik gudang, penjualan toko, hingga analitik eksekutif."

---

### 2. ALUR UTAMA DENGAN TIGA AKUN (± 2.5 Menit)

#### A. Alur Pengadaan Barang: Gudang ➔ Manajer ➔ Gudang
1. **Buka Jendela 1 (Staf Gudang):**
   - Buka menu **Pembelian (PO)** -> Klik **Ajukan Pembelian Baru**.
   - Pilih pemasok, pilih barang (misal: Minyak Goreng / Gula), masukkan jumlah 10 unit, lalu simpan.
   - *VO:*
     > "Pertama, kita mulai dari alur pengadaan barang. Di jendela **Staf Gudang**, staf mendeteksi kebutuhan stok dan membuat pengajuan pembelian ke pemasok melalui menu Pembelian PO. Setelah disimpan, status pembelian tercatat sebagai **Diajukan**."

2. **Beralih ke Jendela 2 (Manajer):**
   - Buka menu **Pembelian (PO)**, lihat pengajuan yang baru masuk.
   - Klik tombol **Setujui**, masukkan harga beli satuan (HPP), lalu konfirmasi. Status berubah menjadi **Disetujui**.
   - *VO:*
     > "Kedua, kita beralih ke jendela **Manajer**. Sesuai aturan bisnis, hanya Manajer yang berhak menyetujui pengadaan dan menginput harga beli resmi dari pemasok. Manajer menekan tombol **Setujui**, menginput harga beli satuan, dan status berubah menjadi **Disetujui**."

3. **Beralih kembali ke Jendela 1 (Staf Gudang):**
   - Di menu Pembelian PO, klik tombol **Terima Barang Fisik**.
   - Konfirmasi penerimaan -> Buka menu **Barang & Stok** untuk menunjukkan stok fisik langsung bertambah otomatis dan tercatat di kartu stok.
   - *VO:*
     > "Ketiga, kembali ke jendela **Staf Gudang**. Saat armada pemasok tiba, staf gudang menekan tombol **Terima Barang Fisik**. Seketika itu juga, stok gudang otomatis bertambah, kartu mutasi stok terbit, dan HPP rata-rata tertimbang dikalkulasi ulang oleh sistem."

---

#### B. Alur Penjualan Barang: Penjualan ➔ Gudang ➔ Manajer
1. **Buka Jendela 3 (Staf Penjualan):**
   - Buka menu **Pesanan Jual** -> Klik **Buat Pesanan Baru**.
   - Pilih toko pelanggan, pilih barang yang stoknya tersedia, masukkan diskon resmi (misal: 5%), lalu simpan.
   - Klik tombol **Konfirmasi Pesanan**. Sistem mengunci stok dengan `FOR UPDATE` di database Supabase.
   - *VO:*
     > "Sekarang kita masuk ke alur penjualan. Di jendela **Staf Penjualan**, staf membuat pesanan jual baru untuk toko pelanggan. Setelah data divalidasi tidak melebihi kredit limit, pesanan disimpan dan staf menekan tombol **Konfirmasi**. Sistem secara atomik mengurangi stok gudang untuk mencegah terjadinya stok minus."

2. **Beralih ke Jendela 1 (Staf Gudang):**
   - Buka menu **Pesanan Jual**, cari pesanan yang berstatus **Dikonfirmasi**.
   - Klik tombol **Kirim Pesanan** -> status berubah menjadi **Dikirim** dan jatuh tempo otomatis terhitung dari termin bayar toko.
   - *VO:*
     > "Selanjutnya, staf gudang memeriksa antrean pesanan siap kirim dan menekan tombol **Kirim Pesanan** saat barang dimuat ke armada pengiriman. Tanggal jatuh tempo tagihan otomatis dihitung sistem."

3. **Beralih ke Jendela 2 (Manajer):**
   - Buka menu **Pesanan Jual**, cari pesanan tadi yang berstatus **Dikirim**.
   - *(Nanti akan didemokan pelunasan via Mayar pada bagian peningkatan fitur).*
   - *VO:*
     > "Terakhir, pesanan berstatus dikirim akan masuk ke piutang berjalan dan siap diproses pelunasannya oleh Manajer."

---

### 3. BUKTI KEAMANAN ROUTE GUARD & RLS (± 30 Detik)
- **Tampilan Layar:** Tetap di **Jendela 3 (Staf Penjualan)** yang hak aksesnya paling terbatas.
- **Aksi:**
  - Klik address bar browser, ketik manual URL halaman rahasia Manajer: `/laporan`, lalu tekan Enter.
  - Tunjukkan bahwa sistem langsung menolak akses dan me-redirect kembali ke Dashboard.
  - Coba ketik URL `/pengaturan`, tunjukkan kembali penolakan akses.
- **Voice Over (VO):**
  > "Selanjutnya adalah **Bukti Keamanan Sistem**.  
  > Saat ini saya sedang login sebagai **Staf Penjualan** yang tidak memiliki wewenang melihat laporan keuangan maupun audit log.  
  > Sekarang saya coba mengetik manual URL halaman manajer di address bar, yaitu `/laporan`.  
  > Bisa kita lihat, middleware proteksi rute langsung menolak akses dan mengembalikan pengguna ke dashboard. Hal yang sama terjadi jika kita mencoba mengakses URL `/pengaturan`."

---

### 4. UJI SATU ATURAN BISNIS / TEST CASE (± 30 Detik)
- **Tampilan Layar:** Di **Jendela 3 (Staf Penjualan)**, buka halaman **Buat Pesanan Baru**.
- **Aksi:**
  - Pilih toko, pilih barang, lalu pada kolom diskon masukkan angka **11%** (melebihi batas maksimal Sales yaitu 10%).
  - Klik simpan/konfirmasi -> tunjukkan error penolakan sistem.
- **Voice Over (VO):**
  > "Sekarang kita menguji satu aturan bisnis yang dilanggar secara sengaja, yaitu **TC-03 terkait batas diskon penjualan (BR-03)**.  
  > Di form ini, staf penjualan mencoba memasukkan diskon sebesar **11%**—yang melebihi batas maksimal 10% untuk staf penjualan.  
  > Sistem secara tegas menolak transaksi dan memunculkan peringatan bahwa batas diskon terlampaui. Aturan bisnis terbukti terjaga dengan baik."

---

### 5. PENINGKATAN FITUR / NILAI TAMBAH (± 45 – 60 Detik)
- **Tampilan Layar:** Tunjukkan 4 fitur nilai tambah secara berurutan:

1. **Cetak Surat Jalan (Di Jendela Gudang / Pesanan Jual):**
   - Klik tombol **Cetak Surat Jalan** pada pesanan -> tunjukkan jendela print format resmi 2 kolom tanda tangan tanpa bocoran harga pokok.
   - *VO:* *"Fitur nilai tambah pertama adalah **Cetak Surat Jalan Otomatis** berstandar logistik pengiriman fisik."*

2. **Notifikasi Email Stok Menipis (Di Menu Barang & Stok):**
   - Klik tombol **Kirim Email Notifikasi**, masukkan email, klik Kirim -> tunjukkan tab Gmail dengan tabel rekap restok.
   - *VO:* *"Kedua, **Notifikasi Email Stok Menipis via Resend API**, yang otomatis mengirimkan peringatan barang kritis ke email manajemen."*

3. **Tautan Bayar & QRIS Mayar Sandbox (Di Jendela Manajer / Pesanan Jual):**
   - Klik tombol **Mayar (QRIS)** pada pesanan berstatus *Dikirim* -> tunjukkan invoice Mayar & tombol WhatsApp.
   - Klik tombol **Simulasikan Pembayaran Sukses (Webhook Sandbox)** -> status seketika berubah jadi **Lunas**.
   - *VO:* *"Ketiga, **Integrasi Pembayaran Digital Mayar Sandbox**. Manajer dapat menerbitkan QRIS dan tagihan digital, dan saat webhook payment.received diterima, status pesanan seketika berubah menjadi Lunas."*

4. **AI Copilot Operasional (Di Header Kanan Atas):**
   - Klik tombol **AI Copilot** -> drawer terbuka dengan analisis laba, piutang, dan rekomendasi real-time.
   - *VO:* *"Keempat, **AI Copilot**, asisten cerdas yang menganalisis kesehatan perputaran stok, margin, dan piutang secara instan."*

- **Penutup:**
  > "Demikian demonstrasi Sistem ERP CV Sinar Abadi Niaga dari saya. Terima kasih atas perhatiannya!"

---

## 📋 Ringkasan Penilaian Babak 1 (Petunjuk Capstone):
Saat mengunggah ke LMS `innovators.iodacademy.id`, cantumkan:
1. URL Live Netlify
2. Link GitHub Repo (Public)
3. Akun Login 3 Peran (`hendra@...`, `rina@...`, `joko@...` / `Latihan#2026`)
4. Link Video Demo (YouTube Unlisted / Google Drive Public)
5. Daftar peningkatan fitur dan menit kemunculannya di video.
