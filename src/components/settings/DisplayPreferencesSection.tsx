import React from 'react';
import type { UserSettings } from '../../types';
import { Eye, Monitor, Bell, HelpCircle } from 'lucide-react';

interface DisplayPreferencesSectionProps {
  userSettings: UserSettings;
  onUpdate: (partial: Partial<UserSettings>, notifyMessage?: string) => void;
}

export const DisplayPreferencesSection: React.FC<DisplayPreferencesSectionProps> = ({
  userSettings,
  onUpdate,
}) => {
  return (
    <section
      aria-labelledby="display-preferences-heading"
      className="bg-surface-panel border border-border-default rounded-[4px] p-5 sm:p-6 space-y-6"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-default pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-[4px] bg-surface-subtle border border-border-default flex items-center justify-center text-accent">
            <Eye className="size-4" />
          </div>
          <div>
            <h2 id="display-preferences-heading" className="text-sm font-semibold text-text-primary flex items-center gap-2">
              Workspace & Display Preferences
            </h2>
            <p className="text-[11px] text-text-secondary">
              Customizes interface density, visual themes, and local reminder settings without modifying scoring algorithms.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-[4px] bg-surface-subtle border border-border-default text-text-secondary text-[11px] font-medium font-mono">
          <span>Presentation Only</span>
        </div>
      </div>

      {/* Preferences Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Density Mode */}
        <div className="space-y-2">
          <label htmlFor="densityMode" className="block text-xs font-medium text-text-primary flex items-center gap-1.5">
            <Monitor className="size-3.5 text-accent" />
            <span>Interface Density Mode</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id="densityMode-compact"
              onClick={() => onUpdate({ densityMode: 'compact' }, 'Interface density set to Compact')}
              className={`px-3 py-2 rounded-[4px] text-xs font-medium border transition-colors flex flex-col items-start gap-0.5 ${
                userSettings.densityMode === 'compact'
                  ? 'bg-surface-elevated border-accent text-primary-foreground'
                  : 'bg-surface-subtle border-border-default text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              <span className="font-semibold">Compact (Default)</span>
              <span className="text-[10px] text-text-tertiary">Studio-grade dense layout</span>
            </button>
            <button
              type="button"
              id="densityMode-comfortable"
              onClick={() => onUpdate({ densityMode: 'comfortable' }, 'Interface density set to Comfortable')}
              className={`px-3 py-2 rounded-[4px] text-xs font-medium border transition-colors flex flex-col items-start gap-0.5 ${
                userSettings.densityMode === 'comfortable'
                  ? 'bg-surface-elevated border-accent text-primary-foreground'
                  : 'bg-surface-subtle border-border-default text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              <span className="font-semibold">Comfortable</span>
              <span className="text-[10px] text-text-tertiary">Spacious card padding</span>
            </button>
          </div>
          <p className="text-[10px] text-text-tertiary">
            Adjusts table rows, card padding, and vertical rhythm across all primary views.
          </p>
        </div>

        {/* Theme Selection */}
        <div className="space-y-2">
          <label htmlFor="themeSelect" className="block text-xs font-medium text-text-primary">
            Visual Theme
          </label>
          <select
            id="themeSelect"
            value={userSettings.theme || 'dark'}
            onChange={(e) => {
              onUpdate({ theme: e.target.value as UserSettings['theme'] }, 'Theme preference updated');
            }}
            className="w-full bg-surface-subtle border border-border-default focus:border-accent rounded-[4px] px-3 py-2 text-xs text-text-primary focus:outline-none transition-colors cursor-pointer"
            aria-describedby="theme-helper"
          >
            <option value="dark" className="bg-surface-panel text-text-primary">Obsidian Dark (Default Technical)</option>
            <option value="high_contrast" className="bg-surface-panel text-text-primary">High Contrast Dark</option>
            <option value="slate_dark" className="bg-surface-panel text-text-primary">Slate Dark</option>
          </select>
          <p id="theme-helper" className="text-[10px] text-text-tertiary">
            High-contrast dark palettes engineered for long-duration focused study sessions.
          </p>
        </div>
      </div>

      {/* Toggles & Reminders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-border-default">
        {/* Explanation Tooltips Toggle */}
        <div className="flex items-start justify-between gap-3 p-3 rounded-[4px] bg-surface-subtle border border-border-default">
          <div className="space-y-0.5">
            <label htmlFor="showExplanationTooltips" className="text-xs font-medium text-text-primary flex items-center gap-1.5 cursor-pointer">
              <HelpCircle className="size-3.5 text-info" />
              <span>Explanation Tooltips</span>
            </label>
            <p className="text-[10px] text-text-tertiary">
              Display technical explanations and calculation formulas when hovering over telemetry badges.
            </p>
          </div>
          <input
            id="showExplanationTooltips"
            type="checkbox"
            checked={userSettings.showExplanationTooltips}
            onChange={(e) => onUpdate({ showExplanationTooltips: e.target.checked }, 'Tooltip preferences updated')}
            className="mt-1 size-4 rounded bg-surface-panel border-border-default text-accent focus:ring-accent cursor-pointer"
          />
        </div>

        {/* Daily Check-in Reminder Settings */}
        <div className="p-3 rounded-[4px] bg-surface-subtle border border-border-default space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <label htmlFor="dailyCheckInReminder" className="text-xs font-medium text-text-primary flex items-center gap-1.5 cursor-pointer">
                <Bell className="size-3.5 text-accent-amber" />
                <span>Daily Check-in Reminder</span>
              </label>
              <p className="text-[10px] text-text-tertiary">
                Enable local in-browser evening review prompt.
              </p>
            </div>
            <input
              id="dailyCheckInReminder"
              type="checkbox"
              checked={userSettings.dailyCheckInReminder}
              onChange={(e) => onUpdate({ dailyCheckInReminder: e.target.checked }, 'Reminder preferences updated')}
              className="mt-1 size-4 rounded bg-surface-panel border-border-default text-accent focus:ring-accent cursor-pointer"
            />
          </div>

          {userSettings.dailyCheckInReminder && (
            <div className="pt-2 border-t border-border-default flex items-center justify-between gap-3 animate-fade-in">
              <label htmlFor="reminderTime" className="text-[11px] text-text-secondary">
                Target Reminder Time:
              </label>
              <input
                id="reminderTime"
                type="time"
                value={userSettings.reminderTime || '20:00'}
                onChange={(e) => onUpdate({ reminderTime: e.target.value }, 'Reminder time updated')}
                className="bg-surface-panel border border-border-default focus:border-accent rounded px-2 py-1 text-xs text-text-primary font-mono focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
