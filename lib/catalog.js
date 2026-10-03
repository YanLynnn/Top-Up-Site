'use strict';
const cfg = require('./config');
const games = require('./games');
const db = require('./db');
const dg = require('./digiflazz');

const TTL = 10 * 60 * 1000;
let mem = null;
const norm = (s) => String(s || '').trim().toUpperCase();
const brands = new Set(games.map((g) => norm(g.brand)));

function sellPrice(cost) {
  const raw = cost * (1 + cfg.markupPercent / 100) + cfg.fixedFee;
  return Math.ceil(raw / cfg.roundTo) * cfg.roundTo;
}

function demoItems() {
  const amounts = [5, 12, 28, 44, 59, 86, 172, 257, 344, 514];
  const items = [];
  for (const g of games) {
    for (const a of amounts) {
      items.push({ sku: `demo-${g.slug}-${a}`, name: `${a} ${g.unit}`, brand: g.brand, cost: Math.round((a * 270) / 100) * 100 + 400, ok: true });
    }
  }
  return items;
}

async function loadItems() {
  if (!dg.configured()) return { items: demoItems(), demo: true };
  if (mem && Date.now() - mem.at < TTL) return { items: mem.items, demo: false };

  let stale = null;
  if (db.configured()) {
    try {
      const row = await db.kvGet('pricelist');
      if (row) {
        stale = row.value;
        if (Date.now() - new Date(row.updated_at).getTime() < TTL) {
          mem = { at: Date.now(), items: row.value };
          return { items: row.value, demo: false };
        }
      }
    } catch (e) { console.error('kvGet', e.message); }
  }

  try {
    const items = (await dg.priceList()).filter((i) => brands.has(norm(i.brand)));
    mem = { at: Date.now(), items };
    if (db.configured()) db.kvSet('pricelist', items).catch((e) => console.error('kvSet', e.message));
    return { items, demo: false };
  } catch (e) {
    if (stale) return { items: stale, demo: false };
    throw e;
  }
}

function cleanName(name, g) {
  const n = String(name || '').replace(new RegExp('^' + g.brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'i'), '').trim();
  return n || String(name || '');
}

async function getCatalog() {
  const { items, demo } = await loadItems();
  const out = [];
  for (const g of games) {
    const products = items
      .filter((i) => norm(i.brand) === norm(g.brand) && i.ok && i.cost > 0)
      .map((i) => ({ sku: i.sku, name: cleanName(i.name, g), cost: i.cost, price: sellPrice(i.cost) }))
      .sort((a, b) => a.price - b.price);
    if (products.length) out.push({ ...g, products });
  }
  return { games: out, demo };
}

module.exports = { getCatalog };
