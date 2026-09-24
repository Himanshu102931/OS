import React, { useState } from 'react';
import type { TopicSkillState, SkillFreshnessState, Topic } from '../../types';
import { Sparkles, X, CheckCircle2, Sliders } from 'lucide-react';
import { Button } from '../ui/button';

interface SkillOverrideModalProps {
  topic: Topic | null;
  skillState: TopicSkillState | undefined;
  isOpen: boolean;
  onClose: () => void;
  onSubmitOverride: (updatedSkillState: TopicSkillState) => void;
}

export const SkillOverrideModal: React.FC<SkillOverrideModalProps> = ({
  topic,
  skillState,
  isOpen,
  onClose,
  onSubmitOverride,
}) => {
  const [evidenceStrength, setEvidenceStrength] = useState<number>(
    skillState?.evidenceStrength ?? 50
  );
  const [freshness, setFreshness] = useState<SkillFreshnessState>(
    skillState?.freshness ?? 'fresh'
  );

  if (!isOpen || !topic) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: TopicSkillState = {
      topicId: topic.id,
      domainId: topic.domainId,
      lastPracticedAt: new Date().toISOString(),
      freshness,
      evidenceStrength,
    };

    onSubmitOverride(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0F12]/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#14171D] border border-[#262D38] rounded-[4px] max-w-md w-full p-6 space-y-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#262D38] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#FFC665] uppercase tracking-wider font-mono">
              <Sparkles className="size-3.5" />
              <span>Skill Manual Rating Override</span>
            </div>
            <h2 className="text-xl font-bold text-[#F1F5F9] mt-0.5 font-mono">{topic.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[4px] text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028] transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          {/* Input 1: Evidence Strength Slider */}
          <div className="space-y-2 p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38]">
            <div className="flex items-center justify-between">
              <label className="text-[#8E98A8] font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider">
                <Sliders className="size-3.5 text-[#FFC665]" /> Skill Strength Rating (0 - 100)
              </label>
              <span className="font-mono font-bold text-sm text-[#FFC665]">{evidenceStrength}/100</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={evidenceStrength}
              onChange={(e) => setEvidenceStrength(Number(e.target.value))}
              className="w-full accent-[#E5A93C] cursor-pointer"
            />
          </div>

          {/* Input 2: Freshness Override */}
          <div className="space-y-1.5 p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38]">
            <label className="text-[#8E98A8] font-semibold block text-[11px] uppercase tracking-wider">Freshness Classification</label>
            <select
              value={freshness}
              onChange={(e) => setFreshness(e.target.value as SkillFreshnessState)}
              className="w-full bg-[#14171D] text-[#F1F5F9] font-bold p-2.5 rounded-[4px] border border-[#262D38] focus:outline-none focus:border-[#3B4556] capitalize"
            >
              <option value="fresh">Fresh (Practiced Recently)</option>
              <option value="aging">Aging (8 - 14 Days)</option>
              <option value="stale">Stale (&gt; 14 Days)</option>
              <option value="untested">Untested (No Baseline Evidence)</option>
            </select>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#262D38]">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} className="text-xs text-[#8E98A8] hover:text-[#F1F5F9] rounded-[4px]">
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              className="text-xs bg-[#E5A93C] hover:bg-[#FFC665] text-[#0D0F12] font-mono font-bold rounded-[4px]"
            >
              <CheckCircle2 className="size-3.5 mr-1" /> Save Skill Rating
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
