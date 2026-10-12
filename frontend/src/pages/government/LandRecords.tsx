// ==========================================
// BhumiSetu - Land Records List + Detail Pages
// ==========================================

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { recordsService } from '../../services/records.service';
import { documentsService } from '../../services/documents.service';
import { gisService } from '../../services';
import { originalFileUrl, pageImageUrl } from '../../services/api-client';
import { BRecord, fmtDateTime } from '../../services/backend';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LandRecord, VERIFICATION_STATUS_LABELS, DOCUMENT_TYPE_LABELS, LAND_CLASSIFICATION_LABELS } from '../../types/land-records';
import { DataTable, SearchInput, Select, StatusBadge, ConfidenceBadge, Badge, Button, Tabs, Timeline, LoadingState, EmptyState, Pagination } from '../../components/ui';
import { useAuthStore } from '../../store/auth.store';
import { UploadCloud, FileText, MapPin, User, Ruler, Calendar, Shield, Download, Printer, Eye, Map, ScrollText, CheckCircle2, History, ExternalLink } from 'lucide-react';

// ---- List Page ----
export const LandRecordsList: React.FC = () => {
  const [records, setRecords] = useState<LandRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [params] = useSearchParams();
  const [search, setSearch] = useState(() => params.get('q') || '');
  useEffect(() => { const q = params.get('q'); if (q !== null) setSearch(q); }, [params]);
  const { can } = useAuthStore();
  const [districtFilter, setDistrictFilter] = useState('');
  const [districts, setDistricts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => { documentsService.villages().then(v => setDistricts([...new Set(v.filter(x => x.in_jurisdiction).map(x => x.district))])).catch(() => {}); }, []);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(async () => {
      try { setRecords((await recordsService.getRecords({ search, district: districtFilter })).data); setError(null); }
      catch (e: any) { setError(e.message); }
      setLoading(false);
    }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, districtFilter]);

  const columns = [
    { key: 'recordId', header: 'Record ID', render: (r: LandRecord) => <span className="font-mono text-xs font-semibold text-gov-blue">{r.recordId}</span> },
    { key: 'owner', header: 'Owner', render: (r: LandRecord) => (
      <div className="max-w-[280px]"><p className="font-medium text-sm truncate" title={r.owner.name}>{r.owner.name}</p><p className="text-xs text-text-tertiary truncate">{r.backend?.owners[0]?.relation || 'S/o'} {r.owner.fatherOrHusbandName}{(r.backend?.owners.length || 0) > 1 ? ` · ${r.backend!.owners.length} owners` : ''}</p></div>
    )},
    { key: 'khasraNumber', header: 'Khasra No.' },
    { key: 'khataNumber', header: 'Khata No.', render: (r: LandRecord) => <span className="font-semibold">{r.khataNumber}</span> },
    { key: 'village', header: 'Location', render: (r: LandRecord) => <div className="text-xs"><p>{r.village} · {r.villageNative}</p><p className="text-text-tertiary">{r.tehsil}, {r.district}, {r.state}</p></div> },
    { key: 'area', header: 'Area', render: (r: LandRecord) => r.area.displayValue },
    { key: 'documentType', header: 'Doc Type', render: (r: LandRecord) => <Badge>{DOCUMENT_TYPE_LABELS[r.documentType]}</Badge> },
    { key: 'confidenceScore', header: 'Confidence', render: (r: LandRecord) => r.confidenceScore > 0 ? <ConfidenceBadge score={r.confidenceScore} /> : <span className="text-xs text-text-tertiary">N/A</span> },
    { key: 'verificationStatus', header: 'Status', render: (r: LandRecord) => <StatusBadge status={r.verificationStatus} /> },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Land Records</h1>
          <p className="text-sm text-text-secondary mt-1">Published, signed records in your jurisdiction. Names match across scripts: type "ram prasad" to find राम प्रसाद.</p>
        </div>
        {can('upload') && <Button icon={<UploadCloud className="w-4 h-4" />} onClick={() => navigate('/upload')}>Upload Document</Button>}
      </div>

      <div className="card">
        <div className="p-4 border-b border-border-default flex flex-wrap gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Owner name (any script), khata, khasra, ULPIN or village..." className="flex-1 min-w-[200px]" />
          <Select options={districts.map(d => ({ value: d, label: d }))} value={districtFilter} onChange={e => setDistrictFilter(e.target.value)} placeholder="All Districts" className="w-44" />
        </div>
        {error && <p className="px-4 py-3 text-sm text-error">{error}</p>}
        <DataTable columns={columns} data={records} onRowClick={r => navigate(`/records/${r.id}`)} loading={loading} emptyMessage={search ? 'No published records match. Try the khata number or a different spelling.' : 'Nothing published yet. Approved records appear here.'} />
        <Pagination page={1} totalPages={1} onPageChange={() => {}} total={records.length} />
      </div>
    </div>
  );
};

