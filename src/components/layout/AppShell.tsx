import React from 'react';
import { usePlacement } from '../../context/PlacementContext';
import type { RoutePath } from '../../context/PlacementContext';
import type { PlacementMode } from '../../types';
import {
  LayoutDashboard,
  Map,
  Code2,
  Sparkles,
  Building2,
  BarChart3,
  Settings,
  Calendar,
  Layers,
  Activity,
  Compass,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { currentRoute, setRoute, todayDate, activePhase, currentMode, setPlacementMode } = usePlacement();

  const navItems: { id: RoutePath; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'roadmap', label: 'Roadmap', icon: Map },
    { id: 'dsa', label: 'DSA Bank', icon: Code2 },
    { id: 'skills', label: 'Skills & Matrix', icon: Sparkles },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'analytics', label: 'Analytics & Review', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 glass-panel px-4 sm:px-8 py-3.5 shadow-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
              <Compass className="size-5 text-white animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-xl leading-none tracking-tight text-white gradient-text-blue">
                  PlacementOS
                </h1>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  V1.0 OS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block font-medium">
                Personal Placement Preparation Control System
              </p>
            </div>
          </div>

          {/* Metadata Badges */}
          <div className="flex items-center gap-3">
            {/* Mode Selector */}
            <div className="hidden md:flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs shadow-inner">
              <Activity className="size-3.5 text-blue-400 animate-pulse" />
              <span className="text-slate-400 font-medium">Mode:</span>
              <select
                value={currentMode}
                onChange={(e) => setPlacementMode(e.target.value as PlacementMode)}
                className="bg-transparent text-slate-100 font-bold focus:outline-none cursor-pointer text-xs uppercase tracking-wide"
              >
                <option value="normal" className="bg-slate-900 text-slate-200">Normal</option>
                <option value="reduced" className="bg-slate-900 text-slate-200">Reduced</option>
                <option value="exam" className="bg-slate-900 text-slate-200">Exam</option>
                <option value="placement_sprint" className="bg-slate-900 text-slate-200">Placement Sprint</option>
              </select>
            </div>

            {/* Active Phase Badge */}
            <div className="hidden lg:flex items-center gap-2 bg-indigo-950/40 border border-indigo-500/30 rounded-xl px-3.5 py-1.5 text-xs shadow-sm">
              <Layers className="size-3.5 text-indigo-400" />
              <span className="font-semibold text-indigo-200">{activePhase.name}</span>
            </div>

            {/* Today Date Badge */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-slate-200 shadow-inner">
              <Calendar className="size-3.5 text-amber-400" />
              <span className="font-mono">{todayDate}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main App Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-slate-950/40 p-3 sm:p-5 shrink-0">
          <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setRoute(item.id)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all text-left whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600/25 via-indigo-600/20 to-purple-600/20 text-blue-300 border border-blue-500/40 shadow-lg shadow-blue-500/10'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`size-4 transition-transform duration-200 ${isActive ? 'text-blue-400 scale-110' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick System Status Box */}
          <div className="mt-8 pt-5 border-t border-white/10 hidden md:block">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">System Metrics</h4>
            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex justify-between items-center">
                <span>Architecture</span>
                <span className="text-slate-200 font-mono text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  Deterministic V1
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Roadmap Span</span>
                <span className="text-slate-200 font-mono text-[11px]">Sep 26 - May 27</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Domains</span>
                <span className="text-blue-400 font-mono font-bold">11 Core</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Storage</span>
                <span className="text-emerald-400 font-mono font-semibold flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-ping inline-block" /> Offline Local
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};
