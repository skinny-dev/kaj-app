import React, { useEffect, useRef } from "react";
// Local leaflet import and CSS for reliability
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import "leaflet/dist/leaflet.css";
import L from "leaflet";

type LatLng = { lat: number; lng: number };

interface StepMapProps {
  center: LatLng;
  onChange: (pos: LatLng) => void;
  className?: string;
}

const tileSources = [
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  "https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png",
  "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
];

const StepMap: React.FC<StepMapProps> = ({ center, onChange, className }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    let destroyed = false;
    let tileLayer: L.TileLayer | null = null;

    const ensureSizedAndInit = () => {
      if (!ref.current) return false;
      const h = ref.current.getBoundingClientRect().height;
      if (h < 60) return false; // wait until it has some height
      if (mapRef.current) return true;

  const map = L.map(ref.current, { zoomControl: true });
  map.setView([center.lat, center.lng], 17);
      const addTiles = (i: number) => {
        const src = tileSources[i];
        if (!src) return; // last resort: blank bg
        try {
          tileLayer = L.tileLayer(src, {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
          });
          tileLayer.on("tileerror", () => {
            try { tileLayer && map.removeLayer(tileLayer); } catch {}
            addTiles(i + 1);
          });
          tileLayer.addTo(map);
        } catch {
          addTiles(i + 1);
        }
      };
      addTiles(0);

      // Draggable marker selection
      const icon = L.divIcon({
        className: "rounded-full border-2 border-white bg-blue-600 shadow",
        html: '<div style="width:18px;height:18px;border-radius:9999px;background:#2563eb;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      const marker = L.marker([center.lat, center.lng], { draggable: true, icon }).addTo(map);
      markerRef.current = marker;
      // Notify initial position
      onChange({ lat: center.lat, lng: center.lng });
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        onChange({ lat: p.lat, lng: p.lng });
      });
      // Tap/click to place marker
      map.on("click", (e: any) => {
        const p = e.latlng as L.LatLng;
        marker.setLatLng(p);
        onChange({ lat: p.lat, lng: p.lng });
      });

      mapRef.current = map;
      // multiple invalidate schedules for modal animations
      [20, 120, 300, 600].forEach((ms) => setTimeout(() => {
        try { map.invalidateSize(); } catch {}
      }, ms));
      return true;
    };

    // Try a few frames to wait for layout
    let tries = 0;
    const tick = () => {
      if (destroyed) return;
      if (ensureSizedAndInit()) return;
      tries++;
      if (tries < 30) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // Observe container for size changes
    if (ref.current && 'ResizeObserver' in window) {
      const ro = new ResizeObserver(() => {
        try { mapRef.current && mapRef.current.invalidateSize(); } catch {}
      });
      ro.observe(ref.current);
      roRef.current = ro;
    }

    return () => {
      destroyed = true;
      try {
        roRef.current && roRef.current.disconnect();
        roRef.current = null;
        if (markerRef.current) {
          try { markerRef.current.remove(); } catch {}
          markerRef.current = null;
        }
        mapRef.current && mapRef.current.remove();
        mapRef.current = null;
      } catch {}
    };
  }, []);

  // Recenter when prop center changes
  useEffect(() => {
    try {
      if (mapRef.current) {
        mapRef.current.setView([center.lat, center.lng], 17, { animate: false });
        if (markerRef.current) markerRef.current.setLatLng([center.lat, center.lng]);
      }
    } catch {}
  }, [center.lat, center.lng]);

  return (
    <div className={className}>
      <div
        ref={ref}
        className="h-full w-full bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
      />
    </div>
  );
};

export default StepMap;
