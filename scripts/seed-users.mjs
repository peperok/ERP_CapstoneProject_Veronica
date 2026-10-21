import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Supabase URL atau Service Role Key belum diset di .env.local!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testUsers = [
  {
    id: "defeb8ce-05f6-5a28-90ea-d8c5921fe92e",
    email: "hendra@sinarabadi.test",
    password: "Latihan#2026",
    nama_lengkap: "Hendra Wijaya",
    peran: "manajer",
    aktif: true,
  },
  {
    id: "1eb18f29-66c1-5086-900e-874c2d3208e5",
    email: "rina@sinarabadi.test",
    password: "Latihan#2026",
    nama_lengkap: "Rina Kartika",
    peran: "penjualan",
    aktif: true,
  },
  {
    id: "0c99b1d9-84f8-5784-a479-3df27328aebd",
    email: "dimas@sinarabadi.test",
    password: "Latihan#2026",
    nama_lengkap: "Dimas Prasetyo",
    peran: "penjualan",
    aktif: true,
  },
  {
    id: "da8229f5-916d-55c1-aaee-cd3cfe3e0a7b",
    email: "joko@sinarabadi.test",
    password: "Latihan#2026",
    nama_lengkap: "Joko Susanto",
    peran: "gudang",
    aktif: true,
  },
  {
    id: "58306883-5223-5b88-8691-edb367c35df9",
    email: "agus@sinarabadi.test",
    password: "Latihan#2026",
    nama_lengkap: "Agus Salim",
    peran: "penjualan",
    aktif: false,
  },
];

async function seedUsers() {
  console.log("Mulai inisialisasi 5 akun uji ke Supabase Auth & public.profiles...");

  for (const u of testUsers) {
    console.log(`Memproses akun: ${u.email} (${u.peran})...`);

    // 1. Buat / Ambil user di auth.users menggunakan Admin API
    const { data: userData, error: createError } =
      await supabase.auth.admin.createUser({
        id: u.id,
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: {
          nama_lengkap: u.nama_lengkap,
          peran: u.peran,
        },
      });

    let userId = u.id;
    if (createError) {
      if (createError.message.includes("already exists") || createError.message.includes("duplicate")) {
        console.log(`Akun ${u.email} sudah ada di Auth. Memperbarui password...`);
        // Cari user id jika berbeda
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existing = listData?.users.find((x) => x.email === u.email);
        if (existing) {
          userId = existing.id;
          await supabase.auth.admin.updateUserById(userId, {
            password: u.password,
            email_confirm: true,
          });
        }
      } else {
        console.error(`Gagal membuat akun ${u.email}:`, createError.message);
        continue;
      }
    } else if (userData?.user) {
      userId = userData.user.id;
    }

    // 2. Upsert ke public.profiles
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      nama_lengkap: u.nama_lengkap,
      peran: u.peran,
      aktif: u.aktif,
    });

    if (profileError) {
      console.error(`Gagal upsert profile untuk ${u.email}:`, profileError.message);
    } else {
      console.log(`✓ Profil ${u.nama_lengkap} (${u.email}) berhasil disimpan.`);
    }
  }

  console.log("Inisialisasi akun uji selesai!");
}

seedUsers().catch(console.error);
