import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import type { RoutePath } from '../../context/PlacementContext';
import { getEvaluatedCandidates } from '../../engine/adaptiveEngine';
import { evaluatePracticeSignals } from '../../engine/adaptiveEngine';
import {
  Code2,
  BookOpen,
  Building2,
  Target,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

/* ─── Types ─── */
interface VisualNode {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  angle: number;
  color: string;
  glowColor: string;
  pulseState: 'idle' | 'pulse' | 'glow';
}

/* ─── Component ─── */
export const TodayControlVisual: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(400);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [tabVisible, setTabVisible] = useState(true);
  const [orbitRotation, setOrbitRotation] = useState(0);

  const {
    taskDefinitions,
    taskProgress,
    dsaProblems,
    dsaProgress,
    skillStates,
    companyOverlays,
    practiceAttempts,
    currentMode,
    todayDate,
    setRoute,
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

  // Resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setSize(Math.min(w, 420));
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Orbit rotation animation
  useEffect(() => {
    if (!tabVisible || reducedMotion) return;
    let rafId = 0;
    let time = 0;
    const tick = () => {
      if (!tabVisible || reducedMotion) return;
      time += 0.005;
      setOrbitRotation(time * 0.5);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [tabVisible, reducedMotion]);

  // Compute visual state
  const state = useMemo(() => {
    const evaluated = getEvaluatedCandidates(
      taskDefinitions,
      taskProgress,
      dsaProblems,
      dsaProgress,
      skillStates,
      companyOverlays,
      currentMode,
      todayDate
    );

    const primary = evaluated[0];
    const primaryTask = primary?.task;
    const primaryState = primaryTask ? taskProgress[primaryTask.id]?.state : undefined;
    const isDone = primaryState === 'completed';

    const dsaDue = dsaProblems.filter((p) => {
      const dp = dsaProgress[p.id];
      return dp?.nextReviewAt && dp.nextReviewAt <= todayDate;
    }).length;
    const dsaMastered = dsaProblems.filter((p) => dsaProgress[p.id]?.passedIndependently).length;

    const skills = Object.values(skillStates);
    const staleCount = skills.filter((s) => s.freshness === 'stale').length;
    const freshCount = skills.filter((s) => s.freshness === 'fresh').length;

    const activeComps = companyOverlays.filter(
      (c) => c.applicationStatus !== 'rejected' && c.applicationStatus !== 'archived'
    );
    const urgentComps = activeComps.filter(
      (c) => c.applicationStatus === 'interview_scheduled' || c.applicationStatus === 'oa_scheduled'
    );

    const signals = evaluatePracticeSignals(practiceAttempts, skillStates, companyOverlays);
    const practiceNeed = signals.assessmentDue || signals.weakTopic || signals.interviewPracticeDue;

    return {
      primaryTask,
      isDone,
      primaryState,
      primaryScore: primary?.breakdown?.finalScore ?? 0,
      primaryReason: primary?.breakdown?.explanation ?? '',
      dsaDue,
      dsaMastered,
      staleCount,
      freshCount,
      activeComps: activeComps.length,
      urgentComps: urgentComps.length,
      practiceNeed,
    };
  }, [taskDefinitions, taskProgress, dsaProblems, dsaProgress, skillStates, companyOverlays, practiceAttempts, currentMode, todayDate]);

  // Build node data
  const nodes: VisualNode[] = useMemo(() => {
    return [
      {
        id: 'primary',
        label: state.isDone ? 'Task Completed' : (state.primaryTask?.title || 'All Caught Up'),
        shortLabel: state.isDone ? 'DONE' : 'ACTION',
        icon: state.isDone ? CheckCircle2 : Sparkles,
        angle: 0,
        color: state.isDone ? 'var(--success)' : 'var(--primary)',
        glowColor: state.isDone ? 'color-mix(in srgb, var(--success) 30%, transparent)' : 'color-mix(in srgb, var(--primary) 30%, transparent)',
        pulseState: state.isDone ? 'glow' : 'pulse',
      },
      {
        id: 'dsa',
        label: `DSA — ${state.dsaDue > 0 ? `${state.dsaDue} review due` : `${state.dsaMastered} mastered`}`,
        shortLabel: 'DSA',
        icon: Code2,
        angle: Math.PI * 0.7,
        color: 'var(--success)',
        glowColor: 'color-mix(in srgb, var(--success) 30%, transparent)',
        pulseState: state.dsaDue > 0 ? 'pulse' : 'glow',
      },
      {
        id: 'skills',
        label: `Skills — ${state.freshCount} fresh, ${state.staleCount} stale`,
        shortLabel: 'SKILLS',
        icon: BookOpen,
        angle: Math.PI * 1.4,
        color: 'var(--accent)',
        glowColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
        pulseState: state.staleCount > 0 ? 'pulse' : 'glow',
      },
      {
        id: 'company',
        label: `Companies — ${state.activeComps} active${state.urgentComps > 0 ? `, ${state.urgentComps} urgent` : ''}`,
        shortLabel: 'COMPANIES',
        icon: Building2,
        angle: Math.PI * 2.1,
        color: 'var(--warning)',
        glowColor: 'color-mix(in srgb, var(--warning) 30%, transparent)',
        pulseState: state.urgentComps > 0 ? 'pulse' : 'glow',
      },
      {
        id: 'practice',
        label: state.practiceNeed ? 'Drill recommended' : 'Drills on track',
        shortLabel: 'PRACTICE',
        icon: Target,
        angle: Math.PI * 2.8,
        color: '#8B5CF6',
        glowColor: 'rgba(139,92,246,0.3)',
        pulseState: state.practiceNeed ? 'pulse' : 'idle',
      },
    ];
  }, [state]);

  // Click handler
  const handleClick = useCallback(
    (nodeId: string) => {
      setActiveNode((prev) => (prev === nodeId ? null : nodeId));
      const routeMap: Record<string, RoutePath> = {
        primary: state.primaryTask?.domainId ? 'preparation' : 'dashboard',
        dsa: 'dsa',
        skills: 'skills',
        company: 'companies',
        practice: 'practice',
      };
      const route = routeMap[nodeId];
      if (route) setRoute(route);
    },
    [state.primaryTask, setRoute]
  );

  const orbitRadius = size * 0.3;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ maxWidth: size, aspectRatio: '1/1', margin: '0 auto' }}
    >
      {/* SVG Background Layer */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 w-full h-full"
        style={{ maxWidth: size, maxHeight: size }}
      >
        <defs>
          {nodes.map((n) => (
            <radialGradient key={`rg-${n.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={n.color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={n.color} stopOpacity="0" />
            </radialGradient>
          ))}
          <filter id="glow-filter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Orbit ring */}
        <circle
          cx={cx}
          cy={cy}
          r={orbitRadius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="0.5"
          strokeDasharray="3 6"
          opacity="0.4"
        />

        {/* Connection arcs */}
        {nodes.filter((n) => n.id !== 'primary').map((node) => {
          const endX = cx + Math.cos(node.angle + orbitRotation * 0.1) * orbitRadius;
          const endY = cy + Math.sin(node.angle + orbitRotation * 0.1) * orbitRadius * 0.85;
          const mx = (cx + endX) / 2 + Math.sin(node.angle) * 15;
          const my = (cy + endY) / 2 + Math.cos(node.angle) * 8;
          return (
            <path
              key={`arc-${node.id}`}
              d={`M ${cx} ${cy} Q ${mx} ${my} ${endX} ${endY}`}
              fill="none"
              stroke={node.color}
              strokeWidth="0.75"
              strokeOpacity="0.3"
              strokeDasharray="4 8"
            >
              {!reducedMotion && (
                <animate
                  attributeName="stroke-dashoffset"
                  values="0;-24"
                  dur="4s"
                  repeatCount="indefinite"
                />
              )}
            </path>
          );
        })}

        {/* Node ambient glows */}
        {nodes.map((node) => {
          const gx = cx + Math.cos(node.angle + orbitRotation * 0.1) * orbitRadius;
          const gy = cy + Math.sin(node.angle + orbitRotation * 0.1) * orbitRadius * 0.85;
          return (
            <circle
              key={`ambient-${node.id}`}
              cx={gx}
              cy={gy}
              r="24"
              fill={node.glowColor}
              opacity={node.pulseState === 'pulse' ? 0.3 : 0.15}
            >
              {!reducedMotion && node.pulseState === 'pulse' && (
                <>
                  <animate attributeName="r" values="20;28;20" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.2;0.4;0.2" dur="2s" repeatCount="indefinite" />
                </>
              )}
              {!reducedMotion && node.pulseState === 'glow' && (
                <animate attributeName="opacity" values="0.15;0.3;0.15" dur="4s" repeatCount="indefinite" />
              )}
            </circle>
          );
        })}
      </svg>

      {/* Interactive HTML Overlay Layer */}
      <div className="absolute inset-0" style={{ maxWidth: size, maxHeight: size }}>
        {nodes.map((node) => {
          const isCenter = node.id === 'primary';
          const isHovered = hoveredNode === node.id;
          const isActive = activeNode === node.id;
          const Icon = node.icon;

          if (isCenter) {
            return (
              <div
                key={node.id}
                className="absolute flex flex-col items-center justify-center"
                style={{
                  left: cx - 36,
                  top: cy - 36,
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${node.glowColor} 0%, transparent 70%)`,
                  cursor: 'pointer',
                  transition: reducedMotion ? 'none' : 'transform 0.3s var(--ease-out), box-shadow 0.3s var(--ease-out)',
                  transform: isActive ? 'scale(1.1)' : isHovered ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: isActive ? `0 0 20px ${node.glowColor}` : isHovered ? `0 0 12px ${node.glowColor}` : 'none',
                  zIndex: 10,
                }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleClick(node.id)}
                role="button"
                aria-label="Primary action node"
              >
                <Icon className="size-7" style={{ color: node.color }} />
                <span
                  className="text-[8px] font-bold tracking-widest mt-0.5"
                  style={{ color: node.color }}
                >
                  {node.shortLabel}
                </span>
              </div>
            );
          }

          const angleRad = node.angle + orbitRotation * 0.1;
          const nodeX = cx + Math.cos(angleRad) * orbitRadius - 18;
          const nodeY = cy + Math.sin(angleRad) * orbitRadius * 0.85 - 18;

          return (
            <div
              key={node.id}
              className="absolute flex flex-col items-center"
              style={{
                left: nodeX,
                top: nodeY,
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--surface)',
                border: `2px solid ${node.color}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: reducedMotion ? 'none' : 'transform 0.3s var(--ease-out), box-shadow 0.3s var(--ease-out)',
                transform: isActive ? 'scale(1.2)' : isHovered ? 'scale(1.15)' : 'scale(1)',
                boxShadow: isHovered || isActive ? `0 0 10px ${node.glowColor}` : `0 0 4px ${node.glowColor}`,
                zIndex: 10,
                opacity: isHovered || isActive ? 1 : 0.85,
              }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => handleClick(node.id)}
              role="button"
              aria-label={node.label}
            >
              <Icon className="size-3.5" style={{ color: node.color }} />
              {isActive && (
                <div
                  className="absolute -bottom-5 text-[7px] font-bold tracking-wide whitespace-nowrap"
                  style={{ color: node.color }}
                >
                  {node.shortLabel}
                </div>
              )}
            </div>
          );
        })}

        {/* Tooltip for hovered node */}
        {hoveredNode && !reducedMotion && (() => {
          const hNode = nodes.find((n) => n.id === hoveredNode);
          if (!hNode) return null;
          const angleRad = hNode.angle;
          const tooltipX = cx + Math.cos(angleRad) * orbitRadius;
          const tooltipY = cy + Math.sin(angleRad) * orbitRadius * 0.85;
          const isRight = Math.cos(angleRad) > 0;

          return (
            <div
              className="absolute pointer-events-none"
              style={{
                left: isRight ? tooltipX + 24 : tooltipX - 120,
                top: tooltipY - 16,
                zIndex: 20,
              }}
            >
              <div
                className="bg-surface-elevated border border-border-active rounded-md px-2.5 py-1.5 shadow-lg"
                style={{ borderColor: `color-mix(in srgb, ${hNode.color} 38%, transparent)` }}
              >
                <p className="text-[10px] font-bold" style={{ color: hNode.color }}>
                  {hNode.label}
                </p>
                <p className="text-[8px] text-text-secondary mt-0.5">Click to navigate</p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Bottom label */}
      <div className="absolute bottom-1 left-0 right-0 text-center">
        <span className="text-[9px] font-mono tracking-widest text-text-secondary uppercase">
          {state.isDone ? '✓ All targets complete — Reflect & Seal' : 'PlaceOS Daily Control'}
        </span>
      </div>
    </div>
  );
};

export default TodayControlVisual;
