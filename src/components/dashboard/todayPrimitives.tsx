import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Today design primitives — the shared building blocks of the redesigned
 * Today page (spec §1.4 type tiers, §1.5 colour vocabulary, §1.6 surface
 * grammar, §5.2 CTA hierarchy).
 *
 * Every colour written here is a canonical semantic utility (`bg-surface-*`,
 * `border-border-*`, `text-text-*`, `bg-primary`, `text-accent`, …) or a
 * `var(--token)` reference. No literal hex, no legacy palette class, no
 * gradient, no glow, no soft shadow, no pill radius.
 *
 * Buttons are plain `<button>` elements rather than the shadcn `Button`:
 * `cn()` in this repo is a naive join (no tailwind-merge), so the primitive's
 * own `rounded-2xl` / `border-transparent` / `hover:bg-primary/80` base classes
 * could not be removed by a caller — CSS source order would decide the winner
 * and the locked 6px radius (§1.6 "no pills") would silently lose. Owning the
 * class list outright keeps the result deterministic. Focus comes from the
 * test-pinned global `*:focus-visible` outline rule; no `outline-none` here.
 */

export type TodayTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const TONE_BG: Record<TodayTone, string> = {
  neutral: 'bg-surface-subtle',
  accent: 'bg-accent/12',
  success: 'bg-success/12',
  warning: 'bg-warning/12',
  danger: 'bg-danger/12',
  info: 'bg-info/12',
};

const TONE_BORDER: Record<TodayTone, string> = {
  neutral: 'border-border-default',
  accent: 'border-accent/40',
  success: 'border-success/40',
  warning: 'border-warning/40',
  danger: 'border-danger/40',
  info: 'border-info/40',
};

const TONE_TEXT: Record<TodayTone, string> = {
  neutral: 'text-text-tertiary',
  accent: 'text-accent',
  success: 'text-status-success',
  warning: 'text-status-warning',
  danger: 'text-status-danger',
  info: 'text-info',
};

/* ─── Section shell ─────────────────────────────────────────────────── */

/** The nine regions of the page spine (§3) and their locked mobile order (§16.1). */
export type TodaySectionId =
  | 'header'
  | 'state'
  | 'mission'
  | 'attention'
  | 'queue'
  | 'progress'
  | 'signals'
  | 'reflection'
  | 'telemetry';

/**
 * Literal class names — a dynamically built `max-md:order-${n}` would never be
 * seen by Tailwind's source scanner and would silently ship no ordering.
 */
const MOBILE_ORDER_CLASS: Record<number, string> = {
  1: 'max-md:order-1',
  2: 'max-md:order-2',
  3: 'max-md:order-3',
  4: 'max-md:order-4',
  5: 'max-md:order-5',
  6: 'max-md:order-6',
  7: 'max-md:order-7',
  8: 'max-md:order-8',
  9: 'max-md:order-9',
};

export interface TodaySectionProps extends React.HTMLAttributes<HTMLElement> {
  /** `data-section` — the region's identity (§16.1). */
  section: TodaySectionId;
  /** `data-mobile-order` — 1…9, matching §16.1. */
  mobileOrder: number;
  /** `data-reveal` id. Sections without it are never reveal-gated. */
  revealId?: string;
  /** Whether the reveal-gated section has been revealed yet. */
  revealed?: boolean;
  /**
   * Reveal gating. Defaults to `revealId !== undefined`; the Mission passes
   * `false` because it carries `data-reveal="hero"` yet is always visible.
   */
  gated?: boolean;
  /** Callback ref used by the IntersectionObserver wiring in DashboardView. */
  observeRef?: (el: HTMLElement | null) => void;
  children: React.ReactNode;
}

/**
 * One region of the Today spine: identity (`data-section`), mobile priority
 * (`data-mobile-order` + the matching `max-md:order-*` class) and optional
 * scroll-reveal (`data-reveal` + `.scroll-reveal`).
 *
 * DOM order is always the desktop order; the `max-md:order-*` utility only
 * re-orders at ≤768px (§16.1), where the spine itself becomes a flex column.
 */
export const TodaySection: React.FC<TodaySectionProps> = ({
  section,
  mobileOrder,
  revealId,
  revealed = false,
  gated,
  observeRef,
  className,
  children,
  ...rest
}) => {
  const isGated = gated ?? revealId !== undefined;
  const orderClass = MOBILE_ORDER_CLASS[mobileOrder] ?? '';

  return (
    <section
      {...rest}
      data-section={section}
      data-mobile-order={mobileOrder}
      data-reveal={revealId}
      ref={observeRef}
      className={cn(
        orderClass,
        isGated && revealId ? 'scroll-reveal' : '',
        isGated && revealId && revealed ? 'visible' : '',
        className
      )}
    >
      {children}
    </section>
  );
};

