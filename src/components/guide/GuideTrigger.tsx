/**
 * PlacementOS Universal Page Guide — Reusable Guide Trigger Button
 *
 * Single consistent trigger component mounted on all 10 major pages.
 * Supports keyboard activation, aria-expanded/aria-controls, and closes
 * the guide if clicked while the guide is active.
 */

import React from 'react';
import { useGuide } from './GuideContext';
import { usePlacement, type RoutePath } from '../../context/PlacementContext';
import { Sparkles } from 'lucide-react';

interface GuideTriggerProps {
  route?: RoutePath;
  className?: string;
}

export const GuideTrigger: React.FC<GuideTriggerProps> = ({ route, className = '' }) => {
  const { currentRoute } = usePlacement();
  const activeRoute = route || currentRoute;
  const { startGuide, closeGuide, isOpen, activeGuide, isGuideCompleted } = useGuide();

  const isTourActive = isOpen && activeGuide?.originRoute === activeRoute;
  const isCompleted = isGuideCompleted(activeRoute);

  const handleClick = () => {
    if (isTourActive) {
      closeGuide();
    } else {
      startGuide(activeRoute);
    }
  };

  const testId = activeRoute === 'dashboard' ? 'today-guide-trigger' : 'guide-trigger';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Toggle ${activeRoute} Guide`}
      aria-haspopup="dialog"
      aria-expanded={isTourActive}
      aria-controls="placementos-guide-dialog"
      data-testid={testId}
      data-guide-target={testId}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] font-mono text-xs font-medium transition-all cursor-pointer border ${
        isTourActive
          ? 'bg-[#2E8B62] text-[#F3F7F3] border-[#46B982] shadow-sm'
          : 'bg-[#111713] hover:bg-[#1B241F] text-[#9AA99F] hover:text-[#E8F0E9] border-[#28352D] hover:border-[#3C4E43]'
      } ${className}`}
    >
      <Sparkles className={`size-3.5 ${isTourActive ? 'text-[#F3F7F3]' : 'text-[#46B982]'}`} />
      <span>Guide</span>
      {isCompleted && !isTourActive && (
        <span
          className="size-1.5 rounded-full bg-[#4CAF78] ml-0.5"
          title="Guide completed"
          aria-label="Completed"
        />
      )}
    </button>
  );
};
