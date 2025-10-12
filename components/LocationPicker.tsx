import React, { useEffect, useRef, useState } from "react";
// Ensure Leaflet CSS is bundled for local fallback
// This has no effect if CDN styles are used, but guarantees styles when importing leaflet locally
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import "leaflet/dist/leaflet.css";

type LatLng = { lat: number; lng: number };

export interface LocationPickerProps {
  apiKey?: string; // Neshan Web API key
  initialCenter?: LatLng;
  onConfirm: (data: { lat: number; lng: number; address: string }) => void;
  onCancel?: () => void;
  formatAddress?: (raw: { lat: number; lng: number; neshan?: string }) => string;
  value?: LatLng; // controlled position
  onChange?: (pos: LatLng) => void; // notify on marker change
  hideHeader?: boolean;
  hideConfirmButton?: boolean;
  readOnly?: boolean; // when true, disable all interactions (preview mode)
  mapHeight?: number; // optional override for map height (px)
  fillParent?: boolean; // when true, use 100% height of parent container
}

declare global {
  interface Window {
    L: any;
  }
}

// Dynamically load a script tag
const loadScript = (src: string, timeoutMs = 5000) =>
  new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    const timer = window.setTimeout(() => {
      s.remove();
      reject(new Error(`Timeout loading script: ${src}`));
    }, timeoutMs);
    s.onload = () => {
      window.clearTimeout(timer);
      resolve();
    };
    s.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(s);
  });

// Dynamically load a stylesheet
const loadStyle = (href: string, timeoutMs = 5000) =>
  new Promise<void>((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) return resolve();
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    const timer = window.setTimeout(() => {
      l.remove();
      reject(new Error(`Timeout loading style: ${href}`));
    }, timeoutMs);
    l.onload = () => {
      window.clearTimeout(timer);
      resolve();
    };
    l.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error(`Failed to load style: ${href}`));
    };
    document.head.appendChild(l);
  });

