export function formatPrice(value: number) {
  return `${value.toFixed(3).replace('.', ',')} €`;
}

export function formatMarkerPrice(value: number) {
  return `${value.toFixed(2).replace('.', ',')}€`;
}

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export function getDistanceInKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const earthRadius = 6371;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const latitudeA = toRadians(from.latitude);
  const latitudeB = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadius * (2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)));
}

export function formatDistanceLabel(distanceInKm: number) {
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)} m`;
  }

  return `${distanceInKm.toFixed(1).replace('.', ',')} km`;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
