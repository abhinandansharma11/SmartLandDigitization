// ==========================================
// BhoomiAI - GIS / Map Module
// ==========================================

import React, { useState, useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MOCK_PARCELS, AMETHI_CENTER, DEFAULT_ZOOM } from '../../data/mock-gis';
import { ParcelProperties } from '../../types/gis';
import { SearchInput } from '../../components/ui';
import { Map as MapIcon, Layers, Search, Eye, ExternalLink, X, MapPin, CheckCircle2, AlertTriangle, Link as LinkIcon, Building2, User, FileText, Satellite, Map as StandardMapIcon, ShieldCheck, Clock } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths for Vite bundler
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const getParcelColor = (status: string) => {
  switch (status) {
    case 'Verified': return '#10b981'; // emerald
    case 'Pending Verification': return '#f59e0b'; // amber
    case 'Conflict': return '#ef4444'; // red
    default: return '#3b82f6'; // blue
  }
};

// Component to handle FlyTo from external clicks (search results)
const MapController = ({ selectedParcelGeometry }: { selectedParcelGeometry: any }) => {
  const map = useMap();
  useEffect(() => {
    if (selectedParcelGeometry) {
      // Create a GeoJSON layer just to get the bounds easily
      const layer = L.geoJSON(selectedParcelGeometry);
      map.flyToBounds(layer.getBounds(), { padding: [50, 50], duration: 1.5 });
    }
  }, [selectedParcelGeometry, map]);
  return null;
};


