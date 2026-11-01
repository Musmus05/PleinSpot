export type AppLanguage = 'fr' | 'en';

const fr = {
  about: {
    body: [
      "PleinSpot compare les prix déclarés par les stations-service sur le flux officiel du ministère de l'Économie (prix-carburants.gouv.fr). Les données sont rechargées toutes les 10 minutes.",
      'La couleur de chaque prix le situe parmi les stations de la zone affichée : vert pour le tiers le moins cher, jaune pour le tiers du milieu, rouge pour le tiers le plus cher. Un double filet signale le prix le plus bas.',
      "Le nom et l'enseigne des stations viennent d'OpenStreetMap, la carte collaborative : ils peuvent être incomplets.",
      "Les prix non mis à jour depuis plus de 30 jours sont écartés. Au-delà de 7 jours, un prix est affiché en contour seul : la station a pu le changer sans le déclarer.",
      "L'historique couvre les 12 derniers mois, d'après les archives annuelles du ministère : pour chaque jour, le dernier prix déclaré par chaque station. Les prix à plus de 30 % de la moyenne nationale du jour, presque toujours des erreurs de saisie, en sont écartés.",
      "Les symboles rond, carré et losange sont les identifiants européens des carburants, ceux que vous trouvez sur le pistolet et sur la trappe de votre réservoir.",
      "Votre position sert uniquement, dans votre navigateur, à centrer la carte et à calculer les distances. Elle n'est jamais enregistrée.",
    ],
    close: 'Fermer',
    sources: 'Sources',
    title: 'À propos de PleinSpot',
  },
  app: {
    about: 'À propos',
    cookies: 'Cookies',
    dataUpdated: (relative: string) => `Prix officiels publiés ${relative}`,
    osmCredit: 'Noms et enseignes © OpenStreetMap',
    errorBody: 'Vérifiez votre connexion, puis réessayez.',
    errorTitle: 'Les prix ne se chargent pas',
    language: 'English',
    languageShort: 'EN',
    loading: 'Chargement des prix officiels…',
    locate: 'Autour de moi',
    zoomIn: 'Zoom avant',
    zoomOut: 'Zoom arrière',
    locationDenied:
      'Position refusée. Autorisez la géolocalisation dans votre navigateur, ou cherchez une ville.',
    locationUnavailable: 'Position indisponible pour le moment. Cherchez une ville à la place.',
    retry: 'Réessayer',
    updating: 'Mise à jour des prix…',
  },
  details: {
    automate: 'Automate carte bancaire 24h/24',
    back: 'Liste des stations',
    close: 'Fermer la fiche',
    copied: 'Lien copié',
    directions: 'Itinéraire',
    hours: 'Horaires',
    officialPage: 'Fiche officielle sur prix-carburants.gouv.fr',
    prices: 'Prix à la pompe',
    rank: (rank: string, total: string) => `${rank}ᵉ prix le plus bas sur ${total} stations dans la zone.`,
    rankFirst: (total: string) => `Prix le plus bas des ${total} stations de la zone.`,
    rupture: 'En rupture',
    savingsCheaper: (amount: string, liters: number) => `${amount} d'économie sur un plein de ${liters} L, par rapport à la moyenne de la zone.`,
    savingsPricier: (amount: string, liters: number) => `${amount} de plus sur un plein de ${liters} L que la moyenne de la zone.`,
    savingsEqual: 'Au prix moyen de la zone.',
    services: 'Services',
    share: 'Partager',
    shareText: (name: string, price: string, fuel: string) => `${fuel} à ${price} chez ${name}, repéré sur PleinSpot`,
    stalePrice: 'Prix non mis à jour depuis plus de 7 jours : il a pu changer depuis.',
    unavailable: 'Non proposé',
    updated: (relative: string) => `mis à jour ${relative}`,
    vsNationalAbove: (cents: string) => `${cents} au-dessus de la moyenne nationale.`,
    vsNationalBelow: (cents: string) => `${cents} sous la moyenne nationale.`,
    waze: 'Waze',
  },
  fuel: {
    from: (price: string) => `dès ${price}`,
    label: 'Carburant',
    none: 'aucune',
  },
  history: {
    allChanges: (count: string) => `Afficher les ${count} changements`,
    changeCount: (count: number) =>
      count === 0
        ? 'Aucun changement de prix sur la période.'
        : count === 1
          ? 'Un changement de prix sur la période.'
          : `${count} changements de prix sur la période.`,
    chartLabel: (summary: string) => `Graphique de l'évolution du prix. ${summary}`,
    columns: {
      average: 'Moyenne',
      change: 'Écart',
      date: 'Date',
      lowest: 'Plus bas',
      national: 'National',
      period: 'Période',
      price: 'Prix',
    },
    down: (cents: string, period: string, from: string, to: string) => `en baisse de ${cents} ${period}, de ${from} à ${to}.`,
    error: "L'historique ne se charge pas pour le moment.",
    flat: (period: string, price: string) => `stable ${period}, à ${price}.`,
    hideTable: 'Masquer le tableau',
    // Abbreviated dates end with a full stop ("11 avr."): they never close a sentence.
    highLow: (low: string, lowDate: string, high: string, highDate: string) =>
      `Au plus bas le ${lowDate} (${low}), au plus haut le ${highDate} (${high}).`,
    loading: "Chargement de l'historique…",
    nationalAverage: 'Moyenne nationale',
    noData: (fuel: string) => `${fuel} : aucun prix déclaré par cette station depuis un an.`,
    noZoneData: "Pas d'historique pour les stations de cette zone.",
    periodIn: { 30: 'en 1 mois', 90: 'en 3 mois', 365: 'en 1 an' },
    periodLabel: 'Période',
    periodSince: { 30: 'depuis 1 mois', 90: 'depuis 3 mois', 365: 'depuis 1 an' },
    periods: { 30: '1 mois', 90: '3 mois', 365: '1 an' },
    same: (reference: string, price: string) => `de nouveau à ${price}, comme ${reference}.`,
    sameAsAgo: { 30: 'il y a 1 mois', 90: 'il y a 3 mois', 365: 'il y a 1 an' },
    sameAsDate: (date: string) => `le ${date}`,
    showTable: 'Voir le tableau',
    sinceDate: (date: string) => `depuis le ${date}`,
    station: 'Cette station',
    stationSubject: 'Prix',
    title: 'Historique',
    today: "Aujourd'hui",
    up: (cents: string, period: string, from: string, to: string) => `en hausse de ${cents} ${period}, de ${from} à ${to}.`,
    vsNationalAbove: (cents: string) => `En moyenne ${cents} au-dessus de la moyenne nationale sur la période.`,
    vsNationalBelow: (cents: string) => `En moyenne ${cents} sous la moyenne nationale sur la période.`,
    vsNationalEqual: 'Au niveau de la moyenne nationale sur la période.',
    vsZoneAbove: (cents: string) => `En moyenne ${cents} de plus que la moyenne de la zone sur la période.`,
    vsZoneBelow: (cents: string) => `En moyenne ${cents} de moins que la moyenne de la zone sur la période.`,
    vsZoneEqual: 'Au niveau de la moyenne de la zone sur la période.',
    weekOf: (date: string) => `Semaine du ${date}`,
    zoneAverage: 'Moyenne de la zone',
    zoneLowest: (price: string, date: string) => `Le ${date}, prix le plus bas de la zone sur la période : ${price}.`,
    zoneLowestLine: 'Plus bas de la zone',
    zoneSubject: 'Moyenne de la zone',
  },
  legend: {
    best: 'Le plus bas',
    cheap: 'Bas',
    high: 'Élevé',
    mid: 'Moyen',
    stale: 'À vérifier',
    title: 'Prix dans la zone',
  },
  live: {
    changed: (count: number) =>
      count === 1 ? 'Un prix vient de changer dans la zone' : `${count} prix viennent de changer dans la zone`,
    down: (cents: string) => `en baisse de ${cents}`,
    live: 'En direct',
    offline: 'Hors ligne, nouvelle tentative…',
    up: (cents: string) => `en hausse de ${cents}`,
  },
  list: {
    highway: 'Autoroute',
    sortDistance: 'Distance',
    sortLabel: 'Trier par',
    sortPrice: 'Prix',
    stale: 'à vérifier',
  },
  opening: {
    allDay: '24h/24',
    automate: 'Automate 24h/24',
    closed: 'Fermé',
    closesAt: (time: string) => `jusqu'à ${time}`,
    closingSoon: (time: string) => `ferme bientôt, à ${time}`,
    open: 'Ouvert',
    open24: 'Ouvert 24h/24',
    opensOn: (day: string, time: string) => `ouvre ${day} à ${time}`,
    opensToday: (time: string) => `ouvre à ${time}`,
    opensTomorrow: (time: string) => `ouvre demain à ${time}`,
    unknown: 'Horaires non communiqués',
    weekdays: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
  },
  search: {
    cities: 'Villes',
    clear: 'Effacer la recherche',
    noResults: 'Aucun résultat. Essayez une ville ou un code postal.',
    placeholder: 'Ville, code postal ou adresse',
    stations: 'Stations dans la zone',
    useMyLocation: 'Utiliser ma position',
  },
  sheet: {
    collapse: 'Réduire la liste',
    expand: 'Afficher la liste',
  },
  zone: {
    emptyBody: 'Dézoomez ou déplacez la carte pour trouver des stations.',
    emptyTitle: (fuel: string) => `Aucune station ne vend de ${fuel} dans cette zone`,
    highest: 'le plus haut',
    lowest: 'le plus bas',
    median: 'médian',
    nationalAbove: (average: string, cents: string) => `Moyenne de la zone ${average}, soit ${cents} au-dessus de la moyenne nationale.`,
    nationalBelow: (average: string, cents: string) => `Moyenne de la zone ${average}, soit ${cents} sous la moyenne nationale.`,
    nationalEqual: (average: string) => `Moyenne de la zone ${average}, au niveau de la moyenne nationale.`,
    stations: (count: string) => `${count} stations`,
  },
};

