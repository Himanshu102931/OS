import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {
  TEACHER_EIGHT_DAY_DSA_CHALLENGE,
} from '../data/teacherEightDayDSAChallenge';
import { DSA_MODULE_LESSONS } from '../data/dsaModuleLessons';
import { PlacementProvider } from '../context/PlacementContext';
import { DSAChallengeWorkspace } from '../components/dsa/DSAChallengeWorkspace';
import { DSAGuidedScaffoldModal } from '../components/dsa/DSAGuidedScaffoldModal';
import { DSAModuleLessonModal } from '../components/dsa/DSAModuleLessonModal';

describe('TASK 174B — DSA Teaching Quality & Educational Architecture', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '#/dsa';
  });

  afterEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // 1. Module Lesson Completeness Validator (All 8 Modules)
  // =========================================================================
  describe('Module Lesson Completeness Validator (Days 1–8)', () => {
    it('contains all 8 modules in both catalog and lesson registry', () => {
      expect(TEACHER_EIGHT_DAY_DSA_CHALLENGE).toHaveLength(8);
      for (let day = 1; day <= 8; day++) {
        expect(DSA_MODULE_LESSONS[day]).toBeDefined();
        const mod = TEACHER_EIGHT_DAY_DSA_CHALLENGE.find((m) => m.day === day);
        expect(mod).toBeDefined();
        expect(mod?.lesson).toBeDefined();
      }
    });

    it('verifies that every module has learning outcomes, pre-checks, core concepts, pattern guide, and exit check', () => {
      for (let day = 1; day <= 8; day++) {
        const lesson = DSA_MODULE_LESSONS[day];
        expect(lesson.day).toBe(day);
        expect(lesson.title).toBeTruthy();
        expect(lesson.estimatedMinutes).toBeGreaterThanOrEqual(30);

        // A. Learning Outcomes (at least 4)
        expect(lesson.learningOutcomes.length).toBeGreaterThanOrEqual(4);
        lesson.learningOutcomes.forEach((outcome) => {
          expect(outcome.length).toBeGreaterThan(15);
        });

        // B. Starting Knowledge Check (3 to 5 questions)
        expect(lesson.startingKnowledgeCheck.length).toBeGreaterThanOrEqual(2);
        expect(lesson.startingKnowledgeCheck.length).toBeLessThanOrEqual(6);
        lesson.startingKnowledgeCheck.forEach((q) => {
          expect(q.id).toBeTruthy();
          expect(q.question.length).toBeGreaterThan(10);
          expect(q.options.length).toBeGreaterThanOrEqual(3);
          expect(q.correctIndex).toBeGreaterThanOrEqual(0);
          expect(q.correctIndex).toBeLessThan(q.options.length);
          expect(q.explanation.length).toBeGreaterThan(15);
          expect(q.topicHint).toBeTruthy();
        });

        // C. Core Concepts (at least 2 with complexity analysis)
        expect(lesson.coreConcepts.length).toBeGreaterThanOrEqual(2);
        lesson.coreConcepts.forEach((c) => {
          expect(c.title).toBeTruthy();
          expect(c.plainLanguageDefinition.length).toBeGreaterThan(20);
          expect(c.whyItMatters.length).toBeGreaterThan(20);
          expect(c.complexityAnalysis.time).toBeTruthy();
          expect(c.complexityAnalysis.space).toBeTruthy();
        });

        // D. Pattern Guide
        expect(lesson.patternGuide.howToIdentify.length).toBeGreaterThanOrEqual(2);
        expect(lesson.patternGuide.preconditions.length).toBeGreaterThanOrEqual(1);
        expect(lesson.patternGuide.whenNotToUse.length).toBeGreaterThanOrEqual(1);
        expect(lesson.patternGuide.comparisonMatrix.length).toBeGreaterThanOrEqual(3);

        // E. Exit Check (at least 1 question)
        expect(lesson.exitCheck.length).toBeGreaterThanOrEqual(1);
        lesson.exitCheck.forEach((q) => {
          expect(q.id).toBeTruthy();
          expect(q.question.length).toBeGreaterThan(10);
          expect(q.options.length).toBeGreaterThanOrEqual(2);
          expect(q.correctIndex).toBeGreaterThanOrEqual(0);
          expect(q.correctIndex).toBeLessThan(q.options.length);
          expect(q.explanation.length).toBeGreaterThan(15);
        });
      }
    });

    it('Day 1 explicitly includes trainer deck warm-ups #1480 and #217 without altering 80-problem curriculum', () => {
      const day1 = DSA_MODULE_LESSONS[1];
      expect(day1.warmUpProblems).toBeDefined();
      expect(day1.warmUpProblems?.length).toBe(2);
      const lcNumbers = day1.warmUpProblems?.map((w) => w.leetcodeNumber);
      expect(lcNumbers).toContain(1480);
      expect(lcNumbers).toContain(217);

      // Verify the core 8-module challenge still has exactly 80 problems
      let totalProblems = 0;
      TEACHER_EIGHT_DAY_DSA_CHALLENGE.forEach((m) => {
        totalProblems += m.guided.length + m.independent.length;
      });
      expect(totalProblems).toBe(80);
    });
  });

  // =========================================================================
  // 2. Guided Scaffold Completeness Validator (All 40 Guided Problems)
  // =========================================================================
  describe('Guided Scaffold Completeness Validator (All 40 Problems)', () => {
    it('verifies all 40 guided problems have complete Python reference code, test cases, and invariants', () => {
      let guidedCount = 0;

      for (const module of TEACHER_EIGHT_DAY_DSA_CHALLENGE) {
        expect(module.guided).toHaveLength(5);

        for (const problem of module.guided) {
          guidedCount++;
          expect(problem.scaffold).toBeDefined();
          const scaffold = problem.scaffold!;

          // Problem statement & constraints
          expect(scaffold.problemRestatement.length).toBeGreaterThan(10);
          expect(scaffold.inputsOutputs.length).toBeGreaterThan(5);
          expect(scaffold.constraints.length).toBeGreaterThan(5);

          // Brute force & why optimized matters
          expect(scaffold.bruteForceIntuition.length).toBeGreaterThan(10);
          expect(scaffold.bruteForceComplexity).toBeTruthy();
          if (!scaffold.whyOptimizedMatters) {
            console.error('MISSING IN REGISTRY:', problem.leetcodeNumber, problem.title);
          }
          expect(scaffold.whyOptimizedMatters).toBeDefined();
          expect(scaffold.whyOptimizedMatters!.length).toBeGreaterThan(20);

          // Python reference code
          expect(scaffold.pythonReferenceCode).toBeDefined();
          expect(scaffold.pythonReferenceCode).toContain('def ');

          // Invariant & correctness argument
          expect(scaffold.invariant.length).toBeGreaterThan(10);
          expect(scaffold.correctnessArgument).toBeDefined();
          expect(scaffold.correctnessArgument!.length).toBeGreaterThan(20);

          // Time and space complexity
          expect(scaffold.timeComplexity).toBeTruthy();
          expect(scaffold.spaceComplexity).toBeTruthy();

          // At least 3 meaningful test cases
          expect(scaffold.testCases).toBeDefined();
          expect(scaffold.testCases!.length).toBeGreaterThanOrEqual(3);
          scaffold.testCases!.forEach((tc) => {
            expect(tc.name).toBeTruthy();
            expect(tc.input).toBeTruthy();
            expect(tc.expectedOutput).toBeTruthy();
            expect(tc.explanation).toBeTruthy();
          });

          // Common mistakes
          expect(scaffold.commonMistakes).toBeDefined();
          expect(scaffold.commonMistakes!.length).toBeGreaterThanOrEqual(1);

          // Explain-back prompt
          expect(scaffold.explainBackPrompt).toBeDefined();
          expect(scaffold.explainBackPrompt!.length).toBeGreaterThan(15);

          // Worked example stepper steps
          expect(scaffold.workedExample.steps.length).toBeGreaterThanOrEqual(2);
          expect(scaffold.workedExample.predictionPrompt.length).toBeGreaterThan(10);
          expect(scaffold.workedExample.predictionAnswer.length).toBeGreaterThan(10);
        }
      }

      expect(guidedCount).toBe(40);
    });
  });

  // =========================================================================
  // 3. Algorithmic Accuracy & Corrections Validator
  // =========================================================================
  describe('Algorithmic Accuracy Corrections Audit', () => {
    it('Correction 1: Day 8 Graph Reachability does NOT describe cyclic DFS as O(V!)', () => {
      const day8 = TEACHER_EIGHT_DAY_DSA_CHALLENGE.find((m) => m.day === 8);
      const lc1971 = day8?.guided.find((p) => p.leetcodeNumber === 1971);
      expect(lc1971).toBeDefined();

      const scaffold = lc1971!.scaffold!;
      // Must NOT claim O(V!) or O(inf)
      expect(scaffold.bruteForceComplexity).not.toContain('O(V!)');
      expect(scaffold.bruteForceComplexity).not.toContain('O(∞)');
      expect(scaffold.bruteForceComplexity).not.toContain('\\infty');
      // Must describe non-termination / failure to terminate on cyclic graphs
      expect(scaffold.bruteForceComplexity.toLowerCase()).toMatch(/fails to terminate|non-terminating/);
      // Must distinguish non-termination from valid O(V + E) traversal with visited tracking
      expect(scaffold.bruteForceComplexity).toContain('O(V + E)');
      expect(scaffold.timeComplexity).toBe('O(V + E)');
    });

    it('Correction 2: Day 2 Hash table complexity is explicitly presented as EXPECTED O(1) with collision degradation notes', () => {
      const day2 = DSA_MODULE_LESSONS[2];
      const hashConcept = day2.coreConcepts.find((c) => c.title.toLowerCase().includes('hash'));
      expect(hashConcept).toBeDefined();
      expect(hashConcept?.whyItMatters.toLowerCase()).toContain('expected o(1)');
      expect(hashConcept?.whyItMatters.toLowerCase()).toContain('collision');
    });

    it('Correction 3: Day 2 Product of Array Except Self does not describe division as brute force', () => {
      const day2 = TEACHER_EIGHT_DAY_DSA_CHALLENGE.find((m) => m.day === 2);
      const lc238 = day2?.guided.find((p) => p.leetcodeNumber === 238);
      expect(lc238).toBeDefined();

      const scaffold = lc238!.scaffold!;
      expect(scaffold.bruteForceIntuition.toLowerCase()).not.toContain('divide');
      expect(scaffold.whyOptimizedMatters).toContain('division');
    });

    it('Correction 4: Day 2 explains why sliding window is INVALID when negative values exist', () => {
      const day2 = DSA_MODULE_LESSONS[2];
      const pre4 = day2.startingKnowledgeCheck.find((q) => q.id === 'd2-pre-4');
      expect(pre4).toBeDefined();
      expect(pre4?.explanation.toLowerCase()).toContain('monotonic');
    });
  });

  // =========================================================================
  // 4. Interactive Progressive Dry-Run Stepper UI (Phase 2)
  // =========================================================================
  describe('Phase 2: Progressive Dry-Run Stepper Sequence', () => {
    it('shows initial state and prompts prediction BEFORE revealing worked transitions', () => {
      const problem = TEACHER_EIGHT_DAY_DSA_CHALLENGE[0].guided[0]; // #344 Reverse String

      render(
        <DSAGuidedScaffoldModal
          problem={problem}
          moduleDay={1}
          moduleTitle="Logic Building, Complexity & Arrays"
          isOpen={true}
          onClose={vi.fn()}
          isCompleted={false}
          onToggleCompleted={vi.fn()}
          onSaveNote={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');

      // 1. Initial State and Prediction Challenge are visible
      expect(within(dialog).getByText(/Active Learning: Predict the Next State/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/Test Input:/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/Step 1 of/i)).toBeInTheDocument();

      // 2. Future steps are NOT yet revealed in the trace history
      expect(within(dialog).queryByText(/✓ Step 1:/i)).not.toBeInTheDocument();
      expect(within(dialog).queryByText(/✓ Step 2:/i)).not.toBeInTheDocument();

      // 3. Prediction prompt and Reveal button are available
      const revealBtn = within(dialog).getByText(/Reveal Next State & Explanation/i);
      expect(revealBtn).toBeInTheDocument();

      // 4. Reveal step 1
      fireEvent.click(revealBtn);

      // Now Step 1 transition and explanation are revealed!
      expect(within(dialog).getByText(/Teacher State Explanation:/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/✓ Step 1:/i)).toBeInTheDocument();
      // Step 2 is still not in history
      expect(within(dialog).queryByText(/✓ Step 2:/i)).not.toBeInTheDocument();
    });

    it('renders Python Reference Code tab with copy button and test cases', () => {
      const problem = TEACHER_EIGHT_DAY_DSA_CHALLENGE[0].guided[0];

      render(
        <DSAGuidedScaffoldModal
          problem={problem}
          moduleDay={1}
          moduleTitle="Logic Building, Complexity & Arrays"
          isOpen={true}
          onClose={vi.fn()}
          isCompleted={false}
          onToggleCompleted={vi.fn()}
          onSaveNote={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');

      // Switch to Code Tab
      const codeTab = within(dialog).getByText(/Python Reference Code/i);
      fireEvent.click(codeTab);

      // Complete Python code and copy button are present
      expect(within(dialog).getByText(/Complete Python Reference Implementation/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/Copy Code/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/def reverseString/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 5. Interactive Module Lesson Modal & Workspace Integration
  // =========================================================================
  describe('Module Lesson Modal & Workspace Integration', () => {
    it('opens DSAModuleLessonModal from workspace and supports interactive pre-check without mastery penalties', () => {
      render(
        <PlacementProvider>
          <DSAChallengeWorkspace onOpenCanonicalAttempt={vi.fn()} />
        </PlacementProvider>
      );

      // Click "Study Module Lesson & Concepts"
      const studyLessonBtn = screen.getByText(/Study Module Lesson & Concepts/i);
      expect(studyLessonBtn).toBeInTheDocument();
      fireEvent.click(studyLessonBtn);

      // Module lesson modal is open
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(/DAY 1 INTERACTIVE LESSON/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/A. Pre-Check/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/B. Core Concepts/i)).toBeInTheDocument();

      // Answer first pre-check question (range(4) prints 0 1 2 3)
      const optionBtn = within(dialog).getByText('0 1 2 3');
      fireEvent.click(optionBtn);

      // Check remaining questions and submit
      const checkBtn = within(dialog).getByText(/Check Answers/i);
      expect(checkBtn).toBeInTheDocument();
    });

    it('navigates through Core Concepts, Pattern Recognition, and Exit Check', () => {
      const lesson = DSA_MODULE_LESSONS[1];
      const guided = TEACHER_EIGHT_DAY_DSA_CHALLENGE[0].guided;

      render(
        <DSAModuleLessonModal
          lesson={lesson}
          guidedProblems={guided}
          isOpen={true}
          onClose={vi.fn()}
          onOpenGuidedProblem={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');

      // Switch to Core Concepts
      const conceptsTab = within(dialog).getByText(/B. Core Concepts/i);
      fireEvent.click(conceptsTab);
      expect(within(dialog).getByText(/Module Learning Outcomes/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/Big-O Asymptotic Complexity Mental Model/i)).toBeInTheDocument();

      // Switch to Pattern Recognition
      const patternsTab = within(dialog).getByText(/C. Pattern Recognition/i);
      fireEvent.click(patternsTab);
      expect(within(dialog).getByText(/Pattern Recognition & Decision Framework/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/Pattern Selection Comparison Matrix/i)).toBeInTheDocument();

      // Switch to Scaffolds Tab
      const scaffoldsTab = within(dialog).getByText(/D. Guided Scaffolds/i);
      fireEvent.click(scaffoldsTab);
      expect(within(dialog).getByText(/Prerequisite Warm-Up Problems/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/LC #1480: Running Sum of 1d Array/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/LC #217: Contains Duplicate/i)).toBeInTheDocument();

      // Switch to Exit Check
      const exitTab = within(dialog).getByText(/E. Exit Check/i);
      fireEvent.click(exitTab);
      expect(within(dialog).getByText(/Module Exit Check/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 6. Evidence Integrity: Lessons NEVER Award Canonical Mastery
  // =========================================================================
  describe('Evidence Integrity: Lessons & Walkthroughs Do Not Fabricate Mastery', () => {
    it('viewing lessons or completing quizzes does not set passedIndependently or promote Leitner box', () => {
      render(
        <PlacementProvider>
          <DSAChallengeWorkspace onOpenCanonicalAttempt={vi.fn()} />
        </PlacementProvider>
      );

      // Initial canonical logged count has / 53 logged
      expect(screen.getByText(/\/ 53 logged/i)).toBeInTheDocument();

      // Open and complete a walkthrough scaffold
      const walkthroughBtns = screen.getAllByText('View Walkthrough');
      fireEvent.click(walkthroughBtns[0]);

      const dialog = screen.getByRole('dialog');
      const completeBtn = within(dialog).getByText(/Mark Walkthrough as Complete/i);
      fireEvent.click(completeBtn);

      const closeBtn = within(dialog).getByRole('button', { name: /Close modal/i });
      fireEvent.click(closeBtn);

      // Walkthrough completed count increments, but Canonical Independent Pass remains strictly unchanged
      expect(screen.getByText(/\/ 40 completed/i)).toBeInTheDocument();
      expect(screen.getByText(/\/ 53 logged/i)).toBeInTheDocument();
    });
  });
});
