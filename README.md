# TopUpin: web top up game otomatis

Alur: **pembeli bayar (DANA/QRIS via Duitku) → callback → server top up ke Digiflazz → status otomatis berubah**.
Tanpa dependency npm, langsung jalan di Vercel. Database di Supabase.

## 1. Daftar layanan (dapatkan token)
| Layanan | Fungsi | Yang kamu ambil |
|---|---|---|
| **Duitku** (duitku.com) | Payment gateway: DANA, QRIS | Merchant Code + API Key (menu Proyek) |
| **Digiflazz** (digiflazz.com) | Supplier top up game | Username + API Key (dev & production) + isi saldo deposit |
| **Supabase** (supabase.com) | Database order | Project URL + service_role key |

Mulai dengan mode uji: Duitku **sandbox** (`DUITKU_SANDBOX=1`) dan **Development Key** Digiflazz.

## 2. Siapkan database
Supabase > SQL Editor > paste isi `supabase/schema.sql` > Run.

## 3. Deploy ke Vercel
1. Upload folder ini ke GitHub, lalu *Import* di Vercel (framework: Other).
2. Settings > Environment Variables: isi semua variabel dari `.env.example`.
3. Deploy ulang setelah env diisi.

## 4. Pasang callback
- **Duitku**: callback URL sudah dikirim otomatis per transaksi (`/api/callback/duitku`). Pastikan domain kamu sudah terdaftar/diizinkan di proyek Duitku.
- **Digiflazz** > Atur Koneksi > Webhook: URL `https://DOMAINMU/api/callback/digiflazz`, secret sama dengan `DIGIFLAZZ_WEBHOOK_SECRET`.

## 5. Sesuaikan
- **Game**: `lib/games.js`. Nama `brand` harus sama dengan di Digiflazz. Untuk melihat daftar brand:
  `curl -H "x-admin-key: ADMIN_KEY_KAMU" "https://DOMAINMU/api/catalog?brands=1"`
- **Untung**: `MARKUP_PERCENT`, `FIXED_FEE`, `ROUND_TO`.
- **Metode bayar**: `lib/config.js` (kode metode mengikuti Duitku; cek kode yang aktif di akunmu).
- **Nama/WA admin**: `SITE_NAME`, `WHATSAPP_ADMIN`.

## Mode demo
Selama kredensial Digiflazz belum diisi, katalog tampil contoh (harga palsu) dan order ditolak. Berguna untuk cek tampilan.

## Keamanan yang sudah ada
- Harga selalu dihitung di server, bukan dari browser.
- Signature callback Duitku dan webhook Digiflazz diverifikasi; status bayar dicek ulang langsung ke Duitku.
- Top up hanya jalan sekali per order (update atomik), callback ganda aman.
- `max_price` dikirim ke Digiflazz supaya tidak rugi kalau harga modal naik mendadak.
- Semua key hanya di server; tabel Supabase terkunci (RLS) dan hanya diakses lewat service key.

## Sebelum buka untuk umum
- Uji end-to-end di sandbox/dev key: 1 order sukses, 1 order gagal.
- Saldo Digiflazz harus selalu cukup. Kalau kurang, order berstatus `failed` setelah pembeli bayar dan harus kamu refund manual.
- Tidak ada pengecekan nickname akun. ID salah = top up gagal/nyasar. Pertimbangkan tambah fitur cek nickname dari supplier yang menyediakannya.
- Pasang rate limit (Vercel Firewall) untuk `/api/order`.
- Cek ketentuan usaha (identitas/legalitas) di Duitku dan Digiflazz untuk akun production.
