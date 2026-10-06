/* eslint-disable react-refresh/only-export-components */
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import type { RoutePath } from '../../context/PlacementContext';
import type { CandidateTask } from '../../engine/adaptiveEngine';
import { getTaskLearningRoute } from '../../engine/taskFlowEngine';
import { Sparkles, Clock, AlertCircle, ShieldAlert, Check } from 'lucide-react';

/* ─── Types ─── */
export interface TodayHeroVisualProps {
  candidates: CandidateTask[];
}

export interface HeroNodeDestination {
  route: RoutePath;
  linkedTopicId?: string;
}

export type HeroNodeState = 'mission' | 'due' | 'urgent' | 'blocked' | 'complete' | 'idle';

interface VisualNode {
  id: string;
  label: string;
  shortLabel: string;
  angle: number;
  baseRadius: number;
  state: HeroNodeState;
  evidenceStrength: number;
  destination: HeroNodeDestination | null;
}

/* ─── Domain → Preparation Topic canonical routing ─── */
export const DOMAIN_TO_PREP_TOPIC: Record<string, string> = {
  python: 'prep-lang',
  sql: 'prep-sql',
  dbms: 'prep-dbms',
  oop: 'prep-oop',
  os: 'prep-os',
  cn: 'prep-cn',
  aptitude: 'prep-apt-quant',
  communication: 'prep-comm',
  interviews: 'prep-interview-tech',
  projects: 'prep-coding-ds',
};

const DOMAIN_IDS = ['dsa', 'python', 'sql', 'oop', 'dbms', 'os', 'cn', 'aptitude', 'communication', 'interviews', 'projects'] as const;
const DOMAIN_NODE_PREFIX = 'domain-';
const HERO_MAX_PX = 520;

export function resolveHeroNodeDestination(
  nodeId: string,
  candidates: readonly CandidateTask[]
): HeroNodeDestination | null {
  if (nodeId === 'primary') {
    const primaryTask = candidates[0]?.task;
    if (!primaryTask) return null;
    const route = getTaskLearningRoute(primaryTask);
    return { route: route.route, linkedTopicId: route.linkedTopicId };
  }

  if (nodeId === 'company') return { route: 'companies' };

  const domainId = nodeId.startsWith(DOMAIN_NODE_PREFIX)
    ? nodeId.slice(DOMAIN_NODE_PREFIX.length)
    : nodeId;

  if (domainId === 'dsa') return { route: 'dsa' };

  const prepTopicId = DOMAIN_TO_PREP_TOPIC[domainId];
  return prepTopicId ? { route: 'preparation', linkedTopicId: prepTopicId } : null;
}

const STATE_ICONS: Record<HeroNodeState, React.ComponentType<{ className?: string }> | null> = {
  mission: Sparkles,
  due: Clock,
  urgent: AlertCircle,
  blocked: ShieldAlert,
  complete: Check,
  idle: null,
};

const STATE_CLASSES: Record<HeroNodeState, { button: string; border: string; text: string }> = {
  mission: {
    button: 'border-accent bg-accent/15 text-accent shadow-sm',
    border: 'border-accent',
    text: 'text-accent',
  },
  due: {
    button: 'border-warning border-dashed bg-warning/10 text-status-warning',
    border: 'border-warning border-dashed',
    text: 'text-status-warning',
  },
  urgent: {
    button: 'border-warning ring-1 ring-warning bg-warning/15 text-status-warning',
    border: 'border-warning ring-1 ring-warning',
    text: 'text-status-warning',
  },
  blocked: {
    button: 'border-danger border-dotted bg-danger/10 text-status-danger',
    border: 'border-danger border-dotted',
    text: 'text-status-danger',
  },
  complete: {
    button: 'border-success bg-success/15 text-status-success',
    border: 'border-success',
    text: 'text-status-success',
  },
  idle: {
    button: 'border-border-default bg-surface-subtle text-text-tertiary',
    border: 'border-border-default',
    text: 'text-text-tertiary',
  },
};

