import React, { useState, useEffect, useRef } from 'react';
import type { TopicSkillState, SkillFreshnessState, Topic } from '../../types';
import { AlertCircle, X, CheckCircle2, Sliders, ShieldAlert } from 'lucide-react';
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

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-override-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-fade-in"
    >
      <div className="bg-surface border border-border rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--warning,#D19A45)] uppercase tracking-wider font-mono">
              <ShieldAlert className="size-3.5" aria-hidden="true" />
              <span>Self-Attested Skill Rating</span>
            </div>
            <h2 id="skill-override-title" className="text-lg font-bold text-foreground mt-0.5 font-mono">
              {topic.name}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close skill override modal"
            className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Epistemic Distinction Notice */}
        <div className="p-3 bg-[var(--warning,#D19A45)]/10 border border-[var(--warning,#D19A45)]/30 rounded-lg flex items-start gap-2.5 text-xs text-foreground-muted">
          <AlertCircle className="size-4 text-[var(--warning,#D19A45)] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            <strong className="text-foreground">Self-Attestation Warning:</strong> Manual override modifies your local baseline rating without generating objective task or DSA evidence. Use for prior domain mastery calibration.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          {/* Input 1: Evidence Strength Slider */}
          <div className="space-y-2 p-3.5 rounded-lg bg-surface-elevated border border-border">
            <div className="flex items-center justify-between">
              <label
                htmlFor="skill-strength-slider"
                className="text-foreground-muted font-semibold flex items-center gap-1.5 text-[11px] uppercase tracking-wider"
              >
                <Sliders className="size-3.5 text-[var(--action-accent-skills,#8B5CF6)]" aria-hidden="true" />
                Evidence Strength (0 - 100)
              </label>
              <span className="font-mono font-bold text-sm text-[var(--action-accent-skills,#8B5CF6)]">
                {evidenceStrength}%
              </span>
            </div>
            <input
              id="skill-strength-slider"
              type="range"
              min={0}
              max={100}
              value={evidenceStrength}
              onChange={(e) => setEvidenceStrength(Number(e.target.value))}
              className="w-full accent-[var(--action-accent-skills,#8B5CF6)] cursor-pointer"
            />
          </div>

          {/* Input 2: Freshness Override */}
          <div className="space-y-1.5 p-3.5 rounded-lg bg-surface-elevated border border-border">
            <label
              htmlFor="skill-freshness-select"
              className="text-foreground-muted font-semibold block text-[11px] uppercase tracking-wider"
            >
              Freshness Classification
            </label>
            <select
              id="skill-freshness-select"
              value={freshness}
              onChange={(e) => setFreshness(e.target.value as SkillFreshnessState)}
              className="w-full bg-surface text-foreground font-bold p-2.5 rounded-md border border-border focus:outline-none focus:border-[var(--action-accent-skills,#8B5CF6)] capitalize"
            >
              <option value="fresh">Fresh (Practiced Recently)</option>
              <option value="aging">Aging (8 - 14 Days)</option>
              <option value="stale">Stale (&gt; 14 Days)</option>
              <option value="untested">Untested (No Baseline Evidence)</option>
            </select>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onClose}
              className="text-xs text-foreground-muted hover:text-foreground rounded-[4px]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              className="text-xs bg-[var(--action-accent-skills,#8B5CF6)] hover:bg-[var(--action-accent-skills-hover,#A78BFA)] text-white font-mono font-bold rounded-[4px] shadow-xs"
            >
              <CheckCircle2 className="size-3.5 mr-1" aria-hidden="true" /> Save Rating Override
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
