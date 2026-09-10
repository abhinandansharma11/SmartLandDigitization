// ==========================================
// BhoomiAI - Demo Role Switcher (SIH Presentation)
// ==========================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { MOCK_USERS } from '../data/mock-users';
import { ROLE_LABELS, UserRole, GOVERNMENT_ROLES } from '../types/auth';
import { Beaker, ChevronUp, ChevronDown, User, Shield, X } from 'lucide-react';

export const DemoSwitcher: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, switchRole, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleSwitch = (userId: string) => {
    const targetUser = MOCK_USERS.find(u => u.id === userId);
    if (!targetUser) return;
    switchRole(userId);
    // Navigate to appropriate portal
    if (GOVERNMENT_ROLES.includes(targetUser.role)) {
      navigate('/dashboard');
    } else {
      navigate('/citizen');
    }
    setOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-lg hover:bg-amber-600 transition-colors"
      >
        <Beaker className="w-4 h-4" />
        <span>SIH Demo</span>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute bottom-12 right-0 w-72 bg-white rounded-lg shadow-2xl border border-gray-200 animate-fade-in overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-amber-900">🎯 Demo Mode</h4>
              <p className="text-[10px] text-amber-700 mt-0.5">Switch roles for SIH presentation</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-amber-600 hover:text-amber-800">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current user */}
          {isAuthenticated && user && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
              <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">Current</p>
              <p className="text-xs font-medium text-blue-900">{user.name}</p>
              <p className="text-[10px] text-blue-700">{ROLE_LABELS[user.role]}</p>
            </div>
          )}

          {/* User list */}
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
            {MOCK_USERS.map(u => {
              const isActive = user?.id === u.id;
              const isGov = GOVERNMENT_ROLES.includes(u.role);
              return (
                <button
                  key={u.id}
                  onClick={() => handleSwitch(u.id)}
                  disabled={isActive}
                  className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center gap-3 ${
                    isActive
                      ? 'bg-blue-50 cursor-default'
                      : 'hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isGov ? 'bg-navy-800 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    {isGov ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium truncate ${isActive ? 'text-blue-800' : 'text-gray-900'}`}>
                      {u.name}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {ROLE_LABELS[u.role]}
                      {u.jurisdiction.district && ` · ${u.jurisdiction.district}`}
                    </p>
                  </div>
                  {isActive && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Logout & Go to Login
              </button>
            ) : (
              <p className="text-[10px] text-gray-500">Click a role above to sign in as that user</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
