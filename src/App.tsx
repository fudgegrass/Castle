import { useCallback, useEffect, useState } from 'react';
import { AuthExpired, clientId, currentToken, forgetToken, signIn } from './google';
import { CalEvent, eventsOn, loadEvents, startOfDay } from './calendar';

type State =
  | { kind: 'signed-out'; error?: string }
  | { kind: 'loading' }
  | { kind: 'ready'; events: CalEvent[]; loadedAt: Date }
  | { kind: 'error'; message: string };

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

function greeting(now: Date) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function App() {
  const [state, setState] = useState<State>(() => (currentToken() ? { kind: 'loading' } : { kind: 'signed-out' }));
  const [now, setNow] = useState(() => new Date());

  // Keeps the "now" line and greeting current.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(async (token: string) => {
    setState({ kind: 'loading' });
    try {
      const today = startOfDay(new Date());
      const events = await loadEvents(token, today, startOfDay(today, 2));
      setState({ kind: 'ready', events, loadedAt: new Date() });
    } catch (e) {
      if (e instanceof AuthExpired) setState({ kind: 'signed-out', error: 'Tap to reconnect to Google.' });
      else setState({ kind: 'error', message: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    const token = currentToken();
    if (token) refresh(token);
  }, [refresh]);

  // Refresh when you come back to the app.
  useEffect(() => {
    const onVisible = () => {
      const token = currentToken();
      if (document.visibilityState === 'visible' && token) refresh(token);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const connect = async () => {
    try {
      const token = await signIn();
      await refresh(token);
    } catch (e) {
      setState({ kind: 'signed-out', error: (e as Error).message });
    }
  };

  const disconnect = () => {
    forgetToken();
    setState({ kind: 'signed-out' });
  };

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="eyebrow">{dayFmt.format(now)}</p>
          <h1>{greeting(now)}, Thomas</h1>
        </div>
        {state.kind === 'ready' && (
          <button className="link" onClick={disconnect}>
            Sign out
          </button>
        )}
      </header>

      {state.kind === 'signed-out' && (
        <section className="card center">
          <h2>Open your Castle</h2>
          <p className="muted">Castle uses the Google account on this device. Your data goes only between this device and Google.</p>
          {!clientId && <p className="error">Setup not finished: Castle has no Google client ID yet.</p>}
          {state.error && <p className="error">{state.error}</p>}
          <button className="primary" onClick={connect} disabled={!clientId}>
            Continue with Google
          </button>
        </section>
      )}

      {state.kind === 'loading' && <section className="card center muted">Reading your calendar…</section>}

      {state.kind === 'error' && (
        <section className="card center">
          <p className="error">{state.message}</p>
          <button className="primary" onClick={connect}>
            Try again
          </button>
        </section>
      )}

      {state.kind === 'ready' && (
        <main className="grid">
          <DayCard title="Today" events={eventsOn(state.events, now)} now={now} />
          <DayCard title="Tomorrow" events={eventsOn(state.events, startOfDay(now, 1))} />
          <section className="card soon">
            <h2>Inbox</h2>
            <p className="muted">Email sorting arrives in step 3.</p>
          </section>
          <section className="card soon">
            <h2>Today's training</h2>
            <p className="muted">Your gym plan arrives in step 5.</p>
          </section>
        </main>
      )}
    </div>
  );
}

function DayCard({ title, events, now }: { title: string; events: CalEvent[]; now?: Date }) {
  const allDay = events.filter((e) => e.allDay);
  const timed = events.filter((e) => !e.allDay);
  // Index of the first event that hasn't ended, to place the "now" line.
  const nowIndex = now ? timed.findIndex((e) => e.end > now) : -1;

  return (
    <section className="card">
      <h2>
        {title} <span className="count">{events.length === 1 ? '1 event' : `${events.length} events`}</span>
      </h2>
      {events.length === 0 && <p className="muted">Nothing on the calendar.</p>}
      {allDay.length > 0 && (
        <ul className="allday">
          {allDay.map((e) => (
            <li key={e.id} style={{ borderColor: e.color }}>
              {e.title}
            </li>
          ))}
        </ul>
      )}
      <ul className="events">
        {timed.map((e, i) => {
          const past = now ? e.end <= now : false;
          const happening = now ? e.start <= now && e.end > now : false;
          return (
            <li key={e.id} className={past ? 'past' : happening ? 'happening' : ''}>
              {now && i === nowIndex && !happening && <div className="now-line" aria-label="Now" />}
              <span className="dot" style={{ background: e.color }} />
              <div className="when">
                {timeFmt.format(e.start)}
                <span className="until">{timeFmt.format(e.end)}</span>
              </div>
              <div className="what">
                <a href={e.link} target="_blank" rel="noreferrer">
                  {e.title}
                </a>
                {e.location && <span className="where">{e.location}</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
