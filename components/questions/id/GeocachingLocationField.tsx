'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const GeocachingMap = dynamic(() => import('./GeocachingMap'), {
  ssr: false,
  loading: () => (
    <div
      className="geocaching-map grid place-items-center border border-border bg-muted text-sm text-muted-foreground"
      role="status"
    >
      Karte wird geladen …
    </div>
  ),
});

export interface GeocachingLocationValue {
  target_latitude?: number;
  target_longitude?: number;
  proximity_radius?: number;
}

interface GeocachingLocationFieldProps {
  value: GeocachingLocationValue;
  errors?: Partial<Record<keyof GeocachingLocationValue, string>>;
  disabled?: boolean;
  onChange: (value: GeocachingLocationValue) => void;
}

type LocationKey = keyof GeocachingLocationValue;

const COORDINATE_PATTERN = /^[+-]?\d+(?:[.,]\d+)?$/;
const RADIUS_PATTERN = /^\d+$/;

const parseCoordinate = (
  draft: string,
  minimum: number,
  maximum: number
): number | undefined => {
  const trimmed = draft.trim();
  if (!COORDINATE_PATTERN.test(trimmed)) {
    return undefined;
  }

  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : undefined;
};

const parseRadius = (draft: string): number | undefined => {
  const trimmed = draft.trim();
  if (!RADIUS_PATTERN.test(trimmed)) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const formatCoordinate = (value: number | undefined) =>
  value === undefined ? '' : value.toFixed(6);

export default function GeocachingLocationField({
  value,
  errors = {},
  disabled = false,
  onChange,
}: GeocachingLocationFieldProps) {
  const [latitudeDraft, setLatitudeDraft] = useState(() =>
    formatCoordinate(value.target_latitude)
  );
  const [longitudeDraft, setLongitudeDraft] = useState(() =>
    formatCoordinate(value.target_longitude)
  );
  const [radiusDraft, setRadiusDraft] = useState(() =>
    String(value.proximity_radius ?? 10)
  );
  const lastEmittedRef = useRef<GeocachingLocationValue>({ ...value });

  useEffect(() => {
    if (
      !Object.is(value.target_latitude, lastEmittedRef.current.target_latitude)
    ) {
      setLatitudeDraft(formatCoordinate(value.target_latitude));
    }
    lastEmittedRef.current.target_latitude = value.target_latitude;
  }, [value.target_latitude]);

  useEffect(() => {
    if (
      !Object.is(
        value.target_longitude,
        lastEmittedRef.current.target_longitude
      )
    ) {
      setLongitudeDraft(formatCoordinate(value.target_longitude));
    }
    lastEmittedRef.current.target_longitude = value.target_longitude;
  }, [value.target_longitude]);

  useEffect(() => {
    if (
      !Object.is(
        value.proximity_radius,
        lastEmittedRef.current.proximity_radius
      )
    ) {
      setRadiusDraft(
        value.proximity_radius === undefined
          ? ''
          : String(value.proximity_radius)
      );
    }
    lastEmittedRef.current.proximity_radius = value.proximity_radius;
  }, [value.proximity_radius]);

  const emitField = (key: LocationKey, nextValue: number | undefined) => {
    lastEmittedRef.current[key] = nextValue;
    onChange({ ...value, [key]: nextValue });
  };

  const handleMapTargetChange = (latitude: number, longitude: number) => {
    setLatitudeDraft(latitude.toFixed(6));
    setLongitudeDraft(longitude.toFixed(6));
    lastEmittedRef.current.target_latitude = latitude;
    lastEmittedRef.current.target_longitude = longitude;
    onChange({
      ...value,
      target_latitude: latitude,
      target_longitude: longitude,
    });
  };

  const radius = parseRadius(radiusDraft);
  const radiusGuidance =
    radius !== undefined && radius < 10
      ? 'Unter 10 Metern kann die GPS-Genauigkeit das zuverlässige Freischalten verhindern.'
      : radius !== undefined && radius > 1000
        ? 'Dieser Radius ist für ein Campus-Ziel ungewöhnlich groß.'
        : null;

  const renderError = (key: LocationKey) => {
    const error = errors[key];
    return error ? (
      <p id={`geocaching-${key}-error`} className="text-xs text-destructive">
        {error}
      </p>
    ) : null;
  };

  const describedBy = (key: LocationKey, descriptionId?: string) =>
    [descriptionId, errors[key] ? `geocaching-${key}-error` : undefined]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <fieldset className="flex flex-col gap-4" disabled={disabled}>
      <legend className="sr-only">Zielkoordinaten und Näherungsradius</legend>
      <p className="text-sm text-muted-foreground">
        Klicken Sie auf die Karte oder ziehen Sie den Zielmarker. Der Kreis
        zeigt, wo die Antwort freigeschaltet wird.
      </p>

      <GeocachingMap
        targetLatitude={value.target_latitude}
        targetLongitude={value.target_longitude}
        proximityRadius={value.proximity_radius}
        disabled={disabled}
        onTargetChange={handleMapTargetChange}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="geocaching-target-latitude">Breitengrad*</Label>
          <Input
            id="geocaching-target-latitude"
            type="text"
            inputMode="decimal"
            value={latitudeDraft}
            disabled={disabled}
            aria-invalid={Boolean(errors.target_latitude)}
            aria-describedby={describedBy('target_latitude')}
            onChange={(event) => {
              const draft = event.target.value;
              setLatitudeDraft(draft);
              emitField('target_latitude', parseCoordinate(draft, -90, 90));
            }}
          />
          {renderError('target_latitude')}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="geocaching-target-longitude">Längengrad*</Label>
          <Input
            id="geocaching-target-longitude"
            type="text"
            inputMode="decimal"
            value={longitudeDraft}
            disabled={disabled}
            aria-invalid={Boolean(errors.target_longitude)}
            aria-describedby={describedBy('target_longitude')}
            onChange={(event) => {
              const draft = event.target.value;
              setLongitudeDraft(draft);
              emitField('target_longitude', parseCoordinate(draft, -180, 180));
            }}
          />
          {renderError('target_longitude')}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="geocaching-proximity-radius">Näherungsradius*</Label>
          <Input
            id="geocaching-proximity-radius"
            type="text"
            inputMode="numeric"
            value={radiusDraft}
            disabled={disabled}
            aria-invalid={Boolean(errors.proximity_radius)}
            aria-describedby={describedBy(
              'proximity_radius',
              'geocaching-radius-description'
            )}
            onChange={(event) => {
              const draft = event.target.value;
              setRadiusDraft(draft);
              emitField('proximity_radius', parseRadius(draft));
            }}
          />
          <p
            id="geocaching-radius-description"
            className="text-xs text-muted-foreground"
          >
            Angabe in Metern.
          </p>
          {renderError('proximity_radius')}
        </div>
      </div>

      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        {radiusGuidance ? <p role="status">{radiusGuidance}</p> : null}
        <p>In Gebäuden kann der GPS-Empfang ungenauer sein.</p>
      </div>
    </fieldset>
  );
}
