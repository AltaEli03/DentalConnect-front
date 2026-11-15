import type { Clinic } from '../types/api';

const earthRadiusKm = 6371.0088;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function filterNearbyClinics<T extends Clinic>(clinics: T[], latitude: number, longitude: number, radiusKm = 10): Array<T & { distanceKm: number }> {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || radiusKm <= 0) return [];
  return clinics.flatMap((clinic) => {
    const lat = clinic.latitude;
    const lon = clinic.longitude;
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return [];
    const distance = distanceKm(latitude, longitude, lat, lon);
    return distance <= radiusKm ? [{ ...clinic, distanceKm: distance }] : [];
  }).sort((a, b) => a.distanceKm - b.distanceKm);
}