/* ─── Component ─── */
export const TodayHeroVisual: React.FC<TodayHeroVisualProps> = ({ candidates }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState(480);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  const {
    dsaProblems,
    dsaProgress,
    skillStates,
    companyOverlays,
    todayDate,
    setRoute,
    dailyTaskAssignments,
  } = usePlacement();

  // Reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const h = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  // Responsive measurement: tracks outer container, capped by HERO_MAX_PX
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const applyWidth = (width: number) => {
      if (width > 0) setSize(Math.min(Math.round(width), HERO_MAX_PX));
    };

    if (typeof ResizeObserver === 'undefined') {
      applyWidth(el.getBoundingClientRect().width);
      const onResize = () => applyWidth(el.getBoundingClientRect().width);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) applyWidth(entry.contentRect.width);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const currentTaskId = candidates[0]?.task?.id;
  const [prevTaskId, setPrevTaskId] = useState(currentTaskId);
  const [signals, setSignals] = useState<Array<{ id: string; from: string; to: string }>>(() => {
    const isReduced = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
    return !isReduced && candidates[0]?.task
      ? [{ id: `sig-${candidates[0].task.id}`, from: `domain-${candidates[0].task.domainId}`, to: 'primary' }]
      : [];
  });

  if (currentTaskId !== prevTaskId) {
    setPrevTaskId(currentTaskId);
    setSignals(
      !reducedMotion && candidates[0]?.task
        ? [{ id: `sig-${candidates[0].task.id}`, from: `domain-${candidates[0].task.domainId}`, to: 'primary' }]
        : []
    );
  }

  const missionDomainId = candidates[0]?.task?.domainId;

  const activeComps = useMemo(
    () => companyOverlays.filter(
      (c) => c.applicationStatus !== 'rejected' && c.applicationStatus !== 'archived'
    ),
    [companyOverlays]
  );

  const urgentComps = useMemo(
    () => activeComps.filter(
      (c) => c.applicationStatus === 'interview_scheduled' || c.applicationStatus === 'oa_scheduled'
    ),
    [activeComps]
  );

  // Nodes derivation
  const nodes: VisualNode[] = useMemo(() => {
    const primaryTask = candidates[0]?.task;
    const hasCandidate = !!primaryTask;
    const primaryScore = candidates[0]?.breakdown?.finalScore ?? 0;

    const scale = Math.min(1, Math.max(0.72, size / 360));

    const centerNode: VisualNode = {
      id: 'primary',
      label: primaryTask?.title || 'All caught up',
      shortLabel: hasCandidate ? '●' : '○',
      angle: 0,
      baseRadius: Math.round(28 * scale),
      state: hasCandidate ? 'mission' : 'idle',
      evidenceStrength: primaryScore,
      destination: resolveHeroNodeDestination('primary', candidates),
    };

    const DOMAIN_SHORT_LABELS: Record<string, string> = {
      dsa: 'DSA',
      python: 'PY',
      sql: 'SQL',
      oop: 'OOP',
      dbms: 'DBMS',
      os: 'OS',
      cn: 'CN',
      aptitude: 'APT',
      communication: 'COM',
      interviews: 'INT',
      projects: 'PRO',
    };

    const domainNodes: VisualNode[] = DOMAIN_IDS.map((did, i) => {
      const domainSkillStates = Object.values(skillStates).filter((s) => s.domainId === did);
      const avgStrength = domainSkillStates.length > 0
        ? domainSkillStates.reduce((sum, s) => sum + s.evidenceStrength, 0) / domainSkillStates.length
        : 0;

      const isMission = hasCandidate && did === missionDomainId;
      const isBlocked = domainSkillStates.some((s) => s.freshness === 'stale');
      const isUrgent = activeComps.some(
        (c) => (c.applicationStatus === 'interview_scheduled' || c.applicationStatus === 'oa_scheduled') &&
               c.requiredDomains?.includes(did)
      );
      const isDue = did === 'dsa'
        ? dsaProblems.some((p) => {
            const dp = dsaProgress[p.id];
            return dp?.nextReviewAt && dp.nextReviewAt <= todayDate;
          })
        : domainSkillStates.some((s) => s.freshness === 'aging');

      const domainAssignments = dailyTaskAssignments.filter((a) => a.date === todayDate);
      const isComplete = domainAssignments.length > 0 && domainAssignments.every((a) => a.completed);

      // Resolution order: mission > blocked > urgent > due > complete > idle
      let nodeState: HeroNodeState = 'idle';
      if (isMission) nodeState = 'mission';
      else if (isBlocked) nodeState = 'blocked';
      else if (isUrgent) nodeState = 'urgent';
      else if (isDue) nodeState = 'due';
      else if (isComplete) nodeState = 'complete';

      const unscaledR = 14 + (avgStrength / 100) * 8;

      return {
        id: `domain-${did}`,
        label: `${did.toUpperCase()} — ${avgStrength.toFixed(0)}%`,
        shortLabel: DOMAIN_SHORT_LABELS[did] ?? did.toUpperCase().slice(0, 3),
        angle: (Math.PI * 2 * i) / DOMAIN_IDS.length + Math.PI * 0.15,
        baseRadius: Math.round(unscaledR * scale),
        state: nodeState,
        evidenceStrength: avgStrength,
        destination: resolveHeroNodeDestination(`domain-${did}`, candidates),
      };
    });

    if (urgentComps.length > 0) {
      domainNodes.push({
        id: 'company',
        label: `Companies — ${urgentComps.length} urgent`,
        shortLabel: 'CO',
        angle: Math.PI * 0.5,
        baseRadius: Math.round(16 * scale),
        state: 'urgent',
        evidenceStrength: 0,
        destination: resolveHeroNodeDestination('company', candidates),
      });
    }

    return [centerNode, ...domainNodes];
  }, [candidates, dsaProblems, dsaProgress, skillStates, todayDate, dailyTaskAssignments, missionDomainId, activeComps, urgentComps, size]);

  const cx = size / 2;
  const cy = size / 2;
  const orbitRadius = size * 0.34;

  const dueCount = nodes.filter((n) => n.id !== 'primary' && n.state === 'due').length;
  const urgentCount = nodes.filter((n) => n.id !== 'primary' && n.state === 'urgent').length;
  const todayAssignments = dailyTaskAssignments.filter((a) => a.date === todayDate);
  const completedAssignments = todayAssignments.filter((a) => a.completed).length;

  const activateNode = useCallback(
    (node: VisualNode) => {
      if (!node.destination) return;
      setActiveNode((prev) => (prev === node.id ? null : node.id));
      setRoute(node.destination.route, node.destination.linkedTopicId);
    },
    [setRoute]
  );

  const onNodeKeyDown = useCallback(
    (event: React.KeyboardEvent, node: VisualNode) => {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        activateNode(node);
      }
    },
    [activateNode]
  );

  return (
    <div
      ref={containerRef}
      data-testid="today-hero"
      role="group"
      aria-label="Today's domain map"
      data-candidate-task-id={candidates[0]?.task.id ?? ''}
      data-candidate-task-title={candidates[0]?.task.title ?? ''}
      data-candidate-score={candidates[0]?.breakdown ? String(candidates[0].breakdown.finalScore) : ''}
      data-candidate-reason={candidates[0]?.breakdown?.explanation ?? ''}
      className="relative w-full"
      style={{
        maxWidth: HERO_MAX_PX,
        aspectRatio: '1/1',
        margin: '0 auto',
      }}
    >
      {/* Screen reader summary paragraph (§13.7) */}
      <p className="sr-only">
        {`Mission: ${candidates[0]?.task?.title || 'All caught up'}. ${dueCount} domain${dueCount === 1 ? '' : 's'} due, ${urgentCount} company urgent, ${completedAssignments} of ${todayAssignments.length} assignments complete.`}
      </p>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      >
        {/* Background ambient radial circle */}
        <circle cx={cx} cy={cy} r={orbitRadius * 1.3} fill="var(--surface-subtle)" opacity="0.3" />

        {/* Orbit track rings */}
        <circle
          cx={cx}
          cy={cy}
          r={orbitRadius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="0.5"
          strokeDasharray="3 8"
          opacity="0.5"
        />
        <circle
          cx={cx}
          cy={cy}
          r={orbitRadius * 0.6}
          fill="none"
          stroke="var(--border)"
          strokeWidth="0.3"
          strokeDasharray="2 10"
          opacity="0.3"
        />

        {/* Subtle radial axis lines */}
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={`grid-${i}`}
            x1={cx}
            y1={cy - orbitRadius * 1.2}
            x2={cx}
            y2={cy + orbitRadius * 1.2}
            stroke="var(--border)"
            strokeWidth="0.5"
            opacity="0.25"
            transform={`rotate(${i * 30} ${cx} ${cy})`}
          />
        ))}

        {/* Connecting arcs between nodes - rotating with the constellation orbit */}
        <g
          className={!reducedMotion ? 'constellation-orbit' : undefined}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        >
          {nodes.filter((n) => n.id !== 'primary').map((node) => {
            const angleRad = node.angle;
            const endX = cx + Math.cos(angleRad) * orbitRadius;
            const endY = cy + Math.sin(angleRad) * orbitRadius;
            const mx = (cx + endX) / 2 + Math.sin(angleRad) * 16;
            const my = (cy + endY) / 2 + Math.cos(angleRad) * 10;

            return (
              <path
                key={`arc-${node.id}`}
                d={`M ${cx} ${cy} Q ${mx} ${my} ${endX} ${endY}`}
                fill="none"
                stroke="var(--border-active)"
                strokeWidth="0.8"
                strokeOpacity={hoveredNode === node.id ? 0.6 : 0.25}
                strokeDasharray="4 6"
              />
            );
          })}
        </g>

        {/* Finite event-driven signal pulses (spec §13.5) */}
        {!reducedMotion && signals.map((_sig, i) => (
          <circle key={`sig-${i}`} cx={cx} cy={cy} r="3" fill="var(--accent)" opacity={0.8}>
            <animate attributeName="opacity" values="0.8;0" dur="0.8s" fill="freeze" />
          </circle>
        ))}
      </svg>

      {/* Interactive HTML overlay */}
      <div className="absolute inset-0" data-guide-target="today-domain-nodes">
        {/* Orbiting domain nodes container */}
        <div
          className={`absolute inset-0 pointer-events-none ${!reducedMotion ? 'constellation-orbit' : ''}`}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        >
          {nodes.filter((n) => n.id !== 'primary').map((node) => {
            const isHovered = hoveredNode === node.id;
            const isActive = activeNode === node.id;
            const angleRad = node.angle;
            const actionable = node.destination !== null;
            const Icon = STATE_ICONS[node.state];
            const classes = STATE_CLASSES[node.state];

            const sharedProps = {
              'data-node-id': node.id,
              'data-actionable': actionable ? 'true' : 'false',
              'data-destination-route': node.destination?.route ?? '',
              'data-destination-topic': node.destination?.linkedTopicId ?? '',
              onMouseEnter: actionable ? () => setHoveredNode(node.id) : undefined,
              onMouseLeave: actionable ? () => setHoveredNode(null) : undefined,
              onFocus: actionable ? () => setHoveredNode(node.id) : undefined,
              onBlur: actionable ? () => setHoveredNode(null) : undefined,
              onClick: actionable ? () => activateNode(node) : undefined,
              onKeyDown: actionable ? (e: React.KeyboardEvent) => onNodeKeyDown(e, node) : undefined,
              'aria-label': `${node.label} — ${node.state}`,
              title: `${node.label} (${node.destination?.route ? `routes to ${node.destination.route}` : 'idle'})`,
            };

            const nx = cx + Math.cos(angleRad) * orbitRadius - node.baseRadius;
            const ny = cy + Math.sin(angleRad) * orbitRadius - node.baseRadius;
            const isLowerHalf = ny > cy;

            return (
              <button
                key={node.id}
                type="button"
                data-testid="hero-node"
                {...sharedProps}
                className={`today-hero-node pointer-events-auto absolute flex flex-col items-center justify-center rounded-full border transition-all duration-200 ${classes.button} ${
                  actionable ? 'cursor-pointer' : 'cursor-default'
                }`}
                style={{
                  left: nx,
                  top: ny,
                  width: node.baseRadius * 2,
                  height: node.baseRadius * 2,
                  transform: isActive ? 'scale(1.15)' : isHovered ? 'scale(1.08)' : 'scale(1)',
                  zIndex: 15,
                }}
                tabIndex={actionable ? 0 : undefined}
              >
                {/* Counter-rotating container keeps glyphs, labels and tooltips upright */}
                <div
                  className={`w-full h-full flex flex-col items-center justify-center relative ${
                    !reducedMotion ? 'constellation-node-counter' : ''
                  }`}
                >
                  <span className="font-mono text-[9px] font-bold">
                    {node.shortLabel}
                  </span>

                  {/* State glyph indicator badge */}
                  {Icon ? (
                    <span className={`absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-surface-panel border ${classes.border} ${classes.text}`} aria-hidden="true">
                      <Icon className="size-2.5" />
                    </span>
                  ) : null}

                  {/* Tooltip on hover/focus/active — positioned above on lower half to prevent bottom clipping */}
                  {actionable && (isHovered || isActive) && !reducedMotion && (
                    <span className={`absolute ${isLowerHalf ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2 whitespace-nowrap block pointer-events-none z-30`}>
                      <span className="block rounded-md border border-border-default bg-surface-elevated px-2.5 py-1.5 shadow-lg">
                        <span className="block text-[10px] font-semibold text-text-primary">{node.label}</span>
                        <span className="block font-mono text-[9px] text-text-tertiary">state: {node.state}</span>
                      </span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Center mission node (stationary anchor at center cx, cy) */}
        {(() => {
          const centerNode = nodes.find((n) => n.id === 'primary');
          if (!centerNode) return null;
          const isHovered = hoveredNode === centerNode.id;
          const isActive = activeNode === centerNode.id;
          const actionable = centerNode.destination !== null;
          const classes = STATE_CLASSES[centerNode.state];

          const sharedProps = {
            'data-node-id': centerNode.id,
            'data-actionable': actionable ? 'true' : 'false',
            'data-destination-route': centerNode.destination?.route ?? '',
            'data-destination-topic': centerNode.destination?.linkedTopicId ?? '',
            onMouseEnter: actionable ? () => setHoveredNode(centerNode.id) : undefined,
            onMouseLeave: actionable ? () => setHoveredNode(null) : undefined,
            onFocus: actionable ? () => setHoveredNode(centerNode.id) : undefined,
            onBlur: actionable ? () => setHoveredNode(null) : undefined,
            onClick: actionable ? () => activateNode(centerNode) : undefined,
            onKeyDown: actionable ? (e: React.KeyboardEvent) => onNodeKeyDown(e, centerNode) : undefined,
            'aria-label': `Primary action: ${centerNode.label} — ${centerNode.state}`,
            title: `Primary action: ${centerNode.label} (${centerNode.destination?.route ? `opens ${centerNode.destination.route}` : 'idle'})`,
          };

          return (
            <button
              key={centerNode.id}
              type="button"
              data-testid="hero-node-primary"
              {...sharedProps}
              className={`today-hero-node absolute flex flex-col items-center justify-center rounded-full border transition-all duration-200 ${classes.button} ${
                !reducedMotion && centerNode.state === 'mission' ? 'mission-pulse-glow' : ''
              } ${actionable ? 'cursor-pointer' : 'cursor-default'}`}
              style={{
                left: cx - centerNode.baseRadius,
                top: cy - centerNode.baseRadius,
                width: centerNode.baseRadius * 2,
                height: centerNode.baseRadius * 2,
                transform: isActive ? 'scale(1.12)' : isHovered ? 'scale(1.06)' : 'scale(1)',
                zIndex: 20,
              }}
              tabIndex={actionable ? 0 : undefined}
            >
              {/* Finite pulse ring on active center node when motion allowed */}
              {centerNode.state === 'mission' && !reducedMotion && (
                <span
                  className="absolute inset-0 rounded-full border border-accent/40"
                  style={{ animation: 'pulse-ring 0.8s ease-out' }}
                  aria-hidden="true"
                />
              )}
              <span className="text-xl font-bold font-mono">
                {centerNode.shortLabel}
              </span>
              <span className="mt-0.5 font-mono text-[8px] uppercase tracking-widest text-text-secondary">
                TODAY
              </span>

              {/* Tooltip on hover/focus/active for center mission node */}
              {actionable && (isHovered || isActive) && !reducedMotion && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap block pointer-events-none z-30">
                  <span className="block rounded-md border border-border-default bg-surface-elevated px-2.5 py-1.5 shadow-lg">
                    <span className="block text-[10px] font-semibold text-text-primary">{centerNode.label}</span>
                    <span className="block font-mono text-[9px] text-text-tertiary">
                      {centerNode.destination?.route
                        ? `Learning workspace · ${centerNode.destination.route}${centerNode.destination.linkedTopicId ? ` (${centerNode.destination.linkedTopicId})` : ''}`
                        : `state: ${centerNode.state}`}
                    </span>
                  </span>
                </span>
              )}
            </button>
          );
        })()}
      </div>

      {/* Visible constellation state legend (§13.7, T-NEW-11) */}
      <div className="absolute top-[calc(100%+8px)] left-0 right-0 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[9px] text-text-tertiary px-1">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full border border-accent bg-accent/20" aria-hidden="true" />
          <span>Mission</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full border border-dashed border-warning" aria-hidden="true" />
          <span>Due</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full border border-warning ring-1 ring-warning" aria-hidden="true" />
          <span>Urgent</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full border border-dotted border-danger" aria-hidden="true" />
          <span>Blocked</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full border border-success bg-success/20" aria-hidden="true" />
          <span>Complete</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full border border-border-default bg-surface-subtle" aria-hidden="true" />
          <span>Idle</span>
        </span>
      </div>
    </div>
  );
};