export const GISMap: React.FC = () => {
  const navigate = useNavigate();
  const [selectedParcel, setSelectedParcel] = useState<ParcelProperties | null>(null);
  const [selectedGeometry, setSelectedGeometry] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [isSatellite, setIsSatellite] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('All');

  // Filter parcels for map rendering and search results
  const filteredFeatures = useMemo(() => {
    let features = MOCK_PARCELS.features;
    if (activeFilter !== 'All') {
      features = features.filter(f => f.properties.verificationStatus === activeFilter);
    }
    if (search) {
      const s = search.toLowerCase();
      features = features.filter(f => 
        f.properties.khasraNumber.toLowerCase().includes(s) ||
        f.properties.owner.toLowerCase().includes(s) ||
        f.properties.village.toLowerCase().includes(s)
      );
    }
    return features;
  }, [search, activeFilter]);

  const geoJsonData = { ...MOCK_PARCELS, features: filteredFeatures };

  const handleFeatureClick = (feature: any) => {
    setSelectedParcel(feature.properties);
    setSelectedGeometry(feature.geometry);
  };

  const geoJsonStyle = (feature: any) => {
    const isSelected = selectedParcel?.id === feature?.properties?.id;
    const baseColor = getParcelColor(feature?.properties?.verificationStatus || '');
    return {
      fillColor: baseColor,
      weight: isSelected ? 4 : 2,
      opacity: 1,
      color: isSelected ? '#ffffff' : baseColor,
      dashArray: isSelected ? '' : '3',
      fillOpacity: isSelected ? 0.7 : 0.4
    };
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    layer.on({
      click: () => handleFeatureClick(feature),
      mouseover: (e) => {
        const target = e.target;
        target.setStyle({ fillOpacity: 0.8, weight: 3 });
        target.bringToFront();
      },
      mouseout: (e) => {
        const target = e.target;
        // geoJsonStyle function doesn't work directly here without re-evaluating the whole layer,
        // so we manually reset based on selection state
        const isSelected = selectedParcel?.id === feature?.properties?.id;
        target.setStyle({ fillOpacity: isSelected ? 0.7 : 0.4, weight: isSelected ? 4 : 2 });
      }
    });
    // Add tooltip
    layer.bindTooltip(`<b>Khasra: ${feature.properties.khasraNumber}</b><br/>${feature.properties.owner}`, {
      sticky: true,
      className: 'custom-tooltip'
    });
  };

  return (
    <div className="flex h-[calc(100vh-80px)] -m-6 relative overflow-hidden bg-surface-secondary animate-fade-in">
      
      {/* Map Container */}
      <div className="flex-1 relative z-0">
        <MapContainer
          center={AMETHI_CENTER}
          zoom={15}
          className="w-full h-full"
          zoomControl={false}
        >
          {isSatellite ? (
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            />
          ) : (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
          )}

          {/* GeoJSON Layer. Key changes when data changes to force re-render */}
          <GeoJSON 
            key={`${search}-${activeFilter}-${isSatellite ? 'sat' : 'std'}`}
            data={geoJsonData} 
            style={geoJsonStyle} 
            onEachFeature={onEachFeature} 
          />
          
          <MapController selectedParcelGeometry={selectedGeometry} />
        </MapContainer>

        {/* Floating Controls */}
        <div className="absolute top-4 left-4 z-[400] flex gap-2">
          <button 
            onClick={() => setIsSatellite(false)}
            className={`px-4 py-2 rounded-lg shadow-md font-semibold text-sm flex items-center gap-2 transition-all ${!isSatellite ? 'bg-gov-blue text-white' : 'bg-white text-text-secondary hover:bg-gray-50'}`}
          >
            <StandardMapIcon className="w-4 h-4" /> Vector
          </button>
          <button 
            onClick={() => setIsSatellite(true)}
            className={`px-4 py-2 rounded-lg shadow-md font-semibold text-sm flex items-center gap-2 transition-all ${isSatellite ? 'bg-gov-blue text-white' : 'bg-white text-text-secondary hover:bg-gray-50'}`}
          >
            <Satellite className="w-4 h-4" /> Satellite
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-6 right-6 z-[400] bg-white p-4 rounded-xl shadow-lg border border-border-default">
          <h4 className="font-bold text-sm mb-3">Verification Status</h4>
          <div className="space-y-2 text-xs font-semibold">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-emerald-500 opacity-60 border-2 border-emerald-500" /> Verified</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-amber-500 opacity-60 border-2 border-amber-500" /> Pending Verification</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-500 opacity-60 border-2 border-red-500" /> Conflict Detected</div>
          </div>
        </div>
      </div>

      {/* LEFT SIDEBAR: Search & List */}
      <div className="w-80 bg-white border-r border-border-default shadow-[10px_0_15px_rgba(0,0,0,0.03)] flex flex-col z-[410] relative">
        <div className="p-4 border-b border-border-default bg-surface-primary space-y-4">
          <h2 className="font-bold text-lg text-text-primary flex items-center gap-2">
            <Layers className="w-5 h-5 text-gov-blue" /> Parcel Explorer
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-text-tertiary" />
            <input 
              type="text" 
              placeholder="Search khasra, owner, village..." 
              className="w-full pl-9 pr-4 py-2 bg-surface-secondary border border-border-strong rounded-lg text-sm focus:outline-none focus:border-gov-blue"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {['All', 'Verified', 'Pending Verification', 'Conflict'].map(f => (
              <button 
                key={f} 
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeFilter === f ? 'bg-gov-blue text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredFeatures.map(f => {
            const p = f.properties;
            const isSelected = selectedParcel?.id === p.id;
            return (
              <div 
                key={p.id}
                onClick={() => handleFeatureClick(f)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-gov-blue bg-gov-blue-50/30' : 'border-transparent hover:bg-surface-secondary'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-mono text-sm font-bold text-text-primary">{p.khasraNumber}</span>
                  <div className={`w-2.5 h-2.5 rounded-full ${p.verificationStatus === 'Verified' ? 'bg-emerald-500' : p.verificationStatus === 'Conflict' ? 'bg-red-500' : 'bg-amber-500'}`} />
                </div>
                <p className="text-sm font-semibold truncate">{p.owner}</p>
                <p className="text-xs text-text-tertiary">{p.village}, {p.area}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT SLIDE-IN PANEL: Parcel Details */}
      <AnimatePresence>
        {selectedParcel && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 bottom-0 w-96 bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.1)] z-[500] flex flex-col border-l border-border-default"
          >
            <div className="p-4 border-b border-border-default bg-surface-primary flex items-center justify-between sticky top-0">
              <h2 className="font-bold text-lg text-text-primary flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gov-blue" />
                Parcel Details
              </h2>
              <button 
                onClick={() => { setSelectedParcel(null); setSelectedGeometry(null); }}
                className="p-1.5 hover:bg-surface-secondary rounded-lg text-text-tertiary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Header Status */}
              <div className={`p-4 rounded-xl border ${selectedParcel.verificationStatus === 'Verified' ? 'bg-emerald-50 border-emerald-200' : selectedParcel.verificationStatus === 'Conflict' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-3">
                  {selectedParcel.verificationStatus === 'Verified' ? <ShieldCheck className="w-6 h-6 text-emerald-600" /> : selectedParcel.verificationStatus === 'Conflict' ? <AlertTriangle className="w-6 h-6 text-red-600" /> : <Clock className="w-6 h-6 text-amber-600" />}
                  <div>
                    <h3 className={`font-bold ${selectedParcel.verificationStatus === 'Verified' ? 'text-emerald-700' : selectedParcel.verificationStatus === 'Conflict' ? 'text-red-700' : 'text-amber-700'}`}>
                      {selectedParcel.verificationStatus}
                    </h3>
                    <p className={`text-xs ${selectedParcel.verificationStatus === 'Verified' ? 'text-emerald-600' : selectedParcel.verificationStatus === 'Conflict' ? 'text-red-600' : 'text-amber-600'}`}>
                      Blockchain integrity check completed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">Khasra Number</p>
                  <p className="font-mono text-xl font-bold text-gov-blue">{selectedParcel.khasraNumber}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">Owner</p>
                    <p className="text-sm font-semibold">{selectedParcel.owner}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">Area</p>
                    <p className="text-sm font-semibold">{selectedParcel.area}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">Village</p>
                    <p className="text-sm font-semibold">{selectedParcel.village}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">Land Type</p>
                    <p className="text-sm font-semibold">{selectedParcel.landType}</p>
                  </div>
                </div>
              </div>

              {/* Entity Linkage Graph */}
              <div className="mt-8 pt-6 border-t border-border-default">
                <h4 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-ai-purple" />
                  Entity & Parcel Linkage
                </h4>
                
                <div className="bg-surface-secondary rounded-xl p-4 relative overflow-hidden">
                  <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-ai-purple/20" />
                  
                  <div className="space-y-4 relative">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-sm z-10"><Building2 className="w-4 h-4 text-blue-600" /></div>
                      <span className="text-xs font-semibold bg-white px-2 py-1 rounded shadow-sm border border-border-default flex-1">Village: {selectedParcel.village}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-white shadow-sm z-10"><MapIcon className="w-4 h-4 text-emerald-600" /></div>
                      <span className="text-xs font-semibold bg-white px-2 py-1 rounded shadow-sm border border-border-default flex-1">Parcel: {selectedParcel.khasraNumber}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center border-2 border-white shadow-sm z-10"><User className="w-4 h-4 text-purple-600" /></div>
                      <span className="text-xs font-semibold bg-white px-2 py-1 rounded shadow-sm border border-border-default flex-1">Owner: {selectedParcel.owner}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center border-2 border-white shadow-sm z-10"><FileText className="w-4 h-4 text-amber-600" /></div>
                      <span className="text-xs font-semibold bg-white px-2 py-1 rounded shadow-sm border border-border-default flex-1 font-mono">ULPIN Link active</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="p-4 border-t border-border-default bg-surface-primary">
               <button onClick={() => navigate(`/records/${selectedParcel.recordId}`)} className="w-full py-2.5 rounded-lg bg-gov-blue text-white font-bold flex items-center justify-center gap-2 shadow-md hover:bg-gov-blue-light transition-colors">
                 <Eye className="w-4 h-4" /> View Full Record
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default GISMap;
