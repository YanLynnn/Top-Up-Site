'use strict';
const crypto = require('crypto');
const cfg = require('../lib/config');
const db = require('../lib/db');
const catalog = require('../lib/catalog');
const duitku = require('../lib/duitku');
const orders = require('../lib/orders');

const ACCOUNT_RE = /^[A-Za-z0-9_.\-]{3,24}$/;
const ZONE_RE = /^\d{1,6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORDER_ID_RE = /^[A-Z0-9]{6,32}$/;

const fail = (res, code, error) => res.status(code).json({ error });

function origin(req) {
  const fixed = cfg.siteUrl();
  if (fixed) return fixed;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return 'https://' + host;
}

async function create(req, res) {
  if (!db.configured() || !duitku.configured()) return fail(res, 503, 'Toko belum selesai disetel. Hubungi admin.');

  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const accountId = String(b.accountId || '').trim();
  const zone = String(b.zone || '').trim();
  const email = String(b.email || '').trim();
  const method = cfg.methods.find((m) => m.code === String(b.method || ''));

  const { games, demo } = await catalog.getCatalog();
  if (demo) return fail(res, 503, 'Toko masih mode demo. Hubungkan supplier dulu sebelum menerima pesanan.');

  const game = games.find((g) => g.slug === String(b.game || ''));
  if (!game) return fail(res, 400, 'Game tidak ditemukan.');
  // Harga SELALU diambil dari server, tidak pernah dari browser.
  const product = game.products.find((p) => p.sku === String(b.sku || ''));
  if (!product) return fail(res, 400, 'Nominal tidak tersedia. Muat ulang halaman lalu pilih lagi.');
  if (!method) return fail(res, 400, 'Metode pembayaran tidak valid.');
  if (!ACCOUNT_RE.test(accountId)) return fail(res, 400, `${game.idLabel} tidak valid.`);
  if (game.zone && !ZONE_RE.test(zone)) return fail(res, 400, `${game.zoneLabel} tidak valid.`);
  if (email && !EMAIL_RE.test(email)) return fail(res, 400, 'Format email tidak valid.');

  const id = 'TP' + crypto.randomBytes(6).toString('hex').toUpperCase();
  const customerNo = game.zone ? accountId + zone : accountId;
  const base = origin(req);

  await db.insertOrder({
    id,
    game: game.slug,
    game_name: game.name,
    sku: product.sku,
    product_name: product.name,
    account_id: accountId,
    zone: game.zone ? zone : null,
    customer_no: customerNo,
    price: product.price,
    cost: product.cost,
    pay_method: method.code,
    email: email || null,
    status: 'pending_payment',
  });

  try {
    const inv = await duitku.createInvoice({
      orderId: id,
      amount: product.price,
      method: method.code,
      productName: `${game.name} ${product.name}`.slice(0, 100),
      email: email || process.env.DEFAULT_EMAIL || 'pembeli@example.com',
      customerName: cfg.siteName.slice(0, 20),
      callbackUrl: base + '/api/callback/duitku',
      returnUrl: `${base}/?order=${id}`,
      expiryMinutes: cfg.orderExpiryMinutes,
    });
    await db.patchOrder(id, ['pending_payment'], { pay_url: inv.paymentUrl, pay_ref: inv.reference });
    return res.status(200).json({ orderId: id, payUrl: inv.paymentUrl });
  } catch (e) {
    console.error('create invoice error', id, e.message);
    await db.patchOrder(id, ['pending_payment'], { status: 'failed', message: 'Gagal membuat invoice pembayaran' }).catch(() => {});
    return fail(res, 502, 'Metode pembayaran ini sedang bermasalah. Coba metode lain atau ulangi sebentar lagi.');
  }
}

async function status(req, res) {
  const id = String((req.query && req.query.id) || '').trim().toUpperCase();
  if (!ORDER_ID_RE.test(id)) return fail(res, 400, 'ID pesanan tidak valid.');
  let o = await db.getOrder(id);
  if (!o) return fail(res, 404, 'Pesanan tidak ditemukan. Periksa lagi ID pesanannya.');
  o = await orders.refresh(o);
  return res.status(200).json(orders.publicView(o));
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'POST') return await create(req, res);
    if (req.method === 'GET') return await status(req, res);
    res.setHeader('Allow', 'GET, POST');
    return fail(res, 405, 'Method tidak didukung.');
  } catch (e) {
    console.error('order error', e.message);
    return fail(res, 500, 'Terjadi gangguan di server. Coba lagi sebentar lagi.');
  }
};
