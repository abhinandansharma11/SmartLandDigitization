// ==========================================
// BhoomiAI - Citizen Portal Pages
// ==========================================

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence, useInView, animate } from 'framer-motion';
import { citizenService } from '../../services';
import { LandRecord, LAND_CLASSIFICATION_LABELS } from '../../types/land-records';
import { CitizenApplication } from '../../data/mock-analytics';
import { Button, Select, SearchInput, StatusBadge, Badge, LoadingState, EmptyState, Timeline } from '../../components/ui';
import {
  Search, FileText, Map, Download, ArrowRight, Eye, Clock, CheckCircle2,
  Shield, MapPin, Ruler, User, Calendar, FileCheck, Award, Loader2,
  UploadCloud, ServerCog, Workflow, ScanText, BadgeCheck, Link2, Database, LayoutDashboard,
  Activity, Layers3, Navigation, Sparkles,
  Building2, Stamp, Scale, ScrollText, MapPinned, FileCheck2, Landmark,
} from 'lucide-react';

const PIPELINE_STAGES = [
  { title: 'Land Record', description: 'Your source document', detail: 'A scanned RoR, deed, or cadastral record starts the secure digitization journey.', icon: FileText, visual: 'document' },
  { title: 'Officer Uploads via Portal', description: 'Secure intake', detail: 'Authorized officers upload and classify documents through the government portal.', icon: UploadCloud, visual: 'upload' },
  { title: 'API Gateway + Backend', description: 'Protected services', detail: 'Requests are authenticated, validated, and routed through BhoomiAI backend services.', icon: ServerCog, visual: 'gateway' },
  { title: 'Pipeline Orchestration', description: 'Jobs stay in sync', detail: 'Each processing step is queued, monitored, and retried without losing document context.', icon: Workflow, visual: 'workflow' },
  { title: 'AI Extraction', description: 'OCR + NER + Forgery Detection', detail: 'Vision models read fields, identify entities, and flag suspicious alterations.', icon: ScanText, visual: 'scan' },
  { title: 'Confidence Verified', description: 'Human-in-the-loop', detail: 'Confidence scores surface exceptions so officers can verify what needs attention.', icon: BadgeCheck, visual: 'verified' },
  { title: 'Blockchain Audit Trail', description: 'Tamper-evident history', detail: 'Every approved change is hashed and stored as tamper-evident history.', icon: Link2, visual: 'chain' },
  { title: 'PostgreSQL + PostGIS', description: 'Records + spatial data', detail: 'Validated records and parcel geometry stay queryable in one authoritative data layer.', icon: Database, visual: 'map' },
  { title: 'Officer Dashboard + Map', description: 'Decisions at a glance', detail: 'Officers review queues, analytics, and mapped parcels from a single workspace.', icon: LayoutDashboard, visual: 'dashboard' },
];

