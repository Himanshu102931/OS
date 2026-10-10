import React from 'react';
import { usePlacement } from '../../context/PlacementContext';
import type { RoutePath } from '../../context/PlacementContext';
import type { PlacementMode } from '../../types';
import {
  LayoutDashboard,
  Map,
  Code2,
  Building2,
  BarChart3,
  Settings,
  Calendar,
  Layers,
  Terminal,
  Target,
  GraduationCap,
  Dumbbell,
  ClipboardCheck,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';


interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const {
    currentRoute,
    setRoute,
    todayDate,
    activePhase,
    currentMode,
    setPlacementMode,
    persistenceError,
    storageConflict,
    resolveStorageConflict,
  } = usePlacement();

  const navItems: { id: RoutePath; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Today', icon: LayoutDashboard },
    { id: 'assessment', label: 'Diagnostic', icon: ClipboardCheck },
    { id: 'roadmap', label: 'Roadmap', icon: Map },
    { id: 'dsa', label: 'DSA', icon: Code2 },
    { id: 'skills', label: 'Skills', icon: GraduationCap },
    { id: 'preparation', label: 'Preparation', icon: Target },
    { id: 'practice', label: 'Practice', icon: Dumbbell },
    { id: 'project', label: 'Project Lab', icon: Terminal },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'analytics', label: 'Review', icon: BarChart3 },
    { id: 'interview', label: 'Interview', icon: UserCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const getPageTitle = (route: RoutePath): string => {
    switch (route) {
      case 'dashboard': return 'Today / Operational Workspace';
      case 'assessment': return 'Baseline Diagnostic Assessment';
      case 'roadmap': return 'Master Roadmap & Trajectory';
      case 'dsa': return 'DSA Bank & Spaced Repetition';
      case 'skills': return 'Skills Matrix & Readiness';
      case 'preparation':
      case 'practice': return 'Preparation Hub & Workspace';
      case 'project': return 'Project Lab & Engineering Defense';
      case 'companies': return 'Target Companies & Overlays';
      case 'analytics': return 'Analytics & Review';
      case 'settings': return 'System Settings & Storage';
      case 'interview': return 'Interview Readiness Scorecard';
      default: return 'PlacementOS';
    }
  };


  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden flex flex-col font-sans bg-background text-foreground selection:bg-accent/30 selection:text-white">
      {/* Top Header Bar */}
      <header className="shrink-0 bg-surface/95 backdrop-blur-md border-b border-border px-4 sm:px-8 py-3 z-40">
        <div className="max-w-[1500px] mx-auto flex items-center justify-between gap-4">
          {/* Brand & Page Context */}
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-[4px] bg-surface-elevated border border-border flex items-center justify-center text-accent">
              <Terminal className="size-4.5" />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-semibold text-base text-foreground tracking-tight">PlacementOS</span>
              <span className="text-secondary">/</span>
              <span className="text-sm font-medium text-foreground-muted">{getPageTitle(currentRoute)}</span>
            </div>
          </div>

          {/* Global Header Controls */}
          <div className="flex items-center gap-3.5">
            {/* Mode Selector */}
            <div className="flex items-center gap-1.5 bg-surface-elevated border border-border rounded-[4px] px-3 py-1.5 text-xs">
              <span className="text-foreground-muted font-medium text-[11px]">Mode:</span>
              <select
                value={currentMode}
                onChange={(e) => setPlacementMode(e.target.value as PlacementMode)}
                className="bg-transparent text-accent font-medium focus:outline-none cursor-pointer text-xs"
              >
                <option value="normal" className="bg-surface-elevated text-foreground">Normal</option>
                <option value="reduced" className="bg-surface-elevated text-foreground">Reduced</option>
                <option value="exam" className="bg-surface-elevated text-foreground">Exam</option>
                <option value="placement_sprint" className="bg-surface-elevated text-foreground">Placement Sprint</option>
              </select>
            </div>

            {/* Active Phase Badge */}
            <div className="hidden lg:flex items-center gap-1.5 bg-surface-elevated border border-border rounded-[4px] px-3 py-1.5 text-xs text-foreground-muted">
              <Layers className="size-3.5 text-accent" />
              <span className="text-foreground font-medium text-xs">{activePhase.name}</span>
            </div>

            {/* Today Date */}
            <div className="flex items-center gap-1.5 bg-surface-elevated border border-border rounded-[4px] px-3 py-1.5 text-xs text-foreground-muted">
              <Calendar className="size-3.5 text-foreground-muted" />
              <span className="font-mono text-foreground text-xs">{todayDate}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Persistence Failure Alert Banner */}
      {persistenceError && (
        <div
          role="alert"
          aria-live="assertive"
          data-testid="persistence-error-banner"
          className="bg-danger/15 border-b border-danger/40 text-danger px-4 sm:px-8 py-2.5 text-xs flex items-center justify-between gap-3 shrink-0 z-30 animate-fade-in font-sans"
        >
          <div className="max-w-[1500px] mx-auto w-full flex items-center gap-2.5">
            <AlertTriangle className="size-4 shrink-0 text-danger" />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-semibold text-foreground">Storage Save Failed:</span>
              <span>Unable to persist changes to local browser storage (quota exceeded or storage restricted).</span>
              <span className="text-foreground-muted text-[11px]">Recent changes may not survive a page refresh or browser restart.</span>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Tab Concurrency Conflict Warning Banner */}
      {storageConflict && (
        <div
          role="alert"
          aria-live="assertive"
          data-testid="storage-conflict-banner"
          className="bg-warning/15 border-b border-warning/40 text-warning px-4 sm:px-8 py-2.5 text-xs flex items-center justify-between gap-3 shrink-0 z-30 animate-fade-in font-sans"
        >
          <div className="max-w-[1500px] mx-auto w-full flex items-center justify-between gap-2.5 flex-wrap">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="size-4 shrink-0 text-warning" />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-semibold text-foreground">Concurrent Update Detected:</span>
                <span>Another browser tab updated your saved progress. To prevent overwriting newer data, background saves in this tab are paused.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reload latest progress from storage? Any unsaved edits in this tab will be replaced with the latest saved state.')) {
                  resolveStorageConflict();
                }
              }}
              data-testid="resolve-conflict-btn"
              className="px-2.5 py-1 bg-warning/20 hover:bg-warning/30 text-warning border border-warning/50 rounded font-medium text-xs transition-colors shrink-0 cursor-pointer"
            >
              Reload Latest State
            </button>
          </div>
        </div>
      )}

      {/* Main App Container */}
      <div className="flex-1 max-w-[1500px] w-full mx-auto flex flex-col md:flex-row min-h-0 md:overflow-hidden">
        {/* Sidebar Navigation - Fixed & docked on desktop */}
        <aside className="w-full md:w-60 lg:w-64 border-b md:border-b-0 md:border-r border-border bg-surface p-3.5 shrink-0 flex flex-col justify-between md:h-full md:overflow-y-auto">
          <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setRoute(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-[4px] text-xs font-medium text-left whitespace-nowrap transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#46B982] ${
                    isActive
                      ? 'bg-[#18221B] text-[#F3F7F3] border-l-2 border-l-[#46B982] border-y border-r border-[#26352C] font-semibold shadow-sm'
                      : 'text-foreground-muted hover:text-[#F3F7F3] hover:bg-[#162019] hover:translate-x-0.5 border border-transparent'
                  }`}
                >
                  <Icon
                    className={`size-4 transition-colors duration-150 ${
                      isActive ? 'text-[#46B982]' : 'text-[#6B7C72] group-hover:text-[#46B982]'
                    }`}
                  />
                  <span className="transition-colors duration-150">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quiet System Footer */}
          <div className="mt-6 pt-4 border-t border-border hidden md:block px-2 text-[11px] text-secondary space-y-1 font-mono shrink-0">
            <div className="flex justify-between">
              <span>PlacementOS</span>
              <span className="text-foreground-muted">v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Storage</span>
              <span className="text-status-success">Local (Offline)</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area - Independently scrollable on desktop */}
        <main className="flex-1 min-w-0 bg-background md:h-full md:overflow-y-auto">
          {/*
            The page gutter lives on this wrapper, not on the scroll surface.
            A scroll container's padding is part of its own scrollport, so a
            `position: sticky; top: 0` child would pin to the bottom of that
            padding instead of its top edge — leaving a band through which page
            content scrolls visibly above the sticky element. Padding on an
            inner wrapper scrolls away with the content it belongs to, so the
            scrollport's clip edge and the sticky reference coincide.
          */}
          <div className="p-5 sm:p-7 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
