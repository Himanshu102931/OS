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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
              <Sparkles className="size-3.5" />
              <span>Skill Manual Rating Override</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">{topic.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Input 1: Evidence Strength Slider */}
          <div className="space-y-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-slate-400 font-semibold flex items-center gap-1">
                <Sliders className="size-3.5 text-blue-400" /> Skill Strength Rating (0 - 100)
              </label>
              <span className="font-mono font-bold text-sm text-blue-400">{evidenceStrength}/100</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={evidenceStrength}
              onChange={(e) => setEvidenceStrength(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Input 2: Freshness Override */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <label className="text-slate-400 font-semibold block">Freshness Classification</label>
            <select
              value={freshness}
              onChange={(e) => setFreshness(e.target.value as SkillFreshnessState)}
              className="w-full bg-slate-900 text-slate-100 font-bold p-2.5 rounded-xl border border-slate-800 focus:outline-none capitalize"
            >
              <option value="fresh">Fresh (Practiced Recently)</option>
              <option value="aging">Aging (8 - 14 Days)</option>
              <option value="stale">Stale (&gt; 14 Days)</option>
              <option value="untested">Untested (No Baseline Evidence)</option>
            </select>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} className="text-xs text-slate-400">
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold"
            >
              <CheckCircle2 className="size-3.5 mr-1" /> Save Skill Rating
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
