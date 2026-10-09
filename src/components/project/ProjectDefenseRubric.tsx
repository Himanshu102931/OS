import React, { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  Scale,
  Bug,
  TrendingUp,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  MessageSquareQuote,
  Lightbulb,
} from 'lucide-react';

interface RubricItem {
  id: string;
  category: string;
  badge: string;
  icon: React.FC<{ className?: string }>;
  question: string;
  interviewerIntent: string;
  preparedDefense: string;
  talkingPoints: string[];
  keyMetricOrFormula?: string;
}

const RUBRIC_ITEMS: RubricItem[] = [
  {
    id: 'rubric-elevator-pitch',
    category: 'Opening Pitch',
    badge: '60-SECOND OPENING',
    icon: Clock,
    question: 'Tell me about your project and its high-level architectural purpose.',
    interviewerIntent:
      'Tests if you can clearly articulate what the system is, who it is for, and the single most critical engineering decision without rambling.',
    preparedDefense:
      'PlacementOS is a local-first, zero-backend personal placement preparation OS for campus SDE candidates. The defining engineering decision is that all recommendations trace to an explainable 6-factor deterministic weighted formula over local state — zero LLMs and zero cloud databases.',
    talkingPoints: [
      'Problem: Placement prep spreads across notes and sheets with no objective signal on what to do next.',
      'Core Architecture: Single React Context + Pure Engines (no React deps) + StorageAdapter.',
      'Key Metric: 6-factor deterministic priority formula you can calculate by hand.',
    ],
    keyMetricOrFormula:
      'Score = 0.25×Urgency + 0.20×Weakness + 0.20×Importance + 0.15×Company + 0.10×SpacedRep + 0.10×Recovery',
  },
  {
    id: 'rubric-tradeoffs',
    category: 'System Trade-offs',
    badge: 'TECHNICAL TRADE-OFF',
    icon: Scale,
    question: 'Why did you choose localStorage over a real backend database? What trade-off did you accept?',
    interviewerIntent:
      'Tests if you understand the consequences of your architectural constraints rather than blindly defending them.',
    preparedDefense:
      'We chose localStorage to achieve instant zero-latency offline performance, zero operational cost, and absolute user privacy without backend server infrastructure. The accepted trade-off is device-bound persistence, which is mitigated via schema-versioned JSON export and import backups.',
    talkingPoints: [
      'Alternative considered: PostgreSQL / Supabase backend.',
      'Rejected because: Placement prep is personal; network latency and auth friction degrade daily flow.',
      'Mitigation: Versioned StorageAdapter (schema 1.0.0) with defaults merge and quarantine on corrupt payloads.',
    ],
    keyMetricOrFormula: 'Schema Version 1.0.0 · JSON Backup Import/Export · Quarantine Key Isolation',
  },
  {
    id: 'rubric-hardest-bug',
    category: 'Debugging & State',
    badge: 'HARDEST BUG SOLVED',
    icon: Bug,
    question: 'What was the hardest bug you encountered and how did you resolve it?',
    interviewerIntent:
      'Evaluates concurrency, edge-case handling, state boundary bugs, and debugging methodology.',
    preparedDefense:
      'The hardest bug was the midnight date rollover race condition where day check-ins were either double-sealed or missed when the browser was backgrounded or asleep. The solution was making day sealing immutable and idempotent, triggered by a 60-second periodic poll combined with a window.focus event listener.',
    talkingPoints: [
      'Root Cause: Relying on a single setTimeout timer failed when the OS put the browser tab to sleep.',
      'Fix: Idempotent date check comparing stored ISO date with local today date on window.focus.',
      'Guarantee: Once DailyCheckIn.isSealed is set to true, it is immutable and can never be re-sealed.',
    ],
    keyMetricOrFormula: 'Window Focus Listener + 60s Polling + Immutable isSealed Flag',
  },
  {
    id: 'rubric-scaling',
    category: 'Scalability & Performance',
    badge: '100X TRAFFIC SCALING',
    icon: TrendingUp,
    question: 'What is the single biggest performance bottleneck in your system, and how would you scale to 100x traffic?',
    interviewerIntent:
      'Evaluates knowledge of client-side performance, memoization, caching, database indexing, and distributed systems.',
    preparedDefense:
      'On the client side, recomputing 6-factor priority rankings on every render was mitigated by memoized pure engine functions over normalized state maps. If backed by a server at 100x traffic, we would introduce Redis caching for candidate scoring, database read-replicas, and background queue workers.',
    talkingPoints: [
      'Current Optimization: Pure functions accept plain objects; scoring re-runs only when inputs change.',
      'Server Architecture at 100x: API Gateway -> Stateless Node/Go Service -> Redis Candidate Cache -> Postgres Read-Replicas.',
      'Bottleneck target: Complex candidate scoring query offloaded to Redis sorted sets.',
    ],
    keyMetricOrFormula: 'Memoized Pure Engines + Normalized ID Lookups + O(1) State Access',
  },
  {
    id: 'rubric-rebuilding',
    category: 'Architecture Evolution',
    badge: 'WHAT WOULD YOU REBUILD',
    icon: RotateCcw,
    question: 'If you could rewrite one architectural subsystem from scratch, what would it be and why?',
    interviewerIntent:
      'Tests architectural maturity, self-awareness, and understanding of code maintainability.',
    preparedDefense:
      'I would normalize topic coverage tracking from repeated string arrays across entities into a single unified coverage map keyed by topic ID. While the current implementation is fully test-covered, a centralized coverage graph simplifies future multi-topic cross-referencing and schema migrations.',
    talkingPoints: [
      'Current pattern: Coverage tracked through arrays in tasks, practice attempts, and DSA progress.',
      'Proposed evolution: Centralized normalized topic graph: Map<TopicId, { covered, practiced, assessed, retained }>.' ,
      'Benefit: Eliminates multi-array synchronization overhead and simplifies data migrations.',
    ],
    keyMetricOrFormula: 'Normalized Single Topic Graph vs Multi-Entity String Arrays',
  },
];

