// Where everything sits on the two hand-painted rooms. All numbers are percentages of the painting,
// so the scene scales with the screen. "crop" boxes cut the matching piece out of the painting so
// objects can lift, glow and sway while still looking like part of the artwork.

const base = import.meta.env.BASE_URL + 'hearth/';
export const asset = (name: string) => base + name;

export type Box = { l: number; t: number; w: number; h: number };
export type Zone = Box & { k: string; bottom: boolean };
export type ObjectId = 'alm' | 'let' | 'tome' | 'orb' | 'door';
export type Mask = { cx: number; rx: [number, number]; ry: [number, number]; cy: [number, number] };

export type Layout = {
  kind: 'desktop' | 'phone';
  aspect: [number, number];
  day: { img: string; video: string };
  night: { img: string; video: string };
  win: Box & { cloudyD: string; rainD: string; rainN: string; radius: string };
  zones: Zone[];
  hot: Record<ObjectId, Box>;
  tags: Record<ObjectId, { l: number; t: number; above?: boolean }>;
  orbGlow: { l: number; t: number };
  fireCentre: number; // horizontal centre of the hearth glow, in %
  light: string; // ellipse size and position of the warm firelight
  coals: Box;
  lamp?: Box;
  steam: { l: number; t: number; w: number; delay: number; tea?: boolean }[];
  sparks: { l: number; t: number; delay: number }[];
  hearth: Box & { video: string; poster: string; mask: Mask };
  halo: Box;
  flame: Box;
  zz: [{ l: number; t: number; size: number }, { l: number; t: number; size: number }];
  cats?: {
    day: Box & { video: string; poster: string; mask: string };
    night: Box & { video: string; poster: string; mask: string };
  };
};

export const desktop: Layout = {
  kind: 'desktop',
  aspect: [2400, 1357],
  day: { img: asset('room-day.jpg'), video: asset('room-day.mp4') },
  night: { img: asset('room-night.jpg'), video: asset('room-night.mp4') },
  win: { l: 10.7, t: 25.9, w: 15.9, h: 32.4, cloudyD: asset('win-d-cloudy.jpg'), rainD: asset('win-d-rain.jpg'), rainN: asset('win-d-nrain.jpg'), radius: '6px' },
  zones: [
    { k: 'ivyL', l: 0, t: 10, w: 8, h: 33, bottom: false },
    { k: 'ivyA', l: 11.4, t: 0, w: 12.2, h: 13, bottom: false },
    { k: 'ivyR', l: 75.7, t: 0, w: 24.3, h: 27, bottom: false },
    { k: 'herbs', l: 53.5, t: 17.5, w: 14.5, h: 25.5, bottom: false },
    { k: 'gems', l: 66.8, t: 0, w: 8.2, h: 28.5, bottom: false },
    { k: 'pans', l: 28.2, t: 17.7, w: 14, h: 24, bottom: false },
    { k: 'flwL', l: 0, t: 39, w: 10.7, h: 20, bottom: true },
    { k: 'plnt', l: 21.4, t: 43, w: 10, h: 14, bottom: true },
    { k: 'flwR', l: 91.4, t: 57.5, w: 8.6, h: 13.5, bottom: true },
  ],
  hot: {
    alm: { l: 6.8, t: 6.2, w: 10, h: 20.5 },
    let: { l: 3, t: 66, w: 15.5, h: 16 },
    tome: { l: 88.6, t: 26, w: 9.2, h: 17.2 },
    orb: { l: 79.8, t: 57.8, w: 11.3, h: 26.5 },
    door: { l: 70.9, t: 30.4, w: 9, h: 16.4 },
  },
  tags: {
    alm: { l: 11.8, t: 27.5 },
    let: { l: 10.8, t: 83 },
    tome: { l: 93.2, t: 44 },
    orb: { l: 85.4, t: 52, above: true },
    door: { l: 75.4, t: 47.5 },
  },
  orbGlow: { l: 85.4, t: 69 },
  fireCentre: 46.4,
  light: 'ellipse 42% 55% at 46.4% 52%',
  coals: { l: 33, t: 55, w: 27, h: 13 },
  steam: [
    { l: 48.6, t: 14, w: 2.2, delay: -0.6 },
    { l: 50, t: 15, w: 1.8, delay: -2.1 },
    { l: 76.8, t: 66.5, w: 1.3, delay: -0.3, tea: true },
    { l: 77.8, t: 67.5, w: 1.1, delay: -1.9, tea: true },
  ],
  sparks: [
    { l: 68.4, t: 25.5, delay: -0.4 },
    { l: 71, t: 19, delay: -2.2 },
    { l: 12.5, t: 11, delay: -1.3 },
    { l: 86, t: 64, delay: -3 },
    { l: 96.5, t: 30, delay: -1.9 },
    { l: 10.5, t: 71, delay: -2.7 },
    { l: 75.5, t: 38.5, delay: -0.9 },
  ],
  hearth: {
    l: 30, t: 30, w: 32, h: 50,
    video: asset('ember-desktop.mp4'), poster: asset('ember-desktop.jpg'),
    mask: { cx: 52, rx: [46, 26], ry: [44, 32], cy: [60, 62] },
  },
  halo: { l: 37, t: 45, w: 20, h: 24 },
  flame: { l: 42, t: 50, w: 10, h: 10 },
  zz: [{ l: 70, t: -10, size: 22 }, { l: 78, t: -22, size: 30 }],
  cats: {
    day: {
      l: 9, t: 36, w: 22, h: 28, video: asset('cat-day.mp4'), poster: asset('cat-day.jpg'),
      mask: 'radial-gradient(ellipse 10% 27% at 46.5% 65%, #000 60%, transparent 100%)',
    },
    night: {
      l: 43, t: 72, w: 24, h: 25.5, video: asset('cat-night.mp4'), poster: asset('cat-night.jpg'),
      mask: 'radial-gradient(ellipse 20% 21% at 59% 77%, #000 60%, transparent 100%)',
    },
  },
};

