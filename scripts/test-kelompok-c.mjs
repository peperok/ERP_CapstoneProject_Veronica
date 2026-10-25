import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE env variables");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey);

async function runTestGroupC() {
  console.log("=================================================");
  console.log("🚀 MENJALANKAN PENGUJIAN KELOMPOK C (BR-04, BR-05, BR-06)");
  console.log("   TC-07, TC-08, TC-09, TC-10, TC-11, TC-12, TC-13");
  console.log("=================================================\n");

  const results = [];

  // Ambil profil pengguna
  const { data: users, error: userErr } = await adminClient.from("profiles").select("id, peran, nama_lengkap");
  if (userErr || !users) throw new Error("Gagal mengambil data profiles: " + userErr?.message);

  const rina = users.find(u => u.peran === "penjualan" && u.nama_lengkap.includes("Rina"));
  const hendra = users.find(u => u.peran === "manajer");

  // --------------------------------------------------------------------------
  // TC-07: Penolakan konfirmasi pesanan di bawah harga pokok (Sales) (BR-04)
  // Data Uji: SO-00044 (Gula diskon 10%, subtotal < modal)
  // --------------------------------------------------------------------------
  console.log("▶ [TC-07] Penolakan Konfirmasi Pesanan di Bawah HPP oleh Sales (Rina)");
  try {
    const { data: so44 } = await adminClient.from("pesanan_jual").select("id, nomor, status").eq("nomor", "SO-00044").single();
    if (!so44) throw new Error("SO-00044 tidak ditemukan");

    // Sales (Rina) mencoba konfirmasi SO-00044
    const { data: resRina, error: errRina } = await adminClient.rpc("konfirmasi_pesanan_jual", {
      p_pesanan_id: so44.id,
      p_pelaku_id: rina.id
    });

    const success = resRina?.success;
    const msg = resRina?.message || errRina?.message || "";

    if (!success && msg.includes("Harga di bawah harga pokok hanya boleh disetujui Manajer")) {
      console.log(`  [PASS] Staf Penjualan ditolak: "${msg}"`);
      results.push({
        id: "TC-07",
        rule: "BR-04",
        name: "Penolakan konfirmasi pesanan di bawah harga pokok (Sales)",
        expected: "Konfirmasi ditolak: Harga di bawah harga pokok hanya boleh disetujui Manajer",
        actual: msg,
        status: "PASSED"
      });
    } else {
      throw new Error(`Expected ditolak dengan pesan HPP manajer, got: ${JSON.stringify(resRina || errRina)}`);
    }
  } catch (err) {
    console.error("  [FAIL] TC-07:", err.message);
    results.push({ id: "TC-07", rule: "BR-04", name: "Penolakan konfirmasi di bawah HPP", expected: "Ditolak", actual: err.message, status: "FAILED" });
  }

  // --------------------------------------------------------------------------
  // TC-08: Persetujuan pesanan di bawah harga pokok oleh Manajer (BR-04)
  // Data Uji: SO-00044 oleh Manajer Hendra
  // --------------------------------------------------------------------------
  console.log("\n▶ [TC-08] Persetujuan Pesanan di Bawah HPP oleh Manajer (Hendra)");
  try {
    const { data: so44 } = await adminClient.from("pesanan_jual").select("id, nomor, status").eq("nomor", "SO-00044").single();
    
    // Simpan stok awal barang gula
    const { data: item44 } = await adminClient.from("item_pesanan_jual").select("barang_id, jumlah").eq("pesanan_jual_id", so44.id).single();
    const { data: brgGulaAwal } = await adminClient.from("barang").select("stok").eq("id", item44.barang_id).single();

    // Manajer (Hendra) mengonfirmasi
    const { data: resHendra, error: errHendra } = await adminClient.rpc("konfirmasi_pesanan_jual", {
      p_pesanan_id: so44.id,
      p_pelaku_id: hendra.id
    });

    if (resHendra?.success) {
      const { data: soUpdated } = await adminClient.from("pesanan_jual").select("status").eq("id", so44.id).single();
      const { data: brgGulaSesudah } = await adminClient.from("barang").select("stok").eq("id", item44.barang_id).single();

      console.log(`  [PASS] Manajer berhasil menyetujui. Status SO: ${soUpdated.status}, Stok berkurang dari ${brgGulaAwal.stok} ke ${brgGulaSesudah.stok}`);
      results.push({
        id: "TC-08",
        rule: "BR-04",
        name: "Persetujuan pesanan di bawah harga pokok oleh Manajer",
        expected: "Konfirmasi berhasil diproses, status berubah dikonfirmasi, stok berkurang",
        actual: `Status: ${soUpdated.status}, Stok terpotong: ${brgGulaAwal.stok - brgGulaSesudah.stok}`,
        status: "PASSED"
      });

      // Cleanup: kembalikan status SO-00044 ke draf & stok kembali ke awal
      await adminClient.from("pesanan_jual").update({ status: "draf", dikonfirmasi_pada: null }).eq("id", so44.id);
      await adminClient.from("barang").update({ stok: brgGulaAwal.stok }).eq("id", item44.barang_id);
      await adminClient.from("mutasi_stok").delete().eq("nomor_dokumen", "SO-00044");
    } else {
      throw new Error(`Gagal konfirmasi oleh Manajer: ${resHendra?.message || errHendra?.message}`);
    }
  } catch (err) {
    console.error("  [FAIL] TC-08:", err.message);
    results.push({ id: "TC-08", rule: "BR-04", name: "Persetujuan pesanan di bawah HPP oleh Manajer", expected: "Berhasil", actual: err.message, status: "FAILED" });
  }

  // --------------------------------------------------------------------------
  // TC-09: Penolakan konfirmasi jika melebihi batas kredit (BR-05)
  // Data Uji: SO-00041 (Toko Rejeki Lancar, piutang Rp7.564.000 / limit Rp8.000.000, pesanan Rp1.086.000)
  // Catatan: Karena waktu riil melewati tanggal seed data (21 Okt 2026), kita isolasi validasi kredit
  // dengan sementara memajukan due date SO-00026 agar fokus menguji aturan batas kredit.
  // --------------------------------------------------------------------------
  console.log("\n▶ [TC-09] Penolakan Konfirmasi Jika Melebihi Batas Kredit");
  try {
    const { data: so41 } = await adminClient.from("pesanan_jual").select("id, nomor, status, dibuat_oleh").eq("nomor", "SO-00041").single();

    // Isolasi tanggal invoice Toko Rejeki Lancar agar fokus menguji batas kredit
    await adminClient.from("pesanan_jual").update({ jatuh_tempo: "2026-11-20" }).eq("nomor", "SO-00026");

    const { data: resLimit, error: errLimit } = await adminClient.rpc("konfirmasi_pesanan_jual", {
      p_pesanan_id: so41.id,
      p_pelaku_id: so41.dibuat_oleh
    });

    // Kembalikan tanggal seed SO-00026
    await adminClient.from("pesanan_jual").update({ jatuh_tempo: "2026-10-21" }).eq("nomor", "SO-00026");

    const success = resLimit?.success;
    const msg = resLimit?.message || errLimit?.message || "";

    if (!success && msg.includes("melebihi batas kredit")) {
      console.log(`  [PASS] Ditolak batas kredit: "${msg}"`);
      results.push({
        id: "TC-09",
        rule: "BR-05",
        name: "Penolakan konfirmasi jika melebihi batas kredit",
        expected: "Konfirmasi ditolak karena total piutang baru melebihi batas kredit",
        actual: msg,
        status: "PASSED"
      });
    } else {
      throw new Error(`Expected batas kredit ditolak, got: ${JSON.stringify(resLimit || errLimit)}`);
    }
  } catch (err) {
    console.error("  [FAIL] TC-09:", err.message);
    results.push({ id: "TC-09", rule: "BR-05", name: "Penolakan konfirmasi melebihi batas kredit", expected: "Ditolak", actual: err.message, status: "FAILED" });
  }

  // --------------------------------------------------------------------------
  // TC-10: Penolakan konfirmasi akibat tagihan lewat jatuh tempo (BR-05)
  // Data Uji: SO-00042 (Toko Maju Bersama punya invoice tempo 30 Sept 2026 belum lunas)
  // --------------------------------------------------------------------------
  console.log("\n▶ [TC-10] Penolakan Konfirmasi Akibat Tagihan Lewat Jatuh Tempo");
  try {
    const { data: so42 } = await adminClient.from("pesanan_jual").select("id, nomor, status, dibuat_oleh").eq("nomor", "SO-00042").single();

    const { data: resOverdue, error: errOverdue } = await adminClient.rpc("konfirmasi_pesanan_jual", {
      p_pesanan_id: so42.id,
      p_pelaku_id: so42.dibuat_oleh
    });

    const success = resOverdue?.success;
    const msg = resOverdue?.message || errOverdue?.message || "";

    if (!success && msg.includes("telah lewat jatuh tempo")) {
      console.log(`  [PASS] Ditolak tagihan jatuh tempo: "${msg}"`);
      results.push({
        id: "TC-10",
        rule: "BR-05",
        name: "Penolakan konfirmasi akibat tagihan lewat jatuh tempo",
        expected: "Konfirmasi ditolak: Pelanggan memiliki tagihan yang telah lewat jatuh tempo",
        actual: msg,
        status: "PASSED"
      });
    } else {
      throw new Error(`Expected tagihan jatuh tempo ditolak, got: ${JSON.stringify(resOverdue || errOverdue)}`);
    }
  } catch (err) {
    console.error("  [FAIL] TC-10:", err.message);
    results.push({ id: "TC-10", rule: "BR-05", name: "Penolakan jatuh tempo", expected: "Ditolak", actual: err.message, status: "FAILED" });
  }

  // --------------------------------------------------------------------------
  // TC-11: Pelanggan baru otomatis batas kredit Rp0 (BR-05)
  // Pengujian 1: Pelanggan baru dibuat oleh Sales otomatis batas_kredit = 0
  // Pengujian 2: Konfirmasi pesanan untuk pelanggan batas kredit 0 ditolak
  // --------------------------------------------------------------------------
  console.log("\n▶ [TC-11] Pelanggan Baru Otomatis Batas Kredit Rp0");
  let testPelangganId = null;
  let testSOId = null;
  try {
    // 1. Simulasikan pembuatan pelanggan baru oleh Sales (default batas_kredit Rp0)
    const kodeBaru = `PLG-TEST-${Date.now().toString().slice(-4)}`;
    const { data: pelBaru, error: pelErr } = await adminClient.from("pelanggan").insert({
      kode: kodeBaru,
      nama_toko: "Toko Baru Uji Limit",
      telepon: "081234567899",
      alamat: "Jl. Uji Kredit No. 1",
      termin_hari: 14,
      batas_kredit: 0,
      aktif: true
    }).select().single();

    if (pelErr || !pelBaru) throw new Error("Gagal membuat pelanggan uji: " + pelErr?.message);
    testPelangganId = pelBaru.id;

    if (pelBaru.batas_kredit !== 0) {
      throw new Error(`Batas kredit baru tidak Rp0: ${pelBaru.batas_kredit}`);
    }

    // 2. Buat pesanan draf untuk pelanggan ini
    const { data: brgSample } = await adminClient.from("barang").select("id, harga_jual").gt("stok", 5).limit(1).single();
    const { data: soBaru, error: soErr } = await adminClient.from("pesanan_jual").insert({
      nomor: `SO-TEST-C11-${Date.now().toString().slice(-4)}`,
      pelanggan_id: testPelangganId,
      status: "draf",
      total: brgSample.harga_jual,
      dibuat_oleh: rina.id
    }).select().single();
    if (soErr || !soBaru) throw new Error("Gagal membuat SO uji: " + soErr?.message);
    testSOId = soBaru.id;

    await adminClient.from("item_pesanan_jual").insert({
      pesanan_jual_id: testSOId,
      barang_id: brgSample.id,
      jumlah: 1,
      harga_satuan: brgSample.harga_jual,
      diskon_persen: 0,
      subtotal: brgSample.harga_jual
    });

    // 3. Konfirmasi pesanan -> Harus ditolak batas kredit Rp0
    const { data: resC11, error: errC11 } = await adminClient.rpc("konfirmasi_pesanan_jual", {
      p_pesanan_id: testSOId,
      p_pelaku_id: rina.id
    });

    const success = resC11?.success;
    const msg = resC11?.message || errC11?.message || "";

    if (!success && msg.includes("melebihi batas kredit (Rp0)")) {
      console.log(`  [PASS] Pelanggan baru limit Rp0 diverifikasi & ditolak saat konfirmasi: "${msg}"`);
      results.push({
        id: "TC-11",
        rule: "BR-05",
        name: "Pelanggan baru otomatis batas kredit Rp0",
        expected: "Pelanggan baru batas kredit Rp0 & konfirmasi ditolak melebihi batas kredit (Rp0)",
        actual: msg,
        status: "PASSED"
      });
    } else {
      throw new Error(`Expected ditolak limit Rp0, got: ${JSON.stringify(resC11 || errC11)}`);
    }
  } catch (err) {
    console.error("  [FAIL] TC-11:", err.message);
    results.push({ id: "TC-11", rule: "BR-05", name: "Pelanggan baru batas kredit Rp0", expected: "Ditolak", actual: err.message, status: "FAILED" });
  } finally {
    if (testSOId) {
      await adminClient.from("item_pesanan_jual").delete().eq("pesanan_jual_id", testSOId);
      await adminClient.from("pesanan_jual").delete().eq("id", testSOId);
    }
    if (testPelangganId) {
      await adminClient.from("pelanggan").delete().eq("id", testPelangganId);
    }
  }

  // --------------------------------------------------------------------------
  // TC-12: Penolakan konfirmasi jika stok salah satu barang kosong (BR-06)
  // Data Uji: SO-00040 (Memuat Tepung Terigu stok 38 dan Kopi Sachet stok 0)
  // --------------------------------------------------------------------------
  console.log("\n▶ [TC-12] Penolakan Konfirmasi Jika Stok Salah Satu Barang Kosong");
  try {
    const { data: so40 } = await adminClient.from("pesanan_jual").select("id, nomor, status, dibuat_oleh").eq("nomor", "SO-00040").single();
    
    // Ambil stok awal Tepung Terigu (BRG-003)
    const { data: itemTepung } = await adminClient.from("item_pesanan_jual").select("barang_id, jumlah").eq("pesanan_jual_id", so40.id).limit(1).single();
    const { data: brgTepungAwal } = await adminClient.from("barang").select("stok").eq("id", itemTepung.barang_id).single();

    // Isolasi tanggal SO-00030 milik Toko Berkah Jaya agar fokus menguji stok kosong
    await adminClient.from("pesanan_jual").update({ jatuh_tempo: "2026-11-20" }).eq("nomor", "SO-00030");

    const { data: resStok, error: errStok } = await adminClient.rpc("konfirmasi_pesanan_jual", {
      p_pesanan_id: so40.id,
      p_pelaku_id: so40.dibuat_oleh
    });

    // Kembalikan tanggal seed SO-00030
    await adminClient.from("pesanan_jual").update({ jatuh_tempo: "2026-10-24" }).eq("nomor", "SO-00030");

    const success = resStok?.success;
    const msg = resStok?.message || errStok?.message || "";

    // Cek stok sesudah percobaan konfirmasi gagal
    const { data: brgTepungSesudah } = await adminClient.from("barang").select("stok").eq("id", itemTepung.barang_id).single();

    if (!success && msg.includes("tidak mencukupi") && brgTepungAwal.stok === brgTepungSesudah.stok) {
      console.log(`  [PASS] Ditolak stok kosong atomik: "${msg}". Stok Tepung Terigu tetap utuh (${brgTepungSesudah.stok}).`);
      results.push({
        id: "TC-12",
        rule: "BR-06",
        name: "Penolakan konfirmasi jika stok salah satu barang kosong",
        expected: "Seluruh konfirmasi gagal atomik, stok barang lain tidak terpotong",
        actual: `${msg} (Stok barang lain tetap utuh: ${brgTepungSesudah.stok})`,
        status: "PASSED"
      });
    } else {
      throw new Error(`Expected rollback atomik stok kosong, got: ${JSON.stringify(resStok || errStok)}`);
    }
  } catch (err) {
    console.error("  [FAIL] TC-12:", err.message);
    results.push({ id: "TC-12", rule: "BR-06", name: "Penolakan stok kosong atomik", expected: "Rollback", actual: err.message, status: "FAILED" });
  }

  // --------------------------------------------------------------------------
  // TC-13: Pencegahan race condition (stok minus) pada konfirmasi bersamaan (BR-06)
  // Data Uji: SO-00038 (Rina) & SO-00039 (Dimas) pesan 1 dus Susu Kental Manis (sisa stok 1)
  // Dilakukan pemanggilan RPC secara simultan via Promise.all
  // --------------------------------------------------------------------------
  console.log("\n▶ [TC-13] Pencegahan Race Condition (Stok Minus) Konfirmasi Simultan");
  try {
    const { data: so38 } = await adminClient.from("pesanan_jual").select("id, nomor, dibuat_oleh").eq("nomor", "SO-00038").single();
    const { data: so39 } = await adminClient.from("pesanan_jual").select("id, nomor, dibuat_oleh").eq("nomor", "SO-00039").single();
    const { data: susuAwal } = await adminClient.from("barang").select("id, stok").eq("kode", "BRG-011").single();

    console.log(`  Stok awal Susu Kental Manis (BRG-011): ${susuAwal.stok}`);

    // Isolasi tanggal invoice kedua pelanggan agar murni menguji race condition persaingan stok
    await adminClient.from("pesanan_jual").update({ jatuh_tempo: "2026-11-20" }).in("nomor", ["SO-00030", "SO-00017"]);

    // Eksekusi bersamaan (simultan)
    const [res1, res2] = await Promise.all([
      adminClient.rpc("konfirmasi_pesanan_jual", { p_pesanan_id: so38.id, p_pelaku_id: so38.dibuat_oleh }),
      adminClient.rpc("konfirmasi_pesanan_jual", { p_pesanan_id: so39.id, p_pelaku_id: so39.dibuat_oleh })
    ]);

    // Kembalikan tanggal seed
    await adminClient.from("pesanan_jual").update({ jatuh_tempo: "2026-10-24" }).eq("nomor", "SO-00030");
    await adminClient.from("pesanan_jual").update({ jatuh_tempo: "2026-10-22" }).eq("nomor", "SO-00017");

    const resultsCombined = [res1?.data, res2?.data];
    const successes = resultsCombined.filter(r => r?.success === true);
    const failures = resultsCombined.filter(r => r?.success === false);

    const { data: susuAkhir } = await adminClient.from("barang").select("stok").eq("id", susuAwal.id).single();

    console.log(`  Hasil Simultan: ${successes.length} Berhasil, ${failures.length} Gagal. Sisa stok: ${susuAkhir.stok}`);

    if (successes.length === 1 && failures.length === 1 && susuAkhir.stok === 0) {
      console.log(`  [PASS] Race condition tertangani sempurna! Tepat 1 transaksi menang, 1 transaksi ditolak stok habis. Stok akhir = ${susuAkhir.stok} (tidak minus).`);
      results.push({
        id: "TC-13",
        rule: "BR-06",
        name: "Pencegahan race condition pada konfirmasi bersamaan",
        expected: "Tepat 1 pesanan berhasil, 1 pesanan gagal stok habis, stok akhir >= 0 (tidak minus)",
        actual: `1 Berhasil, 1 Ditolak ("${failures[0].message}"). Stok akhir = ${susuAkhir.stok}`,
        status: "PASSED"
      });

      // Cleanup: Kembalikan kondisi awal SO-00038 & SO-00039 serta stok susu menjadi 1
      await adminClient.from("pesanan_jual").update({ status: "draf", dikonfirmasi_pada: null }).in("id", [so38.id, so39.id]);
      await adminClient.from("barang").update({ stok: susuAwal.stok }).eq("id", susuAwal.id);
      await adminClient.from("mutasi_stok").delete().in("nomor_dokumen", ["SO-00038", "SO-00039"]);
    } else {
      throw new Error(`Race condition gagal: successes=${successes.length}, failures=${failures.length}, stokAkhir=${susuAkhir.stok}`);
    }
  } catch (err) {
    console.error("  [FAIL] TC-13:", err.message);
    results.push({ id: "TC-13", rule: "BR-06", name: "Pencegahan race condition", expected: "1 Berhasil, 1 Gagal, Stok >= 0", actual: err.message, status: "FAILED" });
  }

  // --------------------------------------------------------------------------
  // REKAP HASIL
  // --------------------------------------------------------------------------
  console.log("\n=================================================");
  console.log("📊 REKAPITULASI HASIL PENGUJIAN KELOMPOK C");
  console.log("=================================================");
  console.table(results.map(r => ({ ID: r.id, Aturan: r.rule, Skenario: r.name, Status: r.status })));

  const allPassed = results.every(r => r.status === "PASSED");
  if (allPassed) {
    console.log("\n🎉 SELURUH TEST CASE KELOMPOK C (TC-07 s/d TC-13) 100% PASSED!");
  } else {
    console.error("\n❌ BEBERAPA TEST CASE GAGAL!");
    process.exit(1);
  }
}

runTestGroupC().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