type Copy = typeof fr;

const en: Copy = {
  about: {
    body: [
      'PleinSpot compares the prices French fuel stations declare on the official open-data feed of the Ministry of Economy (prix-carburants.gouv.fr). Data is reloaded every 10 minutes.',
      'The colour of each price places it among the stations of the visible area: green for the cheapest third, yellow for the middle third, red for the most expensive third. A double rule marks the lowest price.',
      'Station names and brands come from OpenStreetMap, the collaborative map: they can be incomplete.',
      'Prices not updated for more than 30 days are discarded. After 7 days a price is shown as an outline only: the station may have changed it without declaring it.',
      "The price history covers the last 12 months, from the ministry's yearly archives: for each day, the last price each station declared. Prices more than 30% away from that day's national average, nearly always typing errors, are left out.",
      'The circle, square and diamond symbols are the European fuel identifiers you find on the nozzle and on your fuel filler cap.',
      'Your location is only used in your browser, to centre the map and compute distances. It is never stored.',
    ],
    close: 'Close',
    sources: 'Sources',
    title: 'About PleinSpot',
  },
  app: {
    about: 'About',
    cookies: 'Cookies',
    dataUpdated: (relative: string) => `Official prices published ${relative}`,
    osmCredit: 'Names and brands © OpenStreetMap',
    errorBody: 'Check your connection, then try again.',
    errorTitle: 'Prices are not loading',
    language: 'Français',
    languageShort: 'FR',
    loading: 'Loading official prices…',
    locate: 'Near me',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    locationDenied: 'Location refused. Allow geolocation in your browser, or search for a city.',
    locationUnavailable: 'Location unavailable right now. Search for a city instead.',
    retry: 'Retry',
    updating: 'Updating prices…',
  },
  details: {
    automate: '24/7 card-operated pump',
    back: 'Station list',
    close: 'Close',
    copied: 'Link copied',
    directions: 'Directions',
    hours: 'Opening hours',
    officialPage: 'Official page on prix-carburants.gouv.fr',
    prices: 'Pump prices',
    rank: (rank: string, total: string) => `#${rank} lowest price of ${total} stations in the area.`,
    rankFirst: (total: string) => `Lowest price of the ${total} stations in the area.`,
    rupture: 'Out of stock',
    savingsCheaper: (amount: string, liters: number) => `${amount} saved on a ${liters} L tank, compared with the area average.`,
    savingsPricier: (amount: string, liters: number) => `${amount} more on a ${liters} L tank than the area average.`,
    savingsEqual: 'At the area average price.',
    services: 'Services',
    share: 'Share',
    shareText: (name: string, price: string, fuel: string) => `${fuel} at ${price} at ${name}, found on PleinSpot`,
    stalePrice: 'Price not updated for more than 7 days: it may have changed since.',
    unavailable: 'Not sold',
    updated: (relative: string) => `updated ${relative}`,
    vsNationalAbove: (cents: string) => `${cents} above the national average.`,
    vsNationalBelow: (cents: string) => `${cents} below the national average.`,
    waze: 'Waze',
  },
  fuel: {
    from: (price: string) => `from ${price}`,
    label: 'Fuel',
    none: 'none',
  },
  history: {
    allChanges: (count: string) => `Show all ${count} changes`,
    changeCount: (count: number) =>
      count === 0 ? 'No price change over the period.' : count === 1 ? 'One price change over the period.' : `${count} price changes over the period.`,
    chartLabel: (summary: string) => `Price history chart. ${summary}`,
    columns: {
      average: 'Average',
      change: 'Change',
      date: 'Date',
      lowest: 'Lowest',
      national: 'National',
      period: 'Period',
      price: 'Price',
    },
    down: (cents: string, period: string, from: string, to: string) => `down ${cents} ${period}, from ${from} to ${to}.`,
    error: 'Price history is not loading right now.',
    flat: (period: string, price: string) => `steady ${period}, at ${price}.`,
    hideTable: 'Hide the table',
    highLow: (low: string, lowDate: string, high: string, highDate: string) =>
      `Lowest on ${lowDate} (${low}), highest on ${highDate} (${high}).`,
    loading: 'Loading price history…',
    nationalAverage: 'National average',
    noData: (fuel: string) => `${fuel}: no price declared by this station in the past year.`,
    noZoneData: 'No price history for the stations in this area.',
    periodIn: { 30: 'in 1 month', 90: 'in 3 months', 365: 'in 1 year' },
    periodLabel: 'Period',
    periodSince: { 30: 'for 1 month', 90: 'for 3 months', 365: 'for 1 year' },
    periods: { 30: '1 month', 90: '3 months', 365: '1 year' },
    same: (reference: string, price: string) => `back at ${price}, the same as ${reference}.`,
    sameAsAgo: { 30: '1 month ago', 90: '3 months ago', 365: '1 year ago' },
    sameAsDate: (date: string) => `on ${date}`,
    showTable: 'Show the table',
    sinceDate: (date: string) => `since ${date}`,
    station: 'This station',
    stationSubject: 'Price',
    title: 'Price history',
    today: 'Today',
    up: (cents: string, period: string, from: string, to: string) => `up ${cents} ${period}, from ${from} to ${to}.`,
    vsNationalAbove: (cents: string) => `On average ${cents} above the national average over the period.`,
    vsNationalBelow: (cents: string) => `On average ${cents} below the national average over the period.`,
    vsNationalEqual: 'In line with the national average over the period.',
    vsZoneAbove: (cents: string) => `On average ${cents} more than the area average over the period.`,
    vsZoneBelow: (cents: string) => `On average ${cents} less than the area average over the period.`,
    vsZoneEqual: 'In line with the area average over the period.',
    weekOf: (date: string) => `Week of ${date}`,
    zoneAverage: 'Area average',
    zoneLowest: (price: string, date: string) => `On ${date}, lowest price in the area over the period: ${price}.`,
    zoneLowestLine: 'Area lowest',
    zoneSubject: 'Area average',
  },
  legend: {
    best: 'Lowest',
    cheap: 'Low',
    high: 'High',
    mid: 'Mid',
    stale: 'To check',
    title: 'Prices in the area',
  },
  live: {
    changed: (count: number) => (count === 1 ? 'One price just changed in the area' : `${count} prices just changed in the area`),
    down: (cents: string) => `down ${cents}`,
    live: 'Live',
    offline: 'Offline, retrying…',
    up: (cents: string) => `up ${cents}`,
  },
  list: {
    highway: 'Motorway',
    sortDistance: 'Distance',
    sortLabel: 'Sort by',
    sortPrice: 'Price',
    stale: 'to check',
  },
  opening: {
    allDay: 'Open 24h',
    automate: '24/7 pump',
    closed: 'Closed',
    closesAt: (time: string) => `until ${time}`,
    closingSoon: (time: string) => `closes soon, at ${time}`,
    open: 'Open',
    open24: 'Open 24 hours',
    opensOn: (day: string, time: string) => `opens ${day} at ${time}`,
    opensToday: (time: string) => `opens at ${time}`,
    opensTomorrow: (time: string) => `opens tomorrow at ${time}`,
    unknown: 'Opening hours not provided',
    weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  },
  search: {
    cities: 'Cities',
    clear: 'Clear search',
    noResults: 'No results. Try a city or a postcode.',
    placeholder: 'City, postcode or address',
    stations: 'Stations in the area',
    useMyLocation: 'Use my location',
  },
  sheet: {
    collapse: 'Collapse the list',
    expand: 'Show the list',
  },
  zone: {
    emptyBody: 'Zoom out or move the map to find stations.',
    emptyTitle: (fuel: string) => `No station sells ${fuel} in this area`,
    highest: 'highest',
    lowest: 'lowest',
    median: 'median',
    nationalAbove: (average: string, cents: string) => `Area average ${average}, ${cents} above the national average.`,
    nationalBelow: (average: string, cents: string) => `Area average ${average}, ${cents} below the national average.`,
    nationalEqual: (average: string) => `Area average ${average}, in line with the national average.`,
    stations: (count: string) => `${count} stations`,
  },
};

const NBSP = ' ';

/**
 * Keeps what reads as one unit on one line, in every text of the app, including the values a
 * text receives: a number and the word after it ("3 mois", "50 L", "24 stations"), and French
 * punctuation with the space before it ("sur la période : 2,250 €").
 */
function keepUnitsTogether(text: string) {
  return text
    .replace(/(\d) (?=[\p{L}€%])/gu, `$1${NBSP}`)
    .replace(/ ([:;!?»])/g, `${NBSP}$1`)
    .replace(/« /g, `«${NBSP}`);
}

function typeset<T>(value: T): T {
  if (typeof value === 'string') {
    return keepUnitsTogether(value) as T;
  }

  if (typeof value === 'function') {
    return ((...args: unknown[]) => typeset((value as (...args: unknown[]) => unknown)(...args))) as T;
  }

  if (Array.isArray(value)) {
    return value.map(typeset) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, typeset(entry)])) as T;
  }

  return value;
}

export const copy: Record<AppLanguage, Copy> = { en: typeset(en), fr: typeset(fr) };
