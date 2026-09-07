"use client";

import { useEffect, useRef } from "react";
import {
  Map as MaplibreMap,
  Marker,
  NavigationControl,
} from "maplibre-gl";
import type {
  GeoJSONSource,
  Map,
  MapLayerMouseEvent,
  Marker as MarkerType,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ActivityLevel, AirportStation, Volcano } from "@/lib/types";
import { ACTIVITY_COLORS } from "@/lib/types";

type Props = {
  volcanoes: Volcano[];
  airports?: AirportStation[];
  showAirports?: boolean;
  selectedId?: string | null;
  focusAirportIcao?: string | null;
  onSelect: (v: Volcano) => void;
  onSelectAirport?: (a: AirportStation) => void;
};

const OPEN_SRC = "pe-airports-open";
const OPEN_CIRCLE = "pe-airports-open-circle";
const OPEN_LABEL = "pe-airports-open-label";

function markerEl(v: Volcano, selected: boolean) {
  const level = v.activity_level as ActivityLevel;
  const color = ACTIVITY_COLORS[level];
  const size = selected ? 18 : level >= 3 ? 16 : level === 2 ? 12 : 8;

  const wrap = document.createElement("button");
  wrap.type = "button";
  wrap.className = "pe-marker-wrap";
  wrap.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: 0;
    cursor: pointer;
    padding: 0;
  `;
  wrap.setAttribute("aria-label", `${v.name} Level ${level}`);

  if (level >= 3 || selected) {
    const label = document.createElement("span");
    label.className = "pe-marker-label";
    label.textContent = v.name;
    wrap.appendChild(label);
  }

  const dot = document.createElement("span");
  dot.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    border: 2px solid rgba(232,238,247,0.92);
    background: ${color};
    box-shadow: 0 0 0 ${level >= 3 ? 7 : 0}px ${color}44;
    animation: ${level >= 3 ? "pe-pulse 1.8s ease-out infinite" : "none"};
  `;
  wrap.appendChild(dot);
  return wrap;
}

