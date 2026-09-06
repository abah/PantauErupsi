"use client";

import { useEffect, useRef } from "react";
import {
  Map as MaplibreMap,
  Marker,
  NavigationControl,
} from "maplibre-gl";
import type { Map, Marker as MarkerType } from "maplibre-gl";
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

function airportEl(a: AirportStation, emphasize: boolean) {
  const status = a.closed ? "CLOSED" : a.has_va ? "OPEN · VA" : "OPEN";
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
    z-index: ${a.closed ? 5 : a.has_va ? 4 : 1};
  `;
  wrap.setAttribute("aria-label", `${a.icao} ${a.name} ${status}`);

  if (emphasize) {
    const label = document.createElement("span");
    label.className = "pe-marker-label";
    label.textContent = `${a.icao}${a.closed ? " ✕" : a.has_va ? " VA" : ""}`;
    wrap.appendChild(label);
  }

  const size = a.closed ? 22 : a.has_va ? 18 : 10;
  const pin = document.createElement("span");
  pin.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border-radius: ${a.closed || a.has_va ? "4px" : "50%"};
    display: grid;
    place-items: center;
    font-size: ${a.closed || a.has_va ? "11px" : "0"};
    font-weight: 800;
    color: ${a.closed ? "#fff" : "#041016"};
    background: ${a.closed ? "#ff1f4b" : a.has_va ? "#e0b84a" : "#2dd4bf"};
    border: 1px solid rgba(255,255,255,${a.closed || a.has_va ? 0.4 : 0.2});
    box-shadow: 0 0 0 ${a.closed ? 6 : 0}px rgba(255,31,75,0.35);
    opacity: ${a.closed || a.has_va ? 1 : 0.75};
  `;
  pin.textContent = a.closed || a.has_va ? "✈" : "";
  wrap.appendChild(pin);
  return wrap;
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
  const onSelectRef = useRef(onSelect);
  const onAirportRef = useRef(onSelectAirport);
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

    return () => {
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

    if (!showAirports) return;

    // Urut: OPEN dulu, lalu VA, CLOSED di atas (ditambahkan terakhir = paling depan)
    const ordered = [...airports].sort((a, b) => {
      const rank = (x: AirportStation) => (x.closed ? 2 : x.has_va ? 1 : 0);
      return rank(a) - rank(b);
    });

    for (const a of ordered) {
      const emphasize = a.closed || a.has_va;
      const el = airportEl(a, emphasize);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onAirportRef.current?.(a);
      });
      const marker = new Marker({ element: el, anchor: "bottom" })
        .setLngLat([a.lng, a.lat])
        .addTo(map);
      airportMarkersRef.current.push(marker);
    }
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
