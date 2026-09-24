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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-bold tracking-wider">
              <Compass className="size-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg leading-none tracking-tight text-white">PlacementOS</h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/60">
                  V1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Personal Placement Preparation System</p>
            </div>
          </div>

          {/* Phase & Date Metadata */}
          <div className="flex items-center gap-3">
            {/* Mode Selector */}
            <div className="hidden md:flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
              <Activity className="size-3.5 text-blue-400" />
              <span className="text-slate-400 font-medium">Mode:</span>
              <select
                value={currentMode}
                onChange={(e) => setPlacementMode(e.target.value as PlacementMode)}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer text-xs"
              >
                <option value="normal" className="bg-slate-900 text-slate-200">Normal Workload</option>
                <option value="reduced" className="bg-slate-900 text-slate-200">Reduced Workload</option>
                <option value="exam" className="bg-slate-900 text-slate-200">Exam Mode</option>
                <option value="placement_sprint" className="bg-slate-900 text-slate-200">Placement Sprint</option>
              </select>
            </div>

            {/* Active Phase Badge */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1 text-xs">
              <Layers className="size-3.5 text-indigo-400" />
              <span className="font-medium text-slate-300">{activePhase.name}</span>
            </div>

            {/* Today Date Badge */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-300 font-medium">
              <Calendar className="size-3.5 text-amber-400" />
              <span>{todayDate}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main App Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        {/* Desktop Sidebar Navigation */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800/80 bg-slate-950/50 p-3 sm:p-4 shrink-0">
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setRoute(item.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`size-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Domain Status Box */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 hidden md:block">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">System Specs</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Architecture</span>
                <span className="text-slate-300 font-mono">Deterministic V1</span>
              </div>
              <div className="flex justify-between">
                <span>Roadmap Scope</span>
                <span className="text-slate-300 font-mono">Sep 26 - May 27</span>
              </div>
              <div className="flex justify-between">
                <span>Core Domains</span>
                <span className="text-slate-300 font-mono">11 Active</span>
              </div>
              <div className="flex justify-between">
                <span>Storage</span>
                <span className="text-emerald-400 font-mono">Local Offline</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Route Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};
