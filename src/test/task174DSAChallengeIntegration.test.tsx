import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { DSAView } from '../components/dsa/DSAView';
import { DSAChallengeWorkspace } from '../components/dsa/DSAChallengeWorkspace';
import { DSAChallengeTodayCard } from '../components/dashboard/DSAChallengeTodayCard';
import { StorageAdapter, type AppExtendedStorageState } from '../storage/storageAdapter';

describe('Task 174: 8-Day DSA Challenge Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '#/dsa';
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the 8-Day DSA Challenge workspace with all 8 modules and teacher metadata', () => {
    render(
      <PlacementProvider>
        <DSAChallengeWorkspace onOpenCanonicalAttempt={vi.fn()} />
      </PlacementProvider>
    );

    // Header & teacher attribution
    expect(screen.getByText('8-Day DSA Challenge Track')).toBeInTheDocument();
    expect(screen.getByText(/Teacher Placement Series/i)).toBeInTheDocument();
    expect(screen.getByText(/8 Modules · 80 Curated LeetCode Problems/i)).toBeInTheDocument();

    // 8 Day navigation buttons
    expect(screen.getByText('Day 1')).toBeInTheDocument();
    expect(screen.getByText('Day 8')).toBeInTheDocument();

    // Day 1 Module details (in nav button and in module header)
    expect(screen.getByText('MODULE 1 OF 8')).toBeInTheDocument();
    expect(screen.getAllByText('Logic Building, Complexity & Arrays').length).toBeGreaterThan(0);

    // 5 Guided problems in Day 1
    expect(screen.getByText(/LeetCode #344: Reverse String/i)).toBeInTheDocument();
    expect(screen.getByText(/LeetCode #414: Third Maximum Number/i)).toBeInTheDocument();
    expect(screen.getByText(/LeetCode #283: Move Zeroes/i)).toBeInTheDocument();
    expect(screen.getByText(/LeetCode #1: Two Sum/i)).toBeInTheDocument();
    expect(screen.getByText(/LeetCode #121: Best Time to Buy and Sell Stock/i)).toBeInTheDocument();

    // 5 Independent problems in Day 1
    expect(screen.getByText(/LeetCode #88: Merge Sorted Array/i)).toBeInTheDocument();
    expect(screen.getByText(/LeetCode #169: Majority Element/i)).toBeInTheDocument();
    expect(screen.getByText(/LeetCode #189: Rotate Array/i)).toBeInTheDocument();
    expect(screen.getByText(/LeetCode #53: Maximum Subarray/i)).toBeInTheDocument();
    expect(screen.getByText(/LeetCode #724: Find Pivot Index/i)).toBeInTheDocument();
  });

  it('allows switching pacing mode between Guided, Flexible, and Intensive', async () => {
    render(
      <PlacementProvider>
        <DSAChallengeWorkspace onOpenCanonicalAttempt={vi.fn()} />
      </PlacementProvider>
    );

    const guidedBtn = screen.getByText(/Guided \(45m\)/i);
    const intensiveBtn = screen.getByText(/Intensive \(90m\+\)/i);

    fireEvent.click(guidedBtn);
    expect(guidedBtn).toHaveClass('bg-[var(--accent)]');

    fireEvent.click(intensiveBtn);
    expect(intensiveBtn).toHaveClass('bg-[var(--accent)]');
  });

  it('navigates to Day 8 and displays graph-specific algorithms and dry-run details', async () => {
    render(
      <PlacementProvider>
        <DSAChallengeWorkspace onOpenCanonicalAttempt={vi.fn()} />
      </PlacementProvider>
    );

    // Click Day 8 tab
    const day8Tab = screen.getByText('Day 8');
    fireEvent.click(day8Tab);

    expect(screen.getByText('MODULE 8 OF 8')).toBeInTheDocument();
    expect(screen.getAllByText('Graph Algorithms').length).toBeGreaterThan(0);

    // Check Day 8 problems
    expect(screen.getByText(/LeetCode #1971: Find if Path Exists in Graph/i)).toBeInTheDocument();
    expect(screen.getByText(/LeetCode #200: Number of Islands/i)).toBeInTheDocument();
    expect(screen.getByText(/LeetCode #207: Course Schedule/i)).toBeInTheDocument();
    expect(screen.getByText(/LeetCode #743: Network Delay Time/i)).toBeInTheDocument();
  });

  it('opens guided walkthrough scaffold modal, performs step-state prediction, and saves notes', async () => {
    render(
      <PlacementProvider>
        <DSAChallengeWorkspace onOpenCanonicalAttempt={vi.fn()} />
      </PlacementProvider>
    );

    // Click View Walkthrough on first problem (Reverse String)
    const walkthroughBtns = screen.getAllByText('View Walkthrough');
    fireEvent.click(walkthroughBtns[0]);

    // Modal is open
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Problem Restatement & Setup/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Beginner Brute-Force Intuition/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Active Learning: Predict the Next State/i)).toBeInTheDocument();

    // Reveal prediction
    const revealBtn = within(dialog).getByText(/Reveal Next State & Explanation/i);
    fireEvent.click(revealBtn);
    expect(within(dialog).getByText(/Teacher State Explanation:/i)).toBeInTheDocument();

    // Check invariant
    expect(within(dialog).getByText(/Crucial Algorithm Invariant/i)).toBeInTheDocument();

    // Switch to notes tab and save note
    const notesTab = within(dialog).getByText(/My Reflection & Notes/i);
    fireEvent.click(notesTab);

    const approachInput = within(dialog).getByPlaceholderText(/Keep two pointers at ends/i);
    fireEvent.change(approachInput, { target: { value: 'Swap characters at left and right pointers in-place.' } });

    const saveBtn = within(dialog).getByText(/Save My Notes/i);
    fireEvent.click(saveBtn);

    expect(within(dialog).getByText(/Notes Saved!/i)).toBeInTheDocument();

    // Toggle completed
    const completeBtn = within(dialog).getByText(/Mark Walkthrough as Complete/i);
    fireEvent.click(completeBtn);
    expect(within(dialog).getByText(/Guided Walkthrough Completed/i)).toBeInTheDocument();
  });

  it('allows logging an external challenge practice attempt without corrupting canonical dsaProgress', async () => {
    render(
      <PlacementProvider>
        <DSAChallengeWorkspace onOpenCanonicalAttempt={vi.fn()} />
      </PlacementProvider>
    );

    // Problem #189 Rotate Array is an external problem
    const logPracticeBtns = screen.getAllByText(/Log External Practice/i);
    fireEvent.click(logPracticeBtns[0]);

    // External attempt modal is open
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByText(/External Practice/i).length).toBeGreaterThan(0);
    expect(within(dialog).getByText(/Pass \(All Cases\)/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Independent Pass/i)).toBeInTheDocument();

    // Submit attempt
    const submitBtn = within(dialog).getByText(/Save Challenge Attempt/i);
    fireEvent.click(submitBtn);

    // Verify storage was updated with external attempt
    const saved = StorageAdapter.loadState();
    expect(saved.dsaChallengeState).toBeDefined();
    expect(Object.keys(saved.dsaChallengeState?.itemProgress || {}).length).toBeGreaterThan(0);
  });

  it('switches between 150-Problem Catalog and 8-Day DSA Challenge in DSAView', async () => {
    render(
      <PlacementProvider>
        <DSAView />
      </PlacementProvider>
    );

    // Default view has tabs and header
    expect(screen.getByText('DSA Problem Laboratory')).toBeInTheDocument();
    expect(screen.getByText('150-Problem Catalog')).toBeInTheDocument();
    expect(screen.getByText('8-Day DSA Challenge')).toBeInTheDocument();

    // Switch to Challenge view
    const challengeTab = screen.getByText('8-Day DSA Challenge');
    fireEvent.click(challengeTab);

    expect(screen.getByText('8-Day DSA Challenge Track')).toBeInTheDocument();
    expect(screen.getByText('MODULE 1 OF 8')).toBeInTheDocument();

    // Switch back to Catalog view
    const catalogTab = screen.getByText('150-Problem Catalog');
    fireEvent.click(catalogTab);
    expect(screen.getByText('DSA Problem Laboratory')).toBeInTheDocument();
  });

  it('renders DSAChallengeTodayCard on dashboard with exploratory label when unassessed', () => {
    render(
      <PlacementProvider>
        <DSAChallengeTodayCard onNavigateToChallenge={vi.fn()} />
      </PlacementProvider>
    );

    expect(screen.getByTestId('dsa-challenge-today-card')).toBeInTheDocument();
    expect(screen.getByText(/8-Day DSA Challenge/i)).toBeInTheDocument();
    expect(screen.getByTestId('challenge-exploratory-badge')).toHaveTextContent(/Exploratory · Challenge Foundation/i);
    expect(screen.getByText(/Day 1: Logic Building, Complexity & Arrays/i)).toBeInTheDocument();
    expect(screen.getByTestId('continue-challenge-button')).toBeInTheDocument();
  });

  it('persists and roundtrips challenge state in JSON backup export/import', () => {
    let contextRef: ReturnType<typeof usePlacement> | null = null;
    const TestComponent = () => {
      contextRef = usePlacement();
      return null;
    };

    render(
      <PlacementProvider>
        <TestComponent />
      </PlacementProvider>
    );

    // Enroll and update challenge state inside act()
    act(() => {
      contextRef!.updateDSAChallengeState({
        enrolled: true,
        currentDay: 3,
        pacingMode: 'intensive',
      });
      contextRef!.markChallengeGuidedCompleted(344, true);
    });

    // Export backup
    const exportedJSON = contextRef!.exportBackupJSON();
    expect(exportedJSON).toContain('"currentDay": 3');
    expect(exportedJSON).toContain('"guidedCompleted": true');

    // Import into fresh state
    act(() => {
      const importResult = contextRef!.importBackupJSON(exportedJSON);
      expect(importResult.success).toBe(true);
    });

    const reloaded = StorageAdapter.loadState();
    expect(reloaded.dsaChallengeState?.currentDay).toBe(3);
    expect(reloaded.dsaChallengeState?.pacingMode).toBe('intensive');
    expect(reloaded.dsaChallengeState?.itemProgress[344]?.guidedCompleted).toBe(true);
  });

  it('guarantees self-reported external practice never grants canonical Leitner promotion or mutates dsaProgress', () => {
    let contextRef: ReturnType<typeof usePlacement> | null = null;
    const TestComponent = () => {
      contextRef = usePlacement();
      return null;
    };

    render(
      <PlacementProvider>
        <TestComponent />
      </PlacementProvider>
    );

    // Record an external attempt for LeetCode #189 Rotate Array (not in canonical catalog)
    act(() => {
      contextRef!.recordExternalChallengeAttempt(189, 'pass', true, 'In-place 3-step reversal algorithm.');
    });

    const state = StorageAdapter.loadState() as AppExtendedStorageState;
    // 1. Recorded in challenge state
    expect(state.dsaChallengeState?.itemProgress[189]?.externalPassedIndependently).toBe(true);
    expect(state.dsaChallengeState?.itemProgress[189]?.externalAttemptResult).toBe('pass');

    // 2. Canonical progress must have ZERO entries for #189
    expect(state.dsaProgress['189']).toBeUndefined();
    expect(state.dsaProgress['dsa-189']).toBeUndefined();

    // 3. No canonical attempts were recorded
    expect(state.dsaAttempts?.some((a) => a.problemId === '189' || a.problemId === 'dsa-189')).toBe(false);
  });

  it('truthfully distinguishes canonical logged independent passes from external self-reported passes without claiming automated verification', () => {
    // Set up a state with one canonical independent pass (Two Sum, canonicalId 'dsa-001', LC #1)
    // and one external self-reported pass (Rotate Array, LC #189)
    const state = StorageAdapter.loadState() as AppExtendedStorageState;
    state.dsaProgress['dsa-001'] = {
      problemId: 'dsa-001',
      currentBox: 2,
      passedIndependently: true,
      attemptCount: 1,
      lastAttemptAt: '2026-10-25T10:00:00.000Z',
      nextReviewAt: '2026-10-30',
      evidenceStrength: 0.8,
      createdAt: '2026-10-25T10:00:00.000Z',
      updatedAt: '2026-10-25T10:00:00.000Z',
    };
    state.dsaChallengeState = {
      enrolled: true,
      currentDay: 1,
      pacingMode: 'flexible',
      itemProgress: {
        189: {
          guidedCompleted: false,
          externalAttemptResult: 'pass',
          externalPassedIndependently: true,
        },
      },
    };
    StorageAdapter.saveState(state);

    render(
      <PlacementProvider>
        <DSAChallengeWorkspace onOpenCanonicalAttempt={vi.fn()} />
      </PlacementProvider>
    );

    // Aggregate stat cards must show truthful distinction
    expect(screen.getByText('Canonical Independent (Logged)')).toBeInTheDocument();
    expect(screen.getByText(/\/ 53 logged/i)).toBeInTheDocument();
    expect(screen.getByText(/Self-checked and logged in canonical workbench/i)).toBeInTheDocument();

    expect(screen.getByText('External Self-Reported')).toBeInTheDocument();
    expect(screen.getByText(/\/ 27 self-reported/i)).toBeInTheDocument();
    expect(screen.getByText(/Practice logged on public LeetCode/i)).toBeInTheDocument();

    // Must NOT claim "Independently Verified"
    expect(screen.queryByText(/Independently Verified/i)).not.toBeInTheDocument();

    // Problem badge for Two Sum (canonical in Day 1 Part A)
    expect(screen.getByText(/Canonical Independent Pass/i)).toBeInTheDocument();

    // Problem badge for Rotate Array (external in Day 1 Part B)
    expect(screen.getByText(/External Independent Pass \(Self-Reported\)/i)).toBeInTheDocument();
  });
});
