import { REGIONS } from './regions.js';

export const COUNTRIES = [
  { id: 'de', label: 'Deutschland', regions: REGIONS },
  { id: 'es', label: 'Spanien', regions: [{ id: 'congreso', label: 'Parlamentswahl (Congreso)' }, { id: 'katalonien', label: 'Katalonien' }, { id: 'barcelona', label: 'Barcelona' }] },
];

export function findArea(countryId = 'de', regionId) {
  const country = COUNTRIES.find(c => c.id === countryId);
  if (!country) return null;
  const region = country.regions.find(r => r.id === (regionId || country.regions[0].id));
  return region ? { country, region } : null;
}

export function cacheName(countryId, regionId) {
  return countryId === 'de' ? (regionId === 'bundestag' ? 'polls' : `polls-${regionId}`) : `polls-${countryId}-${regionId}`;
}
