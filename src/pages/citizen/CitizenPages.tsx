// ==========================================
// BhoomiAI - Citizen Portal Pages
// ==========================================

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { citizenService } from '../../services';
import { LandRecord, LAND_CLASSIFICATION_LABELS } from '../../types/land-records';
import { CitizenApplication } from '../../data/mock-analytics';
import { Button, Input, Select, SearchInput, StatusBadge, Badge, LoadingState, EmptyState, Timeline } from '../../components/ui';
import {
  Search, FileText, Map, Download, ArrowRight, Eye, Clock, CheckCircle2,
  Shield, MapPin, Ruler, User, Calendar, ExternalLink, FileCheck, Award,
} from 'lucide-react';
import { getStates, getDistricts, getTehsils, getVillages } from '../../data/mock-jurisdictions';

// ============ CITIZEN HOME ============
export const CitizenHome: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleSearch = () => {
    if (search.trim()) navigate(`/citizen/search?q=${encodeURIComponent(search)}`);
  };

  const quickLinks = [
    { icon: <FileText className="w-6 h-6" />, title: 'View Land Record', desc: 'Search and view your land records', path: '/citizen/search', color: 'text-gov-blue bg-blue-50' },
    { icon: <Clock className="w-6 h-6" />, title: 'Track Application', desc: 'Track mutation & registration status', path: '/citizen/applications', color: 'text-amber-600 bg-amber-50' },
    { icon: <Download className="w-6 h-6" />, title: 'Download Certificates', desc: 'Download RoR, property cards & more', path: '/citizen/certificates', color: 'text-emerald-600 bg-emerald-50' },
    { icon: <Map className="w-6 h-6" />, title: 'View Map', desc: 'View your land parcel on the map', path: '/citizen/search', color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <div className="relative h-[420px] overflow-hidden">
        <img src="/hero-farmland.jpg" alt="Indian agricultural landscape" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900/80 via-navy-900/60 to-navy-900/40" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                Access Your Land Records<br />Anytime, Anywhere
              </h1>
              <p className="text-lg text-white/80 mt-4">
                Transparent · Accurate · Citizen Friendly
              </p>

              {/* Search Bar */}
              <div className="mt-8 flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by Khasra No., Owner Name, Village etc."
                    className="w-full pl-12 pr-4 py-3.5 rounded-lg text-base bg-white text-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gov-blue shadow-lg"
                  />
                </div>
                <Button size="lg" onClick={handleSearch} className="px-8 shadow-lg">Search</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10 mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map(link => (
            <button
              key={link.title}
              onClick={() => navigate(link.path)}
              className="card p-6 text-left card-hover group"
            >
              <div className={`w-12 h-12 rounded-lg ${link.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                {link.icon}
              </div>
              <h3 className="font-semibold text-text-primary">{link.title}</h3>
              <p className="text-sm text-text-secondary mt-1">{link.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Trust indicators */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-border-default">
            <Shield className="w-8 h-8 text-gov-blue flex-shrink-0" />
            <div><p className="font-semibold text-sm">Government Verified</p><p className="text-xs text-text-secondary">All records verified by Revenue Officers</p></div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-border-default">
            <Award className="w-8 h-8 text-verified flex-shrink-0" />
            <div><p className="font-semibold text-sm">AI-Powered Accuracy</p><p className="text-xs text-text-secondary">Advanced OCR/HTR with human verification</p></div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-border-default">
            <MapPin className="w-8 h-8 text-ai-purple flex-shrink-0" />
            <div><p className="font-semibold text-sm">GIS Integrated</p><p className="text-xs text-text-secondary">View parcels on interactive maps</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ CITIZEN SEARCH ============
export const CitizenSearch: React.FC = () => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<LandRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [district, setDistrict] = useState('');
  const [tehsil, setTehsil] = useState('');
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    setSearched(true);
    const data = await citizenService.searchRecords(search, { district, tehsil });
    setResults(data);
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Search Land Records</h1>
      <p className="text-sm text-text-secondary mb-6">Search by Khasra number, owner name, plot/survey number, or village</p>

      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="md:col-span-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Enter Khasra No., Owner Name, Village..." />
          </div>
          <Select options={[{ value: 'Amethi', label: 'Amethi' }, { value: 'Lucknow', label: 'Lucknow' }, { value: 'Varanasi', label: 'Varanasi' }]} value={district} onChange={e => setDistrict(e.target.value)} placeholder="All Districts" />
          <Button onClick={handleSearch} loading={loading} icon={<Search className="w-4 h-4" />}>Search</Button>
        </div>
      </div>

      {loading && <LoadingState message="Searching records..." />}

      {searched && !loading && results.length === 0 && <EmptyState message="No records found matching your search" />}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">{results.length} record(s) found</p>
          {results.map(r => (
            <button key={r.id} onClick={() => navigate(`/citizen/records/${r.id}`)} className="card p-4 w-full text-left card-hover block">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-text-primary">{r.owner.name}</h3>
                    <StatusBadge status={r.verificationStatus} />
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                    <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Khasra: {r.khasraNumber}</span>
                    <span className="flex items-center gap-1"><FileCheck className="w-3.5 h-3.5" /> Khata: {r.khataNumber}</span>
                    <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" /> {r.area.displayValue}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {r.village}, {r.tehsil}</span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-text-tertiary flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============ CITIZEN RECORD VIEW ============
export const CitizenRecordView: React.FC = () => {
  const { id } = useParams();
  const [record, setRecord] = useState<LandRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => { const r = await citizenService.getRecord(id || ''); setRecord(r); setLoading(false); })();
  }, [id]);

  if (loading) return <LoadingState />;
  if (!record) return <div className="max-w-3xl mx-auto py-12 px-4"><EmptyState message="Record not found or not available for public viewing" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="bg-navy-800 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold">Land Record Details</h1>
                {record.verificationStatus === 'verified' && (
                  <span className="bg-emerald-500/20 text-emerald-200 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>
              <p className="text-white/70 text-sm">{record.recordId}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Download PDF</Button>
              <Button variant="secondary" size="sm" icon={<Eye className="w-4 h-4" />}>View Certificate</Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FieldDisplay label="Owner Name" value={record.owner.name} icon={<User className="w-4 h-4" />} />
            <FieldDisplay label="Father/Husband Name" value={record.owner.fatherOrHusbandName} />
            <FieldDisplay label="Khasra Number" value={record.khasraNumber} icon={<FileText className="w-4 h-4" />} />
            <FieldDisplay label="Khata Number" value={record.khataNumber} />
            <FieldDisplay label="Area" value={record.area.displayValue} icon={<Ruler className="w-4 h-4" />} />
            <FieldDisplay label="Land Type" value={LAND_CLASSIFICATION_LABELS[record.landClassification]} />
            <FieldDisplay label="Village" value={record.village} icon={<MapPin className="w-4 h-4" />} />
            <FieldDisplay label="Tehsil" value={record.tehsil} />
            <FieldDisplay label="District" value={record.district} />
            <FieldDisplay label="State" value={record.state} />
            <FieldDisplay label="Verification Status" value={record.verificationStatus === 'verified' ? '✓ Verified' : record.verificationStatus} />
            {record.verifiedAt && <FieldDisplay label="Verified Date" value={new Date(record.verifiedAt).toLocaleDateString('en-IN')} icon={<Calendar className="w-4 h-4" />} />}
          </div>
        </div>

        {/* Map Preview Placeholder */}
        {record.gisLinked && (
          <div className="border-t border-border-default px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Location on Map</h3>
              <Badge variant="info">GIS Linked</Badge>
            </div>
            <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center">
              <div className="text-center">
                <Map className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                <p className="text-sm text-text-tertiary">Map preview available</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FieldDisplay: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex items-start gap-3">
    {icon && <div className="mt-0.5 text-text-tertiary">{icon}</div>}
    <div>
      <p className="text-xs text-text-tertiary uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-text-primary mt-0.5">{value}</p>
    </div>
  </div>
);

// ============ CITIZEN APPLICATIONS ============
export const CitizenApplications: React.FC = () => {
  const [apps, setApps] = useState<CitizenApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { (async () => { const data = await citizenService.getApplications('usr-100'); setApps(data); setLoading(false); })(); }, []);

  if (loading) return <LoadingState />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary mb-2">My Applications</h1>
      <p className="text-sm text-text-secondary mb-6">Track your mutation and registration applications</p>

      {apps.length === 0 ? <EmptyState message="No applications found" /> : (
        <div className="space-y-4">
          {apps.map(app => (
            <button key={app.id} onClick={() => navigate(`/citizen/applications/${app.id}`)} className="card p-5 w-full text-left card-hover block">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-text-primary">{app.applicationId}</h3>
                    <Badge variant={app.status === 'approved' ? 'success' : app.status === 'rejected' ? 'danger' : 'warning'}>
                      {app.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-secondary">{app.type} · Khasra {app.khasraNumber}</p>
                  <p className="text-xs text-text-tertiary mt-1">{app.village}, {app.tehsil}, {app.district}</p>
                  <p className="text-xs text-text-tertiary">Submitted: {new Date(app.submittedAt).toLocaleDateString('en-IN')}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-text-tertiary" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============ CITIZEN APPLICATION DETAIL ============
export const CitizenApplicationDetail: React.FC = () => {
  const { id } = useParams();
  const [app, setApp] = useState<CitizenApplication | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => { const data = await citizenService.getApplication(id || ''); setApp(data); setLoading(false); })(); }, [id]);

  if (loading) return <LoadingState />;
  if (!app) return <EmptyState message="Application not found" />;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text-primary">{app.applicationId}</h1>
            <p className="text-sm text-text-secondary">{app.type}</p>
          </div>
          <Badge variant={app.status === 'approved' ? 'success' : 'warning'}>
            {app.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <FieldDisplay label="Applicant" value={app.applicantName} />
          <FieldDisplay label="Khasra No." value={app.khasraNumber} />
          <FieldDisplay label="Location" value={`${app.village}, ${app.tehsil}, ${app.district}`} />
          <FieldDisplay label="Department" value={app.department} />
          <FieldDisplay label="Submitted" value={new Date(app.submittedAt).toLocaleDateString('en-IN')} />
          <FieldDisplay label="Last Updated" value={new Date(app.lastUpdated).toLocaleDateString('en-IN')} />
        </div>

        <h3 className="text-sm font-semibold text-text-primary mb-4">Application Timeline</h3>
        <Timeline items={app.timeline} />
      </div>
    </div>
  );
};

// ============ CITIZEN CERTIFICATES ============
export const CitizenCertificates: React.FC = () => {
  const certificates = [
    { icon: <FileText className="w-8 h-8" />, title: 'Record of Rights (RoR)', desc: 'Official record of rights certificate', status: 'Available', color: 'text-gov-blue bg-blue-50' },
    { icon: <FileCheck className="w-8 h-8" />, title: 'Mutation Order', desc: 'Land transfer/mutation order copy', status: 'Available', color: 'text-emerald-600 bg-emerald-50' },
    { icon: <Award className="w-8 h-8" />, title: 'Property Card', desc: 'Property ownership card', status: 'Pending', color: 'text-amber-600 bg-amber-50' },
    { icon: <Map className="w-8 h-8" />, title: 'Certified Map Extract', desc: 'Cadastral map extract of your parcel', status: 'Available', color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Download Certificates</h1>
      <p className="text-sm text-text-secondary mb-6">Download official land record certificates and documents</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {certificates.map(cert => (
          <div key={cert.title} className="card p-5 card-hover">
            <div className={`w-14 h-14 rounded-lg ${cert.color} flex items-center justify-center mb-3`}>
              {cert.icon}
            </div>
            <h3 className="font-semibold text-text-primary">{cert.title}</h3>
            <p className="text-sm text-text-secondary mt-1">{cert.desc}</p>
            <div className="flex items-center justify-between mt-4">
              <Badge variant={cert.status === 'Available' ? 'success' : 'warning'}>{cert.status}</Badge>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" icon={<Eye className="w-4 h-4" />}>View</Button>
                <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} disabled={cert.status !== 'Available'}>Download</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
