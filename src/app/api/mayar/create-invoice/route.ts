import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Verifikasi autentikasi user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { pesananId } = body;

    if (!pesananId) {
      return NextResponse.json(
        { success: false, message: "Parameter pesananId diperlukan." },
        { status: 400 }
      );
    }

    // 2. Ambil data pesanan lengkap dari Supabase
    const { data: order, error: orderErr } = await supabase
      .from("pesanan_jual")
      .select(`
        id,
        nomor,
        total,
        status,
        jatuh_tempo,
        pelanggan:pelanggan_id (
          id,
          nama_toko,
          telepon
        ),
        items:item_pesanan_jual (
          id,
          jumlah,
          harga_satuan,
          subtotal,
          barang:barang_id (
            nama
          )
        )
      `)
      .eq("id", pesananId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json(
        { success: false, message: `Pesanan tidak ditemukan: ${orderErr?.message}` },
        { status: 404 }
      );
    }

    const apiKey = process.env.MAYAR_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "MAYAR_API_KEY belum dikonfigurasi di environment server." },
        { status: 500 }
      );
    }

    const pelanggan = order.pelanggan as any;
    const customerName = pelanggan?.nama_toko || "Pelanggan CV Sinar Abadi";
    const phoneRaw = pelanggan?.telepon || "081234567890";
    const mobile = phoneRaw.replace(/[^0-9]/g, "");

    // Format item pesanan untuk Mayar
    const items = (order.items as any[])?.map((item) => ({
      description: item.barang?.nama || "Barang Distribusi",
      quantity: Number(item.jumlah) || 1,
      rate: Number(item.harga_satuan) || Number(order.total),
    })) || [
      {
        description: `Faktur Pesanan ${order.nomor}`,
        quantity: 1,
        rate: Number(order.total),
      },
    ];

    // 3. Panggil API Mayar Sandbox: /hl/v1/invoice/create
    const mayarRes = await fetch("https://api.mayar.io/hl/v1/invoice/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: customerName,
        email: `${order.nomor.toLowerCase()}@sinarabadi.test`,
        mobile: mobile.startsWith("0") ? mobile : `0${mobile}`,
        description: `Tagihan Faktur ${order.nomor} - CV Sinar Abadi Niaga`,
        items: items,
      }),
    });

    const mayarData = await mayarRes.json();

    if (!mayarRes.ok || mayarData.statusCode !== 200) {
      return NextResponse.json(
        {
          success: false,
          message: mayarData.messages || "Gagal membuat invoice di server Mayar.",
          error: mayarData,
        },
        { status: mayarRes.status }
      );
    }

    const invoiceUrl = mayarData.data?.link;
    const invoiceId = mayarData.data?.id;

    // 4. Catat riwayat pembuatan invoice Mayar ke Audit Log sistem (BR-12)
    await supabase.from("audit_log").insert({
      pelaku_id: user.id,
      aksi: "buat_invoice_mayar",
      nama_tabel: "pesanan_jual",
      data_id: order.id,
      nilai_lama: { status: order.status },
      nilai_baru: {
        mayar_invoice_id: invoiceId,
        mayar_invoice_url: invoiceUrl,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Invoice Mayar berhasil dibuat secara real!",
      invoiceUrl: invoiceUrl,
      invoiceId: invoiceId,
      mayarData: mayarData.data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Terjadi kesalahan internal." },
      { status: 500 }
    );
  }
}
