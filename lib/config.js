'use strict';
const env = process.env;
const num = (v, d) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));

module.exports = {
  siteName: env.SITE_NAME || 'TopUpin',
  whatsappAdmin: (env.WHATSAPP_ADMIN || '').replace(/\D/g, ''),
  siteUrl() {
    const u = env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + env.VERCEL_PROJECT_PRODUCTION_URL : '');
    return u.replace(/\/+$/, '');
  },
  markupPercent: num(env.MARKUP_PERCENT, 6),
  fixedFee: num(env.FIXED_FEE, 0),
  roundTo: Math.max(1, num(env.ROUND_TO, 100)),
  orderExpiryMinutes: 60,
  // Kode metode mengikuti Duitku. Cek daftar kode yang aktif di akun/dokumentasi Duitku kamu.
  methods: [
    { code: 'DA', label: 'DANA', note: 'Bayar lewat aplikasi DANA' },
    { code: 'NQ', label: 'QRIS', note: 'Scan dari e-wallet atau m-banking apa saja' },
  ],
};
