'use strict';
const crypto = require('crypto');
const { md5, safeEqual } = require('./util');

const API = 'https://api.digiflazz.com/v1';
const user = () => process.env.DIGIFLAZZ_USERNAME || '';
const key = () => process.env.DIGIFLAZZ_API_KEY || '';
const configured = () => !!(user() && key());

async function post(path, body) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* bukan JSON */ }
  if (!json) throw new Error(`Digiflazz ${res.status}: ${text.slice(0, 200)}`);
  return json.data;
}

async function priceList({ raw = false } = {}) {
  const data = await post('/price-list', { cmd: 'prepaid', username: user(), sign: md5(user() + key() + 'pricelist') });
  if (!Array.isArray(data)) throw new Error('Digiflazz price-list: ' + ((data && data.message) || 'respons tidak dikenal'));
  if (raw) return data;
  return data.map((i) => ({
    sku: i.buyer_sku_code,
    name: i.product_name,
    brand: i.brand,
    cost: Number(i.price),
    ok: i.buyer_product_status !== false && i.seller_product_status !== false,
  }));
}

// Kirim top up. Memakai ref_id yang sama = sekaligus cek status (idempotent di sisi Digiflazz).
async function topup({ sku, customerNo, refId, maxPrice }) {
  const body = {
    username: user(),
    buyer_sku_code: sku,
    customer_no: customerNo,
    ref_id: refId,
    sign: md5(user() + key() + refId),
  };
  if (maxPrice) body.max_price = maxPrice;
  if (process.env.DIGIFLAZZ_TESTING === '1') body.testing = true;
  return post('/transaction', body);
}

function verifyWebhook(rawBody, signatureHeader) {
  const secret = process.env.DIGIFLAZZ_WEBHOOK_SECRET || '';
  if (!secret || !signatureHeader) return false;
  const expected = 'sha1=' + crypto.createHmac('sha1', secret).update(rawBody).digest('hex');
  return safeEqual(expected, signatureHeader);
}

module.exports = { configured, priceList, topup, verifyWebhook };
