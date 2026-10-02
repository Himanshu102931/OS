// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateItemResponse,
  scoreAssessmentAttempt,
  buildBaselineAttempt,
  buildSundayMiniTestAttempt,
  buildFullReassessmentAttempt,
  transitionAttempt,
  isAttemptExpired,
} from '../engine/assessmentEngine';
import {
  executePythonAssessmentItem,
  executeSqlAssessmentItem,
  validatePythonSafety,
  validateSqlSafety,
  EXECUTION_ERROR_CODES,
} from '../engine/assessmentExecutionEngine';
import { BASELINE_ASSESSMENT_ITEMS } from '../data/assessment/items';
import { DSA_PROBLEMS, PHASES, MODULES, TOPICS, TASK_DEFINITIONS } from '../data/seedData';
import {
  StorageAdapter,
  getDefaultStorageState,
  validateStorageState,
  pruneAssessmentResponses,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import type {
  AssessmentItem,
  AssessmentResponse,
  AssessmentState,
  AssessmentExecutionRecord,
} from '../types';

describe('Phase H: Execution-Backed Python & SQL Specification', () => {
  beforeEach(() => {
    StorageAdapter.clearState();
  });

  // Sample Execution-Backed Python Assessment Item
  const samplePythonItem: AssessmentItem = {
    id: 'asm-py-exec-001',
    domainId: 'python',
    topicId: 'prep-lang',
    competency: 'py-data-structures',
    difficulty: 2,
    estimatedMinutes: 2,
    questionType: 'coding_constrained',
    assessmentRole: 'anchor',
    eligibleFor: ['baseline', 'weekly'],
    exposurePolicy: { maxEstimationUses: 2, releaseToPractice: false },
    scoring: { kind: 'execution_test', weight: 1 },
    prompt: 'Write a Python function `reverse_list(lst)` that returns the reversed list.',
    explanation: 'Uses slicing or reversed() to return a reversed list.',
    errorCategories: ['E-APPLY', 'py-data-structures'],
    origin: 'assessment',
    pythonContract: {
      entryPoint: 'reverse_list',
      testCases: [
        { inputs: [[1, 2, 3]], expected: [3, 2, 1] },
        { inputs: [[]], expected: [] },
        { inputs: [['a', 'b', 'c']], expected: ['c', 'b', 'a'] },
      ],
      timeoutMs: 1000,
    },
  };

  // Sample Execution-Backed SQL Assessment Item
  const sampleSqlItem: AssessmentItem = {
    id: 'asm-sql-exec-001',
    domainId: 'sql',
    topicId: 'prep-sql',
    competency: 'sql-select-filter',
    difficulty: 2,
    estimatedMinutes: 2,
    questionType: 'sql_query',
    assessmentRole: 'anchor',
    eligibleFor: ['baseline', 'weekly'],
    exposurePolicy: { maxEstimationUses: 2, releaseToPractice: false },
    scoring: { kind: 'execution_test', weight: 1 },
    prompt: 'Select `id` and `salary` from table `employees` for all employees earning more than 50000.',
    explanation: 'Filters rows with salary > 50000.',
    errorCategories: ['E-APPLY', 'sql-select-filter'],
    origin: 'assessment',
    sqlFixture: {
      tables: {
        employees: {
          columns: ['id', 'name', 'salary'],
          rows: [
            [1, 'Alice', 60000],
            [2, 'Bob', 45000],
            [3, 'Charlie', 75000],
            [4, 'David', 50000],
          ],
        },
      },
      expectedOutput: {
        columns: ['id', 'salary'],
        rows: [
          [1, 60000],
          [3, 75000],
        ],
        orderSensitive: false,
      },
    },
  };

  // 1. Python execution success
  it('1. evaluates correct Python code and reports success with all test cases passing', () => {
    const code = `
def reverse_list(lst):
    return lst[::-1]
`;
    const result = executePythonAssessmentItem(samplePythonItem, code);
    expect(result.passed).toBe(true);
    expect(result.status).toBe('success');
    expect(result.testsPassed).toBe(3);
    expect(result.totalTests).toBe(3);
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  // 2. Python execution failure
  it('2. detects incorrect Python output and flags assertion_failure with E-ASSERTION', () => {
    const code = `
def reverse_list(lst):
    return lst # Fails to reverse
`;
    const result = executePythonAssessmentItem(samplePythonItem, code);
    expect(result.passed).toBe(false);
    expect(result.status).toBe('assertion_failure');
    expect(result.errorCategory).toBe(EXECUTION_ERROR_CODES.ASSERTION);
    expect(result.testsPassed).toBe(0);
    expect(result.message).toContain('Test case failure');
  });

  // 3. Python syntax and runtime error classification
  it('3. accurately classifies syntax and runtime errors with separate error taxonomy codes', () => {
    // Syntax error
    const syntaxCode = `
def reverse_list(lst:
    return lst
`;
    const syntaxResult = executePythonAssessmentItem(samplePythonItem, syntaxCode);
    expect(syntaxResult.passed).toBe(false);
    expect(syntaxResult.status).toBe('syntax_error');
    expect(syntaxResult.errorCategory).toBe(EXECUTION_ERROR_CODES.SYNTAX);

    // Runtime error: ZeroDivisionError
    const runtimeCode = `
def reverse_list(lst):
    x = 10 / 0
    return lst
`;
    const runtimeResult = executePythonAssessmentItem(samplePythonItem, runtimeCode);
    expect(runtimeResult.passed).toBe(false);
    expect(runtimeResult.status).toBe('runtime_error');
    expect(runtimeResult.errorCategory).toBe(EXECUTION_ERROR_CODES.RUNTIME);
    expect(runtimeResult.message).toContain('division by zero');
  });

  // 4. Python timeout and step limit handling
  it('4. detects infinite loops and terminates with timeout status and E-TIMEOUT', () => {
    const infiniteLoopCode = `
def reverse_list(lst):
    while True:
        pass
`;
    const timeoutResult = executePythonAssessmentItem(samplePythonItem, infiniteLoopCode);
    expect(timeoutResult.passed).toBe(false);
    expect(timeoutResult.status).toBe('timeout');
    expect(timeoutResult.errorCategory).toBe(EXECUTION_ERROR_CODES.TIMEOUT);
  });

  // 5. Python deterministic result
  it('5. returns bit-for-bit deterministic results for identical Python code across multiple runs', () => {
    const code = `
def reverse_list(lst):
    res = []
    for item in lst:
        res = [item] + res
    return res
`;
    const run1 = executePythonAssessmentItem(samplePythonItem, code);
    const run2 = executePythonAssessmentItem(samplePythonItem, code);
    const run3 = executePythonAssessmentItem(samplePythonItem, code);

    expect(run1.passed).toBe(run2.passed);
    expect(run2.passed).toBe(run3.passed);
    expect(run1.testsPassed).toBe(run2.testsPassed);
    expect(run2.testsPassed).toBe(run3.testsPassed);
    expect(run1.status).toBe(run2.status);
    expect(run2.status).toBe(run3.status);
  });

  // 6. SQL execution success
  it('6. executes valid SQL query against isolated fixture and passes on matching rowset', () => {
    const query = 'SELECT id, salary FROM employees WHERE salary > 50000;';
    const result = executeSqlAssessmentItem(sampleSqlItem, query);
    expect(result.passed).toBe(true);
    expect(result.status).toBe('success');
    expect(result.testsPassed).toBe(1);
    expect(result.totalTests).toBe(1);
  });

  // 7. SQL wrong-result detection
  it('7. detects query returning incorrect rows and flags assertion_failure with E-WRONG_RESULT', () => {
    const wrongQuery = 'SELECT id, salary FROM employees WHERE salary >= 75000;';
    const result = executeSqlAssessmentItem(sampleSqlItem, wrongQuery);
    expect(result.passed).toBe(false);
    expect(result.status).toBe('assertion_failure');
    expect(result.errorCategory).toBe(EXECUTION_ERROR_CODES.WRONG_RESULT);
  });

  // 8. SQL invalid-query handling
  it('8. detects invalid SQL queries or non-existent tables and reports error cleanly', () => {
    const invalidQuery = 'SELECT id FROM non_existent_table WHERE salary > 50000;';
    const result = executeSqlAssessmentItem(sampleSqlItem, invalidQuery);
    expect(result.passed).toBe(false);
    expect(result.errorCategory).toBe(EXECUTION_ERROR_CODES.INVALID_QUERY);
  });

  // 9. SQL deterministic fixture behavior
  it('9. preserves fixture integrity and produces deterministic results across repeated runs', () => {
    const query = 'SELECT id, salary FROM employees WHERE salary > 50000;';
    const initialRowsCount = sampleSqlItem.sqlFixture!.tables.employees.rows.length;

    const r1 = executeSqlAssessmentItem(sampleSqlItem, query);
    const r2 = executeSqlAssessmentItem(sampleSqlItem, query);

    expect(r1.passed).toBe(true);
    expect(r2.passed).toBe(true);
    expect(sampleSqlItem.sqlFixture!.tables.employees.rows.length).toBe(initialRowsCount);
  });

  // 10. SQL normalized acceptableForms path remains intact
  it('10. preserves existing normalized_match acceptableForms evaluation without invoking execution engine', () => {
    const normalizedItem: AssessmentItem = {
      ...sampleSqlItem,
      id: 'asm-sql-norm-001',
      scoring: {
        kind: 'normalized_match',
        weight: 1,
        acceptableForms: [
          'SELECT department_id, COUNT(*) FROM employees GROUP BY department_id;',
        ],
      },
    };

    const evalResult = evaluateItemResponse(
      normalizedItem,
      'select   department_id,  count(*)  from  employees  group by  department_id;'
    );
    expect(evalResult.result).toBe('correct');
    expect(evalResult.scoredCredit).toBe(1.0);
    // Notice executionResult is NOT set for normalized_match items
    expect(evalResult.executionResult).toBeUndefined();
  });

  // 11. Unsupported execution fails closed
  it('11. fails closed safely when an item lacks a valid execution contract or fixture', () => {
    const corruptItem: AssessmentItem = {
      ...samplePythonItem,
      pythonContract: undefined,
    };

    const result = evaluateItemResponse(corruptItem, 'def solution(): pass');
    expect(result.result).toBe('incorrect');
    expect(result.scoredCredit).toBe(0.0);
    expect(result.errorCategories).toContain(EXECUTION_ERROR_CODES.UNSUPPORTED);
  });

  // 12. Sandbox and isolation constraints
  it('12. enforces strict sandbox isolation and blocks forbidden keywords, imports, and destructive commands', () => {
    // Python forbidden keywords
    const dangerousPython = [
      'import os; os.system("rm -rf /")',
      '__import__("sys").exit()',
      'eval("2 + 2")',
      'open("/etc/passwd", "r")',
      'window.location = "http://evil.com"',
      'fetch("http://evil.com")',
      'this.__proto__.polluted = true',
    ];

    for (const code of dangerousPython) {
      const safety = validatePythonSafety(code);
      expect(safety.safe).toBe(false);
      const execResult = executePythonAssessmentItem(samplePythonItem, code);
      expect(execResult.passed).toBe(false);
      expect(execResult.status).toBe('sandbox_violation');
      expect(execResult.errorCategory).toBe(EXECUTION_ERROR_CODES.SANDBOX_VIOLATION);
    }

    // SQL destructive statements
    const dangerousSql = [
      'DROP TABLE employees;',
      'DELETE FROM employees;',
      'UPDATE employees SET salary = 1000000;',
      'INSERT INTO employees VALUES (99, "Hacker", 999999);',
      'ALTER TABLE employees DROP COLUMN salary;',
    ];

    for (const query of dangerousSql) {
      const safety = validateSqlSafety(query);
      expect(safety.safe).toBe(false);
      const execResult = executeSqlAssessmentItem(sampleSqlItem, query);
      expect(execResult.passed).toBe(false);
      expect(execResult.status).toBe('sandbox_violation');
    }
  });

  // 13. Execution result integration into assessment scoring
  it('13. integrates execution evaluation seamlessly into assessment scoring, crediting correctly', () => {
    const correctCode = 'def reverse_list(lst): return lst[::-1]';
    const evalCorrect = evaluateItemResponse(samplePythonItem, correctCode);
    expect(evalCorrect.result).toBe('correct');
    expect(evalCorrect.scoredCredit).toBe(1.0);
    expect(evalCorrect.executionResult?.passed).toBe(true);

    const wrongCode = 'def reverse_list(lst): return []';
    const evalWrong = evaluateItemResponse(samplePythonItem, wrongCode);
    expect(evalWrong.result).toBe('incorrect');
    expect(evalWrong.scoredCredit).toBe(0.0);
    expect(evalWrong.executionResult?.passed).toBe(false);
  });

  // 14. sourceType 'test' evidence
  it('14. guarantees all evidence logs generated from attempts with execution-backed items have sourceType: test', () => {
    const attempt = buildBaselineAttempt('seed-phase-h');
    const responses: AssessmentResponse[] = [
      {
        id: 'resp-1',
        attemptId: attempt.id,
        itemId: samplePythonItem.id,
        response: 'def reverse_list(lst): return lst[::-1]',
        result: 'correct',
        timeSpentSeconds: 60,
        errorCategories: [],
        scoredCredit: 1.0,
        weightApplied: 1.0,
        executionResult: {
          passed: true,
          status: 'success',
          testsPassed: 3,
          totalTests: 3,
          executionTimeMs: 12,
        },
      },
    ];

    const result = scoreAssessmentAttempt(
      attempt,
      responses,
      [samplePythonItem, ...BASELINE_ASSESSMENT_ITEMS.filter((i) => i.id !== samplePythonItem.id)]
    );

    expect(result.evidenceLogs.length).toBeGreaterThan(0);
    for (const ev of result.evidenceLogs) {
      expect(ev.sourceType).toBe('test');
    }
  });

  // 15. Execution provenance preservation
  it('15. records execution records with full item, attempt, language, code, and result provenance', () => {
    const attempt = buildBaselineAttempt('seed-phase-h');
    const responses: AssessmentResponse[] = [
      {
        id: 'resp-exec',
        attemptId: attempt.id,
        itemId: samplePythonItem.id,
        response: 'def reverse_list(lst): return lst[::-1]',
        result: 'correct',
        timeSpentSeconds: 45,
        errorCategories: [],
        scoredCredit: 1.0,
        weightApplied: 1.0,
        executionResult: {
          passed: true,
          status: 'success',
          testsPassed: 3,
          totalTests: 3,
          executionTimeMs: 15,
        },
      },
    ];

    const result = scoreAssessmentAttempt(
      attempt,
      responses,
      [samplePythonItem, ...BASELINE_ASSESSMENT_ITEMS.filter((i) => i.id !== samplePythonItem.id)]
    );

    expect(result.executionRecords).toBeDefined();
    expect(result.executionRecords!.length).toBe(1);
    const rec = result.executionRecords![0];
    expect(rec.attemptId).toBe(attempt.id);
    expect(rec.itemId).toBe(samplePythonItem.id);
    expect(rec.language).toBe('python');
    expect(rec.code).toContain('def reverse_list');
    expect(rec.result.passed).toBe(true);
    expect(rec.timestamp).toBeDefined();
  });

  // 16. No DSA / practice / Leitner / pattern-mastery mutation
  it('16. ensures execution-backed assessments mutate zero DSA problems, Leitner boxes, or curriculum tasks', () => {
    const initialDsaCount = DSA_PROBLEMS.length;
    const initialPhasesCount = PHASES.length;
    const initialModulesCount = MODULES.length;
    const initialTopicsCount = TOPICS.length;
    const initialTasksCount = TASK_DEFINITIONS.length;

    const attempt = buildBaselineAttempt('seed-phase-h');
    const responses: AssessmentResponse[] = [
      {
        id: 'resp-exec',
        attemptId: attempt.id,
        itemId: samplePythonItem.id,
        response: 'def reverse_list(lst): return lst[::-1]',
        result: 'correct',
        timeSpentSeconds: 30,
        errorCategories: [],
        scoredCredit: 1.0,
        weightApplied: 1.0,
      },
    ];

    scoreAssessmentAttempt(attempt, responses, [samplePythonItem, ...BASELINE_ASSESSMENT_ITEMS]);

    expect(DSA_PROBLEMS.length).toBe(initialDsaCount);
    expect(PHASES.length).toBe(initialPhasesCount);
    expect(MODULES.length).toBe(initialModulesCount);
    expect(TOPICS.length).toBe(initialTopicsCount);
    expect(TASK_DEFINITIONS.length).toBe(initialTasksCount);
  });

  // 17. Persistence and reload behavior
  it('17. serializes state with executionRecords, passes validation, and reloads without loss', () => {
    const defaultState = getDefaultStorageState();
    const executionRecord: AssessmentExecutionRecord = {
      id: 'exec-test-1',
      attemptId: 'att-123',
      itemId: samplePythonItem.id,
      language: 'python',
      code: 'def reverse_list(lst): return lst[::-1]',
      result: {
        passed: true,
        status: 'success',
        testsPassed: 3,
        totalTests: 3,
        executionTimeMs: 10,
      },
      timestamp: new Date().toISOString(),
    };

    const stateWithExec: AppExtendedStorageState = {
      ...defaultState,
      assessmentState: {
        attempts: [],
        responses: [],
        exposures: {},
        domainResults: [],
        snapshots: [],
        weaknessSignals: [],
        profile: { pendingSunday: false },
        executionRecords: [executionRecord],
      },
    };

    // Validates cleanly
    expect(validateStorageState(stateWithExec)).toBe(true);

    // Pruning retains recent execution records
    const pruned = pruneAssessmentResponses(stateWithExec.assessmentState!);
    expect(pruned.executionRecords).toBeDefined();
    expect(pruned.executionRecords!.length).toBe(1);

    // Malformed execution records fail closed
    const corruptState = {
      ...stateWithExec,
      assessmentState: {
        ...stateWithExec.assessmentState!,
        executionRecords: [{ id: 123 } as unknown as AssessmentExecutionRecord],
      },
    };
    expect(validateStorageState(corruptState)).toBe(false);
  });

  // 18. Baseline, weekly, and full-reassessment semantics remain distinct
  it('18. supports execution items across baseline, weekly mini-test, and full reassessment cleanly', () => {
    const baselineAttempt = buildBaselineAttempt('seed-phase-h');
    const stateWithBaseline: AssessmentState = {
      attempts: [
        {
          id: 'att-baseline-001',
          definitionId: 'baseline-diagnostic-v1',
          definitionVersion: 1,
          kind: 'diagnostic_assessment',
          status: 'submitted',
          startedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          endedAt: new Date(Date.now() - 7 * 86400000 + 3600000).toISOString(),
          timeLimitSeconds: 10800,
          seed: 'seed-1',
          selectedItemIds: ['asm-py-exec-001'],
        },
      ],
      responses: [],
      exposures: {},
      domainResults: [],
      snapshots: [],
      weaknessSignals: [],
      profile: {
        baselineCompletedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        pendingSunday: true,
      },
    };

    const weeklyAttempt = buildSundayMiniTestAttempt(stateWithBaseline, {
      currentDate: new Date().toISOString(),
      allItems: [samplePythonItem, ...BASELINE_ASSESSMENT_ITEMS],
    }).attempt;
    const fullAttempt = buildFullReassessmentAttempt('seed-phase-h-reassess');

    expect(baselineAttempt.kind).toBe('diagnostic_assessment');
    expect(weeklyAttempt.kind).toBe('weekly_assessment');
    expect(fullAttempt.kind).toBe('full_reassessment');

    const evalResult = evaluateItemResponse(samplePythonItem, 'def reverse_list(lst): return lst[::-1]');
    expect(evalResult.result).toBe('correct');
  });

  // 19. Calibration observation compatibility
  it('19. generates calibration observation records for execution items preserving execution error categories', () => {
    const attempt = buildBaselineAttempt('seed-phase-h');
    const responses: AssessmentResponse[] = [
      {
        id: 'resp-exec-err',
        attemptId: attempt.id,
        itemId: samplePythonItem.id,
        response: 'def reverse_list(lst): while True: pass',
        result: 'incorrect',
        timeSpentSeconds: 30,
        errorCategories: [EXECUTION_ERROR_CODES.TIMEOUT, ...samplePythonItem.errorCategories],
        scoredCredit: 0.0,
        weightApplied: 1.0,
        executionResult: {
          passed: false,
          status: 'timeout',
          errorCategory: EXECUTION_ERROR_CODES.TIMEOUT,
          testsPassed: 0,
          totalTests: 3,
          executionTimeMs: 1000,
        },
      },
    ];

    const result = scoreAssessmentAttempt(
      attempt,
      responses,
      [samplePythonItem, ...BASELINE_ASSESSMENT_ITEMS.filter((i) => i.id !== samplePythonItem.id)]
    );

    expect(result.calibrationObservations).toBeDefined();
    const obs = result.calibrationObservations!.find((o) => o.itemId === samplePythonItem.id);
    expect(obs).toBeDefined();
    expect(obs!.errorCategories).toContain(EXECUTION_ERROR_CODES.TIMEOUT);
    expect(obs!.observedScore).toBe(0.0);
    expect(obs!.authoredDifficulty).toBe(samplePythonItem.difficulty);
  });

  // 20. Runner UI execution state handling
  it('20. properly formats execution result details for user-facing UI feedback', () => {
    const successResult = executePythonAssessmentItem(
      samplePythonItem,
      'def reverse_list(lst): return lst[::-1]'
    );
    expect(successResult.status).toBe('success');
    expect(successResult.message).toContain('All 3 test cases passed');

    const failResult = executePythonAssessmentItem(
      samplePythonItem,
      'def reverse_list(lst): return [1]'
    );
    expect(failResult.status).toBe('assertion_failure');
    expect(failResult.message).toContain('Expected');
  });

  // 21. Deterministic execution for identical inputs
  it('21. produces deterministic execution results and error messages for identical inputs', () => {
    const query = 'SELECT id, salary FROM employees WHERE salary > 50000;';
    const res1 = executeSqlAssessmentItem(sampleSqlItem, query);
    const res2 = executeSqlAssessmentItem(sampleSqlItem, query);

    expect(res1.passed).toBe(res2.passed);
    expect(res1.status).toBe(res2.status);
    expect(JSON.stringify(res1.actualOutput)).toBe(JSON.stringify(res2.actualOutput));
  });

  // 22. Timeout and expiration interaction with the existing assessment hard wall
  it('22. handles attempt hard wall expiration correctly, recording unanswered status for open items', () => {
    const attempt = buildBaselineAttempt('seed-phase-h');
    // Simulate expired attempt
    const expiredAttempt = {
      ...attempt,
      startedAt: new Date(Date.now() - (attempt.timeLimitSeconds + 10) * 1000).toISOString(),
    };

    expect(isAttemptExpired(expiredAttempt)).toBe(true);
    const autoSubmitted = transitionAttempt(expiredAttempt, 'auto_submitted');
    expect(autoSubmitted.status).toBe('auto_submitted');

    // Item left unanswered due to hard wall expiration
    const evalExpired = evaluateItemResponse(samplePythonItem, 'unanswered');
    expect(evalExpired.result).toBe('unanswered');
    expect(evalExpired.scoredCredit).toBe(0.0);
    expect(evalExpired.errorCategories).toContain('E-SPEED');
  });

  // 23. Prototype pollution defense (F-SEC-01)
  it('23. rejects dynamically constructed __proto__ assignment and prevents Object.prototype pollution', () => {
    const maliciousPayload = [
      'def reverse_list(lst):',
      '    d = {}',
      '    k = "__" + "proto" + "__"',
      '    d[k] = {"polluted": True}',
      '    return lst',
    ].join('\n');

    const result = executePythonAssessmentItem(samplePythonItem, maliciousPayload);
    expect(result.passed).toBe(false);
    expect(result.status).toBe('sandbox_violation');
    expect(result.errorCategory).toBe(EXECUTION_ERROR_CODES.SANDBOX_VIOLATION);
    expect(result.message).toContain('forbidden property');

    // Prove JavaScript Object.prototype was NOT mutated
    expect((Object.prototype as unknown as Record<string, unknown>).polluted).toBeUndefined();
    expect((({} as unknown) as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('24. rejects prototype and constructor assignments across literal and subscription paths', () => {
    const payloadConstructor = [
      'def reverse_list(lst):',
      '    d = {}',
      '    c = "con" + "structor"',
      '    d[c] = 123',
      '    return lst',
    ].join('\n');

    const res1 = executePythonAssessmentItem(samplePythonItem, payloadConstructor);
    expect(res1.passed).toBe(false);
    expect(res1.status).toBe('sandbox_violation');

    const payloadDictLiteral = [
      'def reverse_list(lst):',
      '    k = "proto" + "type"',
      '    d = {k: "evil"}',
      '    return lst',
    ].join('\n');

    const res2 = executePythonAssessmentItem(samplePythonItem, payloadDictLiteral);
    expect(res2.passed).toBe(false);
    expect(res2.status).toBe('sandbox_violation');
  });
});
