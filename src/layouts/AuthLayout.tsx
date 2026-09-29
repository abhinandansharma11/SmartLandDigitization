// ==========================================
// BhoomiAI - Auth Layout (Redesigned)
// Full-screen with animated secure identity visual
// ==========================================

import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => (
  <div className="min-h-screen flex relative overflow-hidden bg-[#f4edda]">
    {/* ── Animated Background: Identity Network Visual ── */}
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_18%,#2583ee_0%,transparent_32%),linear-gradient(135deg,#f4edda_0%,#fffefa_52%,#91dfa9_140%)]" />

      {/* Radial gradient overlays for depth */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(5, 150, 105, 0.15) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(249, 115, 22, 0.1) 0%, transparent 70%)',
        }}
      />

      {/* Subtle grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ── Animated Network Graph (CSS-only) ── */}
      <svg
        className="absolute inset-0 w-full h-full hidden lg:block"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Pulse animation for nodes */}
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(20, 184, 166, 0.6)" />
            <stop offset="100%" stopColor="rgba(20, 184, 166, 0)" />
          </radialGradient>

          <radialGradient id="nodeGlowAmber" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(251, 146, 60, 0.5)" />
            <stop offset="100%" stopColor="rgba(251, 146, 60, 0)" />
          </radialGradient>
        </defs>

        {/* ── Network Lines (OIDC flow representation) ── */}
        {/* Citizen → Gateway */}
        <line x1="12%" y1="25%" x2="30%" y2="40%" stroke="rgba(20, 184, 166, 0.12)" strokeWidth="1">
          <animate attributeName="stroke-opacity" values="0.06;0.18;0.06" dur="4s" repeatCount="indefinite" />
        </line>
        {/* Gateway → Identity Provider */}
        <line x1="30%" y1="40%" x2="22%" y2="65%" stroke="rgba(20, 184, 166, 0.12)" strokeWidth="1">
          <animate attributeName="stroke-opacity" values="0.08;0.2;0.08" dur="5s" repeatCount="indefinite" />
        </line>
        {/* Identity Provider → Backend */}
        <line x1="22%" y1="65%" x2="40%" y2="80%" stroke="rgba(20, 184, 166, 0.1)" strokeWidth="1">
          <animate attributeName="stroke-opacity" values="0.05;0.15;0.05" dur="4.5s" repeatCount="indefinite" />
        </line>
        {/* Gateway → Backend (direct) */}
        <line x1="30%" y1="40%" x2="40%" y2="80%" stroke="rgba(251, 146, 60, 0.08)" strokeWidth="1">
          <animate attributeName="stroke-opacity" values="0.04;0.12;0.04" dur="6s" repeatCount="indefinite" />
        </line>
        {/* Cross connections */}
        <line x1="12%" y1="25%" x2="22%" y2="65%" stroke="rgba(20, 184, 166, 0.06)" strokeWidth="0.5" strokeDasharray="4 6">
          <animate attributeName="stroke-opacity" values="0.03;0.1;0.03" dur="7s" repeatCount="indefinite" />
        </line>
        <line x1="30%" y1="40%" x2="8%" y2="55%" stroke="rgba(20, 184, 166, 0.06)" strokeWidth="0.5" strokeDasharray="4 6">
          <animate attributeName="stroke-opacity" values="0.04;0.09;0.04" dur="5.5s" repeatCount="indefinite" />
        </line>
        <line x1="40%" y1="80%" x2="15%" y2="88%" stroke="rgba(251, 146, 60, 0.06)" strokeWidth="0.5" strokeDasharray="4 6">
          <animate attributeName="stroke-opacity" values="0.03;0.08;0.03" dur="8s" repeatCount="indefinite" />
        </line>

        {/* ── Network Nodes ── */}
        {/* Node 1: Citizen */}
        <circle cx="12%" cy="25%" r="3" fill="rgba(20, 184, 166, 0.5)">
          <animate attributeName="r" values="2.5;4;2.5" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="12%" cy="25%" r="8" fill="url(#nodeGlow)" opacity="0.4">
          <animate attributeName="r" values="6;12;6" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* Node 2: Gateway */}
        <circle cx="30%" cy="40%" r="4" fill="rgba(20, 184, 166, 0.6)">
          <animate attributeName="r" values="3;5;3" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.9;0.5" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx="30%" cy="40%" r="10" fill="url(#nodeGlow)" opacity="0.3">
          <animate attributeName="r" values="8;14;8" dur="4s" repeatCount="indefinite" />
        </circle>

        {/* Node 3: Identity Provider */}
        <circle cx="22%" cy="65%" r="3.5" fill="rgba(251, 146, 60, 0.5)">
          <animate attributeName="r" values="2.5;4.5;2.5" dur="5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="5s" repeatCount="indefinite" />
        </circle>
        <circle cx="22%" cy="65%" r="9" fill="url(#nodeGlowAmber)" opacity="0.3">
          <animate attributeName="r" values="7;13;7" dur="5s" repeatCount="indefinite" />
        </circle>

        {/* Node 4: Backend */}
        <circle cx="40%" cy="80%" r="3" fill="rgba(20, 184, 166, 0.5)">
          <animate attributeName="r" values="2;4;2" dur="3.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.35;0.7;0.35" dur="3.5s" repeatCount="indefinite" />
        </circle>

        {/* Smaller satellite nodes */}
        <circle cx="8%" cy="55%" r="2" fill="rgba(20, 184, 166, 0.3)">
          <animate attributeName="opacity" values="0.2;0.5;0.2" dur="6s" repeatCount="indefinite" />
        </circle>
        <circle cx="15%" cy="88%" r="2" fill="rgba(251, 146, 60, 0.25)">
          <animate attributeName="opacity" values="0.15;0.4;0.15" dur="7s" repeatCount="indefinite" />
        </circle>
        <circle cx="38%" cy="30%" r="1.5" fill="rgba(20, 184, 166, 0.2)">
          <animate attributeName="opacity" values="0.1;0.35;0.1" dur="5s" repeatCount="indefinite" />
        </circle>
        <circle cx="5%" cy="40%" r="1.5" fill="rgba(20, 184, 166, 0.2)">
          <animate attributeName="opacity" values="0.15;0.3;0.15" dur="4.5s" repeatCount="indefinite" />
        </circle>

        {/* ── Data Packet animations (small dots traveling along lines) ── */}
        {/* Packet: Citizen → Gateway */}
        <circle r="1.5" fill="rgba(20, 184, 166, 0.8)">
          <animateMotion dur="3s" repeatCount="indefinite" path="M 0,0 L 100,80" begin="0s">
            <mpath href="#path-cg" />
          </animateMotion>
          <animate attributeName="opacity" values="0;0.8;0.8;0" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* Packet: Gateway → IdP */}
        <circle r="1.5" fill="rgba(251, 146, 60, 0.7)">
          <animateMotion dur="4s" repeatCount="indefinite" begin="1s">
            <mpath href="#path-gi" />
          </animateMotion>
          <animate attributeName="opacity" values="0;0.7;0.7;0" dur="4s" repeatCount="indefinite" begin="1s" />
        </circle>

        {/* Hidden path elements for animateMotion */}
        <path id="path-cg" d="M 12% 25% L 30% 40%" fill="none" />
        <path id="path-gi" d="M 30% 40% L 22% 65%" fill="none" />
      </svg>

      {/* ── Floating Secure Icons (pluckr-style orbiting) ── */}
      <div className="absolute inset-0 hidden lg:block">
        {/* Shield Icon — orbits gently */}
        <div
          className="absolute"
          style={{
            left: '8%',
            top: '18%',
            animation: 'floatOrbit1 12s ease-in-out infinite',
          }}
        >
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-400/20 flex items-center justify-center backdrop-blur-sm">
            <svg className="w-5 h-5 text-teal-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
        </div>

        {/* Government emblem-style icon — floats slowly */}
        <div
          className="absolute"
          style={{
            left: '28%',
            top: '30%',
            animation: 'floatOrbit2 15s ease-in-out infinite',
          }}
        >
          <div className="w-11 h-11 rounded-xl bg-saffron-500/10 border border-saffron-400/20 flex items-center justify-center backdrop-blur-sm">
            <svg className="w-5 h-5 text-saffron-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
            </svg>
          </div>
        </div>

        {/* Verified checkmark — drifts */}
        <div
          className="absolute"
          style={{
            left: '18%',
            top: '72%',
            animation: 'floatOrbit3 10s ease-in-out infinite',
          }}
        >
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-400/15 flex items-center justify-center backdrop-blur-sm">
            <svg className="w-4 h-4 text-teal-300/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    {/* ── Content: Centered Card ── */}
    <div className="relative z-10 w-full flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-[570px]">
        <Outlet />
      </div>
    </div>
  </div>
);
