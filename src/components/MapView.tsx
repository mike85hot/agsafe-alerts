// Leaflet map of clusters. Coloured pins reflect latest severity.
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";
import type { Severity } from "@/lib/agsafe/types";

// Fix leaflet default icon paths inside Vite bundles.
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface MapPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  severity?: Severity | "safe";
  meta?: string;
}

const COLORS: Record<Severity | "safe", string> = {
  safe: "#22c55e",
  watch: "#facc15",
  warning: "#f97316",
  emergency: "#dc2626",
};

export function MapView({ pins, height = 460 }: { pins: MapPin[]; height?: number }) {
  // Center on Nigeria as a sensible default; recompute when pins change.
  const center: [number, number] = pins.length
    ? [pins[0].lat, pins[0].lng]
    : [9.082, 8.6753];

  // Force-resize once on mount so Leaflet picks up its container size.
  useEffect(() => {
    setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
  }, []);

  return (
    <div style={{ height }} className="w-full rounded-lg overflow-hidden border">
      <MapContainer center={center} zoom={6} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={9}
            pathOptions={{ color: COLORS[p.severity ?? "safe"], fillOpacity: 0.85 }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{p.name}</div>
                {p.meta && <div className="text-muted-foreground">{p.meta}</div>}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