// ---- Detail Page ----
export const LandRecordDetail: React.FC = () => {
  const { id } = useParams();
  const [record, setRecord] = useState<LandRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const r = await recordsService.getRecord(id || '');
      setRecord(r);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <LoadingState />;
  if (!record || !record.backend) return <EmptyState message="Record not found, or outside your jurisdiction" />;
  const b = record.backend;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <Eye className="w-4 h-4" /> },
    { id: 'ownership', label: 'Ownership', icon: <User className="w-4 h-4" />, count: b.owners.length },
    { id: 'mutation', label: 'Mutation', icon: <History className="w-4 h-4" />, count: record.mutationHistory.length + record.registrationHistory.length },
    { id: 'gis', label: 'GIS Map', icon: <Map className="w-4 h-4" /> },
    { id: 'validation', label: 'Integrity', icon: <Shield className="w-4 h-4" /> },
    { id: 'audit', label: 'Version History', icon: <ScrollText className="w-4 h-4" />, count: b.history?.length },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold text-text-primary">{record.recordId}</h1>
            <StatusBadge status={record.verificationStatus} />
            {b.is_current ? <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" />Verified Digital Record · v{b.version}</Badge> : <Badge variant="warning">Superseded · v{b.version}</Badge>}
          </div>
          <p className="text-sm text-text-secondary">Khata {b.khata_no} · {b.village_en} ({b.village}) · {b.tehsil}, {b.district}, {b.state}</p>
        </div>
        <div className="flex gap-2">
          {record.sourceDocumentId && <a href={originalFileUrl(record.sourceDocumentId)} target="_blank" rel="noreferrer"><Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Source Scan</Button></a>}
          <Button variant="secondary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>Print</Button>
          {record.gisLinked && <Button variant="outline" size="sm" icon={<Map className="w-4 h-4" />} onClick={() => setActiveTab('gis')}>View on Map</Button>}
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="card p-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoField label="Owner Name(s)" value={record.owner.name} />
            <InfoField label="Father / Husband" value={b.owners[0]?.relative_name ? `${b.owners[0].relative_name}${b.owners[0].relation ? ` (${b.owners[0].relation})` : ''}` : 'Not recorded'} />
            <InfoField label="Khata Number" value={b.khata_no} />
            <InfoField label="Khasra Number(s)" value={record.khasraNumber || 'None recorded'} />
            <InfoField label="Total Area" value={record.area.displayValue} />
            <InfoField label="Land Category" value={b.category || 'Not recorded'} />
            <InfoField label="Village" value={`${b.village_en} · ${b.village}`} />
            <InfoField label="LGD Village Code" value={b.village_lgd} />
            <InfoField label="Tehsil" value={record.tehsil} />
            <InfoField label="District" value={record.district} />
            <InfoField label="State" value={record.state} />
            <InfoField label="Record Year (Fasli)" value={b.fasli_year || 'Not recorded'} />
            <InfoField label="Document Type" value={DOCUMENT_TYPE_LABELS[record.documentType]} />
            <InfoField label="Ownership Type" value={record.ownershipType === 'joint' ? `Joint (${b.owners.length} owners)` : 'Individual'} />
            <InfoField label="Reading Confidence" value={record.confidenceScore > 0 ? `${record.confidenceScore}% (mean of fields, officer-checked count as 100)` : 'N/A'} />
            <InfoField label="GIS Linked" value={record.gisLinked ? `Yes, ${b.plots.filter(p => p.parcel_id).length} of ${b.plots.length} plots` : 'No'} />
            <InfoField label="Published" value={`${fmtDateTime(b.published_at)} by ${b.published_by || 'system'}`} />
            <InfoField label="Version" value={`${b.version}${b.is_current ? ' (current)' : ' (superseded)'}`} />
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 items-start">
            {record.sourceDocumentId ? <img src={pageImageUrl(record.sourceDocumentId, 1, 'processed')} alt="Source scan, page 1" className="w-full rounded-lg border border-border-default shadow-sm bg-white" /> : <FileText className="w-12 h-12 text-text-tertiary" />}
            <div>
              <p className="text-sm text-text-secondary">This record was published from the scan on the left. The original file is kept unchanged with its SHA-256 fingerprint.</p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" icon={<Eye className="w-4 h-4" />} onClick={() => record.sourceDocumentId && navigate(`/processing/${record.sourceDocumentId}`)}>View in Processing Workspace</Button>
                {record.sourceDocumentId && <a href={originalFileUrl(record.sourceDocumentId)} target="_blank" rel="noreferrer"><Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Download Original</Button></a>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ownership' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide text-text-tertiary border-b border-border-default"><th className="py-2 pr-4">#</th><th className="py-2 pr-4">Owner</th><th className="py-2 pr-4">Relation</th><th className="py-2 pr-4">Father / Husband</th><th className="py-2 pr-4">Share</th><th className="py-2">Residence</th></tr></thead>
              <tbody>{b.owners.map((o, i) => <tr key={i} className="border-b border-border-default/60"><td className="py-3 pr-4 text-text-tertiary">{i + 1}</td><td className="py-3 pr-4 font-semibold">{o.name}</td><td className="py-3 pr-4">{o.relation}</td><td className="py-3 pr-4">{o.relative_name}</td><td className="py-3 pr-4 font-mono">{o.share}</td><td className="py-3">{o.residence}</td></tr>)}</tbody>
            </table>
          </div>
        )}

        {activeTab === 'mutation' && (
          record.mutationHistory.length + record.registrationHistory.length > 0 ? (
            <div className="space-y-4">
              {record.mutationHistory.map(m => (
                <div key={m.id} className="border border-border-default rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2"><h4 className="font-semibold text-sm">Mutation case {m.orderNumber}</h4><StatusBadge status={m.status} /></div>
                  <div className="grid grid-cols-2 gap-3 text-sm"><InfoField label="Order Date" value={m.date || 'Not recorded'} /><InfoField label="Basis" value={m.reason || 'Not recorded'} /></div>
                </div>
              ))}
              {record.registrationHistory.map(g => (
                <div key={g.id} className="border border-border-default rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-2">Registered deed {g.registrationNumber}</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm"><InfoField label="Date" value={g.date || 'Not recorded'} /><InfoField label="Sub-registrar Office" value={g.registrarOffice || 'Not recorded'} /></div>
                </div>
              ))}
            </div>
          ) : <EmptyState message="No mutation or registration entries on this record" />
        )}

        {activeTab === 'gis' && <RecordMap record={b} />}

        {activeTab === 'validation' && (
          <div className="space-y-4 max-w-3xl">
            <p className="text-sm text-text-secondary">Every published version is hashed and signed. Changing any value after publication changes the hash, so tampering is detectable.</p>
            <InfoField label="Record Hash (SHA-256)" value={b.record_hash || ''} mono />
            <InfoField label="Signature" value={b.signature || ''} mono />
            <p className="text-xs text-text-tertiary">The demo signs with a server key (HMAC). A live deployment would use a DSC or eSign.</p>
            {record.sourceDocumentId && <Button variant="outline" size="sm" icon={<Shield className="w-4 h-4" />} onClick={() => navigate(`/processing/${record.sourceDocumentId}`)}>See validation checks for the source scan</Button>}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-3">
            {(b.history || []).map(h => (
              <div key={h.id} className={`flex items-center gap-4 rounded-lg border p-3 ${h.id === b.id ? 'border-gov-blue bg-gov-blue-50/40' : 'border-border-default'}`}>
                <span className="font-mono text-sm font-bold text-gov-blue w-10">v{h.version}</span>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{h.owners.join(', ')}</p><p className="text-xs text-text-tertiary">Published {fmtDateTime(h.published_at)} by {h.published_by}</p></div>
                {h.id !== b.id ? <Button size="sm" variant="ghost" onClick={() => navigate(`/records/${h.id}`)}>Open</Button> : <Badge variant="info">This version</Badge>}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => navigate('/audit-logs')}>Open Audit Logs</Button>
          </div>
        )}
      </div>
    </div>
  );
};

