'use strict';
const cfg = require('../lib/config');
const catalog = require('../lib/catalog');
const dg = require('../lib/digiflazz');
const { safeEqual } = require('../lib/util');

module.exports = async (req, res) => {
  try {
    // Helper admin: lihat semua nama brand di Digiflazz untuk mengisi lib/games.js
    if (req.query && req.query.brands) {
      const adminKey = process.env.ADMIN_KEY || '';
      const sent = String(req.headers['x-admin-key'] || '');
      if (!adminKey || !safeEqual(sent, adminKey)) return res.status(401).json({ error: 'Tidak diizinkan' });
      const raw = await dg.priceList({ raw: true });
      return res.status(200).json({ brands: [...new Set(raw.map((i) => i.brand))].sort() });
    }

    const { games, demo } = await catalog.getCatalog();
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    res.status(200).json({
      site: { name: cfg.siteName, whatsapp: cfg.whatsappAdmin },
      demo,
      methods: cfg.methods,
      games: games.map((g) => ({
        slug: g.slug,
        name: g.name,
        short: g.short,
        color: g.color,
        idLabel: g.idLabel,
        zone: g.zone,
        zoneLabel: g.zoneLabel || null,
        products: g.products.map((p) => ({ sku: p.sku, name: p.name, price: p.price })),
      })),
    });
  } catch (e) {
    console.error('catalog error', e.message);
    res.status(502).json({ error: 'Daftar produk belum bisa dimuat. Coba lagi sebentar lagi.' });
  }
};
