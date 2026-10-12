// ==========================================
// BhumiSetu - Government Dashboard Layout
// ==========================================

import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore, BackendPermission } from '../store/auth.store';
import { verificationService } from '../services/verification.service';
import { BDocSummary, BACKEND_ROLE_LABEL, fmtAgo } from '../services/backend';
import { useLiveInterval } from '../hooks/useLiveUpdates';
import { Toaster } from '../components/Toaster';
import { useUIStore } from '../store/ui.store';
import { UserRole, Permission, ROLE_LABELS } from '../types/auth';
import { Badge, Button, SearchInput } from '../components/ui';
import {
  LayoutDashboard, FileText, Upload, CheckSquare, Map, BarChart3,
  ScrollText, Users, Settings, Bell, Search, LogOut, ChevronLeft,
  Menu, Shield, MapPin, ChevronDown, User, Cpu, FileStack,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles?: UserRole[];
  permissions?: Permission[];
  /** Backend permission required to see the item. */
  need?: BackendPermission;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { path: '/records', label: 'Land Records', icon: <FileText className="w-5 h-5" />, need: 'view_records' },
  { path: '/upload', label: 'Upload Document', icon: <Upload className="w-5 h-5" />, need: 'upload' },
  { path: '/documents', label: 'Documents', icon: <FileStack className="w-5 h-5" />, need: 'view_docs' },
  { path: '/verification', label: 'Verification Queue', icon: <CheckSquare className="w-5 h-5" />, need: 'review' },
  { path: '/gis', label: 'GIS / Maps', icon: <Map className="w-5 h-5" />, need: 'view_records' },
  { path: '/reports', label: 'Reports & Analytics', icon: <BarChart3 className="w-5 h-5" />, need: 'dashboard' },
  { path: '/audit-logs', label: 'Audit Logs', icon: <ScrollText className="w-5 h-5" />, need: 'audit' },
  { path: '/users', label: 'User Management', icon: <Users className="w-5 h-5" />, need: 'admin' },
  { path: '/settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, need: 'dashboard' },
];

export const GovernmentLayout: React.FC = () => {
  const { user, logout, can } = useAuthStore();
  const [queue, setQueue] = useState<BDocSummary[]>([]);
  const [query, setQuery] = useState('');
  const loadQueue = useCallback(() => { if (can('review')) verificationService.queue(can('supervise')).then(setQueue).catch(() => {}); }, [can]);
  const location = useLocation();
  useEffect(() => { loadQueue(); }, [loadQueue, location.pathname]);
  useEffect(() => { window.addEventListener('queue-changed', loadQueue); return () => window.removeEventListener('queue-changed', loadQueue); }, [loadQueue]);
  useLiveInterval(loadQueue, 15000);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !(e.target as HTMLElement)?.closest('input,textarea,select'))) { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const { sidebarCollapsed, toggleSidebarCollapse } = useUIStore();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const filteredNav = NAV_ITEMS.filter(item => !item.need || can(item.need));

  const jurisdictionStr = user ? [user.jurisdiction.state, user.jurisdiction.district, user.jurisdiction.tehsil, user.jurisdiction.village].filter(Boolean).join(' / ') : '';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app-shell flex h-screen bg-surface-secondary">
      {/* Sidebar */}
      <aside className={`gov-gradient flex flex-col transition-all duration-200 ${sidebarCollapsed ? 'w-16' : 'w-64'} flex-shrink-0`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h1 className="text-white font-bold text-sm truncate">BhumiSetu</h1>
              <p className="text-white/50 text-[10px] truncate">Land Record System</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto relative">
          {filteredNav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-nav relative ${isActive ? 'text-white' : ''}`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute inset-0 bg-white/10 rounded-md -z-10 shadow-[inset_3px_0_0_0_#14b8a6]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  {item.icon}
                  {!sidebarCollapsed && <span className="truncate relative z-10">{item.label}</span>}
                  {!sidebarCollapsed && item.path === '/verification' && queue.length > 0 && <span className="relative z-10 ml-auto rounded-full bg-white/20 px-2 text-[11px] font-bold text-white">{queue.length}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebarCollapse}
          className="flex items-center justify-center py-3 border-t border-white/10 text-white/50 hover:text-white transition-colors"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-border-default flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={toggleSidebarCollapse} className="lg:hidden p-1.5 rounded hover:bg-surface-tertiary">
              <Menu className="w-5 h-5 text-text-secondary" />
            </button>

            {/* Jurisdiction */}
            <div className="hidden md:flex items-center gap-2 text-xs text-text-secondary">
              <MapPin className="w-3.5 h-3.5" />
              <span>{jurisdictionStr || 'All India'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Global Search */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-md hover:bg-surface-tertiary text-text-secondary"
            >
              <Search className="w-4.5 h-4.5" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-md hover:bg-surface-tertiary text-text-secondary relative"
              >
                <Bell className="w-4.5 h-4.5" />
                {queue.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-10 w-80 bg-white rounded-lg shadow-dropdown border border-border-default z-50 animate-fade-in">
                  <div className="px-4 py-3 border-b border-border-default">
                    <h4 className="text-sm font-semibold">Notifications</h4>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-2">
                    {queue.length === 0 && <p className="px-3 py-4 text-sm text-text-tertiary">{can('review') ? 'Nothing is waiting for you.' : 'Your role gets no review tasks.'}</p>}
                    {queue.slice(0, 8).map(d => (
                      <div key={d.id} onClick={() => { setNotifOpen(false); navigate(`/verification/${d.id}`); }} className="px-3 py-2 rounded hover:bg-surface-secondary cursor-pointer">
                        <p className="text-sm font-medium text-text-primary">{d.status === 'SUPERVISOR' ? 'Needs your approval' : d.qa_sample ? 'Random QA check' : 'Verification task'}</p>
                        <p className="text-xs text-text-tertiary mt-0.5 truncate">{d.filename}{d.min_confidence != null ? ` · lowest confidence ${Math.round(d.min_confidence)}%` : ''}</p>
                        <p className="text-xs text-text-tertiary mt-0.5">{fmtAgo(d.updated_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Role Badge */}
            <div className="hidden lg:block">
              <Badge variant="info">{BACKEND_ROLE_LABEL[user?.backendRole || ''] || ROLE_LABELS[user?.role as UserRole] || user?.role}</Badge>
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-surface-tertiary"
              >
                <div className="w-7 h-7 rounded-full bg-navy-700 flex items-center justify-center">
                  <span className="text-xs font-medium text-white">{user?.name?.charAt(0)}</span>
                </div>
                <ChevronDown className="w-3 h-3 text-text-tertiary hidden sm:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-10 w-56 bg-white rounded-lg shadow-dropdown border border-border-default z-50 animate-fade-in">
                  <div className="px-4 py-3 border-b border-border-default">
                    <p className="text-sm font-medium text-text-primary">{user?.name}</p>
                    <p className="text-xs text-text-tertiary">Signed in as {user?.username} · {jurisdictionStr || 'All India'}</p>
                  </div>
                  <div className="p-1">
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error rounded hover:bg-red-50">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Search overlay */}
        {searchOpen && (
          <div className="absolute inset-0 z-50 bg-black/30" onClick={() => setSearchOpen(false)}>
            <div className="max-w-2xl mx-auto mt-20 bg-white rounded-lg shadow-modal p-4 animate-fade-in" onClick={e => e.stopPropagation()}>
              <form onSubmit={e => { e.preventDefault(); if (query.trim()) { setSearchOpen(false); navigate(`/records?q=${encodeURIComponent(query.trim())}`); } }}>
                <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search records by owner (any script), khata, khasra, ULPIN, village..."
                  className="input-base w-full mb-3 text-base" aria-label="Search records" />
              </form>
              <p className="text-xs text-text-tertiary">Enter to search, Esc to close. Only records within your jurisdiction. Shortcut: / or Ctrl+K.</p>
            </div>
          </div>
        )}

        <Toaster />
        {/* Content */}
        <main className="ambient-main flex-1 overflow-y-auto p-6">
          <div className="ambient-shapes" aria-hidden="true"><span /><span /><span /></div>
          <div className="relative z-10"><Outlet /></div>
        </main>
      </div>
    </div>
  );
};
