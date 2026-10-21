export type UserRole = "Manajer" | "Staf Penjualan" | "Staf Gudang";

export type UserStatus = "aktif" | "nonaktif";

export interface UserProfile {
  id: string;
  nama: string;
  email: string;
  peran: UserRole;
  status: UserStatus;
  created_at?: string;
}

export interface Pemasok {
  id: string;
  kode: string;
  nama: string;
  telepon: string;
  alamat: string;
  status_aktif: boolean;
  created_at?: string;
}

export type TerminBayar = 0 | 7 | 14 | 30;

export interface Pelanggan {
  id: string;
  kode: string;
  nama_toko: string;
  telepon: string;
  alamat: string;
  batas_kredit: number;
  termin_bayar: TerminBayar;
  status_aktif: boolean;
  created_at?: string;
}

export interface Barang {
  id: string;
  kode: string;
  nama: string;
  satuan: string;
  harga_jual: number;
  harga_pokok?: number; // Rahasia khusus Manajer (BR-12)
  stok: number;
  stok_minimum: number;
  status_aktif: boolean;
  created_at?: string;
}

export type StatusPesananJual =
  | "draf"
  | "dikonfirmasi"
  | "dikirim"
  | "lunas"
  | "dibatalkan";

export interface ItemPesananJual {
  id?: string;
  pesanan_id?: string;
  barang_id: string;
  barang?: Barang;
  jumlah: number;
  harga_satuan: number;
  diskon_persen: number;
  subtotal: number;
  harga_pokok_saat_konfirmasi?: number; // Rahasia khusus Manajer
}

export interface PesananJual {
  id: string;
  nomor: string;
  pelanggan_id: string;
  pelanggan?: Pelanggan;
  status: StatusPesananJual;
  total: number;
  tanggal_konfirmasi?: string | null;
  tanggal_kirim?: string | null;
  tanggal_jatuh_tempo?: string | null;
  tanggal_lunas?: string | null;
  alasan_batal?: string | null;
  dibuat_oleh: string;
  creator?: UserProfile;
  items?: ItemPesananJual[];
  created_at?: string;
}

export type StatusPembelian =
  | "diajukan"
  | "disetujui"
  | "ditolak"
  | "diterima"
  | "dibatalkan";

export interface Pembelian {
  id: string;
  nomor: string;
  pemasok_id: string;
  pemasok?: Pemasok;
  barang_id: string;
  barang?: Barang;
  jumlah_dipesan: number;
  jumlah_diterima?: number;
  harga_beli?: number; // Rahasia khusus Manajer (BR-12)
  status: StatusPembelian;
  alasan_tolak?: string | null;
  alasan_batal?: string | null;
  diajukan_oleh: string;
  diputuskan_oleh?: string | null;
  diterima_oleh?: string | null;
  created_at?: string;
}

export type JenisMutasiStok = "masuk" | "keluar" | "batal" | "penyesuaian";

export interface MutasiStok {
  id: string;
  barang_id: string;
  barang?: Barang;
  jenis: JenisMutasiStok;
  jumlah: number;
  stok_sesudah: number;
  nomor_dokumen: string;
  alasan?: string | null;
  pelaku_id: string;
  pelaku?: UserProfile;
  created_at: string;
}

export interface AuditLog {
  id: string;
  pelaku_id: string;
  pelaku?: UserProfile;
  aksi: string;
  data_yang_diubah: string;
  nilai_sebelum: any;
  nilai_sesudah: any;
  created_at: string;
}
