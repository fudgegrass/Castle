// Day and night for Newcastle, NSW, worked out on the device from the date (no network needed).

const LAT = -32.93;
const LON = 151.78;

function sunTimes(now: number) {
  const rad = Math.PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397;
  const d = now / dayMs - 0.5 + J1970 - J2000;
  const lw = rad * -LON, phi = rad * LAT;
  const n = Math.round(d - 0.0009 - lw / (2 * Math.PI));
  const ds = 0.0009 + lw / (2 * Math.PI) + n;
  const M = rad * (357.5291 + 0.98560028 * ds);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const Jnoon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const w = Math.acos((Math.sin(-0.833 * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
  const a = 0.0009 + (w + lw) / (2 * Math.PI) + n;
  const Jset = J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const Jrise = Jnoon - (Jset - Jnoon);
  const toMs = (j: number) => (j + 0.5 - J1970) * dayMs;
  return { rise: toMs(Jrise), set: toMs(Jset) };
}

export type Light = { night: number; dusk: number };

// night: 0 in full daylight, 1 after dark, easing over 90 minutes around sunrise and sunset.
export function lightAt(now: number): Light {
  const t = sunTimes(now), H = 45 * 60000;
  const ramp = (x: number) => Math.max(0, Math.min(1, x));
  let night: number;
  if (now < t.rise - H || now > t.set + H) night = 1;
  else if (now > t.rise + H && now < t.set - H) night = 0;
  else if (Math.abs(now - t.rise) <= H) night = ramp((t.rise + H - now) / (2 * H));
  else night = ramp((now - (t.set - H)) / (2 * H));
  const dusk = Math.max(0, 1 - Math.min(Math.abs(now - t.rise), Math.abs(now - t.set)) / H);
  return { night, dusk };
}

export type Weather = 'sunny' | 'cloudy' | 'rain';

// Current weather in Newcastle from Open-Meteo (free, no key, no personal data sent).
export async function loadWeather(): Promise<Weather | null> {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=weather_code`);
    const j = await r.json();
    const c = j?.current?.weather_code;
    if (typeof c !== 'number') return null;
    return c <= 1 ? 'sunny' : c <= 48 ? 'cloudy' : 'rain';
  } catch {
    return null;
  }
}
