import React from 'react';
import { BASELINE_ASSESSMENT_DEFINITION } from '../../data/assessment/definitions';
import { BASELINE_ASSESSMENT_ITEMS } from '../../data/assessment/items';
import { Layers, CheckCircle, Clock } from 'lucide-react';

const DOMAIN_DETAILS: Record<string, { label: string; construct: string; category: string }> = {
  aptitude: { label: 'Quantitative & Logical Aptitude', construct: 'Numerical speed, logical reasoning, verbal comprehension', category: 'Class A (Core)' },
  dsa: { label: 'Data Structures & Algorithms', construct: 'Arrays, trees, graphs, dynamic programming, recursion', category: 'Class A (Core)' },
  python: { label: 'Python Programming', construct: 'Syntax, memory model, sandboxed test execution', category: 'Class A (Core)' },
  sql: { label: 'SQL & Relational Queries', construct: 'Syntactic query normalization, joins, aggregations', category: 'Class A (Core)' },
  dbms: { label: 'Database Management Systems', construct: 'Indexing, ACID transactions, concurrency, normalization', category: 'Class A (Core)' },
  oop: { label: 'Object-Oriented Design', construct: 'Polymorphism, SOLID principles, design patterns', category: 'Class A (Core)' },
  os: { label: 'Operating Systems', construct: 'Processes, threads, virtual memory, synchronization', category: 'Class A (Core)' },
  cn: { label: 'Computer Networks', construct: 'OSI model, TCP/IP, HTTP/DNS, sockets', category: 'Class A (Core)' },
  communication: { label: 'Technical Communication', construct: 'Technical clarity, structure, conflict resolution', category: 'Class B (Proxy)' },
  interviews: { label: 'Interview Reasoning', construct: 'Behavioral responses, STAR method, project defense', category: 'Class B (Proxy)' },
};

export const AssessmentConstructBlueprint: React.FC = () => {
  const totalItems = BASELINE_ASSESSMENT_ITEMS.length;
  const totalTime = BASELINE_ASSESSMENT_DEFINITION.timeLimitMinutes;

  return (
    <section aria-labelledby="construct-blueprint-heading" className="bg-surface-panel border border-border rounded-md overflow-hidden space-y-0">
      {/* Header Bar */}
      <div className="px-5 py-3.5 border-b border-border bg-surface-elevated/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-action-accent" aria-hidden="true" />
          <h2 id="construct-blueprint-heading" className="text-xs font-semibold text-foreground uppercase tracking-wider">
            10-Module Construct Blueprint
          </h2>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="size-3.5 text-success" aria-hidden="true" />
            <strong className="text-foreground">{totalItems} Standardized Items</strong>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-action-accent" aria-hidden="true" />
            <strong className="text-foreground">{totalTime} min Limit</strong>
          </span>
        </div>
      </div>

      {/* Modules Table */}
      <div className="divide-y divide-border/60 text-xs">
        {BASELINE_ASSESSMENT_DEFINITION.modules.map((mod, idx) => {
          const info = DOMAIN_DETAILS[mod.domainId] || {
            label: mod.domainId.toUpperCase(),
            construct: 'Domain competency evaluation',
            category: 'Standard Module',
          };

          return (
            <div
              key={mod.domainId}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-elevated/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="size-6 rounded flex items-center justify-center font-mono text-[11px] bg-surface-elevated text-action-accent border border-border shrink-0 mt-0.5">
                  M{idx + 1}
                </span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold uppercase tracking-wider text-foreground">
                      {mod.domainId}
                    </span>
                    <span className="text-muted-foreground">— {info.label}</span>
                  </div>
                  <div className="text-[11px] text-secondary">
                    {info.construct}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 text-[11px] font-mono sm:text-right">
                <span className="px-2 py-0.5 rounded bg-surface-elevated text-muted-foreground border border-border">
                  {info.category}
                </span>
                <span className="text-foreground font-semibold w-16 text-right">
                  {mod.itemCount} items
                </span>
                <span className="text-muted-foreground w-20 text-right">
                  ~{mod.timeBudget} min
                </span>
              </div>
            </div>
          );
        })}

        {/* Class C Projects Explicit Callout */}
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-elevated/20 text-secondary">
          <div className="flex items-start gap-3">
            <span className="size-6 rounded flex items-center justify-center font-mono text-[11px] bg-surface-panel text-secondary border border-border shrink-0 mt-0.5">
              —
            </span>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                  Projects & Portfolio
                </span>
                <span className="text-secondary">— Full-Stack & System Defense</span>
              </div>
              <div className="text-[11px] text-secondary italic">
                Class C construct: Excluded from automated baseline. Evaluated through viva defense in Project Lab.
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-secondary">
            Evaluated in Project Lab
          </div>
        </div>
      </div>
    </section>
  );
};
