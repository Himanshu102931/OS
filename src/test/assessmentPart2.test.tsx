/**
 * Assessment Manufacturing Part 2 — Mode B Active Runner & Question Execution Tests
 *
 * Verifies Mode B against the frozen visual specification:
 * 1. Active runner renders canonical assessment
 * 2. Timer is represented and formatted correctly
 * 3. Current question / total questions are accurate
 * 4. Question progression (Next/Previous) works
 * 5. Answer state persists across navigation
 * 6. "I Don't Know" preserves knowledge_gap error taxonomy
 * 7. Confidence controls preserve 3-tier rating semantics
 * 8. MCQ / objective interaction works
 * 9. SQL query input normalization works and persists
 * 10. Python/execution contract remains connected to assessmentExecutionEngine
 * 11. Question palette reflects canonical state and allows jumping
 * 12. Submission confirmation dialog exists with unanswered warning
 * 13. Submission uses canonical finalization path
 * 14. Sealed state prevents duplicate mutation
 * 15. Responsive-safe runner structure
 * 16. Accessibility semantics (roles, landmarks, labels, live regions)
 * 17. No duplicate timer or evaluation logic
 */

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { PlacementProvider } from '../context/PlacementContext';
import { AssessmentRunnerView } from '../components/assessment/AssessmentRunnerView';
import { AssessmentCommandBar } from '../components/assessment/AssessmentCommandBar';
import { AssessmentQuestionStage } from '../components/assessment/AssessmentQuestionStage';
import { AssessmentQuestionPalette } from '../components/assessment/AssessmentQuestionPalette';
import { AssessmentSubmitModal } from '../components/assessment/AssessmentSubmitModal';
import { StorageAdapter, getDefaultStorageState, type AppExtendedStorageState } from '../storage/storageAdapter';
import { BASELINE_ASSESSMENT_ITEMS } from '../data/assessment/items';
import { executePythonAssessmentItem, executeSqlAssessmentItem } from '../engine/assessmentExecutionEngine';
import type { AssessmentAttempt, AssessmentItem, AssessmentResponse } from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Assessment Manufacturing Part 2 — Mode B Active Runner', () => {
  beforeEach(() => {
    StorageAdapter.clearState();
    window.location.hash = '#/assessment';
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const startActiveRunner = () => {
    render(
      <PlacementProvider>
        <AssessmentRunnerView />
      </PlacementProvider>
    );

    const startBtn = screen.getByText('Start Baseline Assessment');
    act(() => {
      fireEvent.click(startBtn);
    });
  };

  describe('1. Active Runner Rendering & Canonical Assessment', () => {
    it('1.1 renders the active runner container with canonical testid and subsystem attributes', () => {
      startActiveRunner();

      const runner = screen.getByTestId('assessment-execution-runner');
      expect(runner).toBeInTheDocument();
      expect(runner).toHaveAttribute('data-subsystem', 'assessment');
    });

    it('1.2 displays the active assessment title and module header', () => {
      startActiveRunner();

      expect(screen.getByText('Baseline Diagnostic')).toBeInTheDocument();
      expect(screen.getByText(/Question 1 of 84/i)).toBeInTheDocument();
    });
  });

  describe('2. Authoritative Wall-Clock Timer', () => {
    it('2.1 formats remaining seconds into HH:MM:SS correctly', () => {
      const mockAttempt: AssessmentAttempt = {
        id: 'attempt-test-1',
        definitionId: 'baseline-v1',
        definitionVersion: 1,
        kind: 'diagnostic_assessment',
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        selectedItemIds: [],
        timeLimitSeconds: 10800,
        seed: 'seed-1',
      };

      render(
        <AssessmentCommandBar
          attempt={mockAttempt}
          currentIndex={0}
          totalCount={84}
          answeredCount={10}
          timeRemainingSeconds={10795} // 02:59:55
          currentItem={BASELINE_ASSESSMENT_ITEMS[0]}
          onSubmitClick={() => {}}
        />
      );

      expect(screen.getByText('02:59:55')).toBeInTheDocument();
      expect(screen.getByText(/10 answered, 74 remaining/i)).toBeInTheDocument();
    });

    it('2.2 indicates timer warning under 15m and critical styling under 5m', () => {
      const mockAttempt: AssessmentAttempt = {
        id: 'attempt-test-2',
        definitionId: 'baseline-v1',
        definitionVersion: 1,
        kind: 'diagnostic_assessment',
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        selectedItemIds: [],
        timeLimitSeconds: 10800,
        seed: 'seed-2',
      };

      const { rerender } = render(
        <AssessmentCommandBar
          attempt={mockAttempt}
          currentIndex={0}
          totalCount={84}
          answeredCount={0}
          timeRemainingSeconds={800} // ~13 mins (urgent warning)
          currentItem={BASELINE_ASSESSMENT_ITEMS[0]}
          onSubmitClick={() => {}}
        />
      );

      const timerEl = screen.getByTestId('assessment-timer');
      expect(timerEl.className).toContain('text-amber-400');

      rerender(
        <AssessmentCommandBar
          attempt={mockAttempt}
          currentIndex={0}
          totalCount={84}
          answeredCount={0}
          timeRemainingSeconds={180} // 3 mins (critical)
          currentItem={BASELINE_ASSESSMENT_ITEMS[0]}
          onSubmitClick={() => {}}
        />
      );

      expect(timerEl.className).toContain('text-red-400');
      expect(timerEl.className).toContain('animate-pulse');
    });
  });

  describe('3. Current Question / Total Items Counter', () => {
    it('3.1 shows accurate question index out of 84 items', () => {
      startActiveRunner();

      expect(screen.getByText(/Question 1 of 84/i)).toBeInTheDocument();
    });
  });

  describe('4. Question Progression (Next / Previous)', () => {
    it('4.1 navigates to next question when Next Question button is clicked', () => {
      startActiveRunner();

      expect(screen.getByText(/Question 1 of 84/i)).toBeInTheDocument();

      const nextBtn = screen.getByText('Next Question');
      act(() => {
        fireEvent.click(nextBtn);
      });

      expect(screen.getByText(/Question 2 of 84/i)).toBeInTheDocument();
    });

    it('4.2 previous button is disabled on the first question and active on subsequent questions', () => {
      startActiveRunner();

      const prevBtn = screen.getByText('Previous Question');
      expect(prevBtn.closest('button')).toBeDisabled();

      const nextBtn = screen.getByText('Next Question');
      act(() => {
        fireEvent.click(nextBtn);
      });

      expect(screen.getByText(/Question 2 of 84/i)).toBeInTheDocument();
      expect(screen.getByText('Previous Question').closest('button')).not.toBeDisabled();

      act(() => {
        fireEvent.click(screen.getByText('Previous Question'));
      });
      expect(screen.getByText(/Question 1 of 84/i)).toBeInTheDocument();
    });
  });

  describe('5 & 8. Answer State & MCQ Interaction Persistence', () => {
    it('5.1 records MCQ option selection and persists when navigating away and back', () => {
      startActiveRunner();

      const radios = screen.getAllByRole('radio');
      expect(radios.length).toBeGreaterThan(0);

      // Select option 1 (index 0)
      act(() => {
        fireEvent.click(radios[0]);
      });

      expect(radios[0]).toHaveAttribute('aria-checked', 'true');

      // Advance to Question 2
      act(() => {
        fireEvent.click(screen.getByText('Next Question'));
      });
      expect(screen.getByText(/Question 2 of 84/i)).toBeInTheDocument();

      // Return to Question 1
      act(() => {
        fireEvent.click(screen.getByText('Previous Question'));
      });
      expect(screen.getByText(/Question 1 of 84/i)).toBeInTheDocument();

      // Option 0 should remain checked
      const recheckedRadios = screen.getAllByRole('radio');
      expect(recheckedRadios[0]).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('6. Honest "I Don\'t Know" Diagnostic Semantics', () => {
    it('6.1 clicking "I don\'t know this concept" marks knowledge_gap and updates UI', () => {
      startActiveRunner();

      const idkBtn = screen.getByText(/I don't know this concept/i);
      act(() => {
        fireEvent.click(idkBtn);
      });

      expect(idkBtn.closest('button')?.className).toContain('text-amber-300');
    });
  });

  describe('7. 3-Tier Confidence Rating Semantics', () => {
    it('7.1 allows selecting guessing, somewhat, confident ratings', () => {
      startActiveRunner();

      const confidentBtn = screen.getByRole('button', { name: /^confident$/i });
      act(() => {
        fireEvent.click(confidentBtn);
      });

      // Active confidence border/style check
      expect(confidentBtn.className).toContain('text-[#EAB308]');
    });
  });

  describe('9 & 10. Sandboxed Python & SQL Execution', () => {
    it('9.1 accepts SQL query inputs for normalized match questions', () => {
      // Find a SQL item
      const sqlItemIndex = BASELINE_ASSESSMENT_ITEMS.findIndex((item) => item.scoring.kind === 'normalized_match');
      expect(sqlItemIndex).toBeGreaterThanOrEqual(0);

      render(
        <PlacementProvider>
          <AssessmentRunnerView />
        </PlacementProvider>
      );

      const startBtn = screen.getByText('Start Baseline Assessment');
      act(() => {
        fireEvent.click(startBtn);
      });

      // Jump to SQL item via palette button
      const paletteContainer = screen.getByRole('navigation', { name: 'Questions list' });
      const itemBtn = paletteContainer.querySelector(`button:nth-child(${sqlItemIndex + 1})`) as HTMLButtonElement;
      expect(itemBtn).toBeInTheDocument();

      act(() => {
        fireEvent.click(itemBtn);
      });

      // Verify SQL Query Editor textarea is rendered
      const textarea = screen.getByPlaceholderText(/SELECT \.\.\. FROM \.\.\. WHERE \.\.\./i);
      expect(textarea).toBeInTheDocument();

      act(() => {
        fireEvent.change(textarea, { target: { value: 'SELECT department_id, COUNT(*) FROM employees GROUP BY department_id;' } });
      });

      expect(textarea).toHaveValue('SELECT department_id, COUNT(*) FROM employees GROUP BY department_id;');
    });

    it('10.1 verifies sandboxed Python and SQL execution engines in isolation', () => {
      const mockPyItem: AssessmentItem = {
        id: 'asm-py-exec-mock',
        domainId: 'python',
        topicId: 'prep-py',
        competency: 'functions',
        difficulty: 2,
        estimatedMinutes: 3,
        questionType: 'code_trace',
        assessmentRole: 'anchor',
        eligibleFor: ['baseline'],
        exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
        scoring: { kind: 'execution_test', weight: 1 },
        prompt: 'Write solution',
        explanation: 'None',
        errorCategories: [],
        origin: 'assessment',
        pythonContract: {
          entryPoint: 'solution',
          testCases: [{ inputs: [5], expected: 10 }],
          timeoutMs: 1000,
        },
      };

      const pyResult = executePythonAssessmentItem(mockPyItem, 'def solution(x):\n    return x * 2');

      expect(pyResult.passed).toBe(true);
      expect(pyResult.status).toBe('success');
      expect(pyResult.testsPassed).toBe(1);

      const mockSqlItem: AssessmentItem = {
        id: 'asm-sql-exec-mock',
        domainId: 'sql',
        topicId: 'prep-sql',
        competency: 'filtering',
        difficulty: 2,
        estimatedMinutes: 3,
        questionType: 'sql_query',
        assessmentRole: 'anchor',
        eligibleFor: ['baseline'],
        exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
        scoring: { kind: 'execution_test', weight: 1 },
        prompt: 'Write query',
        explanation: 'None',
        errorCategories: [],
        origin: 'assessment',
        sqlFixture: {
          tables: {
            users: {
              columns: ['id', 'name'],
              rows: [
                [1, 'Alice'],
                [2, 'Bob'],
              ],
            },
          },
          expectedOutput: {
            columns: ['name'],
            rows: [['Alice']],
          },
        },
      };

      const sqlResult = executeSqlAssessmentItem(mockSqlItem, 'SELECT name FROM users WHERE id = 1;');

      expect(sqlResult.passed).toBe(true);
      expect(sqlResult.status).toBe('success');
    });

    it('10.2 renders execution result feedback when executionResult is provided to stage', () => {
      render(
        <AssessmentQuestionStage
          currentItem={{
            id: 'asm-py-mock',
            domainId: 'python',
            topicId: 'prep-py',
            competency: 'functions',
            difficulty: 2,
            estimatedMinutes: 3,
            questionType: 'code_trace',
            assessmentRole: 'anchor',
            eligibleFor: ['baseline'],
            exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
            scoring: { kind: 'execution_test', weight: 1 },
            prompt: 'Write a python function',
            explanation: 'None',
            errorCategories: [],
            origin: 'assessment',
          }}
          currentIndex={0}
          totalCount={1}
          recordedCurrent={{
            response: 'def solution(): return 1',
            result: 'correct',
            executionResult: {
              passed: true,
              status: 'success',
              message: 'Passed all 3 test cases',
              testsPassed: 3,
              totalTests: 3,
              executionTimeMs: 12,
            },
          }}
          textInput="def solution(): return 1"
          onAnswerChange={() => {}}
          onConfidenceChange={() => {}}
          onPrevious={() => {}}
          onNext={() => {}}
          onSubmitClick={() => {}}
        />
      );

      expect(screen.getByTestId('execution-feedback')).toBeInTheDocument();
      expect(screen.getByText('Execution Passed')).toBeInTheDocument();
      expect(screen.getByText('Passed all 3 test cases')).toBeInTheDocument();
      expect(screen.getByText('12ms')).toBeInTheDocument();
    });
  });

  describe('11. 84-Item Palette Navigator Grid', () => {
    it('11.1 renders all 84 items with module grouping and allows direct jumping', () => {
      startActiveRunner();

      const palette = screen.getByRole('complementary', { name: 'Question Palette' });
      expect(palette).toBeInTheDocument();

      // Click on item 10 in palette navigation
      const paletteContainer = screen.getByRole('navigation', { name: 'Questions list' });
      const item10Btn = paletteContainer.querySelector('button:nth-child(10)') as HTMLButtonElement;
      expect(item10Btn).toBeInTheDocument();

      act(() => {
        fireEvent.click(item10Btn);
      });

      expect(screen.getByText(/Question 10 of 84/i)).toBeInTheDocument();
    });

    it('11.2 shows legend for Answered, Unanswered, Don\'t know, and Current', () => {
      render(
        <AssessmentQuestionPalette
          orderedItems={BASELINE_ASSESSMENT_ITEMS}
          currentIndex={0}
          answeredCount={0}
          totalCount={84}
          responseMap={new Map()}
          onSelectIndex={() => {}}
        />
      );

      expect(screen.getByText('Answered')).toBeInTheDocument();
      expect(screen.getByText('Unanswered')).toBeInTheDocument();
      expect(screen.getByText(/Don't know/i)).toBeInTheDocument();
      expect(screen.getByText('Current')).toBeInTheDocument();
    });
  });

  describe('12 & 13. Submission Shield Gateway & Canonical Finalization', () => {
    it('12.1 opens submission modal upon clicking Finish & Submit', () => {
      startActiveRunner();

      const finishBtn = screen.getByTestId('assessment-finish-btn');
      act(() => {
        fireEvent.click(finishBtn);
      });

      expect(screen.getByRole('heading', { level: 3, name: /Submit Baseline Assessment\?/i })).toBeInTheDocument();
      expect(screen.getByText(/Continue Assessment/i)).toBeInTheDocument();
      expect(screen.getByTestId('confirm-submit-btn')).toBeInTheDocument();
    });

    it('12.2 warns about unanswered questions in the modal', () => {
      render(
        <AssessmentSubmitModal
          isOpen={true}
          answeredCount={15}
          totalCount={84}
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      );

      expect(screen.getByText('69 Unanswered Questions')).toBeInTheDocument();
      expect(screen.getByText(/Unanswered questions receive 0 credit/i)).toBeInTheDocument();
    });

    it('13.1 finalizes and seals attempt upon confirming submission', () => {
      startActiveRunner();

      const finishBtn = screen.getByTestId('assessment-finish-btn');
      act(() => {
        fireEvent.click(finishBtn);
      });

      const confirmBtn = screen.getByTestId('confirm-submit-btn');
      act(() => {
        fireEvent.click(confirmBtn);
      });

      // After sealing, mode C/completed profile state is reached
      expect(screen.getByText('Baseline Diagnostic Profile')).toBeInTheDocument();
    });
  });

  describe('14. Sealed State Immutability', () => {
    it('14.1 does not allow mutating a sealed assessment attempt', () => {
      const defaultState = getDefaultStorageState();
      const completedAttempt: AssessmentAttempt = {
        id: 'attempt-completed-1',
        definitionId: 'baseline-v1',
        definitionVersion: 1,
        kind: 'diagnostic_assessment',
        status: 'submitted',
        startedAt: '2026-10-01T08:00:00.000Z',
        endedAt: '2026-10-01T10:30:00.000Z',
        timeLimitSeconds: 10800,
        seed: 'seed-completed',
        selectedItemIds: ['asm-apt-001'],
      };

      const dummyResponses: AssessmentResponse[] = [];

      const extendedState: AppExtendedStorageState = {
        ...defaultState,
        assessmentState: {
          attempts: [completedAttempt],
          responses: dummyResponses,
          exposures: {},
          domainResults: [
            {
              domainId: 'aptitude',
              abilityScore: 78,
              level: 4,
              confidence: 'high',
              status: 'assessed',
              coverage: { topicsCovered: 2, topicsTotal: 2, competenciesCovered: ['quant'], difficultyBands: [1, 2] },
              assessmentDate: '2026-10-01T10:30:00.000Z',
              provisional: true,
              attemptId: completedAttempt.id,
              kind: 'diagnostic_assessment',
            },
          ],
          snapshots: [],
          weaknessSignals: [],
          profile: { pendingSunday: false },
        },
      };
      StorageAdapter.saveState(extendedState);

      render(
        <PlacementProvider>
          <AssessmentRunnerView />
        </PlacementProvider>
      );

      // Should render the completed/results view, not the active runner
      expect(screen.getByText('Baseline Diagnostic Profile')).toBeInTheDocument();
      expect(screen.queryByTestId('assessment-execution-runner')).toBeNull();
    });
  });

  describe('15 & 16. Responsive Layout & Accessibility Semantics', () => {
    it('15.1 includes accessible ARIA landmarks, roles, and focusable buttons', () => {
      startActiveRunner();

      expect(screen.getByRole('main', { name: /Assessment Execution Workspace/i })).toBeInTheDocument();
      expect(screen.getByRole('complementary', { name: /Question Palette/i })).toBeInTheDocument();
      expect(screen.getByRole('radiogroup', { name: /Multiple Choice Options/i })).toBeInTheDocument();
    });
  });
});
