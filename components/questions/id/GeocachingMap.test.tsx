import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GeocachingMap from './GeocachingMap';
import {
  MAP_MAX_ZOOM,
  OSM_TILE_ATTRIBUTION,
  OSM_TILE_URL,
  PARTIAL_MAP_CONFIG_WARNING,
} from '@/lib/map-config';

const leaflet = vi.hoisted(() => ({
  circles: [] as Array<Record<string, unknown>>,
  circleFactory: vi.fn(),
  divIcon: vi.fn((options) => options),
  mapFactory: vi.fn(),
  maps: [] as Array<Record<string, unknown>>,
  markerFactory: vi.fn(),
  markers: [] as Array<Record<string, unknown>>,
  tileFactory: vi.fn(),
  tiles: [] as Array<Record<string, unknown>>,
}));

vi.mock('leaflet', () => ({
  circle: leaflet.circleFactory,
  divIcon: leaflet.divIcon,
  map: leaflet.mapFactory,
  marker: leaflet.markerFactory,
  tileLayer: leaflet.tileFactory,
}));

const createEventedLayer = () => {
  const handlers: Record<string, (...args: never[]) => void> = {};
  return {
    handlers,
    addTo: vi.fn(function (this: unknown) {
      return this;
    }),
    off: vi.fn((event: string) => {
      delete handlers[event];
    }),
    on: vi.fn((event: string, handler: (...args: never[]) => void) => {
      handlers[event] = handler;
    }),
  };
};

