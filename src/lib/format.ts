import type { LatLng } from '../types/station';
import type { AppLanguage } from './copy';

const LOCALES: Record<AppLanguage, string> = {
  en: 'en-GB',
  fr: 'fr-FR',
};

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function getLocale(language: AppLanguage) {
  return LOCALES[language];
}

function decimalSeparator(language: AppLanguage) {
  return language === 'fr' ? ',' : '.';
}

/** "2,398" — fuel prices are always shown with three decimals, like on the pumps. */
export function formatPriceValue(value: number, language: AppLanguage) {
  return value.toFixed(3).replace('.', decimalSeparator(language));
}

/** "2,398 €" */
export function formatPrice(value: number, language: AppLanguage) {
  return `${formatPriceValue(value, language)} €`;
}

/** Splits 2.398 into "2,39" + "8" so the last digit can be rendered smaller, pump-style. */
export function splitPrice(value: number, language: AppLanguage) {
  const fixed = value.toFixed(3).replace('.', decimalSeparator(language));

  return {
    head: fixed.slice(0, -1),
    tail: fixed.slice(-1),
  };
}

/** 0.046 → "4,6 ct" — drivers compare fuel prices in centimes. */
export function formatCents(delta: number, language: AppLanguage) {
  const cents = Math.abs(delta) * 100;
  const digits = cents < 10 ? 1 : 0;

  return `${cents.toFixed(digits).replace('.', decimalSeparator(language))} ct`;
}

/** "6,40 €" */
export function formatMoney(value: number, language: AppLanguage) {
  return new Intl.NumberFormat(getLocale(language), {
    currency: 'EUR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(value);
}

export function formatCount(value: number, language: AppLanguage) {
  return new Intl.NumberFormat(getLocale(language)).format(value);
}

export function getDistanceInKm(from: LatLng, to: LatLng) {
  const earthRadius = 6371;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function formatDistance(distanceInKm: number, language: AppLanguage) {
  if (distanceInKm < 1) {
    return `${Math.max(10, Math.round((distanceInKm * 1000) / 10) * 10)} m`;
  }

  const digits = distanceInKm < 10 ? 1 : 0;

  return `${distanceInKm.toFixed(digits).replace('.', decimalSeparator(language))} km`;
}

export function getAgeInMs(timestamp: string | null, now = Date.now()) {
  if (!timestamp) {
    return null;
  }

  const time = Date.parse(timestamp);

  return Number.isFinite(time) ? Math.max(0, now - time) : null;
}

/** "il y a 3 h", "hier", "il y a 4 j" */
export function formatRelativeTime(timestamp: string | null, language: AppLanguage, now = Date.now()) {
  const age = getAgeInMs(timestamp, now);

  if (age == null) {
    return null;
  }

  const formatter = new Intl.RelativeTimeFormat(getLocale(language), { numeric: 'auto', style: 'short' });

  if (age < MINUTE_MS) {
    return language === 'fr' ? "à l'instant" : 'just now';
  }

  if (age < HOUR_MS) {
    return formatter.format(-Math.round(age / MINUTE_MS), 'minute');
  }

  if (age < DAY_MS) {
    return formatter.format(-Math.round(age / HOUR_MS), 'hour');
  }

  return formatter.format(-Math.round(age / DAY_MS), 'day');
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