/* ─── Typography ────────────────────────────────────────────────────── */

export interface SectionHeadingProps {
  children: React.ReactNode;
  /** Right-hand meta slot (counts, status tags). */
  right?: React.ReactNode;
  className?: string;
}

/**
 * Section eyebrow + heading: `h2`, 13/600, uppercase, 0.06em tracking
 * (§1.4). Every section shares this left edge (§14).
 */
export const SectionHeading: React.FC<SectionHeadingProps> = ({ children, right, className }) => (
  <div className={cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-2', className)}>
    <h2 className="font-mono text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
      {children}
    </h2>
    {right ? <div className="flex flex-wrap items-center gap-2">{right}</div> : null}
  </div>
);

export interface MonoChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: TodayTone;
  /** 10px uppercase micro label (eyebrow/badge). Default: 11px sentence case. */
  micro?: boolean;
  children: React.ReactNode;
}

/** Mono metadata chip: `bg-surface-subtle` + `border-border-default`, 22–24px. */
export const MonoChip: React.FC<MonoChipProps> = ({ tone = 'neutral', micro = false, className, children, ...rest }) => (
  <span
    {...rest}
    className={cn(
      'inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono font-medium leading-[14px]',
      micro ? 'text-[10px] uppercase tracking-[0.08em]' : 'text-[11px]',
      TONE_BG[tone],
      TONE_BORDER[tone],
      TONE_TEXT[tone],
      className
    )}
  >
    {children}
  </span>
);

/* ─── Surfaces & meters ─────────────────────────────────────────────── */

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/** The one card grammar of §1.6: 8px radius, 1px border, tonal plane. */
export const Panel: React.FC<PanelProps> = ({ className, children, ...rest }) => (
  <div {...rest} className={cn('rounded-lg border border-border-default bg-surface-panel', className)}>{children}</div>
);

export interface MeterBarProps {
  /** 0–100. */
  value: number;
  tone?: 'primary' | 'warning';
  className?: string;
  'aria-hidden'?: boolean;
}

/**
 * Flat meter: `--primary` fill on a `--surface-muted` track, 4px, no
 * gradient, no glow (§1.6). Width transition 320ms (animation A3).
 */
export const MeterBar: React.FC<MeterBarProps> = ({ value, tone = 'primary', className, ...rest }) => {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div
      className={cn('h-1 w-full overflow-hidden rounded-sm bg-surface-subtle', className)}
      {...rest}
    >
      <div
        className={cn(
          'h-full rounded-sm transition-[width] duration-[320ms] ease-out',
          tone === 'primary' ? 'bg-primary' : 'bg-status-warning'
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

/* ─── Buttons ───────────────────────────────────────────────────────── */

export type TodayButtonVariant = 'primary' | 'tonal' | 'outline' | 'ghost' | 'warning';

const BUTTON_BASE =
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border font-medium whitespace-nowrap transition-colors duration-150 select-none disabled:pointer-events-none disabled:opacity-50';

const BUTTON_SIZE: Record<'md' | 'lg', string> = {
  md: 'h-8 px-3 text-[13px]',
  lg: 'h-9 px-4 text-sm',
};

/**
 * §5.2 demotion table. Only `primary` may ever carry `data-cta="primary"`,
 * and Mission renders it exactly once.
 */
const BUTTON_VARIANT: Record<TodayButtonVariant, string> = {
  primary: 'border-action-accent-border bg-action-accent text-action-accent-foreground hover:bg-action-accent-hover shadow-sm transition-colors',
  tonal: 'border-border-default bg-surface-subtle text-text-primary hover:bg-surface-elevated',
  outline: 'border-border-active bg-surface-panel text-text-primary hover:bg-surface-elevated',
  ghost: 'border-transparent bg-transparent text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
  warning: 'border-warning/50 bg-warning/10 text-status-warning hover:bg-warning/20',
};

export interface TodayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TodayButtonVariant;
  size?: 'md' | 'lg';
}

export const TodayButton: React.FC<TodayButtonProps> = ({
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  ...props
}) => <button type={type} className={cn(BUTTON_BASE, BUTTON_SIZE[size], BUTTON_VARIANT[variant], className)} {...props} />;

/**
 * §5.2 — the ONE filled CTA of the Today page. Rendered only by Mission, only
 * in the normal / caught-up states; never in a popover, never in a band.
 * `T-NEW-1` asserts at most one `[data-cta="primary"]` exists per render.
 * `variant`/`size` are pinned here: the spread runs first, these win.
 */
export const PrimaryCTA: React.FC<TodayButtonProps> = ({ className, ...props }) => (
  <TodayButton {...props} variant="primary" size="lg" data-cta="primary" className={cn('font-semibold', className)} />
);
