"use client";

import { useEffect, useRef, useState } from "react";
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

/** Marker bandara — selalu ada ikon pesawat yang terlihat. */
function airportEl(a: AirportStation, showLabel: boolean) {
  const kind = a.closed ? "closed" : a.has_va ? "va" : "open";
  const bg =
    kind === "closed" ? "#ff1f4b" : kind === "va" ? "#e0b84a" : "#2dd4bf";
  const fg = kind === "closed" ? "#fff" : "#041016";
  const size = kind === "closed" ? 28 : kind === "va" ? 24 : 18;

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
    z-index: ${kind === "closed" ? 6 : kind === "va" ? 5 : 3};
  `;
  wrap.setAttribute(
    "aria-label",
    `${a.icao} ${a.name} ${kind === "closed" ? "CLOSED" : kind === "va" ? "OPEN VA" : "OPEN"}`,
  );

  if (showLabel) {
    const label = document.createElement("span");
    label.className = "pe-marker-label";
    label.textContent =
      kind === "closed" ? `${a.icao} ✕` : kind === "va" ? `${a.icao} VA` : a.icao;
    wrap.appendChild(label);
  }

  const pin = document.createElement("span");
  pin.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border-radius: 5px;
    display: grid;
    place-items: center;
    font-size: ${kind === "open" ? 11 : 13}px;
    font-weight: 800;
    line-height: 1;
    color: ${fg};
    background: ${bg};
    border: 2px solid rgba(255,255,255,0.55);
    box-shadow: 0 2px 8px rgba(0,0,0,0.45)${
      kind === "closed" ? ", 0 0 0 5px rgba(255,31,75,0.35)" : ""
    };
  `;
  pin.textContent = "✈";
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
  const [mapReady, setMapReady] = useState(false);
  const [labelOpenAirports, setLabelOpenAirports] = useState(false);

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

    setMapReady(false);
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

    const markReady = () => {
      setMapReady(true);
      setLabelOpenAirports(map.getZoom() >= 5.8);
    };
    if (map.loaded()) markReady();
    else map.once("load", markReady);

    const onZoom = () => setLabelOpenAirports(map.getZoom() >= 5.8);
    map.on("zoomend", onZoom);

    return () => {
      map.off("zoomend", onZoom);
      markersRef.current.forEach((m) => m.remove());
      airportMarkersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      airportMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

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
  }, [volcanoes, selectedId, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    airportMarkersRef.current.forEach((m) => m.remove());
    airportMarkersRef.current = [];

    if (!showAirports || airports.length === 0) return;

    // CLOSED/VA selalu berlabel; OPEN berlabel saat zoom dekat
    const ordered = [...airports].sort((a, b) => {
      const rank = (x: AirportStation) => (x.closed ? 2 : x.has_va ? 1 : 0);
      return rank(a) - rank(b);
    });

    for (const a of ordered) {
      if (
        !Number.isFinite(a.lat) ||
        !Number.isFinite(a.lng) ||
        (a.lat === 0 && a.lng === 0)
      ) {
        continue;
      }
      const showLabel = a.closed || a.has_va || labelOpenAirports;
      const el = airportEl(a, showLabel);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onAirportRef.current?.(a);
      });
      const marker = new Marker({ element: el, anchor: "bottom" })
        .setLngLat([a.lng, a.lat])
        .addTo(map);
      airportMarkersRef.current.push(marker);
    }
  }, [airports, showAirports, mapReady, labelOpenAirports]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedId) return;
    const v = volcanoes.find((x) => x.id === selectedId);
    if (!v) return;
    map.flyTo({
      center: [v.lng, v.lat],
      zoom: Math.max(map.getZoom(), 6.8),
      essential: true,
      speed: 1.2,
    });
  }, [selectedId, volcanoes, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !focusAirportIcao) return;
    const a = airports.find((x) => x.icao === focusAirportIcao);
    if (!a) return;
    map.flyTo({
      center: [a.lng, a.lat],
      zoom: Math.max(map.getZoom(), 7.2),
      essential: true,
      speed: 1.2,
    });
  }, [focusAirportIcao, airports, mapReady]);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}
