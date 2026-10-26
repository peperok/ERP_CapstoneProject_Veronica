import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ambil profile peran pengguna
    const { data: profile } = await supabase
      .from("profiles")
      .select("nama_lengkap, peran")
      .eq("id", user.id)
      .single();

    const role = profile?.peran || "manajer";
    const today = new Date().toISOString().split("T")[0];

    // =========================================================================
    // 1. ROLE: MANAJER (Strategic, Margin, Cashflow, Approval)
    // =========================================================================
    if (role === "manajer") {
      const { data: soList } = await supabase
        .from("pesanan_jual")
        .select("id, nomor, total, status, dikirim_pada, jatuh_tempo, pelanggan(id, nama_toko, limit_kredit, saldo_piutang)");

      let omzet = 0;
      let piutang = 0;
      const overdueList: any[] = [];

      if (soList) {
        soList.forEach((so: any) => {
          const total = Number(so.total || 0);
          if (so.status === "dikirim" || so.status === "lunas") {
            omzet += total;
          }
          if (so.status === "dikonfirmasi" || so.status === "dikirim") {
            piutang += total;
          }
          if (so.status === "dikirim" && so.jatuh_tempo && so.jatuh_tempo < today) {
            overdueList.push({
              nomor: so.nomor,
              toko: so.pelanggan?.nama_toko || "Pelanggan",
              total,
              jatuhTempo: so.jatuh_tempo,
            });
          }
        });
      }

      // Margin & Top item
      const { data: itemData } = await supabase
        .from("item_pesanan_jual")
        .select("jumlah, subtotal, hpp_satuan, barang(nama), pesanan_jual!inner(status)")
        .in("pesanan_jual.status", ["dikirim", "lunas"]);

      let margin = 0;
      const productStats: Record<string, { qty: number; revenue: number; profit: number }> = {};

      if (itemData) {
        itemData.forEach((it: any) => {
          const subtotal = Number(it.subtotal || 0);
          const hpp = Number(it.hpp_satuan || 0) * Number(it.jumlah || 0);
          const profit = subtotal - hpp;
          margin += profit;

          const name = it.barang?.nama || "Barang";
          if (!productStats[name]) {
            productStats[name] = { qty: 0, revenue: 0, profit: 0 };
          }
          productStats[name].qty += Number(it.jumlah || 0);
          productStats[name].revenue += subtotal;
          productStats[name].profit += profit;
        });
      }

      const { data: lowStock } = await supabase
        .from("barang")
        .select("nama, stok, stok_minimum, satuan")
        .eq("aktif", true);

      const criticalItems = (lowStock || []).filter(
        (b: any) => Number(b.stok) <= Number(b.stok_minimum)
      );

      const { data: pendingPO } = await supabase
        .from("pembelian")
        .select("nomor, jumlah_dipesan, pemasok(nama), barang(nama)")
        .eq("status", "diajukan");

      const marginRatio = omzet > 0 ? (margin / omzet) * 100 : 0;
      const sortedProducts = Object.entries(productStats).sort((a, b) => b[1].profit - a[1].profit);
      const topPerformer = sortedProducts[0] ? sortedProducts[0][0] : null;

      const insights = {
        roleTitle: "Executive Strategic Advisory",
        summary: `Performa bisnis CV Sinar Abadi Niaga stabil dengan total omzet tercatat Rp ${omzet.toLocaleString("id-ID")} dan marjin kotor ${marginRatio.toFixed(1)}%. Likuiditas kas berjalan optimal dengan prioritas mitigasi piutang jatuh tempo.`,
        highlights: [
          {
            type: "success",
            title: "Efisiensi Profitabilitas",
            desc: topPerformer
              ? `SKU '${topPerformer}' menjadi penyumbang margin laba terbesar. Disarankan menjaga hubungan pasokan dengan produsen utama.`
              : `Rasio marjin kotor tercapai sebesar ${marginRatio.toFixed(1)}%, menunjukkan kontrol HPP yang solid.`,
          },
          {
            type: criticalItems.length > 0 ? "warning" : "info",
            title: "Ketahanan Stok & Restok",
            desc:
              criticalItems.length > 0
                ? `Terdapat ${criticalItems.length} SKU dengan stok kritis (${criticalItems.slice(0, 2).map((b: any) => `${b.nama} sisa ${b.stok}`).join(", ")}). Prioritaskan persetujuan PO untuk mencegah stock-out.`
                : "Semua persediaan barang berada di atas ambang batas minimum.",
          },
          {
            type: overdueList.length > 0 ? "danger" : "success",
            title: "Manajemen Piutang & Cash Flow",
            desc:
              overdueList.length > 0
                ? `Terdapat ${overdueList.length} tagihan jatuh tempo senilai Rp ${overdueList.reduce((acc, curr) => acc + curr.total, 0).toLocaleString("id-ID")}. Kirimkan invoice penagihan instan via Mayar QRIS.`
                : `Total piutang berjalan Rp ${piutang.toLocaleString("id-ID")} dalam kondisi terjadwal sehat.`,
          },
        ],
        recommendations: [
          criticalItems.length > 0
            ? `Otorisasi segera ${pendingPO?.length || 0} pengajuan PO pembelian barang menipis untuk menjamin ketersediaan pesanan toko rekanan.`
            : "Lakukan evaluasi penyesuaian kuota limit kredit pada toko dengan riwayat pembayaran lancar.",
          overdueList.length > 0
            ? "Gunakan fitur Invoice Digital Mayar pada menu Pesanan Jual untuk mengirimkan tagihan WhatsApp ber-QRIS langsung ke toko."
            : "Pertahankan rasio perputaran piutang di bawah 30 hari untuk menjaga likuiditas kas operasional.",
          "Pantau tren marjin mingguan menjelang akhir bulan untuk antisipasi fluktuasi harga bahan baku pemasok.",
        ],
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };

      return NextResponse.json({ success: true, insights });
    }

    // =========================================================================
    // 2. ROLE: PENJUALAN (Sales Pipeline, Target Toko, Limit Kredit & Penagihan)
    // =========================================================================
    if (role === "penjualan") {
      // Ambil pesanan yang dibuat oleh sales ini
      const { data: myOrders } = await supabase
        .from("pesanan_jual")
        .select("id, nomor, total, status, dibuat_pada, jatuh_tempo, pelanggan(nama_toko, limit_kredit, saldo_piutang)")
        .eq("dibuat_oleh", user.id);

      const drafOrders = (myOrders || []).filter((o) => o.status === "draf");
      const confirmedOrders = (myOrders || []).filter((o) => o.status === "dikonfirmasi");
      const lunasOrders = (myOrders || []).filter((o) => o.status === "lunas");

      // Cek pelanggan dengan kuota kredit masih luas vs hampir habis
      const { data: customers } = await supabase
        .from("pelanggan")
        .select("id, nama_toko, limit_kredit, saldo_piutang, aktif")
        .eq("aktif", true);

      const potentialProspects = (customers || []).filter((c) => {
        const sisa = Number(c.limit_kredit) - Number(c.saldo_piutang);
        return sisa >= 10000000; // Sisa limit masih > 10jt
      });

      const nearLimitCustomers = (customers || []).filter((c) => {
        const usage = Number(c.limit_kredit) > 0 ? (Number(c.saldo_piutang) / Number(c.limit_kredit)) * 100 : 0;
        return usage >= 80;
      });

      const overdueOrders = (myOrders || []).filter(
        (o) => o.status === "dikirim" && o.jatuh_tempo && o.jatuh_tempo < today
      );

      const insights = {
        roleTitle: "Sales Smart Assistant",
        summary: `Halo ${profile?.nama_lengkap || "Staf Penjualan"}, Anda memiliki ${drafOrders.length} draf pesanan aktif dan ${confirmedOrders.length} pesanan sedang disiapkan gudang. Fokus harian: follow-up konfirmasi draf dan maksimalkan toko dengan sisa kredit longgar.`,
        highlights: [
          {
            type: "info",
            title: "Peluang Penjualan (Plafon Kredit Luas)",
            desc: `Terdapat ${potentialProspects.length} toko rekanan dengan sisa limit kredit di atas Rp 10 Juta (${potentialProspects.slice(0, 2).map((c) => c.nama_toko).join(", ")}). Segera tawarkan bundling sembako untuk meningkatkan volume penjualan minggu ini.`,
          },
          {
            type: nearLimitCustomers.length > 0 ? "warning" : "success",
            title: "Peringatan Batas Limit Kredit Toko (BR-05)",
            desc: nearLimitCustomers.length > 0
              ? `${nearLimitCustomers.length} toko telah menggunakan >80% limit kredit (${nearLimitCustomers.slice(0, 2).map((c) => c.nama_toko).join(", ")}). Hindari membuat pesanan baru sebelum faktur berjalan dilunasi agar tidak terblokir sistem.`
              : "Semua toko berada dalam batas aman limit kredit yang diizinkan.",
          },
          {
            type: overdueOrders.length > 0 ? "danger" : "success",
            title: "Penagihan Faktur Tempo",
            desc: overdueOrders.length > 0
              ? `Terdapat ${overdueOrders.length} faktur pesanan Anda yang telah jatuh tempo (${overdueOrders.map((o: any) => (Array.isArray(o.pelanggan) ? o.pelanggan[0]?.nama_toko : o.pelanggan?.nama_toko) || "Toko").join(", ")}). Bagikan tautan pembayaran digital Mayar via WhatsApp agar saldo kredit toko kembali pulih.`
              : "Tidak ada faktur tempo yang menunggak pada portofolio penjualan Anda.",
          },
        ],
        recommendations: [
          drafOrders.length > 0
            ? `Segera konfirmasikan ${drafOrders.length} draf pesanan sebelum pukul 15:00 WIB agar dapat masuk jadwal muat gudang esok hari.`
            : "Kunjungi toko dengan volume order rutin di wilayah rute Jakarta Timur / Bekasi.",
          "Gunakan diskon proporsional (maksimal 10%) untuk mendorong repeat order toko yang aktif.",
          "Ingatkan toko rekanan untuk membayar tepat waktu sebelum tanggal jatuh tempo tempo tercapai.",
        ],
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };

      return NextResponse.json({ success: true, insights });
    }

    // =========================================================================
    // 3. ROLE: GUDANG (Fulfillment Velocity, Low Stock Alert, Incoming PO)
    // =========================================================================
    if (role === "gudang") {
      // Siap kirim (dikonfirmasi)
      const { data: readyOrders } = await supabase
        .from("pesanan_jual")
        .select("id, nomor, total, dikonfirmasi_pada, pelanggan(nama_toko)")
        .eq("status", "dikonfirmasi");

      // Stok menipis
      const { data: items } = await supabase
        .from("barang")
        .select("nama, stok, stok_minimum, satuan")
        .eq("aktif", true);

      const lowStockList = (items || []).filter((b) => Number(b.stok) <= Number(b.stok_minimum));

      // PO Disetujui menunggu barang datang
      const { data: incomingPO } = await supabase
        .from("pembelian")
        .select("nomor, jumlah_dipesan, barang(nama), pemasok(nama)")
        .eq("status", "disetujui");

      const insights = {
        roleTitle: "Warehouse Operations Copilot",
        summary: `Halo ${profile?.nama_lengkap || "Staf Gudang"}, operasional gudang saat ini mencatat ${readyOrders?.length || 0} pesanan siap kemas dan kirim, serta ${incomingPO?.length || 0} pengiriman pasokan masuk yang menunggu penerimaan fisik.`,
        highlights: [
          {
            type: (readyOrders?.length || 0) > 0 ? "warning" : "success",
            title: "Pesanan Siap Kirim (Fulfillment)",
            desc: (readyOrders?.length || 0) > 0
              ? `Ada ${readyOrders?.length} pesanan terkonfirmasi yang menunggu pengiriman (${readyOrders?.slice(0, 2).map((o: any) => o.nomor).join(", ")}). Siapkan packing list dan ubah status ke 'Dikirim' setelah truk berangkat.`
              : "Semua pesanan terkonfirmasi telah diberangkatkan.",
          },
          {
            type: lowStockList.length > 0 ? "danger" : "success",
            title: "Peringatan Stok Kritis Gudang",
            desc: lowStockList.length > 0
              ? `Terdapat ${lowStockList.length} barang di bawah safety stock (${lowStockList.slice(0, 3).map((b) => `${b.nama} sisa ${b.stok} ${b.satuan}`).join(", ")}). Ajukan PO pengadaan tambahan ke pemasok sekarang.`
              : "Semua stok barang gudang berada dalam level aman.",
          },
          {
            type: "info",
            title: "Penerimaan Pasokan Masuk (Inbound)",
            desc: (incomingPO?.length || 0) > 0
              ? `${incomingPO?.length} PO telah disetujui Manajer dan sedang dalam perjalanan dari pemasok (${incomingPO?.slice(0, 2).map((p: any) => `${p.barang?.nama} dari ${p.pemasok?.nama}`).join(", ")}). Siapkan area loading dock.`
              : "Tidak ada jadwal pengiriman pasokan masuk yang pending saat ini.",
          },
        ],
        recommendations: [
          lowStockList.length > 0
            ? "Buat draf Pengajuan Pembelian (PO) untuk barang kritis melalui menu Pembelian."
            : "Lakukan cross-check stok fisik berkala dengan menu Penyesuaian Stok.",
          "Verifikasi kuantiti dan kondisi fisik barang saat truk pemasok tiba sebelum menekan tombol 'Terima Barang'.",
          "Pastikan rute pengiriman pesanan keluar dikelompokkan berdasarkan area toko untuk menghemat biaya operasional.",
        ],
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };

      return NextResponse.json({ success: true, insights });
    }

    return NextResponse.json({ error: "Peran tidak dikenali" }, { status: 400 });
  } catch (error: any) {
    console.error("AI Insight Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
