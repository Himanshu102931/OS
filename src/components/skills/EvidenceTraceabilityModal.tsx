import React, { useEffect, useRef } from 'react';
import type { TopicReadiness } from '../../engine/skillsEngine';
import { usePlacement } from '../../context/PlacementContext';
import {
  resolveSkillEvidenceItem,
  resolveSourceDestination,
  resolveTraceDestination,
} from '../../engine/evidenceTrace';
import { useEvidenceCatalog } from '../evidence/useEvidenceCatalog';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Target,
  ArrowRight,
  Sliders,
  CheckCircle2,
  FileCode,
  FileText,
  Code,
  Link2,
  Unlink,
} from 'lucide-react';
import { Button } from '../ui/button';

interface EvidenceTraceabilityModalProps {
  readiness: TopicReadiness | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenOverride?: () => void;
}

export const EvidenceTraceabilityModal: React.FC<EvidenceTraceabilityModalProps> = ({
  readiness,
  isOpen,
  onClose,
  onOpenOverride,
}) => {
  const { setRoute } = usePlacement();
  const catalog = useEvidenceCatalog();
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

  if (!isOpen || !readiness) return null;

  const handleActionClick = () => {
    onClose();
    const destination = resolveTraceDestination(
      readiness.recommendedAction.route,
      readiness.recommendedAction.targetId,
      catalog
    );
    setRoute(destination.route, destination.targetId);
  };

  const getStatusBadge = () => {
    switch (readiness.readinessStatus) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[var(--success,#4CAF78)] bg-[var(--success,#4CAF78)]/15 border border-[var(--success,#4CAF78)]/30 px-2.5 py-1 rounded-[4px]">
            <ShieldCheck className="size-3.5" aria-hidden="true" /> Placement Ready
          </span>
        );
      case 'on_track':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[var(--warning,#D19A45)] bg-[var(--warning,#D19A45)]/15 border border-[var(--warning,#D19A45)]/30 px-2.5 py-1 rounded-[4px]">
            <TrendingUp className="size-3.5" aria-hidden="true" /> On Track
          </span>
        );
      case 'at_risk':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[var(--danger,#D05A52)] bg-[var(--danger,#D05A52)]/15 border border-[var(--danger,#D05A52)]/30 px-2.5 py-1 rounded-[4px]">
            <AlertTriangle className="size-3.5" aria-hidden="true" /> At Risk / Aging
          </span>
        );
      case 'needs_baseline':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-foreground-muted bg-surface-elevated border border-border px-2.5 py-1 rounded-[4px]">
            <HelpCircle className="size-3.5" aria-hidden="true" /> Baseline Needed
          </span>
        );
    }
  };

  const getClassificationChip = () => {
    switch (readiness.evidenceClassification) {
      case 'demonstrated':
        return (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-[var(--success,#4CAF78)]/15 text-[var(--success,#4CAF78)] border border-[var(--success,#4CAF78)]/30 font-semibold">
            Demonstrated Evidence
          </span>
        );
      case 'inferred':
        return (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-[var(--action-accent-skills-subtle,#8b5cf61f)] text-[var(--action-accent-skills,#8B5CF6)] border border-[var(--action-accent-skills-border,#8b5cf659)] font-semibold">
            Inferred Readiness
          </span>
        );
      case 'insufficient':
      default:
        return (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-surface-elevated text-foreground-muted border border-border font-semibold">
            Insufficient Evidence
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="traceability-drawer-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-fade-in"
    >
      <div className="skills-drawer-slide bg-surface border border-border rounded-xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Drawer Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--action-accent-skills,#8B5CF6)]">
              <span className="uppercase font-bold tracking-wider">{readiness.domainName}</span>
              <span className="text-secondary">•</span>
              <span className="text-foreground-muted">Importance: {readiness.importance}/10</span>
            </div>
            <h2 id="traceability-drawer-title" className="text-xl font-bold text-foreground font-mono">
              {readiness.topicName}
            </h2>
            <div className="flex items-center gap-2 pt-1">
              {getStatusBadge()}
              {getClassificationChip()}
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close evidence traceability drawer"
            className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Readiness Overview Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-elevated p-3.5 rounded-lg border border-border text-xs font-mono">
          <div>
            <span className="text-foreground-muted text-[11px] block">Evidence Strength</span>
            <span className="text-lg font-bold text-foreground">{readiness.evidenceStrength}%</span>
          </div>

          <div>
            <span className="text-foreground-muted text-[11px] block">Level Progress</span>
            <span className="text-lg font-bold text-[var(--action-accent-skills,#8B5CF6)]">
              Level {readiness.currentLevel} <span className="text-secondary text-xs font-normal">/ {readiness.targetLevel}</span>
            </span>
          </div>

          <div>
            <span className="text-foreground-muted text-[11px] block">Freshness State</span>
            <span
              className={`text-xs font-bold capitalize mt-1 inline-block ${
                readiness.freshness === 'fresh'
                  ? 'text-[var(--success,#4CAF78)]'
                  : readiness.freshness === 'aging'
                  ? 'text-[var(--warning,#D19A45)]'
                  : readiness.freshness === 'stale'
                  ? 'text-[var(--danger,#D05A52)]'
                  : 'text-foreground-muted'
              }`}
            >
              {readiness.freshness}
            </span>
          </div>

          <div>
            <span className="text-foreground-muted text-[11px] block">Last Activity</span>
            <span className="text-xs font-bold text-foreground mt-1 block truncate">
              {readiness.lastPracticedAt ? readiness.lastPracticedAt.slice(0, 10) : 'Never'}
            </span>
          </div>
        </div>

        {/* What Caused This / Traceability Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold font-mono text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="size-3.5 text-[var(--action-accent-skills,#8B5CF6)]" aria-hidden="true" />
            What Caused This Readiness Rating?
          </h3>

          <div className="bg-surface-elevated p-4 rounded-lg border border-border space-y-3 text-xs">
            <p className="text-foreground-muted leading-relaxed">
              Readiness is computed deterministically from recorded task completions, DSA Leitner Box states, recent attempts, and evidence decay.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-1">
              <div className="p-2.5 bg-surface rounded-md border border-border space-y-1">
                <span className="text-foreground-muted text-[11px] block">Roadmap Tasks</span>
                <span className="font-bold text-foreground">
                  {readiness.taskEvidenceCount.completed} / {readiness.taskEvidenceCount.total} completed
                </span>
              </div>
              <div className="p-2.5 bg-surface rounded-md border border-border space-y-1">
                <span className="text-foreground-muted text-[11px] block">DSA Problems</span>
                <span className="font-bold text-foreground">
                  {readiness.dsaEvidenceCount.mastered} mastered (Box 3+), {readiness.dsaEvidenceCount.attempted} attempted
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Supporting Evidence Log Timeline */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold font-mono text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-[var(--success,#4CAF78)]" aria-hidden="true" />
            Supporting Evidence Timeline ({readiness.supportingEvidence.length})
          </h3>

          {readiness.supportingEvidence.length === 0 ? (
            <div className="p-4 bg-surface-elevated rounded-lg border border-border text-center text-xs text-foreground-muted font-mono">
              No recorded practice evidence for this topic yet. Complete a task or DSA problem to generate evidence.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1" data-testid="topic-evidence-list">
              {readiness.supportingEvidence.map((ev, index) => {
                const source = resolveSkillEvidenceItem(ev, catalog);
                const destination = resolveSourceDestination(source, catalog);
                return (
                  <div
                    key={ev.id}
                    data-testid={`topic-evidence-row-${index}`}
                    className="p-3 bg-surface-elevated border border-border rounded-lg flex items-center justify-between text-xs font-mono gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {ev.sourceType === 'dsa_problem' || ev.sourceType === 'dsa_attempt' ? (
                        <Code className="size-4 text-[var(--success,#4CAF78)]" aria-hidden="true" />
                      ) : ev.sourceType === 'task' ? (
                        <FileCode className="size-4 text-[var(--action-accent-skills,#8B5CF6)]" aria-hidden="true" />
                      ) : ev.sourceType === 'manual_override' ? (
                        <Sliders className="size-4 text-[var(--warning,#D19A45)]" aria-hidden="true" />
                      ) : (
                        <FileText className="size-4 text-foreground-muted" aria-hidden="true" />
                      )}
                      <div className="min-w-0">
                        <span className="font-semibold text-foreground block truncate">{ev.title}</span>
                        <span className="text-[11px] text-foreground-muted block">{ev.details}</span>
                        <span className="flex items-center gap-2 text-[10px] text-secondary mt-0.5">
                          <span data-testid={`topic-evidence-kind-${index}`}>{source.kind.replace(/_/g, ' ')}</span>
                          <span
                            data-testid={`topic-evidence-status-${index}`}
                            className={
                              source.availability === 'missing'
                                ? 'px-1.5 py-0.5 rounded-[3px] border border-[var(--danger,#D05A52)]/40 text-[var(--danger,#D05A52)]'
                                : 'px-1.5 py-0.5 rounded-[3px] border border-[var(--success,#4CAF78)]/40 text-[var(--success,#4CAF78)]'
                            }
                          >
                            {source.availability === 'missing' ? 'source unavailable' : 'source found'}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                      <span className="font-bold text-[var(--action-accent-skills,#8B5CF6)] text-xs">+{ev.scoreContribution}%</span>
                      {ev.timestamp && (
                        <span className="text-[10px] text-foreground-muted block">
                          {ev.timestamp.slice(0, 10)}
                        </span>
                      )}
                      {destination ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setRoute(destination.route, destination.targetId)}
                          data-testid={`topic-evidence-go-${index}`}
                          title={destination.deepLink ? destination.label : `${destination.label} — page only, no deep link`}
                          className="h-6 px-2 text-[10px] border-border bg-surface text-foreground hover:bg-surface-muted rounded-[4px]"
                        >
                          {destination.deepLink ? (
                            <Link2 className="size-3 mr-1" aria-hidden="true" />
                          ) : (
                            <Unlink className="size-3 mr-1" aria-hidden="true" />
                          )}
                          {destination.label}
                        </Button>
                      ) : (
                        <span
                          data-testid={`topic-evidence-nogo-${index}`}
                          className="text-[10px] text-secondary"
                        >
                          {source.kind === 'derived' ? 'aggregated' : 'no source'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Gap Explanation & Recommended Action */}
        <div className="p-4 bg-surface-elevated rounded-lg border border-border space-y-3 text-xs font-mono">
          <div className="flex items-start gap-2">
            <Target className="size-4 text-[var(--action-accent-skills,#8B5CF6)] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider">Gap Analysis & Target Requirement</span>
              <p className="text-foreground-muted mt-1 leading-relaxed">{readiness.gapExplanation}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-foreground">
              <span className="text-foreground-muted">Recommended Action: </span>
              <span className="font-bold text-[var(--action-accent-skills,#8B5CF6)]">{readiness.recommendedAction.label}</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onOpenOverride && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onOpenOverride();
                  }}
                  className="text-xs border-border text-foreground-muted hover:text-foreground bg-surface rounded-[4px]"
                >
                  <Sliders className="size-3.5 mr-1" aria-hidden="true" /> Override Rating
                </Button>
              )}

              <Button
                size="sm"
                onClick={handleActionClick}
                className="text-xs bg-[var(--action-accent-skills,#8B5CF6)] hover:bg-[var(--action-accent-skills-hover,#A78BFA)] text-white font-bold font-mono rounded-[4px] w-full sm:w-auto shadow-xs"
              >
                Execute Action <ArrowRight className="size-3.5 ml-1" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
