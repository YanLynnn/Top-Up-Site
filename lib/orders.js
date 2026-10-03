'use strict';
const db = require('./db');
const dg = require('./digiflazz');
const cfg = require('./config');

const FINAL = ['success', 'failed', 'expired'];

function mapStatus(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'sukses') return 'success';
  if (v === 'gagal') return 'failed';
  return 'processing';
}

// Terapkan hasil dari Digiflazz (respons langsung, webhook, atau cek ulang). Hanya dari status `processing`.
async function applyDigiflazz(id, d) {
  const status = mapStatus(d.status);
  const patch = { status, sn: d.sn || null, message: d.message || null };
  if (status !== 'processing') patch.done_at = new Date().toISOString();
  const rows = await db.patchOrder(id, ['processing'], patch);
  return rows[0] || null;
}

// Dipanggil setelah pembayaran terbukti lunas. Aman dipanggil berkali-kali: hanya satu pemanggil yang "menang".
async function fulfill(id) {
  const now = new Date().toISOString();
  const claimed = await db.patchOrder(id, ['pending_payment'], { status: 'processing', paid_at: now });
  if (!claimed.length) return null;
  const o = claimed[0];
  try {
    const d = await dg.topup({ sku: o.sku, customerNo: o.customer_no, refId: o.id, maxPrice: o.cost });
    return (await applyDigiflazz(o.id, d)) || o;
  } catch (e) {
    console.error('digiflazz topup error', o.id, e.message);
    return o; // tetap `processing`; webhook atau cek ulang akan menyelesaikan
  }
}

// Dipanggil saat user membuka status: kedaluwarsakan invoice, atau cek ulang order yang menggantung.
async function refresh(o) {
  const age = Date.now() - new Date(o.created_at).getTime();
  if (o.status === 'pending_payment' && age > (cfg.orderExpiryMinutes + 5) * 60 * 1000) {
    const rows = await db.patchOrder(o.id, ['pending_payment'], { status: 'expired' });
    return rows[0] || o;
  }
  if (o.status === 'processing') {
    const cutoff = new Date(Date.now() - 25 * 1000).toISOString();
    const rows = await db.patchOrder(o.id, ['processing'], {}, `&updated_at=lt.${encodeURIComponent(cutoff)}`);
    if (rows.length) {
      try {
        const d = await dg.topup({ sku: o.sku, customerNo: o.customer_no, refId: o.id, maxPrice: o.cost });
        return (await applyDigiflazz(o.id, d)) || rows[0];
      } catch (e) {
        console.error('digiflazz recheck error', o.id, e.message);
      }
    }
  }
  return o;
}

function publicView(o) {
  return {
    id: o.id,
    game: o.game_name,
    product: o.product_name,
    account: o.account_id,
    zone: o.zone || null,
    price: o.price,
    status: o.status,
    sn: o.sn || null,
    message: o.message || null,
    createdAt: o.created_at,
    payUrl: o.status === 'pending_payment' ? o.pay_url : null,
  };
}

module.exports = { FINAL, applyDigiflazz, fulfill, refresh, publicView };
