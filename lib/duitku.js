'use strict';
const { md5, safeEqual } = require('./util');

const root = () =>
  process.env.DUITKU_SANDBOX === '1'
    ? 'https://sandbox.duitku.com/webapi/api/merchant'
    : 'https://passport.duitku.com/webapi/api/merchant';
const code = () => process.env.DUITKU_MERCHANT_CODE || '';
const apiKey = () => process.env.DUITKU_API_KEY || '';
const configured = () => !!(code() && apiKey());

async function post(path, body) {
  const res = await fetch(root() + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { /* bukan JSON */ }
  if (!data) throw new Error(`Duitku ${res.status}: ${text.slice(0, 200)}`);
  return data;
}

async function createInvoice({ orderId, amount, method, productName, email, customerName, callbackUrl, returnUrl, expiryMinutes }) {
  const data = await post('/v2/inquiry', {
    merchantCode: code(),
    paymentAmount: amount,
    paymentMethod: method,
    merchantOrderId: orderId,
    productDetails: productName,
    customerVaName: customerName,
    email,
    callbackUrl,
    returnUrl,
    expiryPeriod: expiryMinutes,
    signature: md5(code() + orderId + amount + apiKey()),
  });
  if (!data.paymentUrl) throw new Error('Duitku: ' + (data.Message || data.statusMessage || 'gagal membuat invoice'));
  return { paymentUrl: data.paymentUrl, reference: data.reference || null };
}

// Cek status langsung ke Duitku (jangan percaya callback saja).
async function checkStatus(orderId) {
  return post('/transactionStatus', {
    merchantCode: code(),
    merchantOrderId: orderId,
    signature: md5(code() + orderId + apiKey()),
  });
}

function verifyCallback(p) {
  if (!p || !p.signature || !p.merchantOrderId) return false;
  if (String(p.merchantCode) !== code()) return false;
  return safeEqual(md5(String(p.merchantCode) + String(p.amount) + String(p.merchantOrderId) + apiKey()), String(p.signature));
}

module.exports = { configured, createInvoice, checkStatus, verifyCallback };
