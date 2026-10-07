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
      className="bg-[#111713] border border-[#28352D] rounded-[4px] p-5 sm:p-6 space-y-6"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#28352D] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-[4px] bg-[#161E19] border border-[#28352D] flex items-center justify-center text-[#46B982]">
            <Eye className="size-4" />
          </div>
          <div>
            <h2 id="display-preferences-heading" className="text-sm font-semibold text-[#E8F0E9] flex items-center gap-2">
              Workspace & Display Preferences
            </h2>
            <p className="text-[11px] text-[#9AA99F]">
              Customizes interface density, visual themes, and local reminder settings without modifying scoring algorithms.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-[4px] bg-[#161E19] border border-[#28352D] text-[#9AA99F] text-[11px] font-medium font-mono">
          <span>Presentation Only</span>
        </div>
      </div>

      {/* Preferences Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Density Mode */}
        <div className="space-y-2">
          <label htmlFor="densityMode" className="block text-xs font-medium text-[#E8F0E9] flex items-center gap-1.5">
            <Monitor className="size-3.5 text-[#46B982]" />
            <span>Interface Density Mode</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id="densityMode-compact"
              onClick={() => onUpdate({ densityMode: 'compact' }, 'Interface density set to Compact')}
              className={`px-3 py-2 rounded-[4px] text-xs font-medium border transition-colors flex flex-col items-start gap-0.5 ${
                userSettings.densityMode === 'compact'
                  ? 'bg-[#18221B] border-[#46B982] text-[#F3F7F3]'
                  : 'bg-[#161E19] border-[#28352D] text-[#9AA99F] hover:text-[#E8F0E9] hover:bg-[#1B241F]'
              }`}
            >
              <span className="font-semibold">Compact (Default)</span>
              <span className="text-[10px] text-[#86958B]">Studio-grade dense layout</span>
            </button>
            <button
              type="button"
              id="densityMode-comfortable"
              onClick={() => onUpdate({ densityMode: 'comfortable' }, 'Interface density set to Comfortable')}
              className={`px-3 py-2 rounded-[4px] text-xs font-medium border transition-colors flex flex-col items-start gap-0.5 ${
                userSettings.densityMode === 'comfortable'
                  ? 'bg-[#18221B] border-[#46B982] text-[#F3F7F3]'
                  : 'bg-[#161E19] border-[#28352D] text-[#9AA99F] hover:text-[#E8F0E9] hover:bg-[#1B241F]'
              }`}
            >
              <span className="font-semibold">Comfortable</span>
              <span className="text-[10px] text-[#86958B]">Spacious card padding</span>
            </button>
          </div>
          <p className="text-[10px] text-[#86958B]">
            Adjusts table rows, card padding, and vertical rhythm across all primary views.
          </p>
        </div>

        {/* Theme Selection */}
        <div className="space-y-2">
          <label htmlFor="themeSelect" className="block text-xs font-medium text-[#E8F0E9]">
            Visual Theme
          </label>
          <select
            id="themeSelect"
            value={userSettings.theme || 'dark'}
            onChange={(e) => {
              onUpdate({ theme: e.target.value as UserSettings['theme'] }, 'Theme preference updated');
            }}
            className="w-full bg-[#161E19] border border-[#28352D] focus:border-[#46B982] rounded-[4px] px-3 py-2 text-xs text-[#E8F0E9] focus:outline-none transition-colors cursor-pointer"
            aria-describedby="theme-helper"
          >
            <option value="dark" className="bg-[#111713] text-[#E8F0E9]">Obsidian Dark (Default Technical)</option>
            <option value="high_contrast" className="bg-[#111713] text-[#E8F0E9]">High Contrast Dark</option>
            <option value="slate_dark" className="bg-[#111713] text-[#E8F0E9]">Slate Dark</option>
          </select>
          <p id="theme-helper" className="text-[10px] text-[#86958B]">
            High-contrast dark palettes engineered for long-duration focused study sessions.
          </p>
        </div>
      </div>

      {/* Toggles & Reminders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-[#28352D]">
        {/* Explanation Tooltips Toggle */}
        <div className="flex items-start justify-between gap-3 p-3 rounded-[4px] bg-[#161E19] border border-[#28352D]">
          <div className="space-y-0.5">
            <label htmlFor="showExplanationTooltips" className="text-xs font-medium text-[#E8F0E9] flex items-center gap-1.5 cursor-pointer">
              <HelpCircle className="size-3.5 text-[#0EA5E9]" />
              <span>Explanation Tooltips</span>
            </label>
            <p className="text-[10px] text-[#86958B]">
              Display technical explanations and calculation formulas when hovering over telemetry badges.
            </p>
          </div>
          <input
            id="showExplanationTooltips"
            type="checkbox"
            checked={userSettings.showExplanationTooltips}
            onChange={(e) => onUpdate({ showExplanationTooltips: e.target.checked }, 'Tooltip preferences updated')}
            className="mt-1 size-4 rounded bg-[#111713] border-[#28352D] text-[#46B982] focus:ring-[#46B982] cursor-pointer"
          />
        </div>

        {/* Daily Check-in Reminder Settings */}
        <div className="p-3 rounded-[4px] bg-[#161E19] border border-[#28352D] space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <label htmlFor="dailyCheckInReminder" className="text-xs font-medium text-[#E8F0E9] flex items-center gap-1.5 cursor-pointer">
                <Bell className="size-3.5 text-[#E5A93C]" />
                <span>Daily Check-in Reminder</span>
              </label>
              <p className="text-[10px] text-[#86958B]">
                Enable local in-browser evening review prompt.
              </p>
            </div>
            <input
              id="dailyCheckInReminder"
              type="checkbox"
              checked={userSettings.dailyCheckInReminder}
              onChange={(e) => onUpdate({ dailyCheckInReminder: e.target.checked }, 'Reminder preferences updated')}
              className="mt-1 size-4 rounded bg-[#111713] border-[#28352D] text-[#46B982] focus:ring-[#46B982] cursor-pointer"
            />
          </div>

          {userSettings.dailyCheckInReminder && (
            <div className="pt-2 border-t border-[#28352D] flex items-center justify-between gap-3 animate-fade-in">
              <label htmlFor="reminderTime" className="text-[11px] text-[#9AA99F]">
                Target Reminder Time:
              </label>
              <input
                id="reminderTime"
                type="time"
                value={userSettings.reminderTime || '20:00'}
                onChange={(e) => onUpdate({ reminderTime: e.target.value }, 'Reminder time updated')}
                className="bg-[#111713] border border-[#28352D] focus:border-[#46B982] rounded px-2 py-1 text-xs text-[#E8F0E9] font-mono focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