export const ProjectDefenseRubric: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>('rubric-elevator-pitch');

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div
      className="space-y-4"
      data-testid="project-defense-rubric"
      role="region"
      aria-label="Viva Interrogation Rubric & Pushback Cheat-Sheet"
    >
      {/* Rubric Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#28352D] pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-[#0D9488]/15 text-[#2DD4BF] rounded border border-[#0D9488]/30 font-bold">
              Zone 4 · Viva Rubric
            </span>
            <span className="text-xs font-mono text-foreground-muted">
              5 Core Interview Defense Scenarios
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
            <ShieldAlert className="size-4 text-[#0D9488]" />
            <span>Senior Interviewer Pushback Cheat-Sheet</span>
          </h2>
        </div>
        <p className="text-[11px] text-secondary font-mono">
          Review before technical rounds
        </p>
      </div>

      {/* 5 Rubric Cards Grid / Accordion */}
      <div className="grid grid-cols-1 gap-3">
        {RUBRIC_ITEMS.map((item, index) => {
          const ItemIcon = item.icon;
          const isExpanded = expandedId === item.id;

          return (
            <div
              key={item.id}
              className={`bg-[#111713] border rounded-[6px] transition-all overflow-hidden ${
                isExpanded
                  ? 'border-[#0D9488]/40 shadow-xs'
                  : 'border-[#28352D] hover:border-[#3B4C40]'
              }`}
              data-testid={`rubric-card-${item.id}`}
            >
              {/* Card Header & Question */}
              <button
                type="button"
                onClick={() => toggleExpand(item.id)}
                aria-expanded={isExpanded}
                aria-controls={`rubric-body-${item.id}`}
                className="w-full p-4 sm:p-4.5 text-left flex items-start justify-between gap-3 cursor-pointer hover:bg-[#161E19]/60 transition-colors focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`size-8 rounded-[4px] border flex items-center justify-center shrink-0 mt-0.5 ${
                      isExpanded
                        ? 'bg-[#0D9488]/15 border-[#0D9488]/40 text-[#2DD4BF]'
                        : 'bg-[#161E19] border-[#28352D] text-foreground-muted'
                    }`}
                  >
                    <ItemIcon className="size-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#161E19] text-[#2DD4BF] border border-[#28352D]">
                        0{index + 1} · {item.badge}
                      </span>
                      <span className="text-[11px] font-mono text-secondary">
                        {item.category}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                      "{item.question}"
                    </h3>
                  </div>
                </div>

                <div className="shrink-0 text-foreground-muted mt-1">
                  {isExpanded ? (
                    <ChevronUp className="size-4 text-[#2DD4BF]" />
                  ) : (
                    <ChevronDown className="size-4 text-secondary" />
                  )}
                </div>
              </button>

              {/* Expandable Prepared Defense Body */}
              {isExpanded && (
                <div
                  id={`rubric-body-${item.id}`}
                  className="p-4 sm:p-5 pt-0 space-y-3.5 border-t border-[#28352D]/60 bg-[#161E19]/30"
                >
                  {/* Interviewer Intent */}
                  <div className="p-3 bg-[#161E19] border border-[#28352D] rounded text-xs space-y-1">
                    <span className="text-[10px] font-mono font-bold text-status-warning flex items-center gap-1.5 uppercase tracking-wider">
                      <Lightbulb className="size-3" />
                      Interviewer Intent & Pushback Angle
                    </span>
                    <p className="text-[11px] text-foreground-muted leading-relaxed">
                      {item.interviewerIntent}
                    </p>
                  </div>

                  {/* Prepared Defense Model Answer */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono font-bold text-[#2DD4BF] flex items-center gap-1.5 uppercase tracking-wider">
                      <MessageSquareQuote className="size-3.5" />
                      Prepared Defense (Say This)
                    </span>
                    <blockquote className="p-3.5 bg-[#111713] border border-[#0D9488]/30 rounded text-xs text-foreground leading-relaxed italic border-l-4 border-l-[#0D9488]">
                      "{item.preparedDefense}"
                    </blockquote>
                  </div>

                  {/* Key Talking Points */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono font-bold text-foreground-muted uppercase tracking-wider block">
                      Key Verification Points
                    </span>
                    <ul className="space-y-1.5 text-xs text-foreground-muted">
                      {item.talkingPoints.map((pt) => (
                        <li key={pt} className="flex items-start gap-2">
                          <span className="size-1.5 rounded-full bg-[#0D9488] shrink-0 mt-1.5" />
                          <span className="leading-relaxed">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Key Metric or Formula Badge */}
                  {item.keyMetricOrFormula && (
                    <div className="p-2.5 bg-[#111713] border border-[#28352D] rounded flex items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="text-secondary">Checkable Claim:</span>
                      <span className="text-foreground font-bold text-right">
                        {item.keyMetricOrFormula}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