export const phone: Layout = {
  kind: 'phone',
  aspect: [1170, 2069],
  day: { img: asset('phone-day.jpg'), video: asset('phone-day.mp4') },
  night: { img: asset('phone-night.jpg'), video: asset('phone-night.mp4') },
  win: { l: 0, t: 20.7, w: 14.9, h: 27, cloudyD: asset('win-p-cloudy.jpg'), rainD: asset('win-p-rain.jpg'), rainN: asset('win-p-nrain.jpg'), radius: '0 50% 50% 0 / 0 30% 30% 0' },
  zones: [
    { k: 'hrbL', l: 7.6, t: 0, w: 32.8, h: 16.4, bottom: false },
    { k: 'chrm', l: 41.7, t: 0, w: 32.8, h: 16.4, bottom: false },
    { k: 'hrbR', l: 75.8, t: 0, w: 24.2, h: 19.3, bottom: false },
    { k: 'ivyM', l: 26.5, t: 25.4, w: 54.3, h: 10.4, bottom: false },
    { k: 'pans', l: 14.5, t: 30, w: 14.2, h: 14.3, bottom: false },
    { k: 'pots', l: 22, t: 56.4, w: 15.8, h: 7.9, bottom: true },
    { k: 'lav', l: 56.8, t: 59.3, w: 16.4, h: 10.7, bottom: true },
  ],
  hot: {
    alm: { l: 19.5, t: 15.3, w: 19.7, h: 11 },
    let: { l: 1, t: 69, w: 32, h: 9.8 },
    tome: { l: 63.3, t: 18.6, w: 34, h: 8.4 },
    orb: { l: 79.5, t: 59, w: 17.5, h: 13.3 },
    door: { l: 81.3, t: 32, w: 16.4, h: 10 },
  },
  tags: {
    alm: { l: 29.4, t: 26.8 },
    let: { l: 17, t: 79.2 },
    tome: { l: 74, t: 27.4 },
    orb: { l: 82, t: 58, above: true },
    door: { l: 82, t: 42.4 },
  },
  orbGlow: { l: 88, t: 64.5 },
  fireCentre: 55.6,
  light: 'ellipse 60% 40% at 55.6% 50%',
  coals: { l: 30, t: 49, w: 52, h: 11 },
  lamp: { l: -6, t: 51, w: 28, h: 16 },
  steam: [{ l: 27, t: 43, w: 5, delay: -0.6 }],
  sparks: [
    { l: 60, t: 12, delay: -0.4 },
    { l: 69, t: 13.5, delay: -2.2 },
    { l: 49, t: 9, delay: -1.3 },
    { l: 88, t: 63, delay: -3 },
    { l: 89.5, t: 36, delay: -1.9 },
    { l: 16, t: 73, delay: -2.7 },
    { l: 29, t: 20, delay: -0.9 },
    { l: 80, t: 22, delay: -1.6 },
  ],
  hearth: {
    l: 24, t: 27, w: 62, h: 36,
    video: asset('ember-phone.mp4'), poster: asset('ember-phone.jpg'),
    mask: { cx: 48, rx: [44, 28], ry: [40, 28], cy: [58, 60] },
  },
  halo: { l: 36, t: 40, w: 36, h: 16 },
  flame: { l: 44, t: 43.5, w: 20, h: 7.5 },
  zz: [{ l: 70, t: -30, size: 18 }, { l: 80, t: -50, size: 24 }],
};

// Background size and position that make an element show exactly its own patch of the painting.
export function cropStyle(b: Box, img: string) {
  return {
    left: b.l + '%',
    top: b.t + '%',
    width: b.w + '%',
    height: b.h + '%',
    backgroundImage: `url(${img})`,
    backgroundSize: `${10000 / b.w}% ${10000 / b.h}%`,
    backgroundPosition: `${b.w >= 100 ? 0 : (b.l / (100 - b.w)) * 100}% ${b.h >= 100 ? 0 : (b.t / (100 - b.h)) * 100}%`,
  };
}

export const boxStyle = (b: Box) => ({ left: b.l + '%', top: b.t + '%', width: b.w + '%', height: b.h + '%' });
