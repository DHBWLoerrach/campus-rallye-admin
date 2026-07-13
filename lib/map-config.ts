export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const MAP_MAX_ZOOM = 19;
export const MAP_INITIAL_CENTER = [47.6152, 7.6641] as const;
export const MAP_OVERVIEW_ZOOM = 16;
export const MAP_TARGET_ZOOM = 18;

export const PARTIAL_MAP_CONFIG_WARNING =
  'Die Kartenkonfiguration ist unvollständig. Es wird OpenStreetMap verwendet.';

export interface MapTileConfig {
  url: string;
  attribution: string;
  warning?: string;
}

export function getMapTileConfig(): MapTileConfig {
  const customUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL;
  const customAttribution = process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION;
  const trimmedCustomUrl = customUrl?.trim();
  const trimmedCustomAttribution = customAttribution?.trim();
  const hasCustomUrl = Boolean(trimmedCustomUrl);
  const hasCustomAttribution = Boolean(trimmedCustomAttribution);

  if (trimmedCustomUrl && trimmedCustomAttribution) {
    return {
      url: trimmedCustomUrl,
      attribution: trimmedCustomAttribution,
    };
  }

  return {
    url: OSM_TILE_URL,
    attribution: OSM_TILE_ATTRIBUTION,
    warning:
      hasCustomUrl || hasCustomAttribution
        ? PARTIAL_MAP_CONFIG_WARNING
        : undefined,
  };
}
