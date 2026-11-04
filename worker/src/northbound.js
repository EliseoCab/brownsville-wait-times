/**
 * A wait report counts only while the person is still south of the U.S. booth,
 * so the booth lies north of them. These anchors are the U.S. inspection side
 * (Los Indios uses the bridge span; the town pin is farther north).
 */
export const NORTHBOUND_MAX_MI = 3;
export const NORTHBOUND_AT_BOOTH_MI = 0.15;
export const NORTHBOUND_MAX_BEARING = 70;
export const NORTHBOUND_HEADING_AWAY = 120;
export const NORTHBOUND_MAX_ACC_M = 400;
/** Ignore a nearer booth when the next one is this close. About 80 meters. */
export const NORTHBOUND_GAP_MI = 0.05;

export const NORTHBOUND_ANCHORS = {
  bm: { lat: 25.89329, lng: -97.505497 },
  gateway: { lat: 25.899143, lng: -97.496978 },
  veterans: { lat: 25.889361, lng: -97.476139 },
  "los-indios": { lat: 26.029167, lng: -97.73875 }
};

function toRad(d) {
  return (d * Math.PI) / 180;
}

export function milesBetween(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * 3958.8 * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function bearingDegrees(from, to) {
  const y = Math.sin(toRad(to.lng - from.lng)) * Math.cos(toRad(to.lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(toRad(to.lng - from.lng));
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function norm360(deg) {
  return ((Number(deg) % 360) + 360) % 360;
}

export function angleDelta(a, b) {
  const d = Math.abs(norm360(a) - norm360(b));
  return d > 180 ? 360 - d : d;
}

/** True when this fix is on the Mexican approach, coming north into the U.S. */
export function northboundIntoUs(anchor, point, heading) {
  if (!anchor || !point) return false;
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const acc = point.acc == null || point.acc === "" ? null : Number(point.acc);
  if (acc != null && Number.isFinite(acc) && acc > NORTHBOUND_MAX_ACC_M) return false;
  const here = { lat: lat, lng: lng };
  const miles = milesBetween(here, anchor);
  if (miles > NORTHBOUND_MAX_MI) return false;
  if (miles <= NORTHBOUND_AT_BOOTH_MI) return true;
  const toAnchor = bearingDegrees(here, anchor);
  if (angleDelta(toAnchor, 0) > NORTHBOUND_MAX_BEARING) return false;
  if (heading != null && heading !== "" && Number.isFinite(Number(heading))) {
    if (angleDelta(heading, toAnchor) > NORTHBOUND_HEADING_AWAY) return false;
  }
  return true;
}

/**
 * The bridge whose U.S. booth this fix is approaching from Mexico.
 * Returns null when none match. ambiguous is true when two booths are too
 * close to call, so the person should choose.
 */
export function nearestNorthboundBridge(point, heading) {
  if (!point || !Number.isFinite(Number(point.lat)) || !Number.isFinite(Number(point.lng))) {
    return null;
  }
  const hits = [];
  Object.keys(NORTHBOUND_ANCHORS).forEach(function (id) {
    const anchor = NORTHBOUND_ANCHORS[id];
    if (!northboundIntoUs(anchor, point, heading)) return;
    hits.push({ id: id, miles: milesBetween(point, anchor) });
  });
  hits.sort(function (a, b) { return a.miles - b.miles; });
  if (!hits.length) return null;
  if (hits.length > 1) {
    const gap = hits[1].miles - hits[0].miles;
    const acc = point.acc == null || point.acc === "" ? 0 : Number(point.acc);
    const accMi = Number.isFinite(acc) && acc > 0 ? acc / 1609.344 : 0;
    if (gap < Math.max(accMi, NORTHBOUND_GAP_MI)) {
      return { id: "", ambiguous: true, miles: hits[0].miles };
    }
  }
  return { id: hits[0].id, ambiguous: false, miles: hits[0].miles };
}