const ArchitecturePipeline: React.FC = () => {
  const sectionRef = React.useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' });
  const [activeStage, setActiveStage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => setIsMobile(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  useEffect(() => {
    if (!isInView || isPaused || isMobile) return;
    const timer = window.setInterval(() => {
      setActiveStage(stage => (stage + 1) % PIPELINE_STAGES.length);
    }, 1450);
    return () => window.clearInterval(timer);
  }, [isInView, isPaused, isMobile]);

  return (
    <section
      ref={sectionRef}
      className="pipeline-section relative overflow-hidden py-20 md:py-28"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="pipeline-grid absolute inset-0" aria-hidden="true" />
      <div className="pipeline-atmosphere" aria-hidden="true">
        {[Building2, Stamp, Scale, ScrollText, MapPinned, FileCheck2, Landmark, Shield, Database, Map].map((Icon, index) => (
          <span key={index} className={`pipeline-atmosphere-icon pipeline-atmosphere-icon-${index + 1}`}>
            <Icon />
          </span>
        ))}
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          className="max-w-2xl mb-14 md:mb-20"
        >
          <p className="pipeline-kicker">Under the hood</p>
          <h2 className="text-3xl md:text-5xl font-bold text-white mt-3 mb-5">How BhoomiAI Works</h2>
          <p className="text-base md:text-lg text-white/60 leading-relaxed">From a paper record to a trusted map, every handoff is visible, verifiable, and built for the officers who keep land data moving.</p>
        </motion.div>

        <div className="pipeline-canvas">
          <svg className="pipeline-track pipeline-track-desktop" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
            <motion.path className="pipeline-beam pipeline-beam-back" d="M55 50 C270 2 350 98 500 50 S730 2 945 50" pathLength="1" initial={{ pathLength: 0 }} animate={{ pathLength: isInView ? 1 : 0 }} transition={{ duration: 1.8, ease: 'easeInOut' }} />
            <motion.path className="pipeline-beam pipeline-beam-front" d="M55 50 C270 98 350 2 500 50 S730 98 945 50" pathLength="1" initial={{ pathLength: 0 }} animate={{ pathLength: isInView ? 1 : 0 }} transition={{ duration: 2.2, delay: 0.15, ease: 'easeInOut' }} />
            <motion.circle className="pipeline-packet pipeline-packet-trail" cx="55" cy="50" r="3" animate={isInView && !isPaused && !isMobile ? { cx: [55, 945], opacity: [0, 0.35, 0.35, 0] } : { opacity: 0 }} transition={{ duration: 11.6, delay: -0.18, repeat: Infinity, ease: 'linear' }} />
            <motion.circle className="pipeline-packet pipeline-packet-trail" cx="55" cy="50" r="2" animate={isInView && !isPaused && !isMobile ? { cx: [55, 945], opacity: [0, 0.22, 0.22, 0] } : { opacity: 0 }} transition={{ duration: 11.6, delay: -0.34, repeat: Infinity, ease: 'linear' }} />
            <motion.circle className="pipeline-packet" cx="55" cy="50" r="5" animate={isInView && !isPaused && !isMobile ? { cx: [55, 945], opacity: [0, 1, 1, 0] } : { opacity: 0 }} transition={{ duration: 11.6, repeat: Infinity, ease: 'linear' }} />
          </svg>
          <svg className="pipeline-track pipeline-track-mobile" viewBox="0 0 80 1440" preserveAspectRatio="none" aria-hidden="true">
            <motion.path d="M40 45 V1395" pathLength="1" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 2, ease: 'easeInOut' }} />
          </svg>

          <div className="pipeline-nodes">
            {PIPELINE_STAGES.map((stage, index) => {
              const Icon = stage.icon;
              const isActive = activeStage === index;
              return (
                <motion.div
                  key={stage.title}
                  className={`pipeline-node ${isActive ? 'is-active' : ''}`}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, amount: 0.65 }}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                  onViewportEnter={() => isMobile && setActiveStage(index)}
                >
                <motion.button
                  type="button"
                  aria-expanded={isActive}
                  aria-label={`Show details for ${stage.title}`}
                  onClick={() => setActiveStage(index)}
                  className={`pipeline-visual pipeline-visual-${stage.visual}`}
                  whileHover={{ y: -5, scale: 1.04 }}
                  whileFocus={{ y: -5, scale: 1.04 }}
                >
                  <span className="pipeline-visual-glow" />
                  <span className="pipeline-visual-sheet" />
                  <span className="pipeline-visual-line pipeline-visual-line-one" />
                  <span className="pipeline-visual-line pipeline-visual-line-two" />
                  <Icon className="pipeline-visual-icon" />
                  <span className="pipeline-visual-badge">{index + 1}</span>
                  <span className="pipeline-visual-info">
                    <strong>{stage.title}</strong>
                    <span>{stage.detail}</span>
                  </span>
                </motion.button>
                </motion.div>
              );
            })}
          </div>
        </div>
        <div className="pipeline-cinematic-caption">
          <span className="pipeline-caption-dot" />
          <span>One record. A thousand signals. One trusted map.</span>
        </div>
      </div>
    </section>
  );
};

