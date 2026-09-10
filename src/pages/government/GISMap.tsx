// ==========================================
// BhoomiAI - GIS / Map Module
// ==========================================

import React, { useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { MOCK_PARCELS, MOCK_MAP_LAYERS, AMETHI_CENTER, DEFAULT_ZOOM } from '../../data/mock-gis';
import { ParcelProperties } from '../../types/gis';
import { Button, Badge, StatusBadge, SearchInput } from '../../components/ui';
import { Map, Layers, Search, Eye, ExternalLink, X } from 'lucide-react';

// Fix Leaflet default icon paths for Vite bundler
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const GISMap: React.FC = () => {
  const [selectedParcel, setSelectedParcel] = useState<ParcelProperties | null>(null);
  const [layers, setLayers] = useState(MOCK_MAP_LAYERS);
  const [showLayers, setShowLayers] = useState(false);
  const [search, setSearch] = useState('');

  const getParcelColor = (status: string) => {
    switch (status) {
      case 'Verified': return '#16a34a';
      case 'Pending Verification': return '#d97706';
      case 'Under Review': return '#3b82f6';
      case 'Rejected': return '#dc2626';
      case 'Validated': return '#22c55e';
      case 'Correction Needed': return '#f97316';
      default: return '#94a3b8';
    }
  };

  const onEachFeature = (feature: any, layer: any) => {
    layer.on({
      click: () => setSelectedParcel(feature.properties),
      mouseover: (e: any) => {
        e.target.setStyle({ weight: 3, fillOpacity: 0.5 });
      },
      mouseout: (e: any) => {
        e.target.setStyle({ weight: 2, fillOpacity: 0.35 });
      },
    });
  };

  const parcelStyle = (feature: any) => ({
    color: getParcelColor(feature?.properties?.verificationStatus || ''),
    weight: 2,
    fillOpacity: 0.35,
    fillColor: getParcelColor(feature?.properties?.verificationStatus || ''),
  });

  const toggleLayer = (id: string) => {
    setLayers(layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">GIS / Maps</h1>
          <p className="text-sm text-text-secondary mt-1">Cadastral map viewer · Amethi District</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Layers className="w-4 h-4" />} onClick={() => setShowLayers(!showLayers)}>
            Layers
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Map */}
        <div className="lg:col-span-3 card overflow-hidden relative">
          <MapContainer center={AMETHI_CENTER} zoom={DEFAULT_ZOOM} className="w-full h-full" style={{ minHeight: '500px' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <GeoJSON
              data={MOCK_PARCELS as any}
              style={parcelStyle}
              onEachFeature={onEachFeature}
            />
          </MapContainer>

          {/* Search overlay */}
          <div className="absolute top-4 left-4 z-[1000] w-64">
            <SearchInput value={search} onChange={setSearch} placeholder="Search parcels..." className="shadow-md" />
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-md p-3">
            <h4 className="text-xs font-semibold mb-2">Legend</h4>
            <div className="space-y-1">
              {[
                { color: '#16a34a', label: 'Verified' },
                { color: '#d97706', label: 'Pending' },
                { color: '#3b82f6', label: 'Under Review' },
                { color: '#dc2626', label: 'Rejected' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Layer panel */}
          {showLayers && (
            <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-md p-4 w-52">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Map Layers</h4>
                <button onClick={() => setShowLayers(false)} className="text-text-tertiary hover:text-text-primary"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                {layers.map(layer => (
                  <label key={layer.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={layer.visible} onChange={() => toggleLayer(layer.id)} className="rounded" />
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: layer.color }} />
                    <span>{layer.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="card flex flex-col">
          <div className="px-4 py-3 border-b border-border-default">
            <h3 className="text-sm font-semibold text-text-primary">
              {selectedParcel ? 'Parcel Details' : 'Select a Parcel'}
            </h3>
          </div>
          {selectedParcel ? (
            <div className="p-4 space-y-3 flex-1">
              <div>
                <p className="text-xs text-text-tertiary">Khasra No.</p>
                <p className="text-lg font-bold text-text-primary">{selectedParcel.khasraNumber}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-text-tertiary">Area</p>
                  <p className="text-sm font-medium">{selectedParcel.area}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Land Type</p>
                  <p className="text-sm font-medium">{selectedParcel.landType}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Owner</p>
                <p className="text-sm font-medium">{selectedParcel.owner}</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Village</p>
                <p className="text-sm">{selectedParcel.village}, {selectedParcel.tehsil}</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Status</p>
                <StatusBadge status={selectedParcel.verificationStatus.toLowerCase().replace(/ /g, '_')} />
              </div>
              {selectedParcel.recordId && (
                <Button variant="outline" size="sm" className="w-full mt-2" icon={<ExternalLink className="w-4 h-4" />}
                  onClick={() => window.location.href = `/records/${selectedParcel.recordId}`}>
                  View Record
                </Button>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div>
                <Map className="w-10 h-10 text-text-tertiary mx-auto mb-2" />
                <p className="text-sm text-text-tertiary">Click on a parcel on the map to view its details</p>
              </div>
            </div>
          )}

          {/* Parcels list */}
          <div className="border-t border-border-default max-h-48 overflow-y-auto">
            <div className="px-4 py-2 bg-surface-tertiary">
              <h4 className="text-xs font-semibold text-text-secondary">All Parcels ({MOCK_PARCELS.features.length})</h4>
            </div>
            {MOCK_PARCELS.features.map(f => (
              <button
                key={f.properties.id}
                onClick={() => setSelectedParcel(f.properties)}
                className={`w-full px-4 py-2 text-left hover:bg-surface-secondary transition-colors border-b border-border-default text-xs ${
                  selectedParcel?.id === f.properties.id ? 'bg-blue-50' : ''
                }`}
              >
                <span className="font-medium">{f.properties.khasraNumber}</span>
                <span className="text-text-tertiary ml-2">{f.properties.village}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GISMap;
