
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './fonts.css';

// Geolocation responder for embedded children (postMessage API)
if (typeof window !== 'undefined') {
  const onMessage = (e: MessageEvent) => {
    try {
      const msg: any = e?.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type !== 'kaj-geo:request') return;

      const reply = (payload: any) => {
        try {
          (e.source as WindowProxy | null)?.postMessage(payload, e.origin || '*');
        } catch {
          // ignore
        }
      };

      if (!('geolocation' in navigator)) {
        reply({ type: 'kaj-geo:error', error: 'unsupported' });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          reply({
            type: 'kaj-geo:position',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        (err) =>
          reply({
            type: 'kaj-geo:error',
            error: `${err.code}:${err.message}`,
          }),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
      );
    } catch {
      // ignore
    }
  };
  try { window.addEventListener('message', onMessage); } catch { /* ignore */ }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
