import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getMapTileConfig,
  OSM_TILE_ATTRIBUTION,
  OSM_TILE_URL,
  PARTIAL_MAP_CONFIG_WARNING,
} from './map-config';

describe('getMapTileConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the complete OpenStreetMap fallback by default', () => {
    vi.stubEnv('NEXT_PUBLIC_MAP_TILE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_MAP_TILE_ATTRIBUTION', '');

    expect(getMapTileConfig()).toEqual({
      url: OSM_TILE_URL,
      attribution: OSM_TILE_ATTRIBUTION,
      warning: undefined,
    });
    expect(OSM_TILE_ATTRIBUTION).toContain(
      '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    );
  });

  it('uses a complete custom provider pair without surrounding whitespace', () => {
    vi.stubEnv(
      'NEXT_PUBLIC_MAP_TILE_URL',
      '  https://tiles.test/{z}/{x}/{y}  '
    );
    vi.stubEnv(
      'NEXT_PUBLIC_MAP_TILE_ATTRIBUTION',
      '  <a href="https://tiles.test/licence">Test Tiles</a>  '
    );

    expect(getMapTileConfig()).toEqual({
      url: 'https://tiles.test/{z}/{x}/{y}',
      attribution: '<a href="https://tiles.test/licence">Test Tiles</a>',
    });
  });

  it.each([
    {
      attribution: '',
      name: 'URL only',
      url: 'https://tiles.test/{z}/{x}/{y}',
    },
    {
      attribution: '<a href="https://tiles.test/licence">Test Tiles</a>',
      name: 'attribution only',
      url: '',
    },
  ])(
    'falls back atomically for $name configuration',
    ({ attribution, url }) => {
      vi.stubEnv('NEXT_PUBLIC_MAP_TILE_URL', url);
      vi.stubEnv('NEXT_PUBLIC_MAP_TILE_ATTRIBUTION', attribution);

      expect(getMapTileConfig()).toEqual({
        url: OSM_TILE_URL,
        attribution: OSM_TILE_ATTRIBUTION,
        warning: PARTIAL_MAP_CONFIG_WARNING,
      });
    }
  );
});
