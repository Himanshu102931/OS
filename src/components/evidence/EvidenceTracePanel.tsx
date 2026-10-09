import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import {
  resolveSourceDestination,
  type EvidenceCatalog,
  type EvidenceTrace,
} from '../../engine/evidenceTrace';
import {
  ArrowRight,
  ChevronDown,
  FileQuestion,
  HelpCircle,
  Link2,
  Unlink,
} from 'lucide-react';
import { Button } from '../ui/button';

const ORIGIN_LABEL: Record<EvidenceTrace['origin'], string> = {
  direct: 'Direct source',
  aggregated: 'Aggregated',
  derived: 'Derived · no single record',
};

const CLASSIFICATION_LABEL: Record<string, string> = {
  demonstrated: 'Demonstrated evidence',
  inferred: 'Inferred readiness',
  insufficient: 'Insufficient evidence',
};

interface EvidenceTracePanelProps {
  trace: EvidenceTrace;
  /** Canonical records used to resolve per-source destinations. */
  catalog: EvidenceCatalog;
  /** Unique prefix — every testid and the disclosure's `aria-controls` derive from it. */
  idPrefix: string;
  /** Disclosure heading. */
  title?: string;
  /** Render expanded on mount. */
  defaultOpen?: boolean;
}

/**
 * SIGNAL → WHY → EVIDENCE → SOURCE → GO TO SOURCE.
 *
 * One expandable disclosure reused by every surface that has a signal to
 * explain. It renders only what `evidenceTrace` resolved: a source that is
 * missing shows as unavailable with no button, a derived entry says so, and a
 * route is only labelled as a deep link when the destination really opens it.
 */
export const EvidenceTracePanel: React.FC<EvidenceTracePanelProps> = ({
  trace,
  catalog,
  idPrefix,
  title = 'Why is this here?',
  defaultOpen = false,
}) => {
  const { setRoute } = usePlacement();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const bodyId = `${idPrefix}-trace-body`;
  const availableCount = trace.sources.filter((s) => s.availability === 'available').length;
  const missingCount = trace.sources.filter((s) => s.availability === 'missing').length;

  return (
    <div
      className="border border-border rounded-[4px] bg-surface overflow-hidden"
      data-testid={`${idPrefix}-trace`}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={bodyId}
        data-testid={`${idPrefix}-trace-toggle`}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-surface-elevated transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-accent">
          <HelpCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {title}
        </span>
        <span className="flex items-center gap-2 text-[10px] font-mono text-foreground-muted shrink-0">
          <span data-testid={`${idPrefix}-trace-origin`}>{ORIGIN_LABEL[trace.origin]}</span>
          <span aria-hidden="true">·</span>
          <span data-testid={`${idPrefix}-trace-sourcecount`}>
            {trace.sources.length} source{trace.sources.length === 1 ? '' : 's'}
          </span>
          <ChevronDown
            className={`size-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </span>
      </button>

      {isOpen && (
        <div id={bodyId} className="px-3 pb-3 pt-3 border-t border-border space-y-3 text-xs">
          {/* WHY */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground-muted">
              Why
            </span>
            <p className="text-foreground leading-relaxed" data-testid={`${idPrefix}-trace-why`}>
              {trace.why}
            </p>
          </div>

          {/* EVIDENCE */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground-muted">
              Evidence
            </span>
            <div
              className="flex flex-wrap items-center gap-1.5"
              data-testid={`${idPrefix}-trace-evidence`}
            >
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-surface-elevated border border-border text-foreground-muted">
                {ORIGIN_LABEL[trace.origin]}
              </span>
              {trace.classification && (
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] border border-border-active text-info"
                  data-testid={`${idPrefix}-trace-classification`}
                >
                  {CLASSIFICATION_LABEL[trace.classification] ?? trace.classification}
                </span>
              )}
              <span className="text-[10px] font-mono text-secondary">
                {availableCount} available · {missingCount} unavailable
              </span>
            </div>
          </div>

          {/* SOURCE */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground-muted">
              Source
            </span>
            <ul className="space-y-1.5" data-testid={`${idPrefix}-trace-sources`}>
              {trace.sources.map((source, index) => {
                const destination = resolveSourceDestination(source, catalog);
                return (
                  <li
                    key={`${source.kind}::${source.sourceId}`}
                    data-testid={`${idPrefix}-trace-source-${index}`}
                    className="p-2 bg-surface-elevated border border-border rounded-[4px] flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <span className="block text-[11px] font-semibold text-foreground">
                        {source.label}
                      </span>
                      {source.detail && (
                        <span className="block text-[10px] text-foreground-muted">{source.detail}</span>
                      )}
                      <span className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-secondary">
                        <span>{source.kind.replace(/_/g, ' ')}</span>
                        {source.timestamp ? <span>· {source.timestamp.slice(0, 10)}</span> : null}
                        {typeof source.strength === 'number' ? (
                          <span>· {source.strength}%</span>
                        ) : null}
                        <span
                          data-testid={`${idPrefix}-trace-source-${index}-status`}
                          className={
                            source.availability === 'missing'
                              ? 'px-1.5 py-0.5 rounded-[3px] border border-status-danger/40 text-status-danger'
                              : source.kind === 'derived'
                              ? 'px-1.5 py-0.5 rounded-[3px] border border-border-active text-foreground-muted'
                              : 'px-1.5 py-0.5 rounded-[3px] border border-status-success/40 text-status-success'
                          }
                        >
                          {source.availability === 'missing'
                            ? 'unavailable'
                            : source.kind === 'derived'
                            ? 'derived'
                            : 'available'}
                        </span>
                      </span>
                    </div>

                    {destination ? (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setRoute(destination.route, destination.targetId)}
                        data-testid={`${idPrefix}-trace-source-${index}-go`}
                        title={
                          destination.deepLink
                            ? destination.label
                            : `${destination.label} — page only, no deep link`
                        }
                        className="h-6 shrink-0 px-2 text-[10px] border-border bg-surface text-foreground hover:bg-surface-muted rounded-[4px]"
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
                        data-testid={`${idPrefix}-trace-source-${index}-nogo`}
                        className="flex items-center gap-1 shrink-0 text-[10px] font-mono text-secondary max-w-[9rem] text-right"
                      >
                        <FileQuestion className="size-3 shrink-0" aria-hidden="true" />
                        {source.kind === 'derived'
                          ? 'Aggregated, no single source'
                          : 'Source unavailable'}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ACTION */}
          <div className="pt-2 border-t border-border space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground-muted">
              Go to source
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="xs"
                onClick={() => setRoute(trace.destination.route, trace.destination.targetId)}
                data-testid={`${idPrefix}-trace-action`}
                className="h-7 px-3 text-[11px] bg-primary hover:bg-primary-hover text-primary-foreground font-bold font-mono rounded-[4px]"
              >
                {trace.destination.label} <ArrowRight className="size-3 ml-1" aria-hidden="true" />
              </Button>
              {trace.destination.note && (
                <span
                  className="text-[10px] text-foreground-muted max-w-[26rem]"
                  data-testid={`${idPrefix}-trace-note`}
                >
                  {trace.destination.note}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
