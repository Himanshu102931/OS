import React from 'react';
import type { PracticeCategory } from '../../types';
import {
  Sparkles,
  Target,
  MessageSquare,
  FileCode,
  BookOpen,
  ShieldCheck,
  Award,
  Search,
  Clock,
  X,
} from 'lucide-react';

export type PracticeTabCategory = PracticeCategory | 'all';

interface PracticeCategoryTabsProps {
  activeCategory: PracticeTabCategory;
  onSelectCategory: (category: PracticeTabCategory) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  timedOnly: boolean;
  onToggleTimedOnly: () => void;
}

const CATEGORIES: {
  id: PracticeTabCategory;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'all', label: 'All Sessions', icon: Sparkles },
  { id: 'aptitude', label: 'Aptitude', icon: Target },
  { id: 'verbal', label: 'Verbal', icon: MessageSquare },
  { id: 'sql', label: 'SQL', icon: FileCode },
  { id: 'core_cs', label: 'Core CS', icon: BookOpen },
  { id: 'project_defense', label: 'Project Defense', icon: ShieldCheck },
  { id: 'mock_interview', label: 'Mock Interview', icon: Award },
];

export const PracticeCategoryTabs: React.FC<PracticeCategoryTabsProps> = ({
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  timedOnly,
  onToggleTimedOnly,
}) => {
  return (
    <div className="space-y-3">
      {/* Category Tabs Strip */}
      <div
        role="tablist"
        aria-label="Practice Categories"
        className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
      >
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              role="tab"
              id={`tab-${cat.id}`}
              aria-selected={isSelected}
              aria-controls="session-catalog-panel"
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 border flex items-center gap-2 ${
                isSelected
                  ? 'bg-surface-elevated border-[#3B82F6]/50 text-foreground shadow-sm'
                  : 'bg-surface border-border text-foreground-muted hover:text-foreground hover:bg-surface-elevated/60'
              }`}
            >
              <Icon
                className={`size-3.5 ${
                  isSelected ? 'text-[#60A5FA]' : 'text-foreground-muted'
                }`}
              />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search drills by topic, keyword, or concept..."
            aria-label="Search practice drills"
            className="w-full bg-surface border border-border rounded-lg pl-8 pr-8 py-1.5 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground p-0.5 rounded"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Timed-Only Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={timedOnly}
            onClick={onToggleTimedOnly}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
              timedOnly
                ? 'bg-[#3B82F6]/10 border-[#3B82F6]/40 text-[#60A5FA]'
                : 'bg-surface border-border text-foreground-muted hover:text-foreground'
            }`}
          >
            <Clock className={`size-3.5 ${timedOnly ? 'text-[#60A5FA]' : 'text-foreground-muted'}`} />
            <span>Timed Drills Only</span>
          </button>
        </div>
      </div>
    </div>
  );
};
