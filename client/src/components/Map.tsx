/**
 * GOOGLE MAPS FRONTEND INTEGRATION - ESSENTIAL GUIDE
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.
 * </MapView>
 *
 * ======
 * Available Libraries and Core Features:
 * -------------------------------
 * 📍 MARKER (from `marker` library)
 * - Attaches to map using { map, position }
 * new google.maps.marker.AdvancedMarkerElement({
 *   map,
 *   position: { lat: 37.7749, lng: -122.4194 },
 *   title: "San Francisco",
 * });
 *
 * -------------------------------
 * 🏢 PLACES (from `places` library)
 * - Does not attach directly to map; use data with your map manually.
 * const place = new google.maps.places.Place({ id: PLACE_ID });
 * await place.fetchFields({ fields: ["displayName", "location"] });
 * map.setCenter(place.location);
 * new google.maps.marker.AdvancedMarkerElement({ map, position: place.location });
 *
 * -------------------------------
 * 🧭 GEOCODER (from `geocoding` library)
 * - Standalone service; manually apply results to map.
 * const geocoder = new google.maps.Geocoder();
 * geocoder.geocode({ address: "New York" }, (results, status) => {
 *   if (status === "OK" && results[0]) {
 *     map.setCenter(results[0].geometry.location);
 *     new google.maps.marker.AdvancedMarkerElement({
 *       map,
 *       position: results[0].geometry.location,
 *     });
 *   }
 * });
 *
 * -------------------------------
 * 📐 GEOMETRY (from `geometry` library)
 * - Pure utility functions; not attached to map.
 * const dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
 *
 * -------------------------------
 * 🛣️ ROUTES (from `routes` library)
 * - Combines DirectionsService (standalone) + DirectionsRenderer (map-attached)
 * const directionsService = new google.maps.DirectionsService();
 * const directionsRenderer = new google.maps.DirectionsRenderer({ map });
 * directionsService.route(
 *   { origin, destination, travelMode: "DRIVING" },
 *   (res, status) => status === "OK" && directionsRenderer.setDirections(res)
 * );
 *
 * -------------------------------
 * 🌦️ MAP LAYERS (attach directly to map)
 * - new google.maps.TrafficLayer().setMap(map);
 * - new google.maps.TransitLayer().setMap(map);
 * - new google.maps.BicyclingLayer().setMap(map);
 *
 * -------------------------------
 * ✅ SUMMARY
 * - “map-attached” → AdvancedMarkerElement, DirectionsRenderer, Layers.
 * - “standalone” → Geocoder, DirectionsService, DistanceMatrixService, ElevationService.
 * - “data-only” → Place, Geometry utilities.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getGoogleMapsScriptUrl } from "@/lib/google-maps-url";

declare global {
  interface Window {
    google?: typeof google;
  }
}

// IMPORTANT: A VITE_* value is embedded in the public JavaScript bundle.
// Only a separately provisioned Google Maps browser key, restricted by HTTP
// referrer and to the required Maps API, may be configured here.
// Never use BUILT_IN_FORGE_API_KEY or VITE_FRONTEND_FORGE_API_KEY.
const BROWSER_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;

let mapsScriptLoading: Promise<void> | null = null;

function loadMapsScript(): Promise<void> {
  if (window.google?.maps?.Map) return Promise.resolve();
  const scriptUrl = getGoogleMapsScriptUrl(BROWSER_MAPS_KEY);
  if (!scriptUrl) return Promise.reject(new Error("Google Maps browser key not configured"));
  if (mapsScriptLoading) return mapsScriptLoading;

  mapsScriptLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => {
      script.remove();
      if (!window.google?.maps?.Map) {
        mapsScriptLoading = null;
        reject(new Error("Google Maps script loaded without the Maps API"));
        return;
      }
      resolve();
    };
    script.onerror = () => {
      script.remove();
      mapsScriptLoading = null;
      reject(new Error("Google Maps script could not be loaded"));
    };
    document.head.appendChild(script);
  });
  return mapsScriptLoading;
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(
    BROWSER_MAPS_KEY?.trim() ? null : "Mapa no disponible: falta configurar una clave pública de Google Maps restringida."
  );

  useEffect(() => {
    let cancelled = false;
    if (!BROWSER_MAPS_KEY?.trim()) return;
    setError(null);
    void loadMapsScript().then(() => {
      if (cancelled || !mapContainer.current || !window.google?.maps?.Map) return;
      const instance = new window.google.maps.Map(mapContainer.current, {
        zoom: initialZoom,
        center: { lat: initialCenter.lat, lng: initialCenter.lng },
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: true,
        mapId: "DEMO_MAP_ID",
      });
      onMapReady?.(instance);
    }).catch(() => {
      if (!cancelled) setError("No se pudo cargar Google Maps. Comprueba la conexión y la configuración.");
    });
    return () => { cancelled = true; };
  }, [initialCenter.lat, initialCenter.lng, initialZoom, onMapReady]);

  return (
    <div className={cn("w-full", className)}>
      {error && <p role="status" className="p-4 text-sm">{error}</p>}
      <div ref={mapContainer} aria-label="Mapa interactivo" className={cn("w-full h-[500px]", error && "hidden")} />
    </div>
  );
}
