import { describe, it, expect } from 'vitest';
import {
  TEACHER_EIGHT_DAY_DSA_CHALLENGE,
  type TeacherChallengeProblem,
} from '../data/teacherEightDayDSAChallenge';
import { DSA_PROBLEMS } from '../data/dsaDataset';

describe('Teacher 8-Day DSA Challenge Catalog — Invariant & Integrity Verification', () => {
  it('contains exactly 8 sequential modules (Days 1 through 8)', () => {
    expect(TEACHER_EIGHT_DAY_DSA_CHALLENGE).toHaveLength(8);
    TEACHER_EIGHT_DAY_DSA_CHALLENGE.forEach((mod, idx) => {
      expect(mod.day).toBe(idx + 1);
      expect(mod.sourcePage).toBe(idx + 1);
      expect(mod.title).toBeTruthy();
      expect(mod.coreSkills).toBeTruthy();
    });
  });

  it('contains exactly 5 guided and 5 independent problems per module (10 per day, 80 total)', () => {
    let totalGuided = 0;
    let totalIndependent = 0;

    TEACHER_EIGHT_DAY_DSA_CHALLENGE.forEach((mod) => {
      expect(mod.guided).toHaveLength(5);
      expect(mod.independent).toHaveLength(5);
      totalGuided += mod.guided.length;
      totalIndependent += mod.independent.length;
    });

    expect(totalGuided).toBe(40);
    expect(totalIndependent).toBe(40);
    expect(totalGuided + totalIndependent).toBe(80);
  });

  it('guarantees all 80 LeetCode problem numbers are unique across the entire challenge', () => {
    const allNumbers: number[] = [];
    TEACHER_EIGHT_DAY_DSA_CHALLENGE.forEach((mod) => {
      mod.guided.forEach((p) => allNumbers.push(p.leetcodeNumber));
      mod.independent.forEach((p) => allNumbers.push(p.leetcodeNumber));
    });

    const uniqueNumbers = new Set(allNumbers);
    expect(allNumbers).toHaveLength(80);
    expect(uniqueNumbers.size).toBe(80);
  });

  it('accurately maps exactly 53 problems to existing canonical DSA_PROBLEMS IDs and leaves 27 as external practice', () => {
    const canonicalIdSet = new Set(DSA_PROBLEMS.map((p) => p.id));
    const canonicalLcMap = new Map(DSA_PROBLEMS.map((p) => [p.leetcodeNumber, p.id]));

    let mappedCount = 0;
    let externalCount = 0;

    const allProblems: TeacherChallengeProblem[] = [];
    TEACHER_EIGHT_DAY_DSA_CHALLENGE.forEach((mod) => {
      allProblems.push(...mod.guided, ...mod.independent);
    });

    for (const prob of allProblems) {
      if (prob.canonicalProblemId) {
        mappedCount++;
        // Must exist in DSA_PROBLEMS
        expect(canonicalIdSet.has(prob.canonicalProblemId)).toBe(true);
        // Must match the exact leetcodeNumber
        expect(canonicalLcMap.get(prob.leetcodeNumber)).toBe(prob.canonicalProblemId);
      } else {
        externalCount++;
        // Must NOT exist in DSA_PROBLEMS
        expect(canonicalLcMap.has(prob.leetcodeNumber)).toBe(false);
      }
    }

    expect(mappedCount).toBe(53);
    expect(externalCount).toBe(27);
  });

  it('provides complete research-aligned scaffolding for all 40 guided items', () => {
    const guidedProblems: TeacherChallengeProblem[] = [];
    TEACHER_EIGHT_DAY_DSA_CHALLENGE.forEach((mod) => {
      guidedProblems.push(...mod.guided);
    });

    expect(guidedProblems).toHaveLength(40);

    for (const prob of guidedProblems) {
      expect(prob.scaffold).toBeDefined();
      const s = prob.scaffold!;
      expect(s.problemRestatement.length).toBeGreaterThan(15);
      expect(s.inputsOutputs).toContain('->');
      expect(s.constraints.length).toBeGreaterThan(5);
      expect(s.bruteForceIntuition.length).toBeGreaterThan(15);
      expect(s.bruteForceComplexity).toContain('O(');
      expect(s.optimizedPattern.length).toBeGreaterThan(3);
      expect(s.invariant.length).toBeGreaterThan(10);
      expect(s.timeComplexity).toContain('O(');
      expect(s.spaceComplexity).toContain('O(');
      expect(s.boundaryEdgeCases.length).toBeGreaterThanOrEqual(2);

      // Worked example with state trace and prediction prompt
      expect(s.workedExample.input.length).toBeGreaterThan(0);
      expect(s.workedExample.steps.length).toBeGreaterThanOrEqual(2);
      expect(s.workedExample.predictionPrompt.length).toBeGreaterThan(15);
      expect(s.workedExample.predictionAnswer.length).toBeGreaterThan(5);
    }
  });

  it('includes graph-specific representation, traversal, and state-tracking notes on Day 8', () => {
    const day8 = TEACHER_EIGHT_DAY_DSA_CHALLENGE.find((m) => m.day === 8);
    expect(day8).toBeDefined();
    expect(day8!.title).toBe('Graph Algorithms');

    for (const prob of day8!.guided) {
      expect(prob.scaffold?.graphNotes).toBeDefined();
      expect(prob.scaffold?.graphNotes?.representation.length).toBeGreaterThan(5);
      expect(prob.scaffold?.graphNotes?.traversalType.length).toBeGreaterThan(3);
      expect(prob.scaffold?.graphNotes?.stateTracking.length).toBeGreaterThan(5);
    }
  });

  it('validates public LeetCode URLs for all 80 problems', () => {
    TEACHER_EIGHT_DAY_DSA_CHALLENGE.forEach((mod) => {
      [...mod.guided, ...mod.independent].forEach((prob) => {
        expect(prob.leetcodeUrl).toMatch(/^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/);
      });
    });
  });
});