// Try to init Neshan map first, fall back to OSM/Leaflet if needed
async function ensureMapLibs() {
  const forceLocal = (import.meta as any)?.env?.VITE_MAP_FORCE_LOCAL;
  if (forceLocal && `${forceLocal}`.toLowerCase() !== 'false') {
    try {
      const mod = await import("leaflet");
      (window as any).L = (mod as any)?.default || mod;
      if ((window as any).L) return { provider: "osm" as const };
    } catch {}
  }
  // 1) Try Neshan Leaflet SDK
  try {
    await loadStyle("https://static.neshan.org/sdk/leaflet/1.7.1/leaflet.css");
    await loadScript("https://static.neshan.org/sdk/leaflet/1.7.1/leaflet.js");
    await loadScript("https://static.neshan.org/sdk/leaflet/1.7.1/neshan-leaflet.js");
    if ((window as any).L) return { provider: "neshan" as const };
  } catch {}

  // 2) Fallback to Leaflet + OSM (unpkg)
  try {
    await loadStyle("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
    await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
    if ((window as any).L) return { provider: "osm" as const };
  } catch {}

  // 3) Another CDN (jsDelivr)
  try {
    await loadStyle("https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css");
    await loadScript("https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js");
    if ((window as any).L) return { provider: "osm" as const };
  } catch {}

  // 4) Local ESM fallback via npm package
  try {
    const mod = await import("leaflet");
    (window as any).L = (mod as any)?.default || mod;
    if ((window as any).L) return { provider: "osm" as const };
  } catch {}

  throw new Error("Map libraries failed to load");
}

async function reverseGeocodeOSM(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=fa`;
    const res = await fetch(url, {
      headers: {
        // Let browser send Referer; set Accept-Language hint
        "Accept-Language": "fa,fa-IR;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) throw new Error("osm http error");
    const data = await res.json();
    const address = (data.display_name || "").toString();
    return address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (e) {
    console.warn("[LocationPicker] OSM reverse failed", e);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

async function reverseGeocodeNeshan(lat: number, lng: number, apiKey?: string): Promise<string> {
  // If no Neshan key, try OSM fallback first
  if (!apiKey) return reverseGeocodeOSM(lat, lng);
  try {
    const res = await fetch(`https://api.neshan.org/v5/reverse?lat=${lat}&lng=${lng}`, {
      headers: {
        "Api-Key": apiKey,
      },
    });
    if (!res.ok) throw new Error("reverse geocode http error");
    const data = await res.json();
    const address = (data.formatted_address || data.address || "").toString();
    return address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (e) {
    console.warn("[LocationPicker] Neshan reverse failed, falling back to OSM", e);
    return reverseGeocodeOSM(lat, lng);
  }
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  apiKey,
  initialCenter = { lat: 35.699739, lng: 51.338097 },
  onConfirm,
  onCancel,
  formatAddress,
  value,
  onChange,
  hideHeader,
  hideConfirmButton,
  readOnly,
  mapHeight,
  fillParent,
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  // If geolocation result arrives before map init, hold it here and apply once
  // the map and marker have been created.
  const pendingPositionRef = useRef<LatLng | null>(null);
  const tileLayerRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [status, setStatus] = useState<string>("در حال بارگذاری نقشه...");
  const [latlng, setLatlng] = useState<LatLng>(initialCenter);
  const [address, setAddress] = useState<string>("");
  const [provider, setProvider] = useState<"neshan" | "osm" | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState<number>(0);
  const [tileError, setTileError] = useState<boolean>(false);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    let map: any;
    let marker: any;
    let destroyed = false;
    let onResize: any;

    (async () => {
      try {
        setLoading(true);
        const { provider } = await ensureMapLibs();
        if (destroyed) return;
        const disableNeshan = (import.meta as any)?.env?.VITE_MAP_DISABLE_NESHAN;
        const hasNeshanKey = Boolean(
          apiKey || (import.meta as any)?.env?.VITE_NESHAN_API_KEY
        );
        const allowNeshan = provider === "neshan" && hasNeshanKey && !(disableNeshan && `${disableNeshan}`.toLowerCase() !== 'false');
        const effectiveProvider = allowNeshan ? "neshan" : "osm";
        setProvider(effectiveProvider as any);
        setInitError(null);

  const L = (window as any).L || (await import("leaflet")).default;
        if (!mapRef.current) return;

        if (effectiveProvider === "neshan") {
          map = new L.Map(mapRef.current, {
            key: apiKey || (import.meta as any)?.env?.VITE_NESHAN_API_KEY || "",
            maptype: "neshan",
            center: [initialCenter.lat, initialCenter.lng],
            zoom: 15,
          });
          try { map && map.once && map.once('load', () => setLoading(false)); } catch {}
          // Fallback: in case 'load' isn't emitted, clear loading after a short delay
          setTimeout(() => setLoading(false), 300);
        } else {
          map = L.map(mapRef.current).setView([initialCenter.lat, initialCenter.lng], 15);
          const tileSources = [
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            "https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png",
            "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
            // Carto basemap (no key, subject to provider limits)
            "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          ];
          const addTileLayer = (idx: number) => {
            const src = tileSources[idx];
            if (!src) {
              setTileError(true);
              setLoading(false);
              return;
            }
            try {
              const tl = L.tileLayer(src, {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors',
              });
              tileLayerRef.current = tl;
              tl.on("tileerror", () => {
                // try next source once
                const next = idx + 1;
                if (tileLayerRef.current) {
                  try { map.removeLayer(tileLayerRef.current); } catch {}
                }
                addTileLayer(next);
              });
              tl.on("load", () => setLoading(false));
              tl.addTo(map);
            } catch {
              addTileLayer(idx + 1);
            }
          };
          addTileLayer(0);
          try { map && map.once && map.once('load', () => setLoading(false)); } catch {}
        }

        marker = L.marker([initialCenter.lat, initialCenter.lng], { draggable: !readOnly }).addTo(map);
        // If a geolocation result arrived before the map finished initializing,
        // apply it now. Otherwise, apply the current latlng state if it differs.
        try {
          const pending = pendingPositionRef.current;
          if (pending) {
            try { map.setView([pending.lat, pending.lng], 16); } catch {}
            try { marker.setLatLng([pending.lat, pending.lng]); } catch {}
            // notify parent and local state
            setLatlng(pending);
            if (typeof onChange === 'function') onChange(pending);
            // clear pending once applied
            pendingPositionRef.current = null;
          } else if (latlng && (latlng.lat !== initialCenter.lat || latlng.lng !== initialCenter.lng)) {
            try { map.setView([latlng.lat, latlng.lng], 16); } catch {}
            try { marker.setLatLng([latlng.lat, latlng.lng]); } catch {}
          }
        } catch {}
        mapInstanceRef.current = map;
        markerRef.current = marker;
        setStatus("روی نقشه محل را انتخاب کنید یا نشانگر را جابجا کنید");

        // Invalidate map size after it becomes visible (modals need this)
        const scheduleInvalidate = (delays: number[]) => {
          delays.forEach((ms) => {
            setTimeout(() => {
              try { map && map.invalidateSize && map.invalidateSize(); } catch {}
              try { map && map.setView && map.setView([initialCenter.lat, initialCenter.lng], 15, { animate: false }); } catch {}
            }, ms);
          });
        };
        // A few spaced attempts to cover animations/layout thrash
        scheduleInvalidate([16, 120, 300, 600, 1000]);
        try {
          requestAnimationFrame(() => {
            try { map && map.invalidateSize && map.invalidateSize(); } catch {}
          });
        } catch {}
        onResize = () => {
          try { map && map.invalidateSize && map.invalidateSize(); } catch {}
        };
        window.addEventListener("resize", onResize);

        // Observe size changes of the container to keep Leaflet layout correct
        try {
          if (mapRef.current && 'ResizeObserver' in window) {
            const ro = new ResizeObserver(() => {
              try { map && map.invalidateSize && map.invalidateSize(); } catch {}
            });
            ro.observe(mapRef.current);
            resizeObserverRef.current = ro;
          }
        } catch {}

        const updatePosition = (lat: number, lng: number) => {
          const next = { lat, lng };
          setLatlng(next);
          if (marker) marker.setLatLng([lat, lng]);
          if (typeof onChange === 'function') onChange(next);
        };

        if (!readOnly) {
          map.on("click", (e: any) => {
            const { lat, lng } = e.latlng || e;
            updatePosition(lat, lng);
          });

          marker.on("dragend", () => {
            const pos = marker.getLatLng();
            updatePosition(pos.lat, pos.lng);
          });
        } else {
          try {
            map.dragging && map.dragging.disable();
            map.touchZoom && map.touchZoom.disable();
            map.scrollWheelZoom && map.scrollWheelZoom.disable();
            map.doubleClickZoom && map.doubleClickZoom.disable();
            map.boxZoom && map.boxZoom.disable();
            map.keyboard && map.keyboard.disable();
          } catch {}
        }

        // Try browser geolocation for better UX
        if (!readOnly && !value && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const glat = pos.coords.latitude;
              const glng = pos.coords.longitude;
              map.setView([glat, glng], 16);
              updatePosition(glat, glng);
            },
            () => {},
            { enableHighAccuracy: true, timeout: 5000 }
          );
        }
      } catch (e) {
        console.error("[LocationPicker] Map init failed", e);
        setStatus("خطا در بارگذاری نقشه. اتصال اینترنت یا فیلترشکن را بررسی کنید.");
        setInitError((e as Error)?.message || "init failed");
        setLoading(false);
      }
    })();

    return () => {
      destroyed = true;
      try {
        if (onResize) window.removeEventListener("resize", onResize);
        if (map && map.remove) map.remove();
        if (resizeObserverRef.current) {
          try { resizeObserverRef.current.disconnect(); } catch {}
          resizeObserverRef.current = null;
        }
      } catch {}
    };
  }, [apiKey, initialCenter.lat, initialCenter.lng, retryKey]);

  // Recenter map when initialCenter changes after init
  useEffect(() => {
    try {
      if (mapInstanceRef.current && initialCenter) {
        mapInstanceRef.current.setView([initialCenter.lat, initialCenter.lng], 15, { animate: false });
        if (markerRef.current) markerRef.current.setLatLng([initialCenter.lat, initialCenter.lng]);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCenter.lat, initialCenter.lng]);

  // Sync external value into marker/map
  useEffect(() => {
    if (!value) return;
    const { lat, lng } = value;
    setLatlng({ lat, lng });
    // We don't keep a persistent map instance here; position sync is handled during init
  }, [value?.lat, value?.lng]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("مرورگر شما از خدمات موقعیت‌یابی پشتیبانی نمی‌کند.");
      return;
    }
    
    setLocationLoading(true);
    setLocationError(null);
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const glat = pos.coords.latitude;
        const glng = pos.coords.longitude;
        const next = { lat: glat, lng: glng };
        // store as pending and attempt immediate apply if map exists
        pendingPositionRef.current = next;
        setLatlng(next);
        try {
          if (mapInstanceRef.current) mapInstanceRef.current.setView([glat, glng], 16);
          if (markerRef.current) markerRef.current.setLatLng([glat, glng]);
          if (typeof onChange === 'function') onChange(next);
          // if we applied immediately, clear pending
          if (mapInstanceRef.current && markerRef.current) pendingPositionRef.current = null;
        } catch {}
        setLocationLoading(false);
        setStatus("موقعیت شما روی نقشه نمایش داده شد");
      },
      (error) => {
        setLocationLoading(false);
        let errorMessage = "دسترسی به موقعیت شما امکان‌پذیر نشد.";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "دسترسی به موقعیت رد شد. لطفاً در تنظیمات مرورگر اجازه دهید.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "موقعیت شما در دسترس نیست. GPS یا اتصال اینترنت را بررسی کنید.";
            break;
          case error.TIMEOUT:
            errorMessage = "زمان درخواست موقعیت تمام شد. دوباره تلاش کنید.";
            break;
        }
        
        setLocationError(errorMessage);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleConfirm = async () => {
    const key = apiKey || (import.meta as any)?.env?.VITE_NESHAN_API_KEY;
    const addrRaw = key
      ? await reverseGeocodeNeshan(latlng.lat, latlng.lng, key)
      : await reverseGeocodeOSM(latlng.lat, latlng.lng);
    setAddress(addrRaw);
    const finalAddress = formatAddress
      ? formatAddress({ lat: latlng.lat, lng: latlng.lng, neshan: addrRaw })
      : (addrRaw || `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`);
    onConfirm({ lat: latlng.lat, lng: latlng.lng, address: finalAddress });
  };

  return (
    <div
      className={fillParent ? "flex flex-col min-h-0" : "space-y-3"}
      style={fillParent ? { height: "100%" } : undefined}
    >
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-300">{status}</p>
          <button
            type="button"
            onClick={handleUseMyLocation}
            className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 hover:border-gray-400"
          >
            موقعیت من
          </button>
        </div>
      )}
      <div
        className={fillParent ? "relative flex-1 min-h-[320px]" : "relative"}
        style={fillParent ? undefined : undefined}
      >
        <div
          ref={mapRef}
          style={{
            height: fillParent ? "100%" : (typeof mapHeight === "number" ? mapHeight :  "55vh"),
            minHeight: fillParent ? 0 : 320,
            width: "100%",
            borderRadius: 8,
            overflow: "hidden",
            pointerEvents: readOnly ? "none" : undefined,
          }}
          className="bg-gray-800 border border-gray-700 h-full"
        />
        {/* Center crosshair to show exact selection point */}
        {!readOnly && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000]">
            <div className="w-4 h-4 rounded-full bg-white shadow-lg border-2 border-blue-500" />
          </div>
        )}
        

        {loading && !initError && (
          <div className="absolute inset-0 z-[5] flex items-center justify-center bg-black/20">
            <span className="text-xs text-gray-200">در حال بارگذاری نقشه...</span>
          </div>
        )}
        {tileError && !loading && (
          <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-2 bg-black/30">
            <p className="text-sm text-gray-200">عدم دسترسی به سرویس‌ نقشه. می‌توانید نقطه را بدون پس‌زمینه انتخاب کنید.</p>
            <button
              type="button"
              onClick={() => { setTileError(false); setRetryKey((k) => k + 1); setLoading(true); }}
              className="text-xs bg-gray-100 text-black rounded px-3 py-1"
            >
              تلاش مجدد
            </button>
          </div>
        )}
        {initError && (
          <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-2 bg-black/40">
            <p className="text-sm text-gray-200">بارگذاری نقشه ناموفق بود.</p>
            <button
              type="button"
              onClick={() => { setLoading(true); setInitError(null); setRetryKey((k) => k + 1); }}
              className="text-xs bg-gray-100 text-black rounded px-3 py-1"
            >
              تلاش مجدد
            </button>
          </div>
        )}
        
        {/* Location error notification */}
        {locationError && (
          <div className="absolute top-4 left-4 right-4 z-[1002]">
            <div className="bg-red-500 text-white text-sm p-3 rounded-lg shadow-lg flex items-center justify-between">
              <span>{locationError}</span>
              <button
                type="button"
                onClick={() => setLocationError(null)}
                className="ml-2 text-white hover:text-gray-200"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locationLoading}
          className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 hover:border-gray-500 rounded-lg py-2.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="استفاده از موقعیت فعلی من"
        >
          {locationLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">در حال دریافت...</span>
            </>
          ) : (
            <>
              <svg 
                className="w-4 h-4 text-white" 
                fill="currentColor" 
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
              </svg>
              <span className="text-sm font-medium">موقعیت من</span>
            </>
          )}
        </button>
      )}
      {!hideConfirmButton && (
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-800 border border-gray-600 text-white rounded-lg py-2"
            >
              انصراف
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 bg-green-500 text-black font-bold rounded-lg py-2 disabled:opacity-60"
          >
            تایید موقعیت
          </button>
        </div>
      )}
      {address && (
        <p className="text-xs text-gray-400">{address}</p>
      )}
    </div>
  );
};

export default LocationPicker;
