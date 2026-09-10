// ==========================================
// BhoomiAI - Citizen Portal Layout
// ==========================================

import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { Cpu, Menu, X, User, LogOut, Bell } from 'lucide-react';
import { Button } from '../components/ui';

export const CitizenLayout: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/citizen'); };

  return (
    <div className="min-h-screen bg-surface-secondary flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-border-default sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink to="/citizen" className="flex items-center gap-3">
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
              <NavLink to="/citizen" end className={({ isActive }) => `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'text-gov-blue bg-blue-50' : 'text-text-secondary hover:text-text-primary hover:bg-surface-tertiary'}`}>Home</NavLink>
              <NavLink to="/citizen/search" className={({ isActive }) => `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'text-gov-blue bg-blue-50' : 'text-text-secondary hover:text-text-primary hover:bg-surface-tertiary'}`}>Services</NavLink>
              <NavLink to="/citizen/search" className={({ isActive }) => `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'text-gov-blue bg-blue-50' : 'text-text-secondary hover:text-text-primary hover:bg-surface-tertiary'}`}>Know Your Land</NavLink>
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
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
                  <Button variant="ghost" size="sm" onClick={() => navigate('/citizen/login')}>Login</Button>
                  <Button variant="primary" size="sm" onClick={() => navigate('/citizen/register')}>Register</Button>
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
              <NavLink to="/citizen" end onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded text-sm text-text-secondary hover:bg-surface-tertiary">Home</NavLink>
              <NavLink to="/citizen/search" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded text-sm text-text-secondary hover:bg-surface-tertiary">Services</NavLink>
              <NavLink to="/citizen/certificates" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded text-sm text-text-secondary hover:bg-surface-tertiary">Certificates</NavLink>
            </nav>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-navy-900 text-white/70 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-5 h-5 text-white" />
                <span className="font-bold text-white">BhoomiAI</span>
              </div>
              <p className="text-sm">Intelligent Land Record Digitization & Validation System</p>
              <p className="text-xs mt-2 text-white/40">Prototype · Smart India Hackathon · PS 26018</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Search Land Records</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Track Application</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Download Certificates</a></li>
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
            © 2026 BhoomiAI · Government of India · All Rights Reserved · Integration Ready (Prototype)
          </div>
        </div>
      </footer>
    </div>
  );
};
