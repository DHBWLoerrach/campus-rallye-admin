'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import {
  getMapTileConfig,
  MAP_INITIAL_CENTER,
  MAP_MAX_ZOOM,
  MAP_OVERVIEW_ZOOM,
  MAP_TARGET_ZOOM,
} from '@/lib/map-config';

interface GeocachingMapProps {
  targetLatitude?: number;
  targetLongitude?: number;
  proximityRadius?: number;
  disabled?: boolean;
  onTargetChange: (latitude: number, longitude: number) => void;
}

const TARGET_ICON = L.divIcon({
  className: 'geocaching-map-target-icon',
  html: '<span class="geocaching-map-target-marker" aria-hidden="true"></span>',
  iconAnchor: [12, 24],
  iconSize: [24, 24],
});

const getValidPosition = (
  latitude: number | undefined,
  longitude: number | undefined
): L.LatLngTuple | null => {
  if (
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return [latitude, longitude];
};

const isValidRadius = (radius: number | undefined): radius is number =>
  typeof radius === 'number' && Number.isInteger(radius) && radius > 0;

const getMapColor = () =>
  getComputedStyle(document.documentElement)
    .getPropertyValue('--dhbw-500')
    .trim() || '#e2001a';

export default function GeocachingMap({
  targetLatitude,
  targetLongitude,
  proximityRadius,
  disabled = false,
  onTargetChange,
}: GeocachingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const markerDragHandlerRef = useRef<(() => void) | null>(null);
  const onTargetChangeRef = useRef(onTargetChange);
  const radiusRef = useRef(proximityRadius);
  const disabledRef = useRef(disabled);
  const initialTargetRef = useRef({
    latitude: targetLatitude,
    longitude: targetLongitude,
  });
  const initiallyHasTarget =
    getValidPosition(targetLatitude, targetLongitude) !== null;
  const hasSelectedTargetRef = useRef(initiallyHasTarget);
  const controlledHasTargetRef = useRef(initiallyHasTarget);
  const [tileConfig] = useState(getMapTileConfig);
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    onTargetChangeRef.current = onTargetChange;
  }, [onTargetChange]);

  useEffect(() => {
    radiusRef.current = proximityRadius;
  }, [proximityRadius]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const removeMarker = useCallback(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (map && marker) {
      if (markerDragHandlerRef.current) {
        marker.off('dragend', markerDragHandlerRef.current);
      }
      map.removeLayer(marker);
      markerRef.current = null;
    }
  }, []);

  const removeCircle = useCallback(() => {
    const map = mapRef.current;
    const circle = circleRef.current;
    if (map && circle) {
      map.removeLayer(circle);
      circleRef.current = null;
    }
  }, []);

  const syncGeometry = useCallback(
    (
      latitude: number | undefined,
      longitude: number | undefined,
      radius: number | undefined,
      focusNewTarget: boolean
    ) => {
      const map = mapRef.current;
      const position = getValidPosition(latitude, longitude);
      if (!map || !position) {
        removeCircle();
        removeMarker();
        return;
      }

      let marker = markerRef.current;
      if (!marker) {
        marker = L.marker(position, {
          alt: 'Zielort der Geocaching-Frage',
          draggable: !disabledRef.current,
          icon: TARGET_ICON,
          keyboard: true,
        }).addTo(map);
        if (markerDragHandlerRef.current) {
          marker.on('dragend', markerDragHandlerRef.current);
        }
        markerRef.current = marker;
      } else {
        marker.setLatLng(position);
      }

      if (disabledRef.current) {
        marker.dragging?.disable();
      } else {
        marker.dragging?.enable();
      }

      if (isValidRadius(radius)) {
        const circle = circleRef.current;
        if (circle) {
          circle.setLatLng(position);
          circle.setRadius(radius);
        } else {
          circleRef.current = L.circle(position, {
            color: getMapColor(),
            fillColor: getMapColor(),
            fillOpacity: 0.12,
            radius,
            weight: 2,
          }).addTo(map);
        }
      } else {
        removeCircle();
      }

      if (focusNewTarget && !hasSelectedTargetRef.current) {
        map.setView(position, MAP_TARGET_ZOOM);
        hasSelectedTargetRef.current = true;
      } else if (!map.getBounds().contains(position)) {
        map.panInside(position);
      }
    },
    [removeCircle, removeMarker]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) {
      return;
    }

    const { latitude: initialLatitude, longitude: initialLongitude } =
      initialTargetRef.current;
    const initialPosition = getValidPosition(initialLatitude, initialLongitude);
    const initialCenter: L.LatLngExpression = initialPosition ?? [
      ...MAP_INITIAL_CENTER,
    ];
    const map = L.map(container, {
      center: initialCenter,
      zoom: initialPosition ? MAP_TARGET_ZOOM : MAP_OVERVIEW_ZOOM,
    });
    mapRef.current = map;

    const handleTileError = () => setTileError(true);
    const handleTileLoad = () => setTileError(false);
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: MAP_MAX_ZOOM,
    });
    tileLayer.on('tileerror', handleTileError);
    tileLayer.on('load', handleTileLoad);
    tileLayer.addTo(map);

    const handleMarkerDragEnd = () => {
      const marker = markerRef.current;
      if (!marker || disabledRef.current) {
        return;
      }
      const position = marker.getLatLng();
      syncGeometry(position.lat, position.lng, radiusRef.current, false);
      onTargetChangeRef.current(position.lat, position.lng);
    };
    markerDragHandlerRef.current = handleMarkerDragEnd;

    const handleMapClick = (event: L.LeafletMouseEvent) => {
      if (disabledRef.current) {
        return;
      }
      syncGeometry(event.latlng.lat, event.latlng.lng, radiusRef.current, true);
      onTargetChangeRef.current(event.latlng.lat, event.latlng.lng);
    };
    map.on('click', handleMapClick);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      map.off('click', handleMapClick);
      tileLayer.off('tileerror', handleTileError);
      tileLayer.off('load', handleTileLoad);
      removeCircle();
      removeMarker();
      markerDragHandlerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [removeCircle, removeMarker, syncGeometry, tileConfig]);

  useEffect(() => {
    const hasTarget =
      getValidPosition(targetLatitude, targetLongitude) !== null;
    const shouldFocusNewTarget =
      hasTarget &&
      !controlledHasTargetRef.current &&
      !hasSelectedTargetRef.current;
    syncGeometry(
      targetLatitude,
      targetLongitude,
      proximityRadius,
      shouldFocusNewTarget
    );
    controlledHasTargetRef.current = hasTarget;
  }, [
    disabled,
    proximityRadius,
    syncGeometry,
    targetLatitude,
    targetLongitude,
  ]);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        className="geocaching-map border border-border"
        aria-label="Zielort auf der Karte auswählen"
      />
      {tileConfig.warning ? (
        <p className="text-xs text-muted-foreground" role="status">
          {tileConfig.warning}
        </p>
      ) : null}
      {tileError ? (
        <p className="text-xs text-destructive" role="status">
          Die Kartenkacheln konnten nicht geladen werden. Die Koordinatenfelder
          bleiben nutzbar.
        </p>
      ) : null}
    </div>
  );
}