const GISHeroPreview: React.FC = () => (
  <div className="gis-hero-preview" aria-hidden="true">
    <div className="gis-hero-grid" />
    <div className="gis-hero-glow gis-hero-glow-one" />
    <div className="gis-hero-glow gis-hero-glow-two" />
    <svg className="gis-hero-map" viewBox="0 0 620 420" fill="none">
      <path className="gis-map-contour gis-map-contour-one" d="M15 322C107 277 137 337 215 295S344 246 405 282s99 10 200-63" />
      <path className="gis-map-contour gis-map-contour-two" d="M36 152c83 50 131-18 204 18s112 94 185 63 106-3 165 21" />
      <path className="gis-parcel gis-parcel-one" d="m76 92 132 35-32 104-139-30z" />
      <path className="gis-parcel gis-parcel-two" d="m208 127 139-37 46 95-137 46z" />
      <path className="gis-parcel gis-parcel-three" d="m394 185 112-59 86 78-82 95-116-54z" />
      <path className="gis-parcel gis-parcel-four" d="m37 201 139 30 44 105-144 35-60-85z" />
      <path className="gis-road" d="M-20 360C110 280 209 353 292 290s172-44 348-163" />
      <motion.circle className="gis-signal gis-signal-one" cx="178" cy="178" r="5" animate={{ r: [5, 18, 5], opacity: [1, 0.15, 1] }} transition={{ duration: 3.8, repeat: Infinity, ease: 'easeOut' }} />
      <motion.circle className="gis-signal gis-signal-two" cx="463" cy="219" r="5" animate={{ r: [5, 20, 5], opacity: [1, 0.15, 1] }} transition={{ duration: 4.4, delay: 1.1, repeat: Infinity, ease: 'easeOut' }} />
      <motion.circle className="gis-location-dot" cx="318" cy="246" r="7" animate={{ cy: [246, 239, 246] }} transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }} />
    </svg>
    <div className="gis-hero-label gis-label-one"><Layers3 className="w-3.5 h-3.5" /> Parcel layers synced</div>
    <div className="gis-hero-label gis-label-two"><Navigation className="w-3.5 h-3.5" /> 18.5204° N · 73.8567° E</div>
  </div>
);

const LIVE_ACTIVITY = [
  { location: 'Bhusari', action: 'parcel record verified', time: 'just now' },
  { location: 'Amethi', action: 'new map layer published', time: 'moments ago' },
  { location: 'Lucknow', action: 'certificate ready to download', time: 'a minute ago' },
  { location: 'Varanasi', action: 'record linked to GIS boundary', time: 'a minute ago' },
];

