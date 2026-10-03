'use strict';
// Edit daftar ini untuk menambah/mengurangi game.
// `brand` harus sama dengan kolom "brand" di price list Digiflazz (huruf besar/kecil bebas).
// Cek nama brand yang tersedia: GET /api/catalog?brands=1 dengan header x-admin-key.
// `zone: true` = butuh Zone/Server ID (customer_no dikirim ke supplier sebagai ID + Zone digabung).
module.exports = [
  { slug: 'mobile-legends', name: 'Mobile Legends', short: 'ML', brand: 'MOBILE LEGENDS', idLabel: 'User ID', zone: true, zoneLabel: 'Zone ID', color: '#3340F2', unit: 'Diamond' },
  { slug: 'free-fire', name: 'Free Fire', short: 'FF', brand: 'FREE FIRE', idLabel: 'Player ID', zone: false, color: '#E8590C', unit: 'Diamond' },
  { slug: 'pubg-mobile', name: 'PUBG Mobile', short: 'PM', brand: 'PUBG MOBILE', idLabel: 'Player ID', zone: false, color: '#7A5B00', unit: 'UC' },
  { slug: 'call-of-duty-mobile', name: 'Call of Duty Mobile', short: 'CP', brand: 'CALL OF DUTY MOBILE', idLabel: 'Open ID', zone: false, color: '#0E8FA0', unit: 'CP' },
  { slug: 'honor-of-kings', name: 'Honor of Kings', short: 'HK', brand: 'HONOR OF KINGS', idLabel: 'Player ID', zone: false, color: '#6C3FD6', unit: 'Token' },
];
