import { CSSProperties, PointerEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalEvent, eventsOn, startOfDay } from '../calendar';
import { boxStyle, cropStyle, desktop, Layout, ObjectId, phone } from './layouts';
import { Light, lightAt, loadWeather, Weather } from './sky';
import './hearth.css';

export type CalendarState =
  | { kind: 'signed-out'; error?: string }
  | { kind: 'loading' }
  | { kind: 'ready'; events: CalEvent[] }
  | { kind: 'error'; message: string };

type Props = {
  calendar: CalendarState;
  now: Date;
  canSignIn: boolean;
  onConnect: () => void;
  onSignOut: () => void;
};

// Times and dates follow the device's own clock and time zone, like the calendar data.
const timeFmt = new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit' });
const dayName = new Intl.DateTimeFormat('en-AU', { weekday: 'long' });
const dayRest = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long' });
const dayShort = new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'long' });

const POKES = [
  'Careful! I am the one keeping this whole castle moving.',
  'Hey! Feed me a log, not a finger.',
  'Psst. Point at things and I will tell you about them.',
  'Without me this place would be a cold pile of bricks.',
  'Fine, fine. I am awake. Mostly.',
];
const WAKE_LINE = 'Hm? Oh! I was not asleep. I was thinking about logs.';
const NAMES: Record<ObjectId, string> = { alm: 'The Almanac', let: 'Letters', tome: 'Tome of Strength', orb: 'The Seeing Orb', door: 'The door dial' };

