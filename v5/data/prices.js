// Standard price table for the automatic offer (SPEC.md section 6).
// PROTOTYPE ASSUMPTIONS, not market research:
//  - typical new price per category (CZK),
//  - offer to the seller = 20 % of the new price, resale to the buyer = 50 % of the new price,
//  - a condition factor lowers both.
// The automatic offer appears if no manager acts within AUTO_OFFER_MINUTES of drop-off.

export const AUTO_OFFER_MINUTES = 10;
export const OFFER_SHARE = 0.20;
export const RESALE_SHARE = 0.50;

export const CATEGORIES = [
  { id: 'kitchen',     icon: 'utensils',   color: '#FCE9C8', kg: 1.2, newPrice: 700 },
  { id: 'textiles',    icon: 'bed-double', color: '#DCEBFA', kg: 1.5, newPrice: 800 },
  { id: 'electronics', icon: 'lamp-desk',  color: '#FFF3C4', kg: 1.5, newPrice: 900 },
  { id: 'furniture',   icon: 'sofa',       color: '#EADFD3', kg: 8.0, newPrice: 1500 },
  { id: 'clothes',     icon: 'shirt',      color: '#F7DDE6', kg: 1.0, newPrice: 1200 },
  { id: 'study',       icon: 'book-open',  color: '#E3E0F7', kg: 0.8, newPrice: 600 },
  { id: 'other',       icon: 'package',    color: '#E6EFEA', kg: 1.0, newPrice: 500 },
];

// Categories that have items in the shop catalogue (used for browse filters). 'other' is for selling only.
export const SHOP_CATEGORIES = CATEGORIES.filter((c) => c.id !== 'other');

export const CONDITIONS = [
  { id: 'likenew', factor: 1.0 },
  { id: 'good',    factor: 0.75 },
  { id: 'used',    factor: 0.5 },
];

export const catById = (id) => CATEGORIES.find((c) => c.id === id);
export const condById = (id) => CONDITIONS.find((c) => c.id === id);

const round10 = (n) => Math.max(10, Math.round(n / 10) * 10);

// Standard offer in CZK for a category x condition, e.g. furniture + good = 1500 * 0.75 * 0.20 = 230 CZK.
export function standardOffer(cat, cond) {
  return round10(catById(cat).newPrice * condById(cond).factor * OFFER_SHARE);
}

export function standardResale(cat, cond) {
  return round10(catById(cat).newPrice * condById(cond).factor * RESALE_SHARE);
}
