// Leaflet map of clusters. Coloured pins reflect latest severity.
// Leaflet touches `window` at module init, so the entire map (including the
// leaflet imports) must be loaded only in the browser. On the server we
// render a lightweight placeholder.
import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { Severity } from "@/lib/agsafe/types";

export interface MapPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  severity?: Severity | "safe";
  meta?: string;
}

const LazyMap = lazy(() => import("./MapViewClient"));

export function MapView({ pins, height = 460 }: { pins: MapPin[]; height?: number }) {
  const fallback = (
    <div
      style={{ height }}
      className="w-full rounded-lg border bg-muted animate-pulse"
    />
  );
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <LazyMap pins={pins} height={height} />
      </Suspense>
    </ClientOnly>
  );
}
