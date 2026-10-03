'use strict';
const dg = require('../../lib/digiflazz');
const orders = require('../../lib/orders');
const { readRaw } = require('../../lib/util');

// Butuh body mentah untuk verifikasi HMAC, jadi parser bawaan dimatikan.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  try {
    const raw = await readRaw(req);
    if (!dg.verifyWebhook(raw, String(req.headers['x-hub-signature'] || ''))) {
      return res.status(401).send('Invalid signature');
    }
    let body = null;
    try { body = JSON.parse(raw); } catch (e) { return res.status(400).send('Bad JSON'); }
    const d = (body && body.data) || {};
    if (d.ref_id) await orders.applyDigiflazz(String(d.ref_id), d);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('digiflazz webhook error', e.message);
    return res.status(500).send('Error');
  }
};

module.exports.config = { api: { bodyParser: false } };
