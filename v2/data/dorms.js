// Prague student dorms and their (fictional) HelloDorm stands.
// Addresses and coordinates: prague-dorms.md (official dorm pages + Esri ArcGIS geocoder, checked 2026-10-20).
// The stands themselves, their opening hours and the "full" flag are prototype inventions.

export const DORMS = [
  { id: 'palach',     name: 'Palachova kolej',     short: 'Palachova',     uni: 'VŠE',  address: 'Hartigova 93/198, 130 00 Praha 3',    lat: 50.09219, lon: 14.48373 },
  { id: 'eisler',     name: 'Eislerova kolej',     short: 'Eislerova',     uni: 'VŠE',  address: 'V Zahrádkách 1953/67, 130 00 Praha 3', lat: 50.09152, lon: 14.48614, full: true },
  { id: 'thaler',     name: 'Thalerova kolej',     short: 'Thalerova',     uni: 'VŠE',  address: 'Jeseniova 1954/210, 130 00 Praha 3',  lat: 50.09143, lon: 14.48312 },
  { id: 'jarov2',     name: 'Kolej Jarov II',      short: 'Jarov II',      uni: 'VŠE',  address: 'Pod lipami 2603/43, 130 00 Praha 3',  lat: 50.09055, lon: 14.49410 },
  { id: 'vltava',     name: 'Kolej Vltava',        short: 'Vltava',        uni: 'VŠE',  address: 'Chemická 953, 148 00 Praha 4',        lat: 50.02006, lon: 14.49552 },
  { id: 'blanice',    name: 'Kolej Blanice',       short: 'Blanice',       uni: 'VŠE',  address: 'Chemická 955, 148 00 Praha 4',        lat: 50.01951, lon: 14.49787 },
  { id: 'roosevelt',  name: 'Rooseveltova kolej',  short: 'Rooseveltova',  uni: 'VŠE',  address: 'Strojnická 1430/7, 170 00 Praha 7',   lat: 50.10457, lon: 14.43464 },
  { id: 'vetrnik',    name: 'Kolej Na Větrníku',   short: 'Na Větrníku',   uni: 'UK',   address: 'Na Větrníku 1932, 162 00 Praha 6',    lat: 50.08806, lon: 14.35399 },
  { id: 'hvezda',     name: 'Kolej Hvězda',        short: 'Hvězda',        uni: 'UK',   address: 'Zvoníčkova 5, 162 08 Praha 6',        lat: 50.08510, lon: 14.34941 },
  { id: 'kajetanka',  name: 'Kolej Kajetánka',     short: 'Kajetánka',     uni: 'UK',   address: 'Radimova 35/12, 169 00 Praha 6',      lat: 50.08738, lon: 14.37114 },
  { id: 'svehlova',   name: 'Kolej Švehlova',      short: 'Švehlova',      uni: 'UK',   address: 'Slavíkova 22, 130 00 Praha 3',        lat: 50.08045, lon: 14.44693 },
  { id: 'listopadu',  name: 'Kolej 17. listopadu', short: '17. listopadu', uni: 'UK',   address: 'Pátkova 3, 180 00 Praha 8',           lat: 50.11664, lon: 14.44241 },
  { id: 'hostivar',   name: 'Kolej areál Hostivař', short: 'Hostivař',     uni: 'UK',   address: 'Weilova 2, 102 00 Praha 10',          lat: 50.05218, lon: 14.53860 },
  { id: 'strahov',    name: 'Koleje Strahov',      short: 'Strahov',       uni: 'ČVUT', address: 'Vaníčkova 315/7, 160 00 Praha 6',     lat: 50.07980, lon: 14.39044 },
  { id: 'masaryk',    name: 'Masarykova kolej',    short: 'Masarykova',    uni: 'ČVUT', address: 'Thákurova 550/1, 160 00 Praha 6',     lat: 50.10102, lon: 14.38706 },
  { id: 'podoli',     name: 'Koleje Podolí',       short: 'Podolí',        uni: 'ČVUT', address: 'Na Lysině 772/12, 147 00 Praha 4',    lat: 50.05406, lon: 14.42911 },
];

// Fictional stand opening hours (prototype). Day 0 = Sunday.
export const STAND_HOURS = {
  1: [16, 19], 2: [16, 19], 3: [16, 19], 4: [16, 19], 5: [16, 19],
  6: [10, 13],
};

export const dormById = (id) => DORMS.find((d) => d.id === id);

// Great-circle distance in metres (haversine formula).
export function distanceM(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
