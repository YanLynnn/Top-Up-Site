'use strict';
const base = () => (process.env.SUPABASE_URL || '').replace(/\/+$/, '') + '/rest/v1';
const key = () => process.env.SUPABASE_SERVICE_KEY || '';
const configured = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const enc = encodeURIComponent;

async function rest(method, path, body, prefer) {
  const res = await fetch(base() + path, {
    method,
    headers: {
      apikey: key(),
      Authorization: 'Bearer ' + key(),
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

async function getOrder(id) {
  const rows = await rest('GET', `/orders?id=eq.${enc(id)}&select=*&limit=1`);
  return rows && rows[0] ? rows[0] : null;
}

async function insertOrder(order) {
  const rows = await rest('POST', '/orders', order, 'return=representation');
  return rows[0];
}

// Update atomik: hanya baris yang statusnya masih di `fromStatuses`.
// Mengembalikan baris yang berhasil diubah ([] kalau sudah diambil proses lain).
async function patchOrder(id, fromStatuses, patch, extraFilter = '') {
  const body = { updated_at: new Date().toISOString(), ...patch };
  return (
    (await rest(
      'PATCH',
      `/orders?id=eq.${enc(id)}&status=in.(${fromStatuses.map(enc).join(',')})${extraFilter}`,
      body,
      'return=representation'
    )) || []
  );
}

async function kvGet(k) {
  const rows = await rest('GET', `/kv?key=eq.${enc(k)}&select=value,updated_at&limit=1`);
  return rows && rows[0] ? rows[0] : null;
}

async function kvSet(k, value) {
  await rest('POST', '/kv?on_conflict=key', { key: k, value, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates,return=minimal');
}

module.exports = { configured, getOrder, insertOrder, patchOrder, kvGet, kvSet };
