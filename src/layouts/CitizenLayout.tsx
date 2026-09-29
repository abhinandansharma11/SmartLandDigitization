// ==========================================
// BhoomiAI - Citizen Portal Layout
// ==========================================

import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { Cpu, Menu, X, LogOut, Bell, ShieldCheck, House } from 'lucide-react';

export const CitizenLayout: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="app-shell min-h-screen bg-surface-secondary flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-border-default sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink
              to="/"
              aria-label="Home"
              title="Home"
              className="mr-4 flex h-9 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-950 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-navy-900 hover:shadow-md"
            >
              <House className="h-4 w-4" strokeWidth={2.4} />
            </NavLink>
            <NavLink to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-navy-800 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-navy-900">BhoomiAI</h1>
                <p className="text-[10px] text-text-tertiary -mt-0.5">भूमि AI · Land Records</p>
              </div>
            </NavLink>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
            </nav>

            {/* Right side */}
            <div className="ml-auto flex items-center gap-3">
              {isAuthenticated && user ? (
                <>
                  <button className="p-2 rounded-md hover:bg-surface-tertiary text-text-secondary relative">
                    <Bell className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center">
                      <span className="text-xs font-medium text-white">{user.name.charAt(0)}</span>
                    </div>
                    <span className="text-sm font-medium text-text-primary hidden sm:block">{user.name}</span>
                    <button onClick={handleLogout} className="p-1.5 rounded hover:bg-surface-tertiary text-text-tertiary" title="Logout">
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="inline-flex items-center gap-2 rounded-full bg-gov-blue px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-gov-blue-dark hover:shadow-md"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Officer Login
                  </button>
                </div>
              )}

              {/* Mobile menu */}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-md hover:bg-surface-tertiary">
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border-default bg-white animate-fade-in">
            <nav className="px-4 py-3 space-y-1">
              <NavLink to="/" end onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded text-sm text-text-secondary hover:bg-surface-tertiary"><House className="h-4 w-4" /> Home</NavLink>
            </nav>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="site-footer bg-navy-950 text-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-5 h-5 text-white" />
                <span className="font-bold text-white">BhoomiAI</span>
              </div>
              <p className="text-sm">Intelligent Land Record Digitization & Validation System</p>
              <p className="text-xs mt-2 text-white/40">Digital land records and applications</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><NavLink to="/search" className="hover:text-white transition-colors">Search Land Records</NavLink></li>
                <li><NavLink to="/track-application" className="hover:text-white transition-colors">Track Application</NavLink></li>
                <li><NavLink to="/certificates" className="hover:text-white transition-colors">Download Certificates</NavLink></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>Revenue Department Helpline</li>
                <li>1800-XXX-XXXX (Toll Free)</li>
                <li>help@bhoomi-ai.gov.in</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-4 text-xs text-white/40 text-center">
            © 2026 BhoomiAI · Digital Land Records Platform · All Rights Reserved
          </div>
        </div>
      </footer>
    </div>
  );
};
