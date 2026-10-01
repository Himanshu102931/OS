// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { PlacementProvider } from '../context/PlacementContext';
import { AssessmentRunnerView } from '../components/assessment/AssessmentRunnerView';
import { StorageAdapter, getDefaultStorageState, type AppExtendedStorageState } from '../storage/storageAdapter';
import type { AssessmentAttempt, AssessmentResponse } from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('AssessmentRunnerView UI Component', () => {
  beforeEach(() => {
    StorageAdapter.clearState();
    window.location.hash = '#/assessment';
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the intro launch screen when no attempt is active', () => {
    render(
      <PlacementProvider>
        <AssessmentRunnerView />
      </PlacementProvider>
    );

    expect(screen.getByText('Baseline Diagnostic Assessment')).toBeDefined();
    expect(screen.getByText(/180 Minutes/i)).toBeDefined();
    expect(screen.getByText(/84 Questions/i)).toBeDefined();
    expect(screen.getByText('Start Baseline Assessment')).toBeDefined();
  });

  it('starts an attempt and presents the first question runner with countdown and palette', () => {
    render(
      <PlacementProvider>
        <AssessmentRunnerView />
      </PlacementProvider>
    );

    const startBtn = screen.getByText('Start Baseline Assessment');
    act(() => {
      fireEvent.click(startBtn);
    });

    expect(screen.getByText(/Question 1 of 84/i)).toBeDefined();
    expect(screen.getByText(/Question Palette/i)).toBeDefined();
    expect(screen.getByText('Next Question')).toBeDefined();
  });

  it('allows answering a question and advancing to the next question', () => {
    render(
      <PlacementProvider>
        <AssessmentRunnerView />
      </PlacementProvider>
    );

    const startBtn = screen.getByText('Start Baseline Assessment');
    act(() => {
      fireEvent.click(startBtn);
    });

    // Pick first option if options exist
    const optionButtons = screen.getAllByRole('button').filter((btn) => btn.querySelector('span.font-mono'));
    if (optionButtons.length > 0) {
      act(() => {
        fireEvent.click(optionButtons[0]);
      });
      expect(screen.getByText(/1 answered/i)).toBeDefined();
    }

    const nextBtn = screen.getByText('Next Question');
    act(() => {
      fireEvent.click(nextBtn);
    });

    expect(screen.getByText(/Question 2 of 84/i)).toBeDefined();
  });

  it('renders the completed diagnostic readout view when baseline is completed', () => {
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
      selectedItemIds: ['item-1'],
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
          {
            domainId: 'projects',
            abilityScore: 0,
            level: 0,
            confidence: 'none',
            status: 'unassessed',
            coverage: { topicsCovered: 0, topicsTotal: 1, competenciesCovered: [], difficultyBands: [] },
            assessmentDate: '2026-10-01T10:30:00.000Z',
            provisional: true,
            constructScope: 'project_evidence_only',
            attemptId: completedAttempt.id,
            kind: 'diagnostic_assessment',
          },
        ],
        snapshots: [
          {
            id: 'snap-1',
            takenAt: '2026-10-01T10:30:00.000Z',
            kind: 'diagnostic_assessment',
            trigger: 'post_baseline',
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
              {
                domainId: 'projects',
                abilityScore: 0,
                level: 0,
                confidence: 'none',
                status: 'unassessed',
                coverage: { topicsCovered: 0, topicsTotal: 1, competenciesCovered: [], difficultyBands: [] },
                assessmentDate: '2026-10-01T10:30:00.000Z',
                provisional: true,
                constructScope: 'project_evidence_only',
                attemptId: completedAttempt.id,
                kind: 'diagnostic_assessment',
              },
            ],
          },
        ],
        weaknessSignals: [
          {
            id: 'ws-1',
            domainId: 'aptitude',
            topicId: 'prep-apt-quant',
            competency: 'Percentages',
            errorCategory: 'E-CORNER',
            strength: 2,
            status: 'open',
            firstSeenAt: '2026-10-01T10:30:00.000Z',
            lastSeenAt: '2026-10-01T10:30:00.000Z',
            occurrences: 1,
            sourceAttemptIds: [completedAttempt.id],
          },
        ],
        profile: {
          baselineCompletedAt: '2026-10-01T10:30:00.000Z',
          pendingSunday: false,
        },
      },
    };

    StorageAdapter.saveState(extendedState);

    render(
      <PlacementProvider>
        <AssessmentRunnerView />
      </PlacementProvider>
    );

    expect(screen.getByText('Baseline Diagnostic Capability Readout')).toBeDefined();
    expect(screen.getByText('APTITUDE')).toBeDefined();
    expect(screen.getByText(/Level 4 — Job Ready/i)).toBeDefined();
    expect(screen.getAllByText(/PROJECTS/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Percentages/i)).toBeDefined();
  });
});
