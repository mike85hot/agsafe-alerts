// Browser-only Leaflet map. Imported lazily by MapView so SSR never touches
// the leaflet module (which references `window` at import time).
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";
import type { Severity } from "@/lib/agsafe/types";
import type { MapPin } from "./MapView";

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const COLORS: Record<Severity | "safe", string> = {
  safe: "#22c55e",
  watch: "#facc15",
  warning: "#f97316",
  emergency: "#dc2626",
};

export default function MapViewClient({ pins, height = 460 }: { pins: MapPin[]; height?: number }) {
  const center: [number, number] = pins.length
    ? [pins[0].lat, pins[0].lng]
    : [9.082, 8.6753];

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
