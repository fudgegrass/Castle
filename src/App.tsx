import { useCallback, useEffect, useState } from 'react';
import { AuthExpired, clientId, currentToken, forgetToken, signIn } from './google';
import { CalEvent, loadEvents, startOfDay } from './calendar';
import Hearth, { CalendarState } from './hearth/Hearth';

type State =
  | { kind: 'signed-out'; error?: string }
  | { kind: 'loading' }
  | { kind: 'ready'; events: CalEvent[]; loadedAt: Date }
  | { kind: 'error'; message: string };


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

  const calendar: CalendarState =
    state.kind === 'ready' ? { kind: 'ready', events: state.events } : state;

  return <Hearth calendar={calendar} now={now} canSignIn={!!clientId} onConnect={connect} onSignOut={disconnect} />;
}
