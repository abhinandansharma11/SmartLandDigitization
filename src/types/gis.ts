// ==========================================
// BhoomiAI - GIS / Map Types
// ==========================================

export interface GeoJSONFeature {
  type: 'Feature';
  properties: ParcelProperties;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface ParcelProperties {
  id: string;
  khasraNumber: string;
  surveyNumber: string;
  area: string;
  owner: string;
  village: string;
  tehsil: string;
  district: string;
  landType: string;
  verificationStatus: string;
  recordId?: string;
}

export interface MapLayer {
  id: string;
  name: string;
  type: 'parcels' | 'boundaries' | 'roads' | 'rivers' | 'settlements';
  visible: boolean;
  color: string;
  opacity: number;
}

export interface MapViewState {
  center: [number, number];
  zoom: number;
  selectedParcelId: string | null;
}
