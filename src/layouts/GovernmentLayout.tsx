// ==========================================
// BhoomiAI - Government Dashboard Layout
// ==========================================

import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useUIStore } from '../store/ui.store';
import { UserRole, Permission, ROLE_LABELS } from '../types/auth';
import { Badge, Button, SearchInput } from '../components/ui';
import {
  LayoutDashboard, FileText, Upload, CheckSquare, Map, BarChart3,
  ScrollText, Users, Settings, Bell, Search, LogOut, ChevronLeft,
  Menu, Shield, MapPin, ChevronDown, User, Cpu,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles?: UserRole[];
  permissions?: Permission[];
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { path: '/records', label: 'Land Records', icon: <FileText className="w-5 h-5" /> },
  { path: '/upload', label: 'Document Processing', icon: <Upload className="w-5 h-5" />,
    roles: [UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.DIGITIZATION_OPERATOR] },
  { path: '/verification', label: 'Verification Queue', icon: <CheckSquare className="w-5 h-5" />,
    roles: [UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.REVENUE_OFFICER, UserRole.AUDITOR] },
  { path: '/gis', label: 'GIS / Maps', icon: <Map className="w-5 h-5" /> },
  { path: '/reports', label: 'Reports & Analytics', icon: <BarChart3 className="w-5 h-5" />,
    roles: [UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.REVENUE_OFFICER, UserRole.GIS_OFFICER, UserRole.AUDITOR] },
  { path: '/audit-logs', label: 'Audit Logs', icon: <ScrollText className="w-5 h-5" />,
    roles: [UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.REVENUE_OFFICER, UserRole.AUDITOR] },
  { path: '/users', label: 'User Management', icon: <Users className="w-5 h-5" />,
    roles: [UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN] },
  { path: '/settings', label: 'Settings', icon: <Settings className="w-5 h-5" />,
    roles: [UserRole.SUPER_ADMIN] },
];

export const GovernmentLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebarCollapse } = useUIStore();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const filteredNav = NAV_ITEMS.filter(item => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

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
              <h1 className="text-white font-bold text-sm truncate">BhoomiAI</h1>
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
                <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-10 w-80 bg-white rounded-lg shadow-dropdown border border-border-default z-50 animate-fade-in">
                  <div className="px-4 py-3 border-b border-border-default">
                    <h4 className="text-sm font-semibold">Notifications</h4>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2">
                    <div className="px-3 py-2 rounded hover:bg-surface-secondary cursor-pointer">
                      <p className="text-sm font-medium text-text-primary">New Verification Task</p>
                      <p className="text-xs text-text-tertiary mt-0.5">Record LR-10003 assigned to you</p>
                      <p className="text-xs text-text-tertiary mt-0.5">2 hours ago</p>
                    </div>
                    <div className="px-3 py-2 rounded hover:bg-surface-secondary cursor-pointer">
                      <p className="text-sm font-medium text-text-primary">Validation Conflict</p>
                      <p className="text-xs text-text-tertiary mt-0.5">Duplicate detected for Khasra 156/1</p>
                      <p className="text-xs text-text-tertiary mt-0.5">5 hours ago</p>
                    </div>
                    <div className="px-3 py-2 rounded hover:bg-surface-secondary cursor-pointer opacity-60">
                      <p className="text-sm text-text-primary">AI Processing Complete</p>
                      <p className="text-xs text-text-tertiary mt-0.5">RoR_142_3_Semrauta.jpg processed</p>
                      <p className="text-xs text-text-tertiary mt-0.5">Yesterday</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Role Badge */}
            <div className="hidden lg:block">
              <Badge variant="info">{ROLE_LABELS[user?.role as UserRole] || user?.role}</Badge>
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
                    <p className="text-xs text-text-tertiary">{user?.email}</p>
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
              <SearchInput value="" onChange={() => {}} placeholder="Search records by owner, Khasra No., village..." className="mb-3" />
              <p className="text-xs text-text-tertiary">Press ESC to close. Search across records within your jurisdiction.</p>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="ambient-main flex-1 overflow-y-auto p-6">
          <div className="ambient-shapes" aria-hidden="true"><span /><span /><span /></div>
          <div className="relative z-10"><Outlet /></div>
        </main>
      </div>
    </div>
  );
};