describe('GeocachingMap', () => {
  let resizeCallback: ResizeObserverCallback;
  let resizeDisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    leaflet.maps.length = 0;
    leaflet.markers.length = 0;
    leaflet.circles.length = 0;
    leaflet.tiles.length = 0;

    leaflet.mapFactory.mockImplementation((_container, options) => {
      const handlers: Record<string, (...args: never[]) => void> = {};
      const boundsContains = vi.fn(() => true);
      const map = {
        handlers,
        options,
        getBounds: vi.fn(() => ({ contains: boundsContains })),
        invalidateSize: vi.fn(),
        off: vi.fn((event: string) => {
          delete handlers[event];
        }),
        on: vi.fn((event: string, handler: (...args: never[]) => void) => {
          handlers[event] = handler;
        }),
        panInside: vi.fn(),
        remove: vi.fn(),
        removeLayer: vi.fn(),
        setView: vi.fn(),
      };
      leaflet.maps.push(map);
      return map;
    });

    leaflet.markerFactory.mockImplementation((position, options) => {
      const layer = createEventedLayer();
      const marker = {
        ...layer,
        options,
        position,
        dragging: { disable: vi.fn(), enable: vi.fn() },
        getLatLng: vi.fn(() => ({ lat: 47.62, lng: 7.67 })),
        setLatLng: vi.fn(),
      };
      leaflet.markers.push(marker);
      return marker;
    });

    leaflet.circleFactory.mockImplementation((position, options) => {
      const layer = createEventedLayer();
      const circle = {
        ...layer,
        options,
        position,
        setLatLng: vi.fn(),
        setRadius: vi.fn(),
      };
      leaflet.circles.push(circle);
      return circle;
    });

    leaflet.tileFactory.mockImplementation((_url, options) => {
      const tile = { ...createEventedLayer(), options };
      leaflet.tiles.push(tile);
      return tile;
    });

    resizeDisconnect = vi.fn();
    class MockResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }
      observe = vi.fn();
      disconnect = resizeDisconnect;
      unobserve = vi.fn();
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('initializes one map and an attributed OpenStreetMap tile layer', () => {
    render(<GeocachingMap onTargetChange={vi.fn()} />);

    expect(leaflet.mapFactory).toHaveBeenCalledTimes(1);
    expect(leaflet.tileFactory).toHaveBeenCalledWith(OSM_TILE_URL, {
      attribution: OSM_TILE_ATTRIBUTION,
      maxZoom: MAP_MAX_ZOOM,
    });
    expect(OSM_TILE_ATTRIBUTION).toContain(
      '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    );
  });

  it('warns about partial provider configuration and keeps the OSM pair', () => {
    vi.stubEnv('NEXT_PUBLIC_MAP_TILE_URL', 'https://tiles.test/{z}/{x}/{y}');

    render(<GeocachingMap onTargetChange={vi.fn()} />);

    expect(screen.getByText(PARTIAL_MAP_CONFIG_WARNING)).toBeInTheDocument();
    expect(leaflet.tileFactory).toHaveBeenCalledWith(OSM_TILE_URL, {
      attribution: OSM_TILE_ATTRIBUTION,
      maxZoom: MAP_MAX_ZOOM,
    });
  });

  it('creates a draggable marker and metre circle for an existing target', () => {
    render(
      <GeocachingMap
        targetLatitude={47.615123}
        targetLongitude={7.664321}
        proximityRadius={15}
        onTargetChange={vi.fn()}
      />
    );

    expect(leaflet.markerFactory).toHaveBeenCalledWith(
      [47.615123, 7.664321],
      expect.objectContaining({
        alt: 'Zielort der Geocaching-Frage',
        draggable: true,
      })
    );
    expect(leaflet.circleFactory).toHaveBeenCalledWith(
      [47.615123, 7.664321],
      expect.objectContaining({ radius: 15 })
    );
  });

  it('creates geometry and emits coordinates on map click', () => {
    const onTargetChange = vi.fn();
    render(
      <GeocachingMap proximityRadius={10} onTargetChange={onTargetChange} />
    );
    const map = leaflet.maps[0] as {
      handlers: Record<string, (event: unknown) => void>;
      setView: ReturnType<typeof vi.fn>;
    };

    act(() => {
      map.handlers.click({ latlng: { lat: 47.61, lng: 7.66 } });
    });

    expect(leaflet.markerFactory).toHaveBeenCalled();
    expect(leaflet.circleFactory).toHaveBeenCalledWith(
      [47.61, 7.66],
      expect.objectContaining({ radius: 10 })
    );
    expect(map.setView).toHaveBeenCalledWith([47.61, 7.66], 18);
    expect(onTargetChange).toHaveBeenCalledWith(47.61, 7.66);
  });

  it('moves the circle and emits coordinates after marker drag', () => {
    const onTargetChange = vi.fn();
    render(
      <GeocachingMap
        targetLatitude={47.61}
        targetLongitude={7.66}
        proximityRadius={10}
        onTargetChange={onTargetChange}
      />
    );
    const marker = leaflet.markers[0] as {
      handlers: Record<string, () => void>;
    };
    const circle = leaflet.circles[0] as {
      setLatLng: ReturnType<typeof vi.fn>;
    };

    act(() => marker.handlers.dragend());

    expect(circle.setLatLng).toHaveBeenCalledWith([47.62, 7.67]);
    expect(onTargetChange).toHaveBeenCalledWith(47.62, 7.67);
  });

  it('updates controlled coordinates and radius in metres', () => {
    const { rerender } = render(
      <GeocachingMap
        targetLatitude={47.61}
        targetLongitude={7.66}
        proximityRadius={10}
        onTargetChange={vi.fn()}
      />
    );
    const marker = leaflet.markers[0] as {
      setLatLng: ReturnType<typeof vi.fn>;
    };
    const circle = leaflet.circles[0] as {
      setLatLng: ReturnType<typeof vi.fn>;
      setRadius: ReturnType<typeof vi.fn>;
    };

    rerender(
      <GeocachingMap
        targetLatitude={47.62}
        targetLongitude={7.67}
        proximityRadius={25}
        onTargetChange={vi.fn()}
      />
    );

    expect(marker.setLatLng).toHaveBeenLastCalledWith([47.62, 7.67]);
    expect(circle.setLatLng).toHaveBeenLastCalledWith([47.62, 7.67]);
    expect(circle.setRadius).toHaveBeenLastCalledWith(25);
    expect(leaflet.mapFactory).toHaveBeenCalledTimes(1);
  });

  it('zooms to the first target entered through controlled fields', () => {
    const { rerender } = render(
      <GeocachingMap proximityRadius={10} onTargetChange={vi.fn()} />
    );
    const map = leaflet.maps[0] as {
      setView: ReturnType<typeof vi.fn>;
    };

    rerender(
      <GeocachingMap
        targetLatitude={47.62}
        targetLongitude={7.67}
        proximityRadius={10}
        onTargetChange={vi.fn()}
      />
    );

    expect(map.setView).toHaveBeenCalledWith([47.62, 7.67], 18);
  });

  it('removes stale geometry and recreates it when coordinates return', () => {
    const { rerender } = render(
      <GeocachingMap
        targetLatitude={47.61}
        targetLongitude={7.66}
        proximityRadius={10}
        onTargetChange={vi.fn()}
      />
    );
    const map = leaflet.maps[0] as {
      removeLayer: ReturnType<typeof vi.fn>;
    };
    const marker = leaflet.markers[0];
    const circle = leaflet.circles[0];

    rerender(
      <GeocachingMap
        targetLatitude={undefined}
        targetLongitude={7.66}
        proximityRadius={10}
        onTargetChange={vi.fn()}
      />
    );

    expect(map.removeLayer).toHaveBeenCalledWith(marker);
    expect(map.removeLayer).toHaveBeenCalledWith(circle);

    rerender(
      <GeocachingMap
        targetLatitude={47.62}
        targetLongitude={7.67}
        proximityRadius={10}
        onTargetChange={vi.fn()}
      />
    );
    expect(leaflet.markers).toHaveLength(2);
    expect(leaflet.circles).toHaveLength(2);
  });

  it('removes only the circle for an invalid controlled radius', () => {
    const { rerender } = render(
      <GeocachingMap
        targetLatitude={47.61}
        targetLongitude={7.66}
        proximityRadius={10}
        onTargetChange={vi.fn()}
      />
    );
    const map = leaflet.maps[0] as {
      removeLayer: ReturnType<typeof vi.fn>;
    };
    const marker = leaflet.markers[0];
    const circle = leaflet.circles[0];

    rerender(
      <GeocachingMap
        targetLatitude={47.61}
        targetLongitude={7.66}
        proximityRadius={undefined}
        onTargetChange={vi.fn()}
      />
    );

    expect(map.removeLayer).toHaveBeenCalledWith(circle);
    expect(map.removeLayer).not.toHaveBeenCalledWith(marker);
  });

  it('invalidates size through ResizeObserver and cleans up once', () => {
    const { unmount } = render(<GeocachingMap onTargetChange={vi.fn()} />);
    const map = leaflet.maps[0] as {
      invalidateSize: ReturnType<typeof vi.fn>;
      off: ReturnType<typeof vi.fn>;
      remove: ReturnType<typeof vi.fn>;
    };

    act(() => resizeCallback([], {} as ResizeObserver));
    expect(map.invalidateSize).toHaveBeenCalledWith({ pan: false });

    unmount();
    expect(map.off).toHaveBeenCalledWith('click', expect.any(Function));
    expect(resizeDisconnect).toHaveBeenCalledTimes(1);
    expect(map.remove).toHaveBeenCalledTimes(1);
  });

  it('shows a non-blocking status when tiles fail', () => {
    render(<GeocachingMap onTargetChange={vi.fn()} />);
    const tile = leaflet.tiles[0] as {
      handlers: Record<string, () => void>;
    };

    act(() => tile.handlers.tileerror());

    expect(
      screen.getByText(/Kartenkacheln konnten nicht geladen werden/)
    ).toBeInTheDocument();
  });
});
