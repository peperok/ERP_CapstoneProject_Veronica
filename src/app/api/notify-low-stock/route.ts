import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Verifikasi sesi user login
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    // 2. Ambil parameter body (optional: custom recipient)
    let body: { targetEmail?: string } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    // 3. Ambil data barang dari database Supabase
    const { data: barangList, error: dbError } = await supabase
      .from("barang")
      .select("id, kode, nama, stok, stok_minimum, satuan")
      .order("stok", { ascending: true });

    if (dbError) {
      return NextResponse.json(
        { success: false, message: `Gagal mengambil data barang: ${dbError.message}` },
        { status: 500 }
      );
    }

    // 4. Filter barang dengan stok <= stok_minimum
    const lowStockItems = (barangList || []).filter(
      (b) => Number(b.stok) <= Number(b.stok_minimum)
    );

    if (lowStockItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Semua persediaan barang saat ini dalam kondisi aman (di atas batas minimum).",
        count: 0,
        items: [],
      });
    }

    // 5. Inisialisasi Resend
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "RESEND_API_KEY belum dikonfigurasi di file environment.",
        },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    // Resend free tier membolehkan kirim ke email akun terdaftar pengguna
    // Jika ada targetEmail yang dikirimkan klien, gunakan itu, jika tidak gunakan email login atau fallback
    const targetEmail = body.targetEmail || user.email || "delivered@resend.dev";

    // 6. Susun Email HTML Profesional
    const tableRowsHtml = lowStockItems
      .map(
        (item, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 0 ? "background-color: #f8fafc;" : ""}">
          <td style="padding: 10px 12px; font-weight: bold; color: #1e293b; font-family: monospace;">${item.kode}</td>
          <td style="padding: 10px 12px; color: #0f172a; font-weight: 600;">${item.nama}</td>
          <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: #dc2626; font-size: 14px;">${item.stok}</td>
          <td style="padding: 10px 12px; text-align: center; font-weight: 600; color: #475569;">${item.stok_minimum}</td>
          <td style="padding: 10px 12px; text-align: center; color: #64748b;">${item.satuan}</td>
          <td style="padding: 10px 12px; text-align: center;">
            <span style="background-color: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold;">
              Defisit: ${Number(item.stok_minimum) - Number(item.stok)} ${item.satuan}
            </span>
          </td>
        </tr>
      `
      )
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #0f172a; }
            .container { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #1e3a8a, #0f172a); padding: 24px 28px; color: #ffffff; }
            .badge-urgent { display: inline-block; background-color: #dc2626; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
            .content { padding: 28px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 16px; margin-bottom: 24px; }
            th { background-color: #0f172a; color: #ffffff; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
            .footer { background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="badge-urgent">⚠️ Perhatian Mendesak</span>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Peringatan Stok Barang Menipis</h1>
              <p style="margin: 6px 0 0 0; font-size: 12px; opacity: 0.85;">CV. Sinar Abadi Niaga — Sistem Manajemen Distribusi ERP</p>
            </div>
            <div class="content">
              <p style="margin-top: 0; font-size: 14px; line-height: 1.5;">
                Halo <strong>Tim Pengadaan &amp; Manajemen</strong>,
              </p>
              <p style="font-size: 13px; line-height: 1.5; color: #334155;">
                Sistem mendeteksi sebanyak <strong>${lowStockItems.length} produk</strong> persediaannya telah mencapai atau berada di bawah <strong>Batas Minimum Stok (Reorder Point)</strong>. Mohon segera lakukan pemesanan pembelian (PO) kepada pemasok terkait untuk mencegah terganggunya operasional penjualan.
              </p>

              <table>
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama Barang</th>
                    <th style="text-align: center;">Sisa Stok</th>
                    <th style="text-align: center;">Min Stok</th>
                    <th style="text-align: center;">Satuan</th>
                    <th style="text-align: center;">Status Defisit</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRowsHtml}
                </tbody>
              </table>

              <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; border-radius: 4px; font-size: 12px; color: #1e40af;">
                💡 <strong>Tindakan yang Disarankan:</strong> Kunjungi menu <strong>Pengadaan / Pembelian</strong> di aplikasi ERP untuk membuat Purchase Order (PO) baru ke pemasok utama.
              </div>
            </div>
            <div class="footer">
              Email otomatis ini dibuat oleh Sistem ERP CV. Sinar Abadi Niaga via Resend API Service.<br/>
              Waktu Pemeriksaan: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Makassar" })} WITA
            </div>
          </div>
        </body>
      </html>
    `;

    // 7. Eksekusi pengiriman email via Resend SDK
    const { data: resendData, error: resendError } = await resend.emails.send({
      from: "ERP Sinar Abadi <onboarding@resend.dev>",
      to: [targetEmail],
      subject: `⚠️ PERINGATAN: ${lowStockItems.length} Stok Barang Menipis (CV Sinar Abadi Niaga)`,
      html: emailHtml,
    });

    if (resendError) {
      console.error("Resend API Error:", resendError);
      return NextResponse.json(
        {
          success: false,
          message: `Gagal mengirim email: ${resendError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengirim email peringatan ${lowStockItems.length} barang menipis ke ${targetEmail}!`,
      emailId: resendData?.id,
      count: lowStockItems.length,
      items: lowStockItems,
    });
  } catch (error: any) {
    console.error("Notify Low Stock Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Terjadi kesalahan server internal.",
      },
      { status: 500 }
    );
  }
}
