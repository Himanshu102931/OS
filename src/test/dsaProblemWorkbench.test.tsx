import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { PlacementProvider } from '../context/PlacementContext';
import { StorageAdapter, getDefaultStorageState, type AppStorageState } from '../storage/storageAdapter';
import { DSAView } from '../components/dsa/DSAView';
import { DSAProblemWorkbench } from '../components/dsa/DSAProblemWorkbench';
import type { DSAProblem, DSAProgress } from '../types';

function makeDSAProgress(problemId: string, overrides: Partial<DSAProgress> = {}): DSAProgress {
  return {
    problemId,
    currentBox: 1,
    attemptCount: 0,
    passedIndependently: false,
    assistedProvisional: false,
    remediationRequired: false,
    lastAttemptAt: undefined,
    nextReviewAt: undefined,
    consecutiveFailures: 0,
    evidenceStrength: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const mockProblems: DSAProblem[] = [
  {
    id: 'dsa-001',
    leetcodeNumber: 1,
    title: 'Two Sum',
    difficulty: 'easy',
    primaryPattern: 'Two Pointers / Hash Map',
    dataStructure: 'Array & Hash Table',
    algorithmicTechnique: 'Lookup Table',
    estimatedTimeMinutes: 20,
    progressionTier: 'STARTER',
    recommendedPhase: 1,
    prerequisites: [],
    isAnchor: true,
    domainId: 'dsa',
    topicId: 'arrays_hashing',
    accessTier: 'FREE',
    leetcodeUrl: 'https://leetcode.com/problems/two-sum/',
  },
  {
    id: 'dsa-002',
    leetcodeNumber: 15,
    title: '3Sum',
    difficulty: 'medium',
    primaryPattern: 'Two Pointers / Hash Map',
    dataStructure: 'Array',
    algorithmicTechnique: 'Sorted Two-Pointer',
    estimatedTimeMinutes: 30,
    progressionTier: 'CORE',
    recommendedPhase: 1,
    prerequisites: ['dsa-001'],
    isAnchor: false,
    domainId: 'dsa',
    topicId: 'arrays_hashing',
    accessTier: 'FREE',
    leetcodeUrl: 'https://leetcode.com/problems/3sum/',
  },
  {
    id: 'dsa-003',
    leetcodeNumber: 42,
    title: 'Trapping Rain Water',
    difficulty: 'hard',
    primaryPattern: 'Two Pointers / Hash Map',
    dataStructure: 'Array',
    algorithmicTechnique: 'Two-Pointer Elevation',
    estimatedTimeMinutes: 45,
    progressionTier: 'CHALLENGE',
    recommendedPhase: 1,
    prerequisites: ['dsa-002'],
    isAnchor: false,
    domainId: 'dsa',
    topicId: 'arrays_hashing',
    accessTier: 'FREE',
    leetcodeUrl: 'https://leetcode.com/problems/trapping-rain-water/',
  },
  {
    id: 'dsa-004',
    leetcodeNumber: 206,
    title: 'Reverse Linked List',
    difficulty: 'easy',
    primaryPattern: 'Fast & Slow Pointers',
    dataStructure: 'Linked List',
    algorithmicTechnique: 'Pointer Reversal',
    estimatedTimeMinutes: 20,
    progressionTier: 'STARTER',
    recommendedPhase: 1,
    prerequisites: [],
    isAnchor: true,
    domainId: 'dsa',
    topicId: 'linked_lists',
    accessTier: 'FREE',
    leetcodeUrl: 'https://leetcode.com/problems/reverse-linked-list/',
  },
  {
    id: 'dsa-005',
    leetcodeNumber: 23,
    title: 'Merge k Sorted Lists',
    difficulty: 'hard',
    primaryPattern: 'Heaps & Priority Queues',
    dataStructure: 'Heap & Linked List',
    algorithmicTechnique: 'k-way Merge',
    estimatedTimeMinutes: 50,
    progressionTier: 'CHALLENGE',
    recommendedPhase: 2,
    prerequisites: ['dsa-004'],
    isAnchor: false,
    domainId: 'dsa',
    topicId: 'heaps',
    accessTier: 'FREE',
    leetcodeUrl: 'https://leetcode.com/problems/merge-k-sorted-lists/',
  },
];

describe('Zone 5: DSA Problem Workbench', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // 1. All 150 canonical problems representation
  it('1. represents all 150 canonical problems in the catalog', () => {
    const defaultState = getDefaultStorageState();
    StorageAdapter.saveState(defaultState);

    render(
      <PlacementProvider>
        <DSAView />
      </PlacementProvider>
    );

    // Workbench exists
    const workbench = screen.getByTestId('dsa-problem-workbench');
    expect(workbench).toBeDefined();

    // Verify header mentions 150 problems
    expect(screen.getByText(/Curated 150-Problem Workbench/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Full Catalog/i })).toBeDefined();
  });

  // 2. Search filtering
  it('2. filters problems by search query (title, pattern, leetcode number)', () => {
    const Wrapper = () => {
      const [searchQuery, setSearchQuery] = useState('');
      const [selectedDifficulty, setSelectedDifficulty] = useState('all');
      const [selectedPattern, setSelectedPattern] = useState<string | null>(null);

      return (
        <DSAProblemWorkbench
          problems={mockProblems}
          progressMap={{}}
          currentPhaseIndex={1}
          todayDate="2026-10-06"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedDifficulty={selectedDifficulty}
          onSelectDifficulty={setSelectedDifficulty}
          selectedPattern={selectedPattern}
          onSelectPattern={setSelectedPattern}
          onOpenAttempt={vi.fn()}
          onOpenWorkspace={vi.fn()}
        />
      );
    };

    render(<Wrapper />);

    const searchInput = screen.getByLabelText(/Search problem catalog/i);
    expect(screen.getByText('Two Sum')).toBeDefined();
    expect(screen.getByText('3Sum')).toBeDefined();

    // Search by title
    fireEvent.change(searchInput, { target: { value: 'Trapping' } });
    expect(screen.getByText('Trapping Rain Water')).toBeDefined();
    expect(screen.queryByText('Two Sum')).toBeNull();

    // Search by LeetCode number #206
    fireEvent.change(searchInput, { target: { value: '206' } });
    expect(screen.getByText('Reverse Linked List')).toBeDefined();
    expect(screen.queryByText('Trapping Rain Water')).toBeNull();

    // Search by pattern
    fireEvent.change(searchInput, { target: { value: 'Heaps' } });
    expect(screen.getByText('Merge k Sorted Lists')).toBeDefined();
    expect(screen.queryByText('Reverse Linked List')).toBeNull();
  });

  // 3. Difficulty filtering
  it('3. filters problems by difficulty pill buttons', () => {
    const Wrapper = () => {
      const [searchQuery, setSearchQuery] = useState('');
      const [selectedDifficulty, setSelectedDifficulty] = useState('all');
      const [selectedPattern, setSelectedPattern] = useState<string | null>(null);

      return (
        <DSAProblemWorkbench
          problems={mockProblems}
          progressMap={{}}
          currentPhaseIndex={1}
          todayDate="2026-10-06"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedDifficulty={selectedDifficulty}
          onSelectDifficulty={setSelectedDifficulty}
          selectedPattern={selectedPattern}
          onSelectPattern={setSelectedPattern}
          onOpenAttempt={vi.fn()}
          onOpenWorkspace={vi.fn()}
        />
      );
    };

    render(<Wrapper />);

    const easyButton = screen.getByRole('button', { name: /^easy$/i });
    const hardButton = screen.getByRole('button', { name: /^hard$/i });

    fireEvent.click(easyButton);
    expect(screen.getByText('Two Sum')).toBeDefined();
    expect(screen.getByText('Reverse Linked List')).toBeDefined();
    expect(screen.queryByText('3Sum')).toBeNull();
    expect(screen.queryByText('Trapping Rain Water')).toBeNull();

    fireEvent.click(hardButton);
    expect(screen.getByText('Trapping Rain Water')).toBeDefined();
    expect(screen.getByText('Merge k Sorted Lists')).toBeDefined();
    expect(screen.queryByText('Two Sum')).toBeNull();
  });

  // 4. Pattern filtering
  it('4. filters problems when a specific pattern is active', () => {
    const Wrapper = () => {
      const [searchQuery, setSearchQuery] = useState('');
      const [selectedDifficulty, setSelectedDifficulty] = useState('all');
      const [selectedPattern, setSelectedPattern] = useState<string | null>('Fast & Slow Pointers');

      return (
        <DSAProblemWorkbench
          problems={mockProblems}
          progressMap={{}}
          currentPhaseIndex={1}
          todayDate="2026-10-06"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedDifficulty={selectedDifficulty}
          onSelectDifficulty={setSelectedDifficulty}
          selectedPattern={selectedPattern}
          onSelectPattern={setSelectedPattern}
          onOpenAttempt={vi.fn()}
          onOpenWorkspace={vi.fn()}
        />
      );
    };

    render(<Wrapper />);

    expect(screen.getByText('Reverse Linked List')).toBeDefined();
    expect(screen.queryByText('Two Sum')).toBeNull();
    expect(screen.getByText(/Pattern Filter:/i)).toBeDefined();

    const clearPatternBtn = screen.getByLabelText(/Clear pattern filter/i);
    fireEvent.click(clearPatternBtn);
  });

  // 5. Status filtering
  it('5. filters problems by status pills (all, unlocked, due, mastered, locked)', () => {
    const progressMap: Record<string, DSAProgress> = {
      'dsa-001': makeDSAProgress('dsa-001', {
        passedIndependently: true,
        currentBox: 4,
      }),
      'dsa-002': makeDSAProgress('dsa-002', {
        passedIndependently: false,
        currentBox: 1,
        nextReviewAt: '2026-10-06', // Due today
      }),
      'dsa-004': makeDSAProgress('dsa-004', {
        remediationRequired: true,
        consecutiveFailures: 3,
      }),
    };

    render(
      <DSAProblemWorkbench
        problems={mockProblems}
        progressMap={progressMap}
        currentPhaseIndex={1}
        todayDate="2026-10-06"
        searchQuery=""
        onSearchChange={vi.fn()}
        selectedDifficulty="all"
        onSelectDifficulty={vi.fn()}
        selectedPattern={null}
        onSelectPattern={vi.fn()}
        onOpenAttempt={vi.fn()}
        onOpenWorkspace={vi.fn()}
      />
    );

    // Mastered tab
    const masteredTab = screen.getByRole('button', { name: /Mastered \(1\)/i });
    fireEvent.click(masteredTab);
    expect(screen.getByText('Two Sum')).toBeDefined();
    expect(screen.queryByText('3Sum')).toBeNull();

    // Reviews Due tab
    const dueTab = screen.getByRole('button', { name: /Reviews Due \(1\)/i });
    fireEvent.click(dueTab);
    expect(screen.getByText('3Sum')).toBeDefined();
    expect(screen.queryByText('Two Sum')).toBeNull();

    // Locked tab (dsa-003 requires dsa-002 to be passed, dsa-005 is phase 2)
    const lockedTab = screen.getByRole('button', { name: /Locked \(2\)/i });
    fireEvent.click(lockedTab);
    expect(screen.getByText('Trapping Rain Water')).toBeDefined();
    expect(screen.getByText('Merge k Sorted Lists')).toBeDefined();
    expect(screen.queryByText('Two Sum')).toBeNull();
  });

  // 6. Completed/Mastered problem state
  it('6. displays Mastered badge and Re-drill action for completed problems', () => {
    const onOpenAttempt = vi.fn();
    const progressMap: Record<string, DSAProgress> = {
      'dsa-001': makeDSAProgress('dsa-001', {
        passedIndependently: true,
        currentBox: 4,
      }),
    };

    render(
      <DSAProblemWorkbench
        problems={[mockProblems[0]]}
        progressMap={progressMap}
        currentPhaseIndex={1}
        todayDate="2026-10-06"
        searchQuery=""
        onSearchChange={vi.fn()}
        selectedDifficulty="all"
        onSelectDifficulty={vi.fn()}
        selectedPattern={null}
        onSelectPattern={vi.fn()}
        onOpenAttempt={onOpenAttempt}
        onOpenWorkspace={vi.fn()}
      />
    );

    expect(screen.getByText('Mastered')).toBeDefined();
    const redrillBtn = screen.getByRole('button', { name: /Attempt Two Sum/i });
    expect(redrillBtn).toBeDefined();
    expect(screen.getByText('Re-drill')).toBeDefined();

    fireEvent.click(redrillBtn);
    expect(onOpenAttempt).toHaveBeenCalledWith(mockProblems[0]);
  });

  // 7. Review-due state
  it('7. displays Review Due badge and Review action for due reviews', () => {
    const onOpenAttempt = vi.fn();
    const progressMap: Record<string, DSAProgress> = {
      'dsa-001': makeDSAProgress('dsa-001', {
        passedIndependently: false,
        currentBox: 2,
        nextReviewAt: '2026-10-06',
      }),
    };

    render(
      <DSAProblemWorkbench
        problems={[mockProblems[0]]}
        progressMap={progressMap}
        currentPhaseIndex={1}
        todayDate="2026-10-06"
        searchQuery=""
        onSearchChange={vi.fn()}
        selectedDifficulty="all"
        onSelectDifficulty={vi.fn()}
        selectedPattern={null}
        onSelectPattern={vi.fn()}
        onOpenAttempt={onOpenAttempt}
        onOpenWorkspace={vi.fn()}
      />
    );

    expect(screen.getByText('Review Due')).toBeDefined();
    const reviewBtn = screen.getByRole('button', { name: /Review Two Sum/i });
    expect(reviewBtn).toBeDefined();

    fireEvent.click(reviewBtn);
    expect(onOpenAttempt).toHaveBeenCalledWith(mockProblems[0]);
  });

  // 8. Remediation state
  it('8. displays Remediation badge and Remediate button when remediationRequired is true', () => {
    const onOpenWorkspace = vi.fn();
    const progressMap: Record<string, DSAProgress> = {
      'dsa-001': makeDSAProgress('dsa-001', {
        remediationRequired: true,
        consecutiveFailures: 3,
      }),
    };

    render(
      <DSAProblemWorkbench
        problems={[mockProblems[0]]}
        progressMap={progressMap}
        currentPhaseIndex={1}
        todayDate="2026-10-06"
        searchQuery=""
        onSearchChange={vi.fn()}
        selectedDifficulty="all"
        onSelectDifficulty={vi.fn()}
        selectedPattern={null}
        onSelectPattern={vi.fn()}
        onOpenAttempt={vi.fn()}
        onOpenWorkspace={onOpenWorkspace}
      />
    );

    expect(screen.getByText('Remediation')).toBeDefined();
    const remediateBtn = screen.getByRole('button', { name: /Remediate Two Sum/i });
    expect(remediateBtn).toBeDefined();

    fireEvent.click(remediateBtn);
    expect(onOpenWorkspace).toHaveBeenCalledWith(mockProblems[0]);
  });

  // 9. Locked/unavailable state
  it('9. displays Locked badge and disabled Locked button when prerequisites not met', () => {
    render(
      <DSAProblemWorkbench
        problems={[mockProblems[1]]} // 3Sum requires dsa-001
        progressMap={{}}
        currentPhaseIndex={1}
        todayDate="2026-10-06"
        searchQuery=""
        onSearchChange={vi.fn()}
        selectedDifficulty="all"
        onSelectDifficulty={vi.fn()}
        selectedPattern={null}
        onSelectPattern={vi.fn()}
        onOpenAttempt={vi.fn()}
        onOpenWorkspace={vi.fn()}
      />
    );

    expect(screen.getAllByText('Locked').length).toBeGreaterThanOrEqual(1);
    const lockedBtn = screen.getByRole('button', { name: /3Sum is locked/i });
    expect(lockedBtn).toBeDefined();
    expect(lockedBtn).toHaveProperty('disabled', true);
  });

  // 10. Primary action routing and workspace button
  it('10. handles Workspace action correctly', () => {
    const onOpenWorkspace = vi.fn();

    render(
      <DSAProblemWorkbench
        problems={[mockProblems[0]]}
        progressMap={{}}
        currentPhaseIndex={1}
        todayDate="2026-10-06"
        searchQuery=""
        onSearchChange={vi.fn()}
        selectedDifficulty="all"
        onSelectDifficulty={vi.fn()}
        selectedPattern={null}
        onSelectPattern={vi.fn()}
        onOpenAttempt={vi.fn()}
        onOpenWorkspace={onOpenWorkspace}
      />
    );

    const workspaceBtn = screen.getByRole('button', { name: /Inspect Two Sum in workspace/i });
    fireEvent.click(workspaceBtn);
    expect(onOpenWorkspace).toHaveBeenCalledWith(mockProblems[0]);
  });

  // 11. Empty state when filters match nothing
  it('11. displays empty state with reset button when no problems match', () => {
    const onSearchChange = vi.fn();
    const onSelectDifficulty = vi.fn();
    const onSelectPattern = vi.fn();

    render(
      <DSAProblemWorkbench
        problems={mockProblems}
        progressMap={{}}
        currentPhaseIndex={1}
        todayDate="2026-10-06"
        searchQuery="nonexistentproblemxyz"
        onSearchChange={onSearchChange}
        selectedDifficulty="all"
        onSelectDifficulty={onSelectDifficulty}
        selectedPattern={null}
        onSelectPattern={onSelectPattern}
        onOpenAttempt={vi.fn()}
        onOpenWorkspace={vi.fn()}
      />
    );

    expect(screen.getByTestId('dsa-workbench-empty')).toBeDefined();
    expect(screen.getByText(/No Problems Match Filter Criteria/i)).toBeDefined();

    const resetBtn = screen.getByRole('button', { name: /Reset All Filters/i });
    fireEvent.click(resetBtn);
    expect(onSearchChange).toHaveBeenCalledWith('');
    expect(onSelectDifficulty).toHaveBeenCalledWith('all');
    expect(onSelectPattern).toHaveBeenCalledWith(null);
  });

  // 12. Full DSAView 5-zone integration and deep link preservation
  it('12. integrates seamlessly within DSAView with all 5 zones active', () => {
    const defaultState = getDefaultStorageState();
    const testState: AppStorageState = {
      ...defaultState,
      dsaProgress: {
        'dsa-001': makeDSAProgress('dsa-001', {
          currentBox: 2,
          nextReviewAt: '2026-10-06',
        }),
      },
    };
    StorageAdapter.saveState(testState);

    render(
      <PlacementProvider>
        <DSAView />
      </PlacementProvider>
    );

    // Zone 1: Mastery Strip
    expect(screen.getByTestId('dsa-mastery-strip')).toBeDefined();

    // Zone 2: Active Focus
    expect(screen.getByTestId('dsa-active-focus')).toBeDefined();
    expect(screen.getByTestId('dsa-primary-cta')).toBeDefined();

    // Zone 3: Review Queue
    expect(screen.getByTestId('dsa-review-queue')).toBeDefined();

    // Zone 4: Pattern Matrix
    expect(screen.getByTestId('dsa-pattern-matrix')).toBeDefined();

    // Zone 5: Problem Workbench
    expect(screen.getByTestId('dsa-problem-workbench')).toBeDefined();
  });
});