function alertAirportEl(a: AirportStation) {
  const isClosed = a.closed;
  const wrap = document.createElement("button");
  wrap.type = "button";
  wrap.className = "pe-airport-marker";
  wrap.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    background: transparent;
    border: 0;
    cursor: pointer;
    padding: 0;
  `;
  wrap.setAttribute(
    "aria-label",
    `${a.icao} ${a.name} ${isClosed ? "CLOSED" : "OPEN VA"}`,
  );

  const label = document.createElement("span");
  label.className = "pe-marker-label";
  label.textContent = `${a.icao}${isClosed ? " ✕" : " VA"}`;
  wrap.appendChild(label);

  const pin = document.createElement("span");
  pin.style.cssText = `
    width: ${isClosed ? 24 : 20}px;
    height: ${isClosed ? 24 : 20}px;
    border-radius: 4px;
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 800;
    color: ${isClosed ? "#fff" : "#041016"};
    background: ${isClosed ? "#ff1f4b" : "#e0b84a"};
    border: 1px solid rgba(255,255,255,0.4);
    box-shadow: 0 0 0 ${isClosed ? 6 : 0}px rgba(255,31,75,0.35);
  `;
  pin.textContent = "✈";
  wrap.appendChild(pin);
  return wrap;
}

function openAirportsGeoJSON(airports: AirportStation[]) {
  return {
    type: "FeatureCollection" as const,
    features: airports
      .filter((a) => !a.closed && !a.has_va)
      .map((a) => ({
        type: "Feature" as const,
        properties: { icao: a.icao, name: a.name },
        geometry: {
          type: "Point" as const,
          coordinates: [a.lng, a.lat],
        },
      })),
  };
}

function clearOpenLayers(map: Map) {
  if (map.getLayer(OPEN_LABEL)) map.removeLayer(OPEN_LABEL);
  if (map.getLayer(OPEN_CIRCLE)) map.removeLayer(OPEN_CIRCLE);
  if (map.getSource(OPEN_SRC)) map.removeSource(OPEN_SRC);
}

function upsertOpenLayers(map: Map, airports: AirportStation[]) {
  const data = openAirportsGeoJSON(airports);
  const existing = map.getSource(OPEN_SRC) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(data);
    return;
  }

  map.addSource(OPEN_SRC, { type: "geojson", data });
  map.addLayer({
    id: OPEN_CIRCLE,
    type: "circle",
    source: OPEN_SRC,
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        3,
        4,
        6,
        7,
        9,
        10,
      ],
      "circle-color": "#2dd4bf",
      "circle-opacity": 0.92,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#041016",
    },
  });
  map.addLayer({
    id: OPEN_LABEL,
    type: "symbol",
    source: OPEN_SRC,
    minzoom: 5.5,
    layout: {
      "text-field": ["get", "icao"],
      "text-size": 10,
      "text-offset": [0, 1.15],
      "text-anchor": "top",
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": "#5eead4",
      "text-halo-color": "#07090d",
      "text-halo-width": 1.25,
    },
  });
}

export function VolcanoMap({
  volcanoes,
  airports = [],
  showAirports = true,
  selectedId,
  focusAirportIcao,
  onSelect,
  onSelectAirport,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<MarkerType[]>([]);
  const airportMarkersRef = useRef<MarkerType[]>([]);
  const airportsRef = useRef(airports);
  const onSelectRef = useRef(onSelect);
  const onAirportRef = useRef(onSelectAirport);
  airportsRef.current = airports;
  onSelectRef.current = onSelect;
  onAirportRef.current = onSelectAirport;

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      markersRef.current.forEach((m) => m.remove());
      airportMarkersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      airportMarkersRef.current = [];
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = new MaplibreMap({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [118.0, -2.5],
      zoom: 4.35,
      minZoom: 3,
      maxZoom: 12,
    });

    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;

    const onOpenClick = (e: MapLayerMouseEvent) => {
      const icao = e.features?.[0]?.properties?.icao as string | undefined;
      if (!icao) return;
      const a = airportsRef.current.find((x) => x.icao === icao);
      if (a) onAirportRef.current?.(a);
    };
    const onEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", OPEN_CIRCLE, onOpenClick);
    map.on("mouseenter", OPEN_CIRCLE, onEnter);
    map.on("mouseleave", OPEN_CIRCLE, onLeave);

    return () => {
      map.off("click", OPEN_CIRCLE, onOpenClick);
      map.off("mouseenter", OPEN_CIRCLE, onEnter);
      map.off("mouseleave", OPEN_CIRCLE, onLeave);
      markersRef.current.forEach((m) => m.remove());
      airportMarkersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      airportMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const ordered = [...volcanoes].sort(
      (a, b) => a.activity_level - b.activity_level,
    );

    for (const v of ordered) {
      const el = markerEl(v, v.id === selectedId);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current(v);
      });
      const marker = new Marker({ element: el, anchor: "bottom" })
        .setLngLat([v.lng, v.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [volcanoes, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    airportMarkersRef.current.forEach((m) => m.remove());
    airportMarkersRef.current = [];

    const apply = () => {
      if (!showAirports) {
        clearOpenLayers(map);
        return;
      }

      upsertOpenLayers(map, airports);

      // CLOSED + VA: marker HTML menonjol
      const alerts = airports.filter((a) => a.closed || a.has_va);
      for (const a of alerts) {
        const el = alertAirportEl(a);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onAirportRef.current?.(a);
        });
        const marker = new Marker({ element: el, anchor: "bottom" })
          .setLngLat([a.lng, a.lat])
          .addTo(map);
        airportMarkersRef.current.push(marker);
      }
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [airports, showAirports]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const v = volcanoes.find((x) => x.id === selectedId);
    if (!v) return;
    map.flyTo({
      center: [v.lng, v.lat],
      zoom: Math.max(map.getZoom(), 6.8),
      essential: true,
      speed: 1.2,
    });
  }, [selectedId, volcanoes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusAirportIcao) return;
    const a = airports.find((x) => x.icao === focusAirportIcao);
    if (!a) return;
    map.flyTo({
      center: [a.lng, a.lat],
      zoom: Math.max(map.getZoom(), 7.2),
      essential: true,
      speed: 1.2,
    });
  }, [focusAirportIcao, airports]);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}
