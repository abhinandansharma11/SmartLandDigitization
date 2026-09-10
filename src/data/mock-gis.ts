// ==========================================
// BhoomiAI - Mock GIS Data (GeoJSON)
// ==========================================

import { GeoJSONFeatureCollection, MapLayer } from '../types/gis';

// Parcels around Amethi, UP area (~26.15°N, 81.8°E)
export const MOCK_PARCELS: GeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'parcel-001',
        khasraNumber: '125/2',
        surveyNumber: '125/2',
        area: '2.5 Acres',
        owner: 'Ram Kumar',
        village: 'Rampur',
        tehsil: 'Gauriganj',
        district: 'Amethi',
        landType: 'Agricultural',
        verificationStatus: 'Verified',
        recordId: 'lr-001',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [81.800, 26.152],
          [81.804, 26.152],
          [81.804, 26.156],
          [81.800, 26.156],
          [81.800, 26.152],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'parcel-002',
        khasraNumber: '130/1',
        surveyNumber: '130/1',
        area: '1.8 Acres',
        owner: 'Sita Devi',
        village: 'Rampur',
        tehsil: 'Gauriganj',
        district: 'Amethi',
        landType: 'Agricultural',
        verificationStatus: 'Verified',
        recordId: 'lr-002',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [81.804, 26.152],
          [81.807, 26.152],
          [81.807, 26.155],
          [81.804, 26.155],
          [81.804, 26.152],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'parcel-003',
        khasraNumber: '142/3',
        surveyNumber: '142/3',
        area: '3.2 Acres',
        owner: 'Rajendra Prasad',
        village: 'Semrauta',
        tehsil: 'Gauriganj',
        district: 'Amethi',
        landType: 'Agricultural',
        verificationStatus: 'Pending Verification',
        recordId: 'lr-003',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [81.808, 26.148],
          [81.814, 26.148],
          [81.814, 26.153],
          [81.808, 26.153],
          [81.808, 26.148],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'parcel-004',
        khasraNumber: '156/1',
        surveyNumber: '156/1',
        area: '0.75 Acres',
        owner: 'Geeta Singh',
        village: 'Dharmapur',
        tehsil: 'Gauriganj',
        district: 'Amethi',
        landType: 'Residential',
        verificationStatus: 'Under Review',
        recordId: 'lr-004',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [81.795, 26.158],
          [81.798, 26.158],
          [81.798, 26.160],
          [81.795, 26.160],
          [81.795, 26.158],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'parcel-005',
        khasraNumber: '78/2',
        surveyNumber: '78/2',
        area: '4.1 Acres',
        owner: 'Lakshmi Narayan',
        village: 'Bahadurpur',
        tehsil: 'Gauriganj',
        district: 'Amethi',
        landType: 'Agricultural',
        verificationStatus: 'Validated',
        recordId: 'lr-007',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [81.790, 26.145],
          [81.796, 26.145],
          [81.796, 26.150],
          [81.790, 26.150],
          [81.790, 26.145],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'parcel-006',
        khasraNumber: '310/5',
        surveyNumber: '310/5',
        area: '2.0 Acres',
        owner: 'Parvati Kumari',
        village: 'Sujanpur',
        tehsil: 'Gauriganj',
        district: 'Amethi',
        landType: 'Agricultural',
        verificationStatus: 'Correction Needed',
        recordId: 'lr-008',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [81.812, 26.156],
          [81.816, 26.156],
          [81.816, 26.160],
          [81.812, 26.160],
          [81.812, 26.156],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'parcel-007',
        khasraNumber: '201/1',
        surveyNumber: '201/1',
        area: '1.2 Acres',
        owner: 'Abdul Rashid',
        village: 'Tiloi',
        tehsil: 'Musafirkhana',
        district: 'Amethi',
        landType: 'Commercial',
        verificationStatus: 'Rejected',
        recordId: 'lr-006',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [81.820, 26.140],
          [81.823, 26.140],
          [81.823, 26.143],
          [81.820, 26.143],
          [81.820, 26.140],
        ]],
      },
    },
  ],
};

export const MOCK_MAP_LAYERS: MapLayer[] = [
  { id: 'parcels', name: 'Cadastral Parcels', type: 'parcels', visible: true, color: '#3b82f6', opacity: 0.6 },
  { id: 'boundaries', name: 'Village Boundaries', type: 'boundaries', visible: true, color: '#6d28d9', opacity: 0.4 },
  { id: 'roads', name: 'Roads', type: 'roads', visible: false, color: '#94a3b8', opacity: 0.5 },
  { id: 'rivers', name: 'Rivers & Water Bodies', type: 'rivers', visible: false, color: '#0ea5e9', opacity: 0.5 },
  { id: 'settlements', name: 'Settlements', type: 'settlements', visible: false, color: '#f59e0b', opacity: 0.4 },
];

export const AMETHI_CENTER: [number, number] = [26.152, 81.804];
export const DEFAULT_ZOOM = 14;
