import { useEffect, useRef, useState } from "react";
import { Plus, Minus, LocateFixed, MapPin } from "lucide-react";
import type { Scene } from "./domain";
import { inr } from "./domain";
const project = (lat: number, lng: number, z: number) => {
  const n = 256 * 2 ** z;
  const s = Math.sin((lat * Math.PI) / 180);
  return { x: ((lng + 180) / 360) * n, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n };
};
const unproject = (x: number, y: number, z: number) => {
  const n = 256 * 2 ** z;
  return {
    lng: (x / n) * 360 - 180,
    lat: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI,
  };
};
export function SceneMap({
  events,
  onSelect,
  place,
  onPlace,
}: {
  events: Scene[];
  onSelect: (e: Scene) => void;
  place?: { lat: number; lng: number };
  onPlace?: (point: { lat: number; lng: number }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 700, h: 550 });
  const [center, setCenter] = useState({ lat: 28.57, lng: 77.15 });
  const [zoom, setZoom] = useState(11);
  const [failed, setFailed] = useState(false);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = new ResizeObserver(([e]) => {
      if (e) setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    r.observe(el);
    return () => r.disconnect();
  }, []);
  useEffect(() => {
    if (place) {
      setCenter(place);
      setZoom(13);
    }
  }, [place]);
  const p = project(center.lat, center.lng, zoom);
  const left = p.x - size.w / 2,
    top = p.y - size.h / 2;
  const tiles = [];
  for (let x = Math.floor(left / 256); x <= Math.floor((left + size.w) / 256); x++)
    for (let y = Math.floor(top / 256); y <= Math.floor((top + size.h) / 256); y++)
      tiles.push({ x, y });
  return (
    <div
      className="scene-map"
      ref={ref}
      aria-label="Event map of Delhi NCR. Pins show approximate neighbourhoods."
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button,a")) return;
        drag.current = { x: e.clientX, y: e.clientY, cx: p.x, cy: p.y };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const c = unproject(
          drag.current.cx - e.clientX + drag.current.x,
          drag.current.cy - e.clientY + drag.current.y,
          zoom,
        );
        setCenter({
          lat: Math.max(28.1, Math.min(29, c.lat)),
          lng: Math.max(76.5, Math.min(77.7, c.lng)),
        });
      }}
      onPointerUp={(e) => {
        if (
          drag.current &&
          onPlace &&
          Math.hypot(e.clientX - drag.current.x, e.clientY - drag.current.y) < 6
        ) {
          const rect = e.currentTarget.getBoundingClientRect();
          const point = unproject(left + e.clientX - rect.left, top + e.clientY - rect.top, zoom);
          onPlace({
            lat: Math.round(Math.max(28.1, Math.min(29, point.lat)) * 100) / 100,
            lng: Math.round(Math.max(76.5, Math.min(77.7, point.lng)) * 100) / 100,
          });
        }
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <div className="map-tiles" aria-hidden="true">
        {tiles.map((t) => (
          <img
            draggable={false}
            key={`${zoom}-${t.x}-${t.y}`}
            src={`https://tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png`}
            alt=""
            style={{ left: t.x * 256 - left, top: t.y * 256 - top }}
            onError={() => setFailed(true)}
          />
        ))}
      </div>
      {place && (
        <span
          className="chosen-map-pin"
          style={{
            left: project(place.lat, place.lng, zoom).x - left,
            top: project(place.lat, place.lng, zoom).y - top,
          }}
        >
          <MapPin size={30} />
          <span>Your approximate area</span>
        </span>
      )}
      {events.map((e) => {
        const q = project(e.lat, e.lng, zoom);
        return (
          <button
            type="button"
            key={e.id}
            className={`map-price ${e.category}`}
            style={{ left: q.x - left, top: q.y - top }}
            onClick={() => onSelect(e)}
            aria-label={`${e.title}, ${inr(e.price)}, approximate location`}
          >
            <MapPin size={13} />
            {inr(e.price)}
          </button>
        );
      })}
      <div className="map-note">
        <span className="live-dot" /> Delhi NCR · approximate locations
      </div>
      <div className="map-controls">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(15, z + 1))}
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(10, z - 1))}
        >
          <Minus size={18} />
        </button>
        <button
          type="button"
          aria-label="Show Delhi NCR"
          onClick={() => {
            setCenter({ lat: 28.57, lng: 77.15 });
            setZoom(11);
          }}
        >
          <LocateFixed size={18} />
        </button>
      </div>
      {failed && (
        <div className="map-unavailable">
          Map tiles could not load. Event pins and the list are still available.
        </div>
      )}
      <a
        className="map-credit"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
      >
        © OpenStreetMap contributors
      </a>
    </div>
  );
}