const RecordMap: React.FC<{ record: BRecord }> = ({ record }) => {
  const [fc, setFc] = useState<any>(null);
  useEffect(() => {
    gisService.getParcels().then(all => {
      const ids = new Set(record.plots.map(p => String(p.parcel_id)).filter(x => x !== 'null'));
      setFc({ ...all, features: all.features.filter(f => ids.has(f.properties.id)) });
    }).catch(() => setFc({ features: [] }));
  }, [record.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const bounds = fc?.features?.length ? L.geoJSON(fc).getBounds().pad(0.8) : null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
      <div className="h-[340px] rounded-lg overflow-hidden border border-border-default bg-surface-secondary">
        {bounds ? <MapContainer bounds={bounds} className="w-full h-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
          <GeoJSON data={fc} style={{ color: '#10b981', weight: 2, fillOpacity: 0.35 }} onEachFeature={(f: any, l) => l.bindTooltip(`Khasra ${f.properties.khasraNumber}`, { permanent: true, direction: 'center' })} />
        </MapContainer> : <div className="h-full flex items-center justify-center text-sm text-text-tertiary p-6 text-center">{fc ? 'No parcel geometry linked yet. Upload this village\'s map sheet to link the plots.' : 'Loading map...'}</div>}
      </div>
      <table className="w-full text-sm self-start">
        <thead><tr className="text-left text-xs uppercase tracking-wide text-text-tertiary border-b border-border-default"><th className="py-2 pr-3">Khasra</th><th className="py-2 pr-3 text-right">Record (ha)</th><th className="py-2 pr-3 text-right">Map (ha)</th><th className="py-2">ULPIN</th></tr></thead>
        <tbody>{record.plots.map((p, i) => {
          const off = p.area_ha && p.map_area_ha ? Math.abs(p.area_ha - p.map_area_ha) / p.map_area_ha > 0.1 : false;
          return <tr key={i} className="border-b border-border-default/60"><td className="py-2.5 pr-3 font-semibold">{p.khasra_no}<span className="block text-[11px] font-normal text-text-tertiary">{p.area_raw}</span></td>
            <td className="py-2.5 pr-3 text-right font-mono">{p.area_ha?.toFixed(4)}</td>
            <td className={`py-2.5 pr-3 text-right font-mono ${off ? 'text-error font-bold' : ''}`}>{p.map_area_ha != null ? p.map_area_ha.toFixed(4) : <span className="text-text-tertiary">none</span>}</td>
            <td className="py-2.5 font-mono text-xs">{p.ulpin || <span className="text-text-tertiary">none</span>}</td></tr>;
        })}</tbody>
      </table>
    </div>
  );
};

const InfoField: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <p className="text-xs text-text-tertiary font-medium uppercase tracking-wide">{label}</p>
    <p className={`text-sm text-text-primary mt-0.5 ${mono ? 'font-mono break-all' : ''}`}>{value}</p>
  </div>
);
