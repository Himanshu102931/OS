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
  Terminal,
  Target,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { currentRoute, setRoute, todayDate, activePhase, currentMode, setPlacementMode } = usePlacement();

  const navItems: { id: RoutePath; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Today', icon: LayoutDashboard },
    { id: 'roadmap', label: 'Roadmap', icon: Map },
    { id: 'dsa', label: 'DSA Bank', icon: Code2 },
    { id: 'skills', label: 'Skills Matrix', icon: Sparkles },
    { id: 'practice', label: 'Practice Hub', icon: Target },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'analytics', label: 'Analytics & Review', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const getPageTitle = (route: RoutePath): string => {
    switch (route) {
      case 'dashboard': return 'Today / Operational Workspace';
      case 'roadmap': return 'Master Roadmap & Trajectory';
      case 'dsa': return 'DSA Bank & Spaced Repetition';
      case 'skills': return 'Skills Matrix & Readiness';
      case 'practice': return 'Placement Assessment & Practice Hub';
      case 'companies': return 'Target Companies & Overlays';
      case 'analytics': return 'Analytics & Telemetry Review';
      case 'settings': return 'System Settings & Storage';
      default: return 'PlacementOS';
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#0D0F12] text-[#F1F5F9] selection:bg-[#E5A93C]/30 selection:text-white">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#14171D]/95 backdrop-blur-md border-b border-[#262D38] px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand & Page Context */}
          <div className="flex items-center gap-3">
            <div className="size-7 rounded-[4px] bg-[#1B2028] border border-[#262D38] flex items-center justify-center text-[#E5A93C]">
              <Terminal className="size-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[#F1F5F9] tracking-tight">PlacementOS</span>
              <span className="text-[#5C6675]">/</span>
              <span className="text-xs font-medium text-[#8E98A8]">{getPageTitle(currentRoute)}</span>
            </div>
          </div>

          {/* Global Header Controls */}
          <div className="flex items-center gap-3">
            {/* Mode Selector */}
            <div className="flex items-center gap-1.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] px-2.5 py-1 text-xs">
              <span className="text-[#8E98A8] font-medium text-[11px]">Mode:</span>
              <select
                value={currentMode}
                onChange={(e) => setPlacementMode(e.target.value as PlacementMode)}
                className="bg-transparent text-[#FFC665] font-medium focus:outline-none cursor-pointer text-xs"
              >
                <option value="normal" className="bg-[#1B2028] text-[#F1F5F9]">Normal</option>
                <option value="reduced" className="bg-[#1B2028] text-[#F1F5F9]">Reduced</option>
                <option value="exam" className="bg-[#1B2028] text-[#F1F5F9]">Exam</option>
                <option value="placement_sprint" className="bg-[#1B2028] text-[#F1F5F9]">Placement Sprint</option>
              </select>
            </div>

            {/* Active Phase Badge */}
            <div className="hidden lg:flex items-center gap-1.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] px-2.5 py-1 text-xs text-[#8E98A8]">
              <Layers className="size-3.5 text-[#E5A93C]" />
              <span className="text-[#F1F5F9] font-medium text-[11px]">{activePhase.name}</span>
            </div>

            {/* Today Date */}
            <div className="flex items-center gap-1.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] px-2.5 py-1 text-xs text-[#8E98A8]">
              <Calendar className="size-3.5 text-[#8E98A8]" />
              <span className="font-mono text-[#F1F5F9] text-[11px]">{todayDate}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main App Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-56 border-b md:border-b-0 md:border-r border-[#262D38] bg-[#14171D] p-3 shrink-0 flex flex-col justify-between">
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setRoute(item.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-[4px] text-xs font-medium transition-all text-left whitespace-nowrap ${
                    isActive
                      ? 'bg-[#1B2028] text-[#F1F5F9] border border-[#3B4556] font-semibold shadow-sm'
                      : 'text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028]/60 border border-transparent'
                  }`}
                >
                  <Icon className={`size-4 ${isActive ? 'text-[#E5A93C]' : 'text-[#5C6675]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quiet System Footer */}
          <div className="mt-6 pt-4 border-t border-[#262D38] hidden md:block px-2 text-[11px] text-[#5C6675] space-y-1 font-mono">
            <div className="flex justify-between">
              <span>PlacementOS</span>
              <span className="text-[#8E98A8]">v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Storage</span>
              <span className="text-[#10B981]">Local (Offline)</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 min-w-0 bg-[#0D0F12]">
          {children}
        </main>
      </div>
    </div>
  );
};
