import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import type { RoutePath } from '../../context/PlacementContext';
import type { CandidateTask } from '../../engine/adaptiveEngine';
import { getTaskLearningRoute } from '../../engine/taskFlowEngine';

/* ─── Types ─── */
export interface TodayHeroVisualProps {
  /**
   * C6 — the ONE canonical candidate evaluation for Today, supplied by the
   * parent (DashboardView) from the full live application state. The hero must
   * never re-derive it, or its score/reason could drift from the primary
   * action and DailyJourney shown alongside it.
   */
  candidates: CandidateTask[];
}
/**
 * C7-01 — destination metadata carried by every rendered node. `null` means the
 * node is not actionable and must be presented as non-actionable (no button
 * semantics, no pointer cursor, no "Click to navigate" affordance).
 */
export interface HeroNodeDestination {
  route: RoutePath;
  linkedTopicId?: string;
}

interface VisualNode {
  id: string;
  label: string;
  shortLabel: string;
  angle: number;
  color: string;
  glowColor: string;
  baseRadius: number;
  /**
   * C7-04 — `'complete'` was removed: a completed task can never be a candidate
   * (`getEvaluatedCandidates` excludes `completed`/`archived`), so the hero's
   * "completed" branch was unreachable and no domain node ever produced it.
   * The visual only represents states that really occur.
   */
  state: 'idle' | 'active' | 'warning';
  pulseState: 'idle' | 'pulse' | 'glow';
  evidenceStrength: number;
  readiness: string;
  destination: HeroNodeDestination | null;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

/* ─── Domain color map ─── */
const DOMAIN_COLORS: Record<string, { color: string; glow: string }> = {
  dsa: { color: '#10B981', glow: 'rgba(16,185,129,0.3)' },
  python: { color: '#F59E0B', glow: 'rgba(245,158,11,0.3)' },
  sql: { color: '#3B82F6', glow: 'rgba(59,130,246,0.3)' },
  oop: { color: '#8B5CF6', glow: 'rgba(139,92,246,0.3)' },
  dbms: { color: '#6366F1', glow: 'rgba(99,102,241,0.3)' },
  os: { color: '#F43F5E', glow: 'rgba(244,63,94,0.3)' },
  cn: { color: '#06B6D4', glow: 'rgba(6,182,212,0.3)' },
  aptitude: { color: '#F97316', glow: 'rgba(249,115,22,0.3)' },
  communication: { color: '#14B8A6', glow: 'rgba(20,184,166,0.3)' },
  interviews: { color: '#EF4444', glow: 'rgba(239,68,68,0.3)' },
  projects: { color: '#A855F7', glow: 'rgba(168,85,247,0.3)' },
};

/* ─── Domain → Preparation Topic canonical routing ─── */
/**
 * THE single domain → Preparation-topic destination map for Today hero nodes.
 * It is exported so tests assert against this one table instead of re-declaring
 * a copy of it; `resolveHeroNodeDestination()` derives the domain from the node
 * id rather than adding a second id-keyed table.
 */
// Pure data + a pure resolver exported from the component that owns them, so
// the mapping exists exactly once and tests import the real one.
// eslint-disable-next-line react-refresh/only-export-components
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

const DOMAIN_NODE_PREFIX = 'domain-';

/** C7-03 — the stage never grows past this width (was a hard-coded 480 initial). */
const HERO_MAX_PX = 520;

/**
 * C7-01 — the ONE authoritative hero node → destination resolver.
 *
 * Every node id the hero can render has exactly one real destination:
 *   - `primary`  → the current canonical top candidate's learning route
 *   - `company`  → companies
 *   - `domain-dsa` → dsa
 *   - `domain-<id>` → the canonical Preparation topic (`DOMAIN_TO_PREP_TOPIC`)
 *
 * Returns `null` for anything unknown so callers can present the node as
 * non-actionable instead of rendering a dead clickable-looking control.
 */
// eslint-disable-next-line react-refresh/only-export-components
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

/* ─── Component ─── */
export const TodayHeroVisual: React.FC<TodayHeroVisualProps> = ({ candidates }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState(480);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [tabVisible, setTabVisible] = useState(true);
  const [signals, setSignals] = useState<Array<{ from: string; to: string; progress: number; active: boolean }>>([]);
  const particlesRef = useRef<Particle[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  const {
    dsaProblems, dsaProgress,
    skillStates, companyOverlays,
    todayDate, setRoute,
  } = usePlacement();

  // Preferences
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const h = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  useEffect(() => {
    const h = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, []);

  // C7-03 — responsive sizing. The measured element is the OUTER wrapper,
  // whose width is derived only from its parent (capped by HERO_MAX_PX), never
  // from `size` itself. `size` is therefore a pure output of the measurement:
  // it cannot feed back into its own input, so a shrink is recoverable and a
  // repeated resize cannot ratchet the stage upward or lock it downward.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const applyWidth = (width: number) => {
      // jsdom / zero-layout environments report 0 — keep the last real size.
      if (width > 0) setSize(Math.min(Math.round(width), HERO_MAX_PX));
    };

    if (typeof ResizeObserver === 'undefined') {
      // Graceful fallback: measure now and on every window resize.
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

  // Compute visual state from real data + the canonical C6 candidate
  // evaluation supplied by DashboardView (never re-derived here).
  //
  // C7-04 — no `completed` branch: completed tasks are excluded from
  // candidates, so a completed primary task can never arrive here. The stage
  // shows exactly the state that is real — the current top candidate.
  const state = useMemo(() => {
    const primary = candidates[0];
    const primaryTask = primary?.task;

    const dsaDue = dsaProblems.filter((p) => {
      const dp = dsaProgress[p.id];
      return dp?.nextReviewAt && dp.nextReviewAt <= todayDate;
    }).length;

    const skills = Object.values(skillStates);
    const staleCount = skills.filter((s) => s.freshness === 'stale').length;
    const freshCount = skills.filter((s) => s.freshness === 'fresh').length;
    const agingCount = skills.filter((s) => s.freshness === 'aging').length;

    const activeComps = companyOverlays.filter(
      (c) => c.applicationStatus !== 'rejected' && c.applicationStatus !== 'archived'
    );
    const urgentComps = activeComps.filter(
      (c) => c.applicationStatus === 'interview_scheduled' || c.applicationStatus === 'oa_scheduled'
    );

    return {
      primaryTask,
      primaryScore: primary?.breakdown?.finalScore ?? 0,
      primaryReason: primary?.breakdown?.explanation ?? '',
      dsaDue, dsaMastered: dsaProblems.filter((p) => dsaProgress[p.id]?.passedIndependently).length,
      staleCount, freshCount, agingCount,
      activeComps: activeComps.length, urgentComps: urgentComps.length,
      practiceNeed: false,
      primaryDomainId: primaryTask?.domainId,
    };
  }, [candidates, dsaProblems, dsaProgress, skillStates, companyOverlays, todayDate]);

  // Build nodes from real data
  const nodes: VisualNode[] = useMemo(() => {
    // C7-04 — the centre node is the current canonical candidate, full stop.
    // There is no "completed" presentation: completed tasks never reach the
    // candidate list. If no candidate is supplied the node is neutral and,
    // through `destination: null`, rendered non-actionable.
    const hasCandidate = !!state.primaryTask;
    const centerNode: VisualNode = {
      id: 'primary',
      label: state.primaryTask?.title || 'All caught up',
      shortLabel: hasCandidate ? '●' : '○',
      angle: 0,
      color: hasCandidate ? '#E5A93C' : '#6B7280',
      glowColor: hasCandidate ? 'rgba(229,169,60,0.35)' : 'rgba(107,114,128,0.35)',
      baseRadius: 28,
      state: hasCandidate ? 'active' : 'idle',
      pulseState: hasCandidate ? 'pulse' : 'idle',
      evidenceStrength: state.primaryScore,
      readiness: hasCandidate ? 'active' : 'idle',
      destination: resolveHeroNodeDestination('primary', candidates),
    };

    // Build domain nodes from actual skill states + company data
    const domainIds = ['dsa', 'python', 'sql', 'oop', 'dbms', 'os', 'cn', 'aptitude', 'communication', 'interviews', 'projects'];
    const domainNodes: VisualNode[] = domainIds.map((did, i) => {
      const domainSkillStates = Object.values(skillStates).filter((s) => s.domainId === did);
      const avgStrength = domainSkillStates.length > 0
        ? domainSkillStates.reduce((sum, s) => sum + s.evidenceStrength, 0) / domainSkillStates.length
        : 0;
      const hasStale = domainSkillStates.some((s) => s.freshness === 'stale');
      const hasFresh = domainSkillStates.some((s) => s.freshness === 'fresh');
      const dom = { color: '#6B7280', glow: 'rgba(107,114,128,0.2)' };
      const dc = DOMAIN_COLORS[did] || dom;

      let nodeState: VisualNode['state'] = 'idle';
      let pulseState: VisualNode['pulseState'] = 'idle';

      if (did === state.primaryDomainId) {
        nodeState = 'active';
        pulseState = 'pulse';
      }
      if (hasStale && did !== state.primaryDomainId) {
        nodeState = 'warning';
        pulseState = 'pulse';
      }
      if (hasFresh && avgStrength > 70) {
        nodeState = 'active';
        pulseState = 'glow';
      }

      return {
        id: `domain-${did}`,
        label: `${did.toUpperCase()} — ${avgStrength.toFixed(0)}%`,
        shortLabel: did.toUpperCase().slice(0, 3),
        angle: (Math.PI * 2 * i) / domainIds.length + Math.PI * 0.15,
        color: dc.color,
        glowColor: dc.glow,
        baseRadius: 14 + (avgStrength / 100) * 8,
        state: nodeState,
        pulseState,
        evidenceStrength: avgStrength,
        readiness: hasStale ? 'stale' : hasFresh ? 'fresh' : 'neutral',
        // C7-01 — destination resolved once, from the single canonical map.
        destination: resolveHeroNodeDestination(`domain-${did}`, candidates),
      };
    });

    // Add company node if urgent
    if (state.urgentComps > 0) {
      domainNodes.push({
        id: 'company',
        label: `Companies — ${state.urgentComps} urgent`,
        shortLabel: 'CO',
        angle: Math.PI * 0.5,
        color: '#F59E0B',
        glowColor: 'rgba(245,158,11,0.35)',
        baseRadius: 16,
        state: 'active',
        pulseState: 'pulse',
        evidenceStrength: 0,
        readiness: 'urgent',
        destination: resolveHeroNodeDestination('company', candidates),
      });
    }

    return [centerNode, ...domainNodes];
  }, [state, candidates, skillStates]);

  // Generate particles (initialized once via effect)
  useEffect(() => {
    if (reducedMotion || !tabVisible) return;
    if (particlesRef.current.length === 0) {
      const newParticles: Particle[] = [];
      for (let i = 0; i < 30; i++) {
        newParticles.push({
          id: i, x: Math.random() * size, y: Math.random() * size,
          vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
          life: Math.random() * 200, maxLife: 200,
          color: `rgba(229,169,60,${0.1 + Math.random() * 0.15})`,
          size: 0.5 + Math.random() * 1.5,
        });
      }
      particlesRef.current = newParticles;
      setParticles(newParticles);
    }
  }, [reducedMotion, tabVisible, size]);

  // Signal propagation animation
  useEffect(() => {
    if (reducedMotion || !tabVisible) return;
    const interval = setInterval(() => {
      const activeNodes = nodes.filter((n) => n.state === 'active' || n.state === 'warning');
      if (activeNodes.length > 0) {
        const from = activeNodes[Math.floor(Math.random() * activeNodes.length)];
        const to = nodes.find((n) => n.id === 'primary');
        if (to) {
          setSignals((prev) => [...prev.slice(-3), { from: from.id, to: 'primary', progress: 0, active: true }]);
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [nodes, reducedMotion, tabVisible]);

  // Animate signals
  useEffect(() => {
    // C7-03 — pause on a hidden tab too: this was the one loop still running
    // while the document was invisible.
    if (reducedMotion || !tabVisible) return;
    const interval = setInterval(() => {
      setSignals((prev) =>
        prev.map((s) => ({ ...s, progress: Math.min(1, s.progress + 0.02) }))
          .filter((s) => s.progress < 1)
      );
    }, 30);
    return () => clearInterval(interval);
  }, [reducedMotion, tabVisible]);

  // Orbit rotation
  const [orbitRot, setOrbitRot] = useState(0);
  useEffect(() => {
    if (!tabVisible || reducedMotion) return;
    let rafId = 0;
    let time = 0;
    const tick = () => {
      if (!tabVisible || reducedMotion) return;
      time += 0.003;
      setOrbitRot(time);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [tabVisible, reducedMotion]);

  const cx = size / 2;
  const cy = size / 2;
  const orbitRadius = size * 0.32;

  // C7-01 — activation. Destination lives on the node itself, so a node with
  // no destination cannot be activated at all (and is rendered non-actionable).
  const activateNode = useCallback(
    (node: VisualNode) => {
      if (!node.destination) return;
      setActiveNode((prev) => (prev === node.id ? null : node.id));
      setRoute(node.destination.route, node.destination.linkedTopicId);
    },
    [setRoute]
  );

  /**
   * C7-02 — explicit activation keys. `preventDefault()` on both keys cancels
   * the browser's own button activation, so Enter and Space each fire the
   * handler exactly once instead of once here and once natively.
   */
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
      className="relative w-full"
      style={{
        // C7-03 — the stage is a square capped by a CONSTANT, never by the
        // measured `size`, so the measurement cannot feed back into its own
        // input: width always follows the parent column (375px → 520px).
        maxWidth: HERO_MAX_PX,
        aspectRatio: '1/1',
        margin: '0 auto',
        transform: `perspective(800px) rotateX(${(mousePos.y / size - 0.5) * 4}deg) rotateY(${(mousePos.x / size - 0.5) * -4}deg)`,
      }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseLeave={() => setMousePos({ x: 0, y: 0 })}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          {/* Center glow */}
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(229,169,60,0.15)" />
            <stop offset="60%" stopColor="rgba(229,169,60,0.04)" />
            <stop offset="100%" stopColor="rgba(229,169,60,0)" />
          </radialGradient>

          {/* Ambient radial gradients for each node */}
          {nodes.map((n) => (
            <radialGradient key={`rg-${n.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={n.color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={n.color} stopOpacity="0" />
            </radialGradient>
          ))}

          {/* Filters */}
          <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Signal gradient */}
          <linearGradient id="signalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E5A93C" stopOpacity="0" />
            <stop offset="50%" stopColor="#E5A93C" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#E5A93C" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Background ambient */}
        <circle cx={cx} cy={cy} r={orbitRadius * 1.5} fill="url(#centerGlow)" />

        {/* Subtle grid */}
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={`grid-${i}`}
            x1={cx} y1={cy - orbitRadius * 1.2}
            x2={cx} y2={cy + orbitRadius * 1.2}
            stroke="#262D38" strokeWidth="0.5" opacity="0.3"
            transform={`rotate(${i * 30} ${cx} ${cy})`}
          />
        ))}

        {/* Connecting arcs between nodes */}
        {nodes.filter((n) => n.id !== 'primary').map((node) => {
          const angleRad = node.angle + orbitRot * 0.1;
          const endX = cx + Math.cos(angleRad) * orbitRadius;
          const endY = cy + Math.sin(angleRad) * orbitRadius * 0.85;
          const mx = (cx + endX) / 2 + Math.sin(angleRad) * 20;
          const my = (cy + endY) / 2 + Math.cos(angleRad) * 12;

          return (
            <path
              key={`arc-${node.id}`}
              d={`M ${cx} ${cy} Q ${mx} ${my} ${endX} ${endY}`}
              fill="none"
              stroke={node.color}
              strokeWidth="0.8"
              strokeOpacity={0.2 + (hoveredNode === node.id ? 0.3 : 0)}
              strokeDasharray="4 6"
            >
              {!reducedMotion && (
                <animate
                  attributeName="stroke-dashoffset"
                  values="0;-24"
                  dur="6s"
                  repeatCount="indefinite"
                />
              )}
            </path>
          );
        })}

        {/* Signal pulses traveling along paths. C7-03 — NOT rendered at all
            under reduced motion: this was the unwrapped SVG opacity animation
            that CSS-only reduced-motion rules could not reach. */}
        {!reducedMotion && signals.map((sig, i) => {
          const sourceNode = nodes.find((n) => n.id === sig.from);
          if (!sourceNode) return null;
          const angleRad = sourceNode.angle + orbitRot * 0.1;
          const endX = cx + Math.cos(angleRad) * orbitRadius;
          const endY = cy + Math.sin(angleRad) * orbitRadius * 0.85;
          const mx = (cx + endX) / 2 + Math.sin(angleRad) * 20;
          const my = (cy + endY) / 2 + Math.cos(angleRad) * 12;

          const t = sig.progress;
          const px = (1-t)*(1-t)*cx + 2*(1-t)*t*mx + t*t*endX;
          const py = (1-t)*(1-t)*cy + 2*(1-t)*t*my + t*t*endY;

          return (
            <circle key={`sig-${i}`} cx={px} cy={py} r="2" fill="#E5A93C" opacity={0.8}>
              <animate attributeName="opacity" values="0;0.8;0.8;0" dur="2s" repeatCount="indefinite" />
            </circle>
          );
        })}

        {/* Particle system */}
        {!reducedMotion && particles.map((p) => {
          const px = ((p.x + p.vx * 60) % size + size) % size;
          const py = ((p.y + p.vy * 60) % size + size) % size;
          const lifePct = p.life / p.maxLife;
          return (
            <circle key={`part-${p.id}`} cx={px} cy={py} r={p.size} fill={p.color} opacity={lifePct * 0.6} />
          );
        })}

        {/* Node ambient glow circles */}
        {nodes.map((node) => {
          const angleRad = node.angle + orbitRot * 0.1;
          const gx = cx + Math.cos(angleRad) * orbitRadius;
          const gy = cy + Math.sin(angleRad) * orbitRadius * 0.85;
          const isHovered = hoveredNode === node.id;
          const isActive = activeNode === node.id;
          const glowR = node.baseRadius * 2.5 + (isHovered ? 10 : 0) + (isActive ? 15 : 0);

          return (
            <circle
              key={`ambient-${node.id}`}
              cx={gx} cy={gy} r={glowR}
              fill={node.glowColor}
              opacity={node.state === 'active' ? 0.25 : node.state === 'warning' ? 0.2 : 0.1}
            >
              {!reducedMotion && (node.state === 'active' || node.state === 'warning') && (
                <>
                  <animate attributeName="r" values={`${glowR};${glowR + 8};${glowR}`} dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.2;0.35;0.2" dur="3s" repeatCount="indefinite" />
                </>
              )}
            </circle>
          );
        })}

        {/* Outer orbit ring */}
        <circle cx={cx} cy={cy} r={orbitRadius} fill="none" stroke="#262D38" strokeWidth="0.5" strokeDasharray="3 8" opacity="0.5" />
        <circle cx={cx} cy={cy} r={orbitRadius * 0.6} fill="none" stroke="#1B2028" strokeWidth="0.3" strokeDasharray="2 10" opacity="0.3" />
      </svg>

      {/* Interactive HTML overlay */}
      <div className="absolute inset-0" data-guide-target="today-domain-nodes">
        {nodes.map((node) => {
          const isCenter = node.id === 'primary';
          const isHovered = hoveredNode === node.id;
          const isActive = activeNode === node.id;
          const angleRad = node.angle + orbitRot * 0.1;
          // C7-01 — a node is only presented as a control when it really has
          // somewhere to go; otherwise it renders as plain, inert content.
          const actionable = node.destination !== null;
          const sharedProps = {
            'data-node-id': node.id,
            'data-actionable': actionable ? 'true' : 'false',
            'data-destination-route': node.destination?.route ?? '',
            'data-destination-topic': node.destination?.linkedTopicId ?? '',
            onMouseEnter: actionable ? () => setHoveredNode(node.id) : undefined,
            onMouseLeave: actionable ? () => setHoveredNode(null) : undefined,
            onClick: actionable ? () => activateNode(node) : undefined,
            onKeyDown: actionable ? (e: React.KeyboardEvent) => onNodeKeyDown(e, node) : undefined,
            ...(actionable
              ? { 'aria-label': isCenter ? `Primary action: ${node.label}` : node.label }
              : {}),
          };

          if (isCenter) {
            return (
              <button
                key={node.id}
                type="button"
                data-testid="hero-node-primary"
                {...sharedProps}
                className={`absolute flex flex-col items-center justify-center today-hero-node ${actionable ? 'cursor-pointer' : 'cursor-default'}`}
                style={{
                  left: cx - node.baseRadius, top: cy - node.baseRadius,
                  width: node.baseRadius * 2, height: node.baseRadius * 2,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${node.glowColor} 0%, transparent 70%)`,
                  transition: 'transform 0.4s var(--ease-out), box-shadow 0.4s var(--ease-out)',
                  transform: isActive ? 'scale(1.15)' : isHovered ? 'scale(1.08)' : 'scale(1)',
                  boxShadow: isActive ? `0 0 30px ${node.glowColor}, 0 0 60px ${node.glowColor}40` : isHovered ? `0 0 20px ${node.glowColor}` : 'none',
                  zIndex: 20,
                }}
                tabIndex={actionable ? 0 : undefined}
              >
                {/* Pulsing ring for active state */}
                {node.state === 'active' && !reducedMotion && (
                  <span className="absolute inset-0 rounded-full border border-[#E5A93C]/30" style={{ animation: 'pulse-ring 2s ease-in-out infinite' }} />
                )}
                <span className="text-2xl font-bold" style={{ color: node.color }}>
                  {node.shortLabel}
                </span>
                <span className="text-[7px] font-mono tracking-widest mt-0.5" style={{ color: node.color, opacity: 0.7 }}>
                  TODAY
                </span>
              </button>
            );
          }

          const nx = cx + Math.cos(angleRad) * orbitRadius - node.baseRadius;
          const ny = cy + Math.sin(angleRad) * orbitRadius * 0.85 - node.baseRadius;

          return (
            <button
              key={node.id}
              type="button"
              data-testid="hero-node"
              {...sharedProps}
              className={`absolute flex flex-col items-center today-hero-node ${actionable ? 'cursor-pointer' : 'cursor-default'}`}
              style={{ left: nx, top: ny, zIndex: 15 }}
              tabIndex={actionable ? 0 : undefined}
            >
              <span
                className="flex items-center justify-center rounded-full transition-all duration-300"
                style={{
                  width: node.baseRadius * 2,
                  height: node.baseRadius * 2,
                  borderRadius: '50%',
                  background: '#14171D',
                  border: `2px solid ${node.color}`,
                  boxShadow: isHovered || isActive ? `0 0 12px ${node.glowColor}` : `0 0 4px ${node.glowColor}40`,
                  transform: isActive ? 'scale(1.2)' : isHovered ? 'scale(1.15)' : 'scale(1)',
                  opacity: isHovered || isActive ? 1 : 0.8,
                }}
              >
                <span className="text-[8px] font-bold font-mono tracking-wide" style={{ color: node.color }}>
                  {node.shortLabel}
                </span>
              </span>
              {/* Label below node */}
              {actionable && (isHovered || isActive) && !reducedMotion && (
                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap block">
                  <span className="block bg-[#1B2028] border border-[#3B4556] rounded-md px-2.5 py-1.5 shadow-lg" style={{ borderColor: `${node.color}40` }}>
                    <span className="block text-[9px] font-semibold" style={{ color: node.color }}>{node.label}</span>
                    <span className="block text-[8px] text-[#8E98A8] mt-0.5">Click to navigate</span>
                  </span>
                </span>
              )}
            </button>
          );
        })}

        {/* Bottom label */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-center">
          <span className="text-[8px] font-mono tracking-widest text-[#5C6675] uppercase">
            PlaceOS Daily Control
          </span>
        </div>
      </div>
    </div>
  );
};
