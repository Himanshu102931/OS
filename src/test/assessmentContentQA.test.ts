import { describe, it, expect } from 'vitest';
import {
  BASELINE_ASSESSMENT_DEFINITION,
  ASSESSMENT_DEFINITIONS,
  BASELINE_ASSESSMENT_ITEMS,
  M1_APTITUDE_ITEMS,
  M2_DSA_ITEMS,
  M3_PYTHON_ITEMS,
  M4_SQL_ITEMS,
  M5_DBMS_ITEMS,
  M6_OOP_ITEMS,
  M7_OS_ITEMS,
  M8_CN_ITEMS,
  M9_COMMUNICATION_ITEMS,
  M10_INTERVIEWS_ITEMS,
} from '../data/assessment';
import { DSA_PROBLEMS } from '../data/dsaDataset';
import type { AssessmentItem } from '../types';

describe('Assessment Specification v1.0 — Phase B: Content & QA Harness', () => {
  const moduleItemMap: Record<string, AssessmentItem[]> = {
    aptitude: M1_APTITUDE_ITEMS,
    dsa: M2_DSA_ITEMS,
    python: M3_PYTHON_ITEMS,
    sql: M4_SQL_ITEMS,
    dbms: M5_DBMS_ITEMS,
    oop: M6_OOP_ITEMS,
    os: M7_OS_ITEMS,
    cn: M8_CN_ITEMS,
    communication: M9_COMMUNICATION_ITEMS,
    interviews: M10_INTERVIEWS_ITEMS,
  };

  const VALID_ERROR_TAXONOMY = new Set([
    // General taxonomy (§12.1)
    'E-CONCEPT',
    'E-APPLY',
    'E-INTERPRET',
    'E-EXEC',
    'E-PATTERN',
    'E-TERM',
    'E-SPEED',
    'E-GUESS',
    'E-UNSPECIFIED',
    // Domain specializations (§12.1)
    'dsa-concept-recognition',
    'dsa-pattern-selection',
    'dsa-algorithm-design',
    'dsa-implementation',
    'dsa-complexity-reasoning',
    'py-syntax',
    'py-language-knowledge',
    'py-control-flow',
    'py-data-structures',
    'py-debugging',
    'py-logic',
    'sql-select-filter',
    'sql-join',
    'sql-group-by',
    'sql-aggregation',
    'sql-subquery',
    'sql-window-functions',
    'sql-null-semantics',
    'apt-concept',
    'apt-arithmetic',
    'apt-interpretation',
    'apt-speed',
    'apt-careless-error',
    'cs-concept-gap',
    'cs-scenario-reasoning',
    'cs-terminology',
    'cs-application',
    'oop-principle-identification',
    'oop-code-trace',
    'oop-design-tradeoff',
    'oop-vocabulary',
    'comm-grammar',
    'comm-comprehension',
    'comm-vocabulary',
    'comm-written-organization',
    'int-tech-knowledge-gap',
    'int-structure-gap',
    'int-scenario-judgment',
  ]);

  describe('1. Authoritative Baseline Definition & Blueprint Timing', () => {
    it('defines 10 modules and excludes projects domain from baseline', () => {
      expect(BASELINE_ASSESSMENT_DEFINITION.modules).toHaveLength(10);
      const domainIds = BASELINE_ASSESSMENT_DEFINITION.modules.map((m) => m.domainId);
      expect(domainIds).not.toContain('projects');
      expect(domainIds).toContain('aptitude');
      expect(domainIds).toContain('dsa');
      expect(domainIds).toContain('python');
      expect(domainIds).toContain('sql');
      expect(domainIds).toContain('dbms');
      expect(domainIds).toContain('oop');
      expect(domainIds).toContain('os');
      expect(domainIds).toContain('cn');
      expect(domainIds).toContain('communication');
      expect(domainIds).toContain('interviews');
    });

    it('has a total time limit of 180 minutes with 160 minutes content budget and 20 min system buffer', () => {
      expect(BASELINE_ASSESSMENT_DEFINITION.timeLimitMinutes).toBe(180);
      const totalContentBudget = BASELINE_ASSESSMENT_DEFINITION.modules.reduce(
        (sum, m) => sum + m.timeBudget,
        0
      );
      expect(totalContentBudget).toBe(160);
      const buffer = BASELINE_ASSESSMENT_DEFINITION.timeLimitMinutes - totalContentBudget;
      expect(buffer).toBe(20);
    });

    it('specifies exact declared time budgets per module matching §6.2', () => {
      const budgetMap = Object.fromEntries(
        BASELINE_ASSESSMENT_DEFINITION.modules.map((m) => [m.domainId, m.timeBudget])
      );
      expect(budgetMap.aptitude).toBe(25);
      expect(budgetMap.dsa).toBe(35);
      expect(budgetMap.python).toBe(15);
      expect(budgetMap.sql).toBe(15);
      expect(budgetMap.dbms).toBe(12);
      expect(budgetMap.oop).toBe(12);
      expect(budgetMap.os).toBe(10);
      expect(budgetMap.cn).toBe(10);
      expect(budgetMap.communication).toBe(16);
      expect(budgetMap.interviews).toBe(10);
    });

    it('is registered in ASSESSMENT_DEFINITIONS array', () => {
      expect(ASSESSMENT_DEFINITIONS).toContain(BASELINE_ASSESSMENT_DEFINITION);
    });
  });

  describe('2. Exact Item Counts & Structure', () => {
    it('contains exactly 84 total baseline assessment items', () => {
      expect(BASELINE_ASSESSMENT_ITEMS).toHaveLength(84);
    });

    it('matches exact item count targets per module declared in §6.2', () => {
      expect(M1_APTITUDE_ITEMS).toHaveLength(20);
      expect(M2_DSA_ITEMS).toHaveLength(9);
      expect(M3_PYTHON_ITEMS).toHaveLength(8);
      expect(M4_SQL_ITEMS).toHaveLength(7);
      expect(M5_DBMS_ITEMS).toHaveLength(8);
      expect(M6_OOP_ITEMS).toHaveLength(7);
      expect(M7_OS_ITEMS).toHaveLength(6);
      expect(M8_CN_ITEMS).toHaveLength(6);
      expect(M9_COMMUNICATION_ITEMS).toHaveLength(8);
      expect(M10_INTERVIEWS_ITEMS).toHaveLength(5);
    });

    it('agrees with definition declared itemCount per module', () => {
      for (const mod of BASELINE_ASSESSMENT_DEFINITION.modules) {
        const items = moduleItemMap[mod.domainId];
        expect(items).toBeDefined();
        expect(items.length).toBe(mod.itemCount);
      }
    });
  });

  describe('3. Unique IDs & Namespacing', () => {
    it('all item IDs are unique and use the asm-* namespace', () => {
      const idSet = new Set<string>();
      for (const item of BASELINE_ASSESSMENT_ITEMS) {
        expect(item.id).toMatch(/^asm-[a-z]+-\d{3}$/);
        expect(idSet.has(item.id)).toBe(false);
        idSet.add(item.id);
      }
      expect(idSet.size).toBe(84);
    });

    it('does not collide with DSA-150 IDs (dsa-*) or practice IDs (q-*)', () => {
      const canonicalDsaIds = new Set(DSA_PROBLEMS.map((p) => p.id));
      for (const item of BASELINE_ASSESSMENT_ITEMS) {
        expect(canonicalDsaIds.has(item.id)).toBe(false);
        expect(item.id.startsWith('dsa-')).toBe(false);
        expect(item.id.startsWith('q-')).toBe(false);
      }
    });

    it('all prompts are unique after whitespace normalization', () => {
      const promptHashes = new Set<string>();
      for (const item of BASELINE_ASSESSMENT_ITEMS) {
        const normalized = item.prompt.toLowerCase().replace(/\s+/g, ' ').trim();
        expect(promptHashes.has(normalized)).toBe(false);
        promptHashes.add(normalized);
      }
    });
  });

  describe('4. Difficulty Distribution & Mapping', () => {
    it('matches exact global difficulty mix of 31 easy, 34 medium, 19 hard (~37/40/23)', () => {
      // Per §8.1: Difficulty 1-2 = Easy pool, 3 = Medium pool, 4 = Hard pool
      const easyItems = BASELINE_ASSESSMENT_ITEMS.filter((i) => i.difficulty === 1 || i.difficulty === 2);
      const medItems = BASELINE_ASSESSMENT_ITEMS.filter((i) => i.difficulty === 3);
      const hardItems = BASELINE_ASSESSMENT_ITEMS.filter((i) => i.difficulty === 4);

      expect(easyItems).toHaveLength(31);
      expect(medItems).toHaveLength(34);
      expect(hardItems).toHaveLength(19);
      expect(easyItems.length + medItems.length + hardItems.length).toBe(84);

      // Percentage check per spec §6.1 (~37% / 40% / 23%)
      const easyPct = (easyItems.length / 84) * 100;
      const medPct = (medItems.length / 84) * 100;
      const hardPct = (hardItems.length / 84) * 100;

      expect(Math.round(easyPct)).toBe(37);
      expect(Math.round(medPct)).toBe(40);
      expect(Math.round(hardPct)).toBe(23);
    });

    it('each module difficulty mix matches its declared blueprint distribution', () => {
      for (const mod of BASELINE_ASSESSMENT_DEFINITION.modules) {
        const items = moduleItemMap[mod.domainId];
        const easy = items.filter((i) => i.difficulty === 1 || i.difficulty === 2).length;
        const medium = items.filter((i) => i.difficulty === 3).length;
        const hard = items.filter((i) => i.difficulty === 4).length;

        expect(easy).toBe(mod.difficultyMix.easy);
        expect(medium).toBe(mod.difficultyMix.medium);
        expect(hard).toBe(mod.difficultyMix.hard);
      }
    });
  });

  describe('5. Timing Realism (§30 Check 9)', () => {
    it('sum of estimatedMinutes per module is less than or equal to module time budget', () => {
      for (const mod of BASELINE_ASSESSMENT_DEFINITION.modules) {
        const items = moduleItemMap[mod.domainId];
        const sumMinutes = items.reduce((sum, item) => sum + item.estimatedMinutes, 0);
        expect(sumMinutes).toBeLessThanOrEqual(mod.timeBudget);
      }
    });

    it('no individual assessment item exceeds 8 minutes', () => {
      for (const item of BASELINE_ASSESSMENT_ITEMS) {
        expect(item.estimatedMinutes).toBeGreaterThan(0);
        expect(item.estimatedMinutes).toBeLessThanOrEqual(8);
      }
    });
  });

  describe('6. Valid Answer Keys & Options (§30 Check 4)', () => {
    it('every objective MCQ item has at least 4 unique options and an in-bounds key', () => {
      for (const item of BASELINE_ASSESSMENT_ITEMS) {
        if (item.options && item.options.length > 0) {
          expect(item.options.length).toBeGreaterThanOrEqual(4);
          const uniqueOptions = new Set(item.options);
          expect(uniqueOptions.size).toBe(item.options.length);

          if (typeof item.key === 'number') {
            expect(item.key).toBeGreaterThanOrEqual(0);
            expect(item.key).toBeLessThan(item.options.length);
          }
        }
      }
    });

    it('SQL normalized-match items provide non-empty acceptableForms array', () => {
      const sqlQueries = M4_SQL_ITEMS.filter((i) => i.scoring.kind === 'normalized_match');
      expect(sqlQueries.length).toBeGreaterThanOrEqual(2);
      for (const item of sqlQueries) {
        expect(item.scoring.acceptableForms).toBeDefined();
        expect(Array.isArray(item.scoring.acceptableForms)).toBe(true);
        expect(item.scoring.acceptableForms!.length).toBeGreaterThanOrEqual(2);
        for (const form of item.scoring.acceptableForms!) {
          expect(form.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it('rubric items specify rubricId and comprehensive rubric guidance in explanation', () => {
      const rubricItems = BASELINE_ASSESSMENT_ITEMS.filter((i) => i.scoring.kind === 'rubric');
      expect(rubricItems.length).toBeGreaterThan(0);
      for (const item of rubricItems) {
        expect(item.scoring.rubricId).toBeDefined();
        expect(item.scoring.rubricId!.length).toBeGreaterThan(0);
        expect(item.explanation.toLowerCase()).toContain('rubric');
      }
    });
  });

  describe('7. Domain & Topic Coverage (§4.3 & §30 Check 5)', () => {
    it('each class A and class B domain has >= 5 items (or >= 4 for interviews) spanning >= 2 difficulty bands and >= 2 competencies', () => {
      for (const mod of BASELINE_ASSESSMENT_DEFINITION.modules) {
        const items = moduleItemMap[mod.domainId];
        const minItems = mod.domainId === 'interviews' ? 4 : 5;
        expect(items.length).toBeGreaterThanOrEqual(minItems);

        // Difficulty bands represented (at least 2 of easy, med, hard)
        const bands = new Set<string>();
        for (const item of items) {
          if (item.difficulty <= 2) bands.add('easy');
          else if (item.difficulty === 3) bands.add('medium');
          else if (item.difficulty === 4) bands.add('hard');
        }
        expect(bands.size).toBeGreaterThanOrEqual(2);

        // Competencies / topics represented (at least 2)
        const competencies = new Set(items.map((i) => i.competency));
        expect(competencies.size).toBeGreaterThanOrEqual(2);
      }
    });

    it('projects domain has zero baseline items and is excluded from baseline assessment', () => {
      const projectItems = BASELINE_ASSESSMENT_ITEMS.filter((i) => (i.domainId as string) === 'projects');
      expect(projectItems).toHaveLength(0);
    });
  });

  describe('8. Independence from Canonical DSA-150 (§14)', () => {
    it('none of the 9 DSA assessment items share title, ID, or prompt with DSA-150 problems', () => {
      const canonicalIds = new Set(DSA_PROBLEMS.map((p) => p.id));
      const canonicalTitles = new Set(DSA_PROBLEMS.map((p) => p.title.toLowerCase()));

      for (const dsaItem of M2_DSA_ITEMS) {
        expect(canonicalIds.has(dsaItem.id)).toBe(false);
        expect(canonicalTitles.has(dsaItem.prompt.toLowerCase())).toBe(false);
        expect(dsaItem.origin).toBe('assessment');
      }
    });
  });

  describe('9. Required Metadata on Every Item (§7.1)', () => {
    it('every item possesses all mandatory fields with valid types', () => {
      for (const item of BASELINE_ASSESSMENT_ITEMS) {
        expect(item.id).toBeTruthy();
        expect(item.domainId).toBeTruthy();
        expect(item.topicId).toBeTruthy();
        expect(item.competency).toBeTruthy();
        expect([1, 2, 3, 4]).toContain(item.difficulty);
        expect(item.estimatedMinutes).toBeGreaterThan(0);
        expect(item.questionType).toBeTruthy();
        expect(['anchor', 'branch', 'confirm']).toContain(item.assessmentRole);
        expect(item.eligibleFor).toContain('baseline');
        expect(item.exposurePolicy).toBeDefined();
        expect(typeof item.exposurePolicy.maxEstimationUses).toBe('number');
        expect(typeof item.exposurePolicy.releaseToPractice).toBe('boolean');
        expect(item.scoring).toBeDefined();
        expect(['objective', 'normalized_match', 'rubric']).toContain(item.scoring.kind);
        expect(item.scoring.weight).toBeGreaterThanOrEqual(1);
        expect(item.prompt).toBeTruthy();
        expect(item.explanation).toBeTruthy();
        expect(Array.isArray(item.errorCategories)).toBe(true);
        expect(item.errorCategories.length).toBeGreaterThan(0);
        expect(item.origin).toBe('assessment');
      }
    });

    it('every errorCategory code adheres to the §12 Error Taxonomy', () => {
      for (const item of BASELINE_ASSESSMENT_ITEMS) {
        for (const cat of item.errorCategories) {
          expect(VALID_ERROR_TAXONOMY.has(cat)).toBe(true);
        }
      }
    });
  });
});
