'use strict';
const db = require('../../lib/db');
const duitku = require('../../lib/duitku');
const orders = require('../../lib/orders');

// Duitku mengirim form-urlencoded. Balas 200 "OK" hanya jika sudah ditangani.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  try {
    const p = req.body || {};
    if (!duitku.verifyCallback(p)) return res.status(400).send('Invalid signature');

    // Notifikasi gagal/pending diabaikan; pelanggan bisa mengulang bayar di invoice yang sama.
    if (String(p.resultCode) !== '00') return res.status(200).send('OK');

    const order = await db.getOrder(String(p.merchantOrderId));
    if (!order) return res.status(404).send('Order not found');
    if (Number(p.amount) !== order.price) return res.status(400).send('Amount mismatch');

    // Verifikasi ulang langsung ke Duitku, jangan hanya percaya callback.
    const st = await duitku.checkStatus(order.id);
    if (String(st.statusCode) !== '00') return res.status(400).send('Not paid');

    await orders.fulfill(order.id);
    return res.status(200).send('OK');
  } catch (e) {
    console.error('duitku callback error', e.message);
    return res.status(500).send('Error'); // Duitku akan mencoba kirim ulang
  }
};
