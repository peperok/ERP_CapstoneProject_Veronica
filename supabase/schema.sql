-- ==============================================================================
-- CAPSTONE PROJECT: ERP DISTRIBUSI CV SINAR ABADI NIAGA
-- SKRIP MIGRASI DATABASE LENGKAP (DDL, RLS, & STORED PROCEDURES)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TIPE ENUM
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('manajer', 'penjualan', 'gudang');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_pembelian AS ENUM ('diajukan', 'disetujui', 'ditolak', 'diterima', 'dibatalkan');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_pesanan_jual AS ENUM ('draf', 'dikonfirmasi', 'dikirim', 'lunas', 'dibatalkan');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE jenis_mutasi_stok AS ENUM ('masuk', 'keluar', 'batal', 'penyesuaian');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABEL UTAMA (SESUAI STRUKTUR EXCEL & ERD)

-- TABEL: profiles (terhubung ke auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nama_lengkap TEXT NOT NULL,
    peran user_role NOT NULL DEFAULT 'penjualan',
    aktif BOOLEAN NOT NULL DEFAULT true,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- TABEL: pemasok
CREATE TABLE IF NOT EXISTS public.pemasok (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode TEXT NOT NULL UNIQUE,
    nama TEXT NOT NULL,
    telepon TEXT NOT NULL,
    alamat TEXT NOT NULL,
    aktif BOOLEAN NOT NULL DEFAULT true,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- TABEL: pelanggan
CREATE TABLE IF NOT EXISTS public.pelanggan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode TEXT NOT NULL UNIQUE,
    nama_toko TEXT NOT NULL,
    telepon TEXT NOT NULL,
    alamat TEXT NOT NULL,
    batas_kredit BIGINT NOT NULL DEFAULT 0 CHECK (batas_kredit >= 0),
    termin_hari INT NOT NULL DEFAULT 0 CHECK (termin_hari IN (0, 7, 14, 30)),
    aktif BOOLEAN NOT NULL DEFAULT true,
    dibuat_oleh UUID REFERENCES public.profiles(id),
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- TABEL: barang
CREATE TABLE IF NOT EXISTS public.barang (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode TEXT NOT NULL UNIQUE,
    nama TEXT NOT NULL,
    satuan TEXT NOT NULL,
    harga_jual BIGINT NOT NULL CHECK (harga_jual > 0),
    harga_pokok BIGINT NOT NULL DEFAULT 0 CHECK (harga_pokok >= 0), -- Rahasia Manajer (BR-12)
    stok INT NOT NULL DEFAULT 0 CHECK (stok >= 0),
    stok_minimum INT NOT NULL DEFAULT 0 CHECK (stok_minimum >= 0),
    aktif BOOLEAN NOT NULL DEFAULT true,
    diperbarui_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- TABEL: pembelian (Purchase Order)
CREATE TABLE IF NOT EXISTS public.pembelian (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nomor TEXT NOT NULL UNIQUE,
    pemasok_id UUID NOT NULL REFERENCES public.pemasok(id),
    barang_id UUID NOT NULL REFERENCES public.barang(id),
    jumlah_dipesan INT NOT NULL CHECK (jumlah_dipesan >= 1 AND jumlah_dipesan <= 10000),
    jumlah_diterima INT CHECK (jumlah_diterima >= 0),
    harga_beli_satuan BIGINT CHECK (harga_beli_satuan IS NULL OR harga_beli_satuan > 0), -- Rahasia Manajer (BR-12)
    status status_pembelian NOT NULL DEFAULT 'diajukan',
    alasan_tolak TEXT,
    alasan_batal TEXT,
    diajukan_oleh UUID NOT NULL REFERENCES public.profiles(id),
    diajukan_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    diputuskan_oleh UUID REFERENCES public.profiles(id),
    diputuskan_pada TIMESTAMPTZ,
    diterima_oleh UUID REFERENCES public.profiles(id),
    diterima_pada TIMESTAMPTZ
);

-- TABEL: pesanan_jual (Sales Order)
CREATE TABLE IF NOT EXISTS public.pesanan_jual (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nomor TEXT NOT NULL UNIQUE,
    pelanggan_id UUID NOT NULL REFERENCES public.pelanggan(id),
    status status_pesanan_jual NOT NULL DEFAULT 'draf',
    total BIGINT NOT NULL DEFAULT 0 CHECK (total >= 0),
    dibuat_oleh UUID NOT NULL REFERENCES public.profiles(id),
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    dikonfirmasi_pada TIMESTAMPTZ,
    dikirim_pada TIMESTAMPTZ,
    jatuh_tempo DATE,
    dilunasi_pada TIMESTAMPTZ,
    dibatalkan_pada TIMESTAMPTZ,
    alasan_batal TEXT
);

-- TABEL: item_pesanan_jual
CREATE TABLE IF NOT EXISTS public.item_pesanan_jual (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pesanan_jual_id UUID NOT NULL REFERENCES public.pesanan_jual(id) ON DELETE CASCADE,
    barang_id UUID NOT NULL REFERENCES public.barang(id),
    jumlah INT NOT NULL CHECK (jumlah >= 1),
    harga_satuan BIGINT NOT NULL CHECK (harga_satuan > 0),
    diskon_persen INT NOT NULL DEFAULT 0 CHECK (diskon_persen >= 0 AND diskon_persen <= 25),
    subtotal BIGINT NOT NULL CHECK (subtotal >= 0),
    hpp_satuan BIGINT DEFAULT 0, -- Rahasia Manajer (BR-12)
    CONSTRAINT uq_pesanan_barang UNIQUE (pesanan_jual_id, barang_id)
);

-- TABEL: mutasi_stok (Kartu Stok)
CREATE TABLE IF NOT EXISTS public.mutasi_stok (
    id BIGSERIAL PRIMARY KEY,
    barang_id UUID NOT NULL REFERENCES public.barang(id),
    jenis jenis_mutasi_stok NOT NULL,
    jumlah INT NOT NULL,
    stok_sesudah INT NOT NULL CHECK (stok_sesudah >= 0),
    nomor_dokumen TEXT NOT NULL,
    alasan TEXT,
    dibuat_oleh UUID NOT NULL REFERENCES public.profiles(id),
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- TABEL: audit_log
CREATE TABLE IF NOT EXISTS public.audit_log (
    id BIGSERIAL PRIMARY KEY,
    pelaku_id UUID NOT NULL REFERENCES public.profiles(id),
    aksi TEXT NOT NULL,
    nama_tabel TEXT NOT NULL,
    data_id TEXT NOT NULL,
    nilai_lama JSONB,
    nilai_baru JSONB,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 4. VIEW KHUSUS RBAC (VIEW PUBLIC NON-MANAJER: BR-12)
-- Menghilangkan harga_pokok, harga_beli_satuan, dan hpp_satuan dari non-manajer
-- ==============================================================================

CREATE OR REPLACE VIEW public.v_barang_public AS
SELECT 
    b.id,
    b.kode,
    b.nama,
    b.satuan,
    b.harga_jual,
    CASE 
        WHEN (SELECT peran FROM public.profiles WHERE id = auth.uid()) = 'manajer' THEN b.harga_pokok
        ELSE NULL 
    END AS harga_pokok,
    b.stok,
    b.stok_minimum,
    b.aktif,
    b.diperbarui_pada,
    (b.stok <= b.stok_minimum) AS stok_menipis
FROM public.barang b;

CREATE OR REPLACE VIEW public.v_pembelian_public AS
SELECT 
    p.id,
    p.nomor,
    p.pemasok_id,
    p.barang_id,
    p.jumlah_dipesan,
    p.jumlah_diterima,
    CASE 
        WHEN (SELECT peran FROM public.profiles WHERE id = auth.uid()) = 'manajer' THEN p.harga_beli_satuan
        ELSE NULL 
    END AS harga_beli_satuan,
    p.status,
    p.alasan_tolak,
    p.alasan_batal,
    p.diajukan_oleh,
    p.diajukan_pada,
    p.diputuskan_oleh,
    p.diputuskan_pada,
    p.diterima_oleh,
    p.diterima_pada
FROM public.pembelian p;

CREATE OR REPLACE VIEW public.v_item_pesanan_jual_public AS
SELECT 
    i.id,
    i.pesanan_jual_id,
    i.barang_id,
    i.jumlah,
    i.harga_satuan,
    i.diskon_persen,
    i.subtotal,
    CASE 
        WHEN (SELECT peran FROM public.profiles WHERE id = auth.uid()) = 'manajer' THEN i.hpp_satuan
        ELSE NULL 
    END AS hpp_satuan
FROM public.item_pesanan_jual i;

-- ==============================================================================
-- 5. FUNCTION HELPER: CEK ROLE PENGGUNA
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS user_role AS $$
    SELECT peran FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_manajer()
RETURNS BOOLEAN AS $$
    SELECT (get_auth_role() = 'manajer');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pemasok ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pelanggan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pembelian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesanan_jual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_pesanan_jual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutasi_stok ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 6.1 PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_update_manajer" ON public.profiles;
CREATE POLICY "profiles_update_manajer" ON public.profiles FOR UPDATE USING (is_manajer());

-- 6.2 PEMASOK POLICIES
DROP POLICY IF EXISTS "pemasok_select" ON public.pemasok;
CREATE POLICY "pemasok_select" ON public.pemasok FOR SELECT USING (true);

DROP POLICY IF EXISTS "pemasok_manage" ON public.pemasok;
CREATE POLICY "pemasok_manage" ON public.pemasok FOR ALL USING (
    get_auth_role() IN ('manajer', 'gudang')
);

-- 6.3 PELANGGAN POLICIES
DROP POLICY IF EXISTS "pelanggan_select" ON public.pelanggan;
CREATE POLICY "pelanggan_select" ON public.pelanggan FOR SELECT USING (true);

DROP POLICY IF EXISTS "pelanggan_insert" ON public.pelanggan;
CREATE POLICY "pelanggan_insert" ON public.pelanggan FOR INSERT WITH CHECK (
    get_auth_role() IN ('manajer', 'penjualan')
);

DROP POLICY IF EXISTS "pelanggan_update" ON public.pelanggan;
CREATE POLICY "pelanggan_update" ON public.pelanggan FOR UPDATE USING (
    get_auth_role() IN ('manajer', 'penjualan')
);

-- 6.4 BARANG POLICIES
DROP POLICY IF EXISTS "barang_select" ON public.barang;
CREATE POLICY "barang_select" ON public.barang FOR SELECT USING (true);

DROP POLICY IF EXISTS "barang_insert" ON public.barang;
CREATE POLICY "barang_insert" ON public.barang FOR INSERT WITH CHECK (is_manajer());

DROP POLICY IF EXISTS "barang_update" ON public.barang;
CREATE POLICY "barang_update" ON public.barang FOR UPDATE USING (
    get_auth_role() IN ('manajer', 'gudang')
);

-- 6.5 PEMBELIAN POLICIES
DROP POLICY IF EXISTS "pembelian_select" ON public.pembelian;
CREATE POLICY "pembelian_select" ON public.pembelian FOR SELECT USING (
    get_auth_role() IN ('manajer', 'gudang')
);

DROP POLICY IF EXISTS "pembelian_insert" ON public.pembelian;
CREATE POLICY "pembelian_insert" ON public.pembelian FOR INSERT WITH CHECK (
    get_auth_role() IN ('manajer', 'gudang')
);

DROP POLICY IF EXISTS "pembelian_update" ON public.pembelian;
CREATE POLICY "pembelian_update" ON public.pembelian FOR UPDATE USING (
    get_auth_role() IN ('manajer', 'gudang')
);

-- 6.6 PESANAN JUAL POLICIES
DROP POLICY IF EXISTS "pesanan_jual_select" ON public.pesanan_jual;
CREATE POLICY "pesanan_jual_select" ON public.pesanan_jual FOR SELECT USING (
    -- Gudang hanya melihat pesanan dikonfirmasi ke atas (PRD Bab 7)
    (get_auth_role() = 'gudang' AND status != 'draf') OR
    (get_auth_role() IN ('manajer', 'penjualan'))
);

DROP POLICY IF EXISTS "pesanan_jual_insert" ON public.pesanan_jual;
CREATE POLICY "pesanan_jual_insert" ON public.pesanan_jual FOR INSERT WITH CHECK (
    get_auth_role() IN ('manajer', 'penjualan')
);

DROP POLICY IF EXISTS "pesanan_jual_update" ON public.pesanan_jual;
CREATE POLICY "pesanan_jual_update" ON public.pesanan_jual FOR UPDATE USING (
    get_auth_role() IN ('manajer', 'penjualan', 'gudang')
);

-- 6.7 ITEM PESANAN JUAL POLICIES
DROP POLICY IF EXISTS "item_pesanan_jual_select" ON public.item_pesanan_jual;
CREATE POLICY "item_pesanan_jual_select" ON public.item_pesanan_jual FOR SELECT USING (true);

DROP POLICY IF EXISTS "item_pesanan_jual_all" ON public.item_pesanan_jual;
CREATE POLICY "item_pesanan_jual_all" ON public.item_pesanan_jual FOR ALL USING (
    get_auth_role() IN ('manajer', 'penjualan')
);

-- 6.8 MUTASI STOK POLICIES
DROP POLICY IF EXISTS "mutasi_stok_select" ON public.mutasi_stok;
CREATE POLICY "mutasi_stok_select" ON public.mutasi_stok FOR SELECT USING (true);

DROP POLICY IF EXISTS "mutasi_stok_insert" ON public.mutasi_stok;
CREATE POLICY "mutasi_stok_insert" ON public.mutasi_stok FOR INSERT WITH CHECK (
    get_auth_role() IN ('manajer', 'gudang')
);

-- 6.9 AUDIT LOG POLICIES (Hanya Manajer: BR-12)
DROP POLICY IF EXISTS "audit_log_select_manajer" ON public.audit_log;
CREATE POLICY "audit_log_select_manajer" ON public.audit_log FOR SELECT USING (is_manajer());

DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;
CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- 7. STORED PROCEDURE TRANSAKSIONAL ATOMIK (BR-04, BR-05, BR-06)
-- Mencegah Race Condition dengan "FOR UPDATE"
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.konfirmasi_pesanan_jual(
    p_pesanan_id UUID,
    p_pelaku_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_pesanan RECORD;
    v_pelanggan RECORD;
    v_item RECORD;
    v_pelaku RECORD;
    v_total_piutang_berjalan BIGINT := 0;
    v_ada_jatuh_tempo BOOLEAN := false;
    v_bawah_hpp BOOLEAN := false;
    v_stok_tersedia INT;
BEGIN
    -- 1. Ambil data pelaku
    SELECT * INTO v_pelaku FROM public.profiles WHERE id = p_pelaku_id;
    IF NOT FOUND OR NOT v_pelaku.aktif THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pelaku tidak ditemukan atau akun nonaktif.');
    END IF;

    -- 2. Ambil data pesanan & kunci baris (FOR UPDATE)
    SELECT * INTO v_pesanan FROM public.pesanan_jual WHERE id = p_pesanan_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pesanan jual tidak ditemukan.');
    END IF;

    IF v_pesanan.status != 'draf' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Hanya pesanan berstatus draf yang dapat dikonfirmasi.');
    END IF;

    -- Batasan pembuat (BR-07): Staf Penjualan hanya boleh konfirmasi draf buatannya
    IF v_pelaku.peran = 'penjualan' AND v_pesanan.dibuat_oleh != p_pelaku_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Staf Penjualan hanya boleh mengonfirmasi draf yang dibuat sendiri.');
    END IF;

    -- 3. Ambil data pelanggan & kunci baris (FOR UPDATE)
    SELECT * INTO v_pelanggan FROM public.pelanggan WHERE id = v_pesanan.pelanggan_id FOR UPDATE;
    IF NOT FOUND OR NOT v_pelanggan.aktif THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pelanggan tidak aktif atau tidak ditemukan.');
    END IF;

    -- 4. VALIDASI BR-05: Cek Tagihan Lewat Jatuh Tempo
    SELECT EXISTS (
        SELECT 1 FROM public.pesanan_jual 
        WHERE pelanggan_id = v_pesanan.pelanggan_id 
          AND status = 'dikirim' 
          AND jatuh_tempo < CURRENT_DATE
    ) INTO v_ada_jatuh_tempo;

    IF v_ada_jatuh_tempo THEN
        RETURN jsonb_build_object('success', false, 'message', 'Konfirmasi ditolak: Pelanggan memiliki tagihan yang telah lewat jatuh tempo.');
    END IF;

    -- VALIDASI BR-05: Cek Batas Kredit
    SELECT COALESCE(SUM(total), 0) INTO v_total_piutang_berjalan
    FROM public.pesanan_jual
    WHERE pelanggan_id = v_pesanan.pelanggan_id
      AND status IN ('dikonfirmasi', 'dikirim');

    IF (v_total_piutang_berjalan + v_pesanan.total) > v_pelanggan.batas_kredit THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', format('Konfirmasi ditolak: Total piutang (Rp%s) ditambah pesanan (Rp%s) melebihi batas kredit (Rp%s).',
                v_total_piutang_berjalan, v_pesanan.total, v_pelanggan.batas_kredit)
        );
    END IF;

    -- 5. VALIDASI BR-04: Cek Harga di bawah HPP
    FOR v_item IN 
        SELECT i.*, b.harga_pokok, b.nama as nama_barang 
        FROM public.item_pesanan_jual i
        JOIN public.barang b ON b.id = i.barang_id
        WHERE i.pesanan_jual_id = p_pesanan_id
    LOOP
        IF v_item.subtotal < (v_item.harga_pokok * v_item.jumlah) THEN
            v_bawah_hpp := true;
        END IF;
    END LOOP;

    IF v_bawah_hpp AND v_pelaku.peran != 'manajer' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Harga di bawah harga pokok hanya boleh disetujui Manajer.');
    END IF;

    -- 6. VALIDASI & PENGURANGAN STOK BR-06 DENGAN PENGUNCIAN BARIS BARANG (FOR UPDATE)
    FOR v_item IN 
        SELECT i.*, b.stok, b.nama as nama_barang, b.harga_pokok
        FROM public.item_pesanan_jual i
        JOIN public.barang b ON b.id = i.barang_id
        WHERE i.pesanan_jual_id = p_pesanan_id
        FOR UPDATE OF b
    LOOP
        IF v_item.stok < v_item.jumlah THEN
            -- Batalkan seluruh transaksi jika satu barang saja kurang
            RAISE EXCEPTION 'Stok barang % tidak mencukupi (sisa %, diminta %). Seluruh konfirmasi dibatalkan.', 
                v_item.nama_barang, v_item.stok, v_item.jumlah;
        END IF;

        -- Kurangi stok barang
        UPDATE public.barang
        SET stok = stok - v_item.jumlah,
            diperbarui_pada = timezone('utc'::text, now())
        WHERE id = v_item.barang_id;

        -- Simpan harga pokok saat konfirmasi pada item pesanan (BR-08 / BR-12)
        UPDATE public.item_pesanan_jual
        SET hpp_satuan = v_item.harga_pokok
        WHERE id = v_item.id;

        -- Catat ke mutasi_stok (BR-11)
        INSERT INTO public.mutasi_stok (
            barang_id, jenis, jumlah, stok_sesudah, nomor_dokumen, dibuat_oleh, dibuat_pada
        ) VALUES (
            v_item.barang_id,
            'keluar',
            v_item.jumlah,
            (v_item.stok - v_item.jumlah),
            v_pesanan.nomor,
            p_pelaku_id,
            timezone('utc'::text, now())
        );
    END LOOP;

    -- 7. Perbarui status pesanan menjadi dikonfirmasi
    UPDATE public.pesanan_jual
    SET status = 'dikonfirmasi',
        dikonfirmasi_pada = timezone('utc'::text, now())
    WHERE id = p_pesanan_id;

    RETURN jsonb_build_object('success', true, 'message', 'Pesanan jual berhasil dikonfirmasi dan stok telah dipotong.');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 8. STORED PROCEDURE: PEMBATALAN PESANAN DIKONFIRMASI (BR-08)
-- Alasan min. 10 karakter & stok dikembalikan
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.batalkan_pesanan_dikonfirmasi(
    p_pesanan_id UUID,
    p_pelaku_id UUID,
    p_alasan TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_pesanan RECORD;
    v_pelaku RECORD;
    v_item RECORD;
    v_stok_skrg INT;
BEGIN
    -- 1. Cek pelaku wajib manajer (BR-08)
    SELECT * INTO v_pelaku FROM public.profiles WHERE id = p_pelaku_id;
    IF v_pelaku.peran != 'manajer' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Hanya Manajer yang berhak membatalkan pesanan yang sudah dikonfirmasi.');
    END IF;

    -- 2. Cek panjang alasan minimal 10 karakter
    IF char_length(trim(p_alasan)) < 10 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Alasan pembatalan wajib diisi paling sedikit 10 karakter.');
    END IF;

    -- 3. Cek pesanan
    SELECT * INTO v_pesanan FROM public.pesanan_jual WHERE id = p_pesanan_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pesanan jual tidak ditemukan.');
    END IF;

    IF v_pesanan.status != 'dikonfirmasi' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Hanya pesanan berstatus dikonfirmasi yang dapat dibatalkan lewat fungsi ini.');
    END IF;

    -- 4. Kembalikan stok barang & catat mutasi stok jenis 'batal'
    FOR v_item IN 
        SELECT i.*, b.stok
        FROM public.item_pesanan_jual i
        JOIN public.barang b ON b.id = i.barang_id
        WHERE i.pesanan_jual_id = p_pesanan_id
        FOR UPDATE OF b
    LOOP
        UPDATE public.barang
        SET stok = stok + v_item.jumlah,
            diperbarui_pada = timezone('utc'::text, now())
        WHERE id = v_item.barang_id;

        INSERT INTO public.mutasi_stok (
            barang_id, jenis, jumlah, stok_sesudah, nomor_dokumen, alasan, dibuat_oleh, dibuat_pada
        ) VALUES (
            v_item.barang_id,
            'batal',
            v_item.jumlah,
            (v_item.stok + v_item.jumlah),
            v_pesanan.nomor,
            p_alasan,
            p_pelaku_id,
            timezone('utc'::text, now())
        );
    END LOOP;

    -- 5. Ubah status pesanan
    UPDATE public.pesanan_jual
    SET status = 'dibatalkan',
        alasan_batal = p_alasan,
        dibatalkan_pada = timezone('utc'::text, now())
    WHERE id = p_pesanan_id;

    -- 6. Catat audit log (BR-12)
    INSERT INTO public.audit_log (
        pelaku_id, aksi, nama_tabel, data_id, nilai_lama, nilai_baru, dibuat_pada
    ) VALUES (
        p_pelaku_id,
        'batal_pesanan_dikonfirmasi',
        'pesanan_jual',
        p_pesanan_id::text,
        jsonb_build_object('status', 'dikonfirmasi'),
        jsonb_build_object('status', 'dibatalkan', 'alasan_batal', p_alasan),
        timezone('utc'::text, now())
    );

    RETURN jsonb_build_object('success', true, 'message', 'Pesanan berhasil dibatalkan dan seluruh stok telah dikembalikan.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 9. STORED PROCEDURE: PENERIMAAN BARANG PEMBELIAN (BR-10)
-- Update stok, update HPP barang, dan cegah penerimaan kedua
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.terima_barang_pembelian(
    p_pembelian_id UUID,
    p_pelaku_id UUID,
    p_jumlah_diterima INT
)
RETURNS JSONB AS $$
DECLARE
    v_pembelian RECORD;
    v_pelaku RECORD;
    v_barang RECORD;
BEGIN
    SELECT * INTO v_pelaku FROM public.profiles WHERE id = p_pelaku_id;
    IF v_pelaku.peran NOT IN ('manajer', 'gudang') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Hanya Manajer atau Staf Gudang yang berhak mencatat penerimaan barang.');
    END IF;

    SELECT * INTO v_pembelian FROM public.pembelian WHERE id = p_pembelian_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Dokumen pembelian tidak ditemukan.');
    END IF;

    IF v_pembelian.status != 'disetujui' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Penerimaan barang hanya dapat dilakukan untuk pembelian berstatus disetujui.');
    END IF;

    IF p_jumlah_diterima < 1 OR p_jumlah_diterima > v_pembelian.jumlah_dipesan THEN
        RETURN jsonb_build_object('success', false, 'message', 'Jumlah diterima harus antara 1 sampai jumlah dipesan.');
    END IF;

    -- Kunci baris barang
    SELECT * INTO v_barang FROM public.barang WHERE id = v_pembelian.barang_id FOR UPDATE;

    -- Tambah stok dan perbarui harga pokok menjadi harga beli pembelian tersebut (BR-10)
    UPDATE public.barang
    SET stok = stok + p_jumlah_diterima,
        harga_pokok = COALESCE(v_pembelian.harga_beli_satuan, harga_pokok),
        diperbarui_pada = timezone('utc'::text, now())
    WHERE id = v_pembelian.barang_id;

    -- Catat ke mutasi_stok jenis 'masuk'
    INSERT INTO public.mutasi_stok (
        barang_id, jenis, jumlah, stok_sesudah, nomor_dokumen, dibuat_oleh, dibuat_pada
    ) VALUES (
        v_pembelian.barang_id,
        'masuk',
        p_jumlah_diterima,
        (v_barang.stok + p_jumlah_diterima),
        v_pembelian.nomor,
        p_pelaku_id,
        timezone('utc'::text, now())
    );

    -- Perbarui dokumen pembelian menjadi diterima
    UPDATE public.pembelian
    SET status = 'diterima',
        jumlah_diterima = p_jumlah_diterima,
        diterima_oleh = p_pelaku_id,
        diterima_pada = timezone('utc'::text, now())
    WHERE id = p_pembelian_id;

    RETURN jsonb_build_object('success', true, 'message', 'Penerimaan barang berhasil dicatat, stok bertambah, dan harga pokok diperbarui.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
