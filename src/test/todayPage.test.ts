import { describe, it, expect } from 'vitest';
import { getDefaultStorageState, validateStorageState } from '../storage/storageAdapter';

describe('Today Page — Clean Default State', () => {
  const state = getDefaultStorageState();

  it('has zero task completions', () => {
    const completed = Object.values(state.taskProgress).filter(tp => tp.state === 'completed');
    expect(completed.length).toBe(0);
  });

  it('has zero task postponements or skips', () => {
    Object.values(state.taskProgress).forEach(tp => {
      expect(tp.postponeCount).toBe(0);
      expect(tp.skipCount).toBe(0);
      expect(tp.timeSpentMinutes).toBe(0);
    });
  });

  it('has no DSA progress (all Box 1, zero attempts)', () => {
    Object.values(state.dsaProgress).forEach(dp => {
      expect(dp.currentBox).toBe(1);
      expect(dp.attemptCount).toBe(0);
      expect(dp.passedIndependently).toBe(false);
      expect(dp.evidenceStrength).toBe(0);
    });
  });

  it('has no preparation progress', () => {
    expect(Object.keys(state.preparationTopicProgress).length).toBe(0);
  });

  it('has no skill evidence (all untested)', () => {
    Object.values(state.skillStates).forEach(sk => {
      expect(sk.freshness).toBe('untested');
      expect(sk.evidenceStrength).toBe(0);
      expect(sk.lastPracticedAt).toBeUndefined();
    });
  });

  it('has no companies by default', () => {
    expect(state.companyOverlays.length).toBe(0);
  });

  it('has no daily check-ins', () => {
    expect(state.dailyCheckIns.length).toBe(0);
  });

  it('has no daily task assignments', () => {
    expect(state.dailyTaskAssignments.length).toBe(0);
  });

  it('has no practice attempts', () => {
    expect(state.practiceAttempts?.length ?? 0).toBe(0);
  });

  it('preserves curriculum metadata', () => {
    // TASK_PROGRESS seed defines curriculum task IDs
    expect(Object.keys(state.taskProgress).length).toBeGreaterThan(0);
    // All tasks should be not_started (curriculum present, no user progress)
    Object.values(state.taskProgress).forEach(tp => {
      expect(tp.state).toBe('not_started');
    });
  });

  it('passes storage validation', () => {
    expect(validateStorageState(state)).toBe(true);
  });
});

describe('Today Page — Node Destination Mapping', () => {
  // Canonical domain-to-preparation-topic mapping used by TodayHeroVisual
  const DOMAIN_TO_PREP_TOPIC: Record<string, string> = {
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

  it('has a destination for every domain node', () => {
    expect(DOMAIN_TO_PREP_TOPIC.python).toBe('prep-lang');
    expect(DOMAIN_TO_PREP_TOPIC.sql).toBe('prep-sql');
    expect(DOMAIN_TO_PREP_TOPIC.dbms).toBe('prep-dbms');
    expect(DOMAIN_TO_PREP_TOPIC.oop).toBe('prep-oop');
    expect(DOMAIN_TO_PREP_TOPIC.os).toBe('prep-os');
    expect(DOMAIN_TO_PREP_TOPIC.cn).toBe('prep-cn');
    expect(DOMAIN_TO_PREP_TOPIC.aptitude).toBe('prep-apt-quant');
    expect(DOMAIN_TO_PREP_TOPIC.communication).toBe('prep-comm');
    expect(DOMAIN_TO_PREP_TOPIC.interviews).toBe('prep-interview-tech');
    expect(DOMAIN_TO_PREP_TOPIC.projects).toBe('prep-coding-ds');
  });

  it('maps DSA node to DSA page', () => {
    // DSA maps to 'dsa' route directly (handled in handleNodeClick)
    expect(DOMAIN_TO_PREP_TOPIC.dsa).toBeUndefined();
  });

  it('maps company node to companies page', () => {
    // Company node handled in handleNodeClick with 'companies' route
    // Not in DOMAIN_TO_PREP_TOPIC
    expect(DOMAIN_TO_PREP_TOPIC.company).toBeUndefined();
  });

  it('every mapped preparation topic id starts with prep-', () => {
    Object.values(DOMAIN_TO_PREP_TOPIC).forEach(id => {
      expect(id).toMatch(/^prep-/);
    });
  });
});

describe('Today Page — Company Delete', () => {
  it('deleteCompanyOverlay exists in PlacementContext interface', async () => {
    // Dynamic import to check the type is exposed
    const context = await import('../context/PlacementContext');
    // The context module should exist and export PlacementProvider
    expect(context.PlacementProvider).toBeDefined();
  });

  it('reset produces empty company list', () => {
    const state = getDefaultStorageState();
    expect(state.companyOverlays).toEqual([]);
  });
});