// Picks the phone painting for tall or narrow screens and the wide painting otherwise.
function useLayout(): Layout {
  const pick = () => (window.innerWidth < 760 || window.innerWidth / window.innerHeight < 0.9 ? phone : desktop);
  const [layout, setLayout] = useState<Layout>(pick);
  useEffect(() => {
    const onResize = () => setLayout(pick());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return layout;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return reduced;
}

// ?time=day|dusk|night and ?weather=sunny|cloudy|rain preview the other looks.
function overrides() {
  const q = new URLSearchParams(window.location.search);
  const time = q.get('time');
  const weather = q.get('weather');
  return {
    light: time === 'day' ? { night: 0, dusk: 0 } : time === 'night' ? { night: 1, dusk: 0 } : time === 'dusk' ? { night: 0.5, dusk: 1 } : null,
    weather: weather === 'sunny' || weather === 'cloudy' || weather === 'rain' ? (weather as Weather) : null,
  };
}

function Loop({ src, poster, className, still }: { src: string; poster: string; className?: string; still: boolean }) {
  if (still) return <img className={className} src={poster} alt="" />;
  return <video className={className} src={src} poster={poster} autoPlay muted loop playsInline />;
}

export default function Hearth({ calendar, now, canSignIn, onConnect, onSignOut }: Props) {
  const layout = useLayout();
  const still = useReducedMotion();
  const forced = useMemo(overrides, []);

  const [liveWeather, setLiveWeather] = useState<Weather | null>(null);
  const [hover, setHover] = useState<ObjectId | null>(null);
  const [open, setOpen] = useState<ObjectId | null>(null);
  const [mx, setMx] = useState(0);
  const [sleepy, setSleepy] = useState(false);
  const [poke, setPoke] = useState('');
  const [pokes, setPokes] = useState(0);
  const [puff, setPuff] = useState(false);
  const [rustle, setRustle] = useState<Record<string, 'rP' | 'rN'>>({});

  const lastActive = useRef(Date.now());
  const lastX = useRef<number | null>(null);
  const lineTimer = useRef<number>(undefined);
  const puffTimer = useRef<number>(undefined);
  const state = useRef({ sleepy, open, hover });
  state.current = { sleepy, open, hover };

  useEffect(() => {
    loadWeather().then(setLiveWeather);
    const t = setInterval(() => loadWeather().then((w) => w && setLiveWeather(w)), 30 * 60_000);
    return () => clearInterval(t);
  }, []);

  // Ember dozes off after a quiet spell.
  useEffect(() => {
    const t = setInterval(() => {
      const s = state.current;
      if (!s.sleepy && !s.open && !s.hover && Date.now() - lastActive.current > 14_000) {
        setSleepy(true);
        setPoke('');
      }
    }, 1000);
    return () => {
      clearInterval(t);
      clearTimeout(lineTimer.current);
      clearTimeout(puffTimer.current);
    };
  }, []);

  // Close panels with Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const say = useCallback((line: string, ms: number) => {
    setPoke(line);
    clearTimeout(lineTimer.current);
    lineTimer.current = window.setTimeout(() => setPoke(''), ms);
  }, []);

  const wake = useCallback(() => {
    lastActive.current = Date.now();
    if (state.current.sleepy) {
      setSleepy(false);
      say(WAKE_LINE, 3200);
    }
  }, [say]);

  const brush = (px: number, py: number) => {
    const dx = lastX.current === null ? 1 : px - lastX.current;
    lastX.current = px;
    const hit = layout.zones.filter((z) => !rustle[z.k] && px >= z.l && px <= z.l + z.w && py >= z.t && py <= z.t + z.h);
    if (!hit.length) return;
    setRustle((r) => {
      const next = { ...r };
      hit.forEach((z) => (next[z.k] = dx >= 0 !== z.bottom ? 'rP' : 'rN'));
      return next;
    });
    hit.forEach((z) =>
      setTimeout(() => setRustle((r) => {
        const next = { ...r };
        delete next[z.k];
        return next;
      }), 1850),
    );
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * 100;
    const py = ((e.clientY - r.top) / r.height) * 100;
    brush(px, py);
    if (e.pointerType === 'mouse') setMx((px / 100) * 2 - 1);
    wake();
  };

  const hoverOn = (id: ObjectId) => () => {
    wake();
    setHover(id);
  };
  const toggle = (id: ObjectId) => () => {
    wake();
    setPoke('');
    setOpen((o) => (o === id ? null : id));
  };
  const pokeFire = () => {
    lastActive.current = Date.now();
    const n = pokes + 1;
    setPokes(n);
    setSleepy(false);
    setOpen(null);
    setPuff(true);
    clearTimeout(puffTimer.current);
    puffTimer.current = window.setTimeout(() => setPuff(false), 700);
    say(POKES[n % POKES.length], 3600);
  };

  // Light and weather.
  const light: Light = forced.light ?? lightAt(now.getTime());
  const weather: Weather = forced.weather ?? liveWeather ?? 'sunny';
  const isNight = light.night >= 0.5;

  // Calendar.
  const today = calendar.kind === 'ready' ? eventsOn(calendar.events, now) : [];
  const tomorrow = calendar.kind === 'ready' ? eventsOn(calendar.events, startOfDay(now, 1)) : [];
  const upcoming = today.filter((e) => !e.allDay && e.end > now);
  const next = upcoming[0];

  const almanacLine = (() => {
    if (calendar.kind === 'signed-out') return 'Open the Almanac and let me read your calendar.';
    if (calendar.kind === 'loading') return 'Reading your calendar. One moment.';
    if (calendar.kind === 'error') return 'The Almanac is stuck. Open it and try again.';
    if (today.length === 0) return 'Nothing on the Almanac today. A quiet one!';
    const count = today.length === 1 ? 'One thing today.' : `${today.length} things today.`;
    return next ? `${count} Next is ${next.title} at ${timeFmt.format(next.start)}.` : `${count} All done for today.`;
  })();
  const almanacSub =
    calendar.kind === 'ready' ? (today.length === 1 ? '1 thing today' : `${today.length} things today`) : calendar.kind === 'loading' ? 'Reading…' : 'Your calendar';

  const lines: Record<ObjectId, string> = {
    alm: almanacLine,
    let: 'Letters come next. I will draft replies, but I will never send a thing without you.',
    tome: 'Your training plan is on its way. I will keep the room warm while you lift.',
    orb: 'The Orb is still waking up. Soon you can ask me to shuffle the Almanac.',
    door: 'Which way shall the door open today?',
  };
  const subs: Record<ObjectId, string> = { alm: almanacSub, let: 'Coming soon', tome: 'Coming soon', orb: 'Coming soon', door: 'Settings' };
  const line = poke || (open ? lines[open] : hover ? lines[hover] : '');

  const focus = hover || open;
  const leanByObject: Record<ObjectId, number> = layout.kind === 'desktop'
    ? { alm: -11, let: -13, tome: 11, orb: 12, door: 8 }
    : { alm: -9, let: -12, tome: 9, orb: 12, door: 10 };
  const lean = sleepy ? 0 : focus ? leanByObject[focus] : mx * 5;

  const m = layout.hearth.mask;
  const lerp = (a: [number, number]) => a[0] + (a[1] - a[0]) * light.night;
  const hearthMask = `radial-gradient(ellipse ${lerp(m.rx)}% ${lerp(m.ry)}% at ${m.cx}% ${lerp(m.cy)}%, #000 55%, transparent 100%)`;
  const glow = sleepy ? 0.45 : open ? 1 : hover ? 0.95 : 0.85;
  const paint = isNight ? layout.night.img : layout.day.img;

  const embers = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        left: 25 + ((i * 23) % 50) + '%',
        top: 55 + ((i * 17) % 25) + '%',
        '--dx': ((i % 2 ? 1 : -1) * (10 + ((i * 7) % 40))) + 'px',
        animationDelay: (i * 0.29).toFixed(2) + 's',
        animationDuration: 2.6 + (i % 4) * 0.5 + 's',
      }) as CSSProperties),
    [],
  );
  const motes = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        left: 14 + ((i * 37) % 72) + '%',
        top: 30 + ((i * 23) % 45) + '%',
        '--dx': ((i % 2 ? 1 : -1) * (20 + ((i * 11) % 50))) + 'px',
        animationDelay: (-i * 0.9).toFixed(1) + 's',
        animationDuration: 8 + (i % 3) * 2 + 's',
      }) as CSSProperties),
    [],
  );

  const objects: ObjectId[] = ['alm', 'let', 'tome', 'orb', 'door'];
  const ariaLabels: Record<ObjectId, string> = {
    alm: `The Almanac: your calendar, ${almanacSub.toLowerCase()}`,
    let: 'Letters: your email, coming soon',
    tome: 'Tome of Strength: your training, coming soon',
    orb: 'The Seeing Orb: ask Castle, coming soon',
    door: 'The door dial: settings',
  };

  const eventRow = (e: CalEvent) => (
    <li key={e.id}>
      <span className="when">{e.allDay ? 'All day' : timeFmt.format(e.start)}</span>
      <span className="what">
        {e.link ? (
          <a href={e.link} target="_blank" rel="noreferrer">
            {e.title}
          </a>
        ) : (
          e.title
        )}
      </span>
    </li>
  );

  const calendarBody = (() => {
    if (calendar.kind === 'signed-out')
      return (
        <>
          <p className="note">Castle reads your Google Calendar on this device only.</p>
          {calendar.error && <p className="err">{calendar.error}</p>}
          {!canSignIn && <p className="err">Setup not finished: Castle has no Google client ID yet.</p>}
          <button type="button" className="pbtn" onClick={onConnect} disabled={!canSignIn}>
            Continue with Google
          </button>
        </>
      );
    if (calendar.kind === 'loading') return <p className="note">Reading your calendar…</p>;
    if (calendar.kind === 'error')
      return (
        <>
          <p className="err">{calendar.message}</p>
          <button type="button" className="pbtn" onClick={onConnect}>
            Try again
          </button>
        </>
      );
    return (
      <>
        <p className="pday">Today</p>
        {today.length ? <ul className="evs">{today.map(eventRow)}</ul> : <p className="note">Nothing on the calendar.</p>}
        <p className="pday">Tomorrow</p>
        {tomorrow.length ? <ul className="evs">{tomorrow.map(eventRow)}</ul> : <p className="note">Nothing on the calendar.</p>}
        <a className="plink" href="https://calendar.google.com/calendar/r" target="_blank" rel="noreferrer">
          Open Google Calendar
        </a>
      </>
    );
  })();

  const panelBody: Record<ObjectId, ReactNode> = {
    alm: calendarBody,
    let: (
      <>
        <p className="note">Email sorting arrives in a later step.</p>
        <p className="note">Replies will wait as Gmail drafts. Nothing is sent without you.</p>
      </>
    ),
    tome: <p className="note">Your gym plan, built around your roster, arrives in a later step.</p>,
    orb: (
      <>
        <label htmlFor="orb-ask" className="note">
          Tell the fire what you need
        </label>
        <input id="orb-ask" className="pinput" type="text" placeholder="Coming soon" disabled />
        <p className="note">You will see every change before it happens.</p>
      </>
    ),
    door: (
      <>
        <p className="note">
          Google Calendar:{' '}
          {calendar.kind === 'ready' || calendar.kind === 'loading' ? 'connected, read only' : 'not connected'}
        </p>
        {calendar.kind === 'ready' || calendar.kind === 'loading' ? (
          <button type="button" className="pbtn ghost" onClick={() => { setOpen(null); onSignOut(); }}>
            Sign out
          </button>
        ) : (
          <button type="button" className="pbtn" onClick={onConnect} disabled={!canSignIn}>
            Continue with Google
          </button>
        )}
      </>
    ),
  };
  const panelPos: Record<ObjectId, CSSProperties> = {
    alm: { left: '3%', top: '30%' },
    let: { left: '3%', bottom: '36%' },
    tome: { right: '2.5%', top: '45%' },
    orb: { right: '2.5%', bottom: '44%' },
    door: { left: '55%', top: '48%' },
  };

  const now10 = now;
  const plaque = (
    <>
      Castle · <b>{dayName.format(now10)}</b>, {dayRest.format(now10)}
    </>
  );

  const sceneStyle = { aspectRatio: `${layout.aspect[0]} / ${layout.aspect[1]}`, '--fire-x': layout.fireCentre + '%' } as CSSProperties;

  return (
    <div className={`hearth-page ${layout.kind}`}>
      <div
        className={`scene ${isNight ? 'is-night' : ''}`}
        style={sceneStyle}
        onPointerMove={onMove}
        onPointerLeave={() => {
          setMx(0);
          setHover(null);
        }}
      >
        <img className="bg" src={layout.day.img} alt="A painted cottage room around a stone hearth, with the harbour and lighthouse outside the window" />
        {!still && <video className="bg" src={layout.day.video} poster={layout.day.img} autoPlay muted loop playsInline aria-hidden="true" />}
        <div className="nightlayer" style={{ opacity: light.night }} aria-hidden="true">
          <img className="bg" src={layout.night.img} alt="" />
          {!still && light.night > 0 && <video className="bg" src={layout.night.video} poster={layout.night.img} autoPlay muted loop playsInline />}
        </div>

        {/* The window shows Newcastle's weather. */}
        {(['cloudyD', 'rainD', 'rainN'] as const).map((k) => {
          const on = k === 'cloudyD' ? !isNight && weather === 'cloudy' : k === 'rainD' ? !isNight && weather === 'rain' : isNight && weather !== 'sunny';
          return (
            <div
              key={k}
              className={`win ${on ? 'on' : ''}`}
              style={{ ...boxStyle(layout.win), backgroundImage: `url(${layout.win[k]})` }}
              aria-hidden="true"
            />
          );
        })}
        <div className={`wx ${weather === 'rain' ? 'wx-rain' : ''}`} style={{ ...boxStyle(layout.win), borderRadius: layout.win.radius }} aria-hidden="true">
          {[
            [4, 75, 22, -3],
            [16, 55, 17, -11],
            [28, 70, 26, -19],
            [9, 45, 14, -7],
            [36, 60, 20, -15],
          ].map(([t, w, d, delay]) => (
            <span key={t} className="wisp" style={{ top: t + '%', width: w + '%', animationDuration: d + 's', animationDelay: delay + 's' }} />
          ))}
          {weather === 'rain' && (
            <>
              <span className="rain" />
              <span className="rain rain2" />
              {[
                [14, 2.6, -0.4],
                [33, 3.4, -1.9],
                [51, 2.2, -1.1],
                [68, 3.0, -2.5],
                [86, 2.8, -0.9],
              ].map(([l, d, delay]) => (
                <span key={l} className="drip" style={{ left: l + '%', animationDuration: d + 's', animationDelay: delay + 's' }} />
              ))}
            </>
          )}
          {isNight && weather === 'sunny' &&
            [
              [18, 10, 0],
              [52, 6, -1.3],
              [76, 18, -2.6],
              [34, 22, -0.7],
              [64, 30, -3.1],
            ].map(([l, t, delay]) => <span key={l} className="star" style={{ left: l + '%', top: t + '%', animationDelay: delay + 's' }} />)}
        </div>

        <div
          className="nglow"
          style={{
            opacity: light.night * (sleepy ? 0.55 : open ? 1 : 0.85),
            transform: `translateX(${(lean * 0.5).toFixed(1)}%)`,
            background: `radial-gradient(ellipse 38% 50% at ${layout.fireCentre}% 52%, rgba(255,150,60,.55), rgba(255,110,40,.2) 45%, transparent 75%)`,
          }}
          aria-hidden="true"
        />
        <div className="orbglow" style={{ left: layout.orbGlow.l + '%', top: layout.orbGlow.t + '%', opacity: 0.25 + light.night * 0.75 }} aria-hidden="true" />
        <div className="dusk" style={{ opacity: light.dusk * 0.6 }} aria-hidden="true" />

        {/* Ivy, herbs and flowers sway when brushed. */}
        {layout.zones.map((z) => (
          <span
            key={z.k}
            className={`sw ${rustle[z.k] ?? ''}`}
            style={{ ...cropStyle(z, paint), transformOrigin: z.bottom ? '50% 100%' : '50% 0' }}
            aria-hidden="true"
          />
        ))}
        <div className="light" style={{ opacity: glow * (1 - light.night * 0.6), background: `radial-gradient(${layout.light}, rgba(255,170,70,.95), rgba(255,120,40,.35) 45%, rgba(20,10,5,.55) 100%)` }} aria-hidden="true" />
        <div className="coals" style={boxStyle(layout.coals)} aria-hidden="true" />
        {layout.lamp && <div className="lamp" style={boxStyle(layout.lamp)} aria-hidden="true" />}

        {layout.steam.map((s, i) => (
          <svg
            key={i}
            className={`steam ${s.tea ? 'tea' : ''}`}
            style={{ left: s.l + '%', top: s.t + '%', width: s.w + '%', animationDelay: s.delay + 's' }}
            viewBox="0 0 20 40"
            aria-hidden="true"
          >
            <path d="M10 38c-6-8 6-12 0-20s4-12 0-16" stroke={s.tea ? '#FFF6E6' : '#F3E6C8'} strokeWidth={s.tea ? 2.2 : 2.5} fill="none" strokeLinecap="round" />
          </svg>
        ))}
        {layout.sparks.map((s, i) => (
          <span key={i} className="spark" style={{ left: s.l + '%', top: s.t + '%', animationDelay: s.delay + 's' }} aria-hidden="true" />
        ))}
        {motes.map((st, i) => (
          <span key={i} className="mote" style={st} aria-hidden="true" />
        ))}

        {/* The objects: each is a piece of the painting that lifts and glows. */}
        {objects.map((id) => (
          <button
            key={id}
            type="button"
            className={`hot ${open === id ? 'on' : ''}`}
            style={cropStyle(layout.hot[id], paint)}
            aria-expanded={open === id}
            aria-label={ariaLabels[id]}
            onClick={toggle(id)}
            onMouseEnter={hoverOn(id)}
            onMouseLeave={() => setHover(null)}
            onFocus={hoverOn(id)}
            onBlur={() => setHover(null)}
          />
        ))}
        {layout.kind === 'desktop' &&
          objects.map((id) => (
            <span
              key={id}
              className={`tag ${focus === id && !open ? 'show' : ''}`}
              style={{ left: layout.tags[id].l + '%', top: layout.tags[id].t + '%', ...(layout.tags[id].above ? { translate: '0 -100%' } : {}) }}
              aria-hidden="true"
            >
              {NAMES[id]}
              <small>{subs[id]}</small>
            </span>
          ))}

        {/* The cat: on the window sill by day, asleep on the rug at night. */}
        {layout.cats && (
          <>
            <div className="cat" style={{ ...boxStyle(layout.cats.day), opacity: Math.max(0, 1 - light.night * 1.6), maskImage: layout.cats.day.mask, WebkitMaskImage: layout.cats.day.mask }} aria-hidden="true">
              <Loop src={layout.cats.day.video} poster={layout.cats.day.poster} still={still} />
            </div>
            <div className="cat" style={{ ...boxStyle(layout.cats.night), opacity: Math.max(0, light.night * 1.6 - 0.6), maskImage: layout.cats.night.mask, WebkitMaskImage: layout.cats.night.mask }} aria-hidden="true">
              <Loop src={layout.cats.night.video} poster={layout.cats.night.poster} still={still} />
            </div>
          </>
        )}

        {/* Ember, the living fire. */}
        <div
          className="hearth"
          style={{
            ...boxStyle(layout.hearth),
            maskImage: hearthMask,
            WebkitMaskImage: hearthMask,
            filter: `brightness(${((sleepy ? 0.8 : 1) * (1 - light.night * 0.12)).toFixed(2)})`,
          }}
          aria-hidden="true"
        >
          <Loop className={`hv ${puff ? 'puff' : ''}`} src={layout.hearth.video} poster={layout.hearth.poster} still={still} />
        </div>
        <span
          className="halo2"
          style={{ ...boxStyle(layout.halo), opacity: sleepy ? 0.3 : open ? 1 : hover ? 0.9 : 0.6, transform: `translateX(${(lean * 0.6).toFixed(1)}%)` }}
          aria-hidden="true"
        />
        <button type="button" className="flamebox" style={boxStyle(layout.flame)} onClick={pokeFire} aria-label="Ember, the hearth fire. Poke it to hear what it thinks">
          {!sleepy && embers.map((st, i) => <span key={i} className="ember" style={st} aria-hidden="true" />)}
          {sleepy &&
            layout.zz.map((z, i) => (
              <span key={i} className="zz" style={{ left: z.l + '%', top: z.t + '%', fontSize: z.size, animationDelay: i ? '-1.5s' : '0s' }} aria-hidden="true">
                z
              </span>
            ))}
        </button>

        {line && (
          <div className="bubble" role="status" key={line}>
            {line}
          </div>
        )}

        {layout.kind === 'desktop' && <div className="plaque">{plaque}</div>}

        {open && (
          <div className="panel" style={layout.kind === 'desktop' ? panelPos[open] : undefined} role="dialog" aria-label={NAMES[open]}>
            <button type="button" className="x" aria-label={`Close ${NAMES[open]}`} onClick={() => setOpen(null)}>
              ×
            </button>
            <p className="ptitle">{NAMES[open]}</p>
            <div className="pbody">{panelBody[open]}</div>
          </div>
        )}
      </div>

      {layout.kind === 'phone' && (
        <section className="daybook" aria-label="The Daybook">
          <div className="dhead">
            <span className="dtitle">The Daybook</span>
            <span className="ddate">{dayShort.format(now)}</span>
          </div>
          {calendar.kind === 'ready' ? (
            today.length ? (
              <ul className="evs">{(upcoming.length ? upcoming : today).slice(0, 3).map(eventRow)}</ul>
            ) : (
              <p className="note">Nothing on the calendar today.</p>
            )
          ) : calendar.kind === 'loading' ? (
            <p className="note">Reading your calendar…</p>
          ) : (
            <button type="button" className="pbtn" onClick={onConnect} disabled={!canSignIn}>
              {calendar.kind === 'error' ? 'Try again' : 'Continue with Google'}
            </button>
          )}
          <span className="hint">Tap anything that glints, or poke the fire.</span>
        </section>
      )}
    </div>
  );
}