const IdleActivityFeed: React.FC = () => {
  const [isIdle, setIsIdle] = useState(false);
  const [activityIndex, setActivityIndex] = useState(-1);

  useEffect(() => {
    let idleTimer: number | undefined;
    let activityTimer: number | undefined;
    let updates = 0;

    const resetActivity = () => {
      setIsIdle(false);
      setActivityIndex(-1);
      updates = 0;
      if (idleTimer) window.clearTimeout(idleTimer);
      if (activityTimer) window.clearInterval(activityTimer);
      idleTimer = window.setTimeout(() => {
        setIsIdle(true);
        setActivityIndex(0);
        updates = 1;
        activityTimer = window.setInterval(() => {
          if (updates >= LIVE_ACTIVITY.length) {
            if (activityTimer) window.clearInterval(activityTimer);
            return;
          }
          setActivityIndex(updates);
          updates += 1;
        }, 2800);
      }, 4200);
    };

    resetActivity();
    window.addEventListener('pointerdown', resetActivity);
    window.addEventListener('keydown', resetActivity);
    window.addEventListener('touchstart', resetActivity);
    return () => {
      if (idleTimer) window.clearTimeout(idleTimer);
      if (activityTimer) window.clearInterval(activityTimer);
      window.removeEventListener('pointerdown', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('touchstart', resetActivity);
    };
  }, []);

  const activity = activityIndex >= 0 ? LIVE_ACTIVITY[activityIndex] : null;
  return (
    <AnimatePresence>
      {isIdle && activity && (
        <motion.div
          className="idle-activity"
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.35 }}
          role="status"
        >
          <span className="idle-activity-icon"><Activity className="w-4 h-4" /></span>
          <span><strong>{activity.location}</strong> {activity.action}</span>
          <small>{activity.time}</small>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============ CITIZEN HOME ============
export const CitizenHome: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = () => {
    if (!search.trim()) return;
    setIsSearching(true);
    setHasSearched(false);
    
    // Fake network delay
    setTimeout(() => {
      setIsSearching(false);
      setHasSearched(true);
      setSearchResults([
        {
          id: 'lr-003',
          owner: 'Rajiv Kumar',
          khasra: '452/1',
          area: '1.2 Hectares',
          village: 'Bhusari',
          status: 'verified',
        },
        {
          id: 'lr-004',
          owner: 'Rajiv Kumar',
          khasra: '452/2',
          area: '0.8 Hectares',
          village: 'Bhusari',
          status: 'pending'
        }
      ]);
    }, 1200);
  };

  const quickLinks = [
    { icon: <FileText className="w-6 h-6" />, title: 'View Land Record', desc: 'Search and view publicly available land records', path: '/search', color: 'from-blue-500 to-gov-blue', shadow: 'shadow-blue-500/20' },
    { icon: <Clock className="w-6 h-6" />, title: 'Track Application', desc: 'Track mutation and registration status', path: '/track-application', color: 'from-amber-400 to-amber-600', shadow: 'shadow-amber-500/20' },
    { icon: <Download className="w-6 h-6" />, title: 'Download Certificates', desc: 'Download RoR, property cards and more', path: '/certificates', color: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-500/20' },
    { icon: <Map className="w-6 h-6" />, title: 'View Map', desc: 'Explore parcels and boundaries on the map', path: '/map', color: 'from-purple-500 to-purple-700', shadow: 'shadow-purple-500/20' },
  ];

  return (
    <div className="public-portal animate-fade-in bg-surface-secondary min-h-screen pb-20">
      {/* Hero Section */}
      <div className="reference-hero relative overflow-hidden bg-gov-blue pt-20 pb-32">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gov-blue" />
          <GISHeroPreview />
          
          {/* Subtle grain */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />

          {/* Floating Icons */}
          <div className="absolute inset-0 hidden lg:block overflow-hidden pointer-events-none">
            <div className="absolute left-[15%] top-[20%]" style={{ animation: 'floatOrbit1 14s ease-in-out infinite' }}>
              <FileText className="w-8 h-8 text-white/10" />
            </div>
            <div className="absolute right-[20%] top-[30%]" style={{ animation: 'floatOrbit2 16s ease-in-out infinite' }}>
              <Shield className="w-12 h-12 text-teal-500/10" />
            </div>
            <div className="absolute left-[25%] bottom-[20%]" style={{ animation: 'floatOrbit3 12s ease-in-out infinite' }}>
              <MapPin className="w-10 h-10 text-saffron-500/10" />
            </div>
            <div className="absolute right-[15%] bottom-[30%]" style={{ animation: 'floatOrbit1 18s ease-in-out infinite reverse' }}>
              <User className="w-8 h-8 text-white/10" />
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold text-navy-950 mb-6" style={{ fontFamily: 'var(--font-display)' }}>
              Your Land. Your Record. <span className="text-white">Your Rights.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10">
              A transparent, secure, and AI-verified platform for citizens to view, track, and manage land ownership.
            </p>
            <IdleActivityFeed />
          </motion.div>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/20 shadow-2xl">
              <div className="flex bg-white rounded-xl overflow-hidden p-1 shadow-inner">
                <div className="flex-1 relative flex items-center">
                  <Search className="absolute left-4 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by Khasra No., Owner Name, Village..."
                    className="w-full pl-12 pr-4 py-4 text-base md:text-lg bg-transparent text-text-primary placeholder-gray-400 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !search.trim()}
                  className="bg-gov-blue hover:bg-gov-blue-light text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
                >
                  {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Search Results (Animated in) */}
          <AnimatePresence>
            {hasSearched && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="max-w-3xl mx-auto mt-6 text-left"
              >
                <div className="space-y-3">
                  {searchResults.map((result, idx) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.15 }}
                      onClick={() => navigate(`/land-record/${result.id}`)}
                      className="bg-white p-4 rounded-xl shadow-lg border border-border-default cursor-pointer hover:border-gov-blue transition-colors group flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-text-primary text-lg group-hover:text-gov-blue transition-colors">{result.owner}</h3>
                          {result.status === 'verified' ? (
                            <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium"><CheckCircle2 className="w-3 h-3"/> Verified</span>
                          ) : (
                            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">Pending Verification</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-text-secondary">
                          <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Khasra {result.khasra}</span>
                          <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" /> {result.area}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {result.village}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-gov-blue transition-colors" />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Quick action grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20 mb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickLinks.map((link, idx) => (
            <motion.button
              key={link.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(link.path)}
              className="bg-white rounded-2xl p-6 text-left shadow-lg border border-border-default hover:border-transparent hover:shadow-2xl transition-all group overflow-hidden relative"
            >
              {/* Soft glow on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${link.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${link.color} text-white flex items-center justify-center mb-5 shadow-lg ${link.shadow} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                {link.icon}
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2 group-hover:text-gov-blue transition-colors">{link.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{link.desc}</p>
            </motion.button>
          ))}
        </div>
      </div>

      <ArchitecturePipeline />

      {/* Trust Strip & Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        
        {/* Trust Badges */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-4 md:gap-8 py-8 mb-12 border-y border-border-default bg-white/50"
        >
          <div className="flex items-center gap-2 text-text-secondary font-medium">
            <Shield className="w-5 h-5 text-teal-600" /> Government Verified
          </div>
          <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-gray-300" />
          <div className="flex items-center gap-2 text-text-secondary font-medium">
            <Award className="w-5 h-5 text-teal-600" /> AI-Powered Accuracy
          </div>
          <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-gray-300" />
          <div className="flex items-center gap-2 text-text-secondary font-medium">
            <MapPin className="w-5 h-5 text-teal-600" /> GIS Integrated
          </div>
        </motion.div>

        {/* Live Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <CountUpItem end={12847} label="Records Digitized" suffix="+" liveStep={7} />
          <CountUpItem end={98.2} label="Verification Accuracy" decimals={1} suffix="%" liveStep={0.1} />
          <CountUpItem end={28} label="Districts Covered" liveStep={1} />
        </div>
      </div>
    </div>
  );
};

const CountUpItem: React.FC<{ end: number; label: string; decimals?: number; suffix?: string; prefix?: string; liveStep?: number }> = ({ end, label, decimals = 0, suffix = '', prefix = '', liveStep = 0 }) => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isInView) {
      const controls = animate(0, end, {
        duration: 2,
        ease: "easeOut",
        onUpdate: (v) => setCount(v)
      });
      return controls.stop;
    }
  }, [isInView, end]);

  useEffect(() => {
    if (!isInView || !liveStep) return;
    const timer = window.setInterval(() => {
      setCount(value => Number((value + liveStep).toFixed(decimals)));
    }, 6200 + (label.length % 3) * 900);
    return () => window.clearInterval(timer);
  }, [decimals, isInView, label.length, liveStep]);

  return (
    <div ref={ref} className="text-center p-8 bg-white rounded-2xl border border-border-default shadow-sm relative overflow-hidden group hover:border-gov-blue/30 transition-colors">
      <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 text-gov-blue">
        <FileCheck className="w-32 h-32" />
      </div>
      <p className="text-4xl md:text-5xl font-bold text-gov-blue mb-3" style={{ fontFamily: 'var(--font-display)' }}>
        {prefix}{(count).toFixed(decimals)}{suffix}
      </p>
      <p className="text-sm md:text-base text-text-secondary font-medium flex items-center justify-center gap-1.5">
        {label}
        {liveStep > 0 && <Sparkles className="w-3.5 h-3.5 text-teal-600" aria-label="Updates periodically" />}
      </p>
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
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    setSearched(true);
    const data = await citizenService.searchRecords(search, { district, tehsil: '' });
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
            <button key={r.id} onClick={() => navigate(`/land-record/${r.id}`)} className="card p-4 w-full text-left card-hover block">
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
            <button key={app.id} onClick={() => navigate(`/track-application/${app.id}`)} className="card p-5 w-full text-left card-hover block">
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
        <Timeline items={app.timeline.map(item => ({ ...item, label: item.step }))} />
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
