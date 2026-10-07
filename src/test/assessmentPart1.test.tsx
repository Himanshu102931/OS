/**
 * Assessment Manufacturing Part 1 — Diagnostic Pre-Flight & Mode A Lobby Tests
 *
 * Verifies Mode A (Pre-Flight Lobby) against the frozen visual specification:
 * - Zone 1: Diagnostic Mission Header & Pre-Flight Briefing
 * - Zone 2: 10-Module Construct Blueprint Grid (84 items, 180m, canonical metadata)
 * - Zone 3: Standardized Rules & Deterministic Scoring Guarantees
 * - Zone 4: Defining Hero Action Launch Strip (Start Diagnostic, Benchmark Topaz accent)
 * - Zone 5: Subsystem Grounding & Longitudinal Calibration Policy (Dual readiness, zero DSA mutation)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PlacementProvider } from '../context/PlacementContext';
import { GuideProvider } from '../components/guide/GuideContext';
import { AssessmentLobby } from '../components/assessment/AssessmentLobby';
import { AssessmentDiagnosticHeader } from '../components/assessment/AssessmentDiagnosticHeader';
import { AssessmentConstructBlueprint } from '../components/assessment/AssessmentConstructBlueprint';
import { AssessmentRulesPanel } from '../components/assessment/AssessmentRulesPanel';
import { AssessmentLaunchPanel } from '../components/assessment/AssessmentLaunchPanel';
import { AssessmentCalibrationPanel } from '../components/assessment/AssessmentCalibrationPanel';
import { AssessmentRunnerView } from '../components/assessment/AssessmentRunnerView';
import { BASELINE_ASSESSMENT_DEFINITION } from '../data/assessment/definitions';
import { BASELINE_ASSESSMENT_ITEMS } from '../data/assessment/items';

describe('Assessment Manufacturing Part 1 — Mode A Pre-Flight Lobby', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <PlacementProvider>
        <GuideProvider>{ui}</GuideProvider>
      </PlacementProvider>
    );
  };

  describe('Zone 1: AssessmentDiagnosticHeader', () => {
    it('1.1 renders assessment identity, title, and mission briefing', () => {
      renderWithProviders(<AssessmentDiagnosticHeader />);

      expect(screen.getByRole('heading', { level: 1, name: /Baseline Diagnostic Assessment/i })).toBeInTheDocument();
      expect(screen.getByText(/PlacementOS Benchmark v1\.0 · Mode A: Pre-Flight Briefing/i)).toBeInTheDocument();
      expect(screen.getByText(/Unassessed Baseline/i)).toBeInTheDocument();
      expect(screen.getByText(/authoritative, empirical capability profile across 10 core placement constructs/i)).toBeInTheDocument();
    });

    it('1.2 renders 5-second telemetry briefing blocks', () => {
      renderWithProviders(<AssessmentDiagnosticHeader />);

      expect(screen.getByText('180 Minutes')).toBeInTheDocument();
      expect(screen.getByText('84 Questions')).toBeInTheDocument();
      expect(screen.getByText('10 Domains')).toBeInTheDocument();
      expect(screen.getByText('Deterministic')).toBeInTheDocument();
      expect(screen.getByText(/Zero LLM grading/i)).toBeInTheDocument();
    });

    it('1.3 mounts the universal GuideTrigger for the assessment route', () => {
      renderWithProviders(<AssessmentDiagnosticHeader />);

      const guideBtn = screen.getByRole('button', { name: /Guide/i });
      expect(guideBtn).toBeInTheDocument();
    });
  });

  describe('Zone 2: AssessmentConstructBlueprint', () => {
    it('2.1 renders all 10 canonical modules and total items from canonical dataset', () => {
      renderWithProviders(<AssessmentConstructBlueprint />);

      expect(screen.getByRole('heading', { level: 2, name: /10-Module Construct Blueprint/i })).toBeInTheDocument();
      expect(BASELINE_ASSESSMENT_DEFINITION.modules.length).toBe(10);
      expect(screen.getByText(`${BASELINE_ASSESSMENT_ITEMS.length} Standardized Items`)).toBeInTheDocument();
      expect(screen.getByText('180 min Limit')).toBeInTheDocument();

      // Check module badges M1 to M10
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByText(`M${i}`)).toBeInTheDocument();
      }

      // Check domain names
      const domains = ['aptitude', 'dsa', 'python', 'sql', 'dbms', 'oop', 'os', 'cn', 'communication', 'interviews'];
      domains.forEach((dom) => {
        expect(screen.getByText(new RegExp(`^${dom}$`, 'i'))).toBeInTheDocument();
      });
    });

    it('2.2 explicitly distinguishes Class C Projects domain evaluated in Project Lab', () => {
      renderWithProviders(<AssessmentConstructBlueprint />);

      expect(screen.getByText(/Projects & Portfolio/i)).toBeInTheDocument();
      expect(screen.getByText(/Class C construct: Excluded from automated baseline\. Evaluated through viva defense in Project Lab\./i)).toBeInTheDocument();
      expect(screen.getByText(/Evaluated in Project Lab/i)).toBeInTheDocument();
    });
  });

  describe('Zone 3: AssessmentRulesPanel', () => {
    it('3.1 renders deterministic scoring rules, chance correction, and honesty guarantees', () => {
      renderWithProviders(<AssessmentRulesPanel />);

      expect(screen.getByRole('heading', { level: 2, name: /Standardized Scoring & Diagnostic Guarantees/i })).toBeInTheDocument();
      expect(screen.getByText(/Zero LLM \/ Pure Determinism/i)).toBeInTheDocument();
      expect(screen.getByText(/Mathematical Chance Correction/i)).toBeInTheDocument();
      expect(screen.getByText(/Honest “I Don’t Know” Behavior/i)).toBeInTheDocument();
      expect(screen.getByText(/Sandboxed Code & SQL Normalization/i)).toBeInTheDocument();
      expect(screen.getByText(/Hard 180m Wall-Clock Limit/i)).toBeInTheDocument();
      expect(screen.getByText(/Immutable Assessment Record/i)).toBeInTheDocument();
    });

    it('3.2 displays mathematical chance correction and error taxonomy mechanics', () => {
      renderWithProviders(<AssessmentRulesPanel />);

      expect(screen.getByText(/c' = \(c - 1\/k\) \/ \(1 - 1\/k\)/i)).toBeInTheDocument();
      expect(screen.getByText(/knowledge_gap/i)).toBeInTheDocument();
      expect(screen.getByText(/0\.8× \(E\) · 1\.0× \(M\) · 1\.3× \(H\) · 1\.7× \(VH\)/i)).toBeInTheDocument();
    });
  });

  describe('Zone 4: AssessmentLaunchPanel', () => {
    it('4.1 renders the defining Start Diagnostic action and pre-flight warning', () => {
      const onStartMock = vi.fn();
      renderWithProviders(<AssessmentLaunchPanel onStart={onStartMock} />);

      expect(screen.getByRole('heading', { level: 2, name: /Ready to Establish Your Diagnostic Baseline\?/i })).toBeInTheDocument();
      const startBtn = screen.getByTestId('start-diagnostic-btn');
      expect(startBtn).toBeInTheDocument();
      expect(startBtn).toHaveTextContent(/Start Baseline Assessment/i);

      fireEvent.click(startBtn);
      expect(onStartMock).toHaveBeenCalledTimes(1);
    });

    it('4.2 supports disabled state when prerequisites or locking are required', () => {
      const onStartMock = vi.fn();
      renderWithProviders(<AssessmentLaunchPanel onStart={onStartMock} disabled={true} />);

      const startBtn = screen.getByTestId('start-diagnostic-btn');
      expect(startBtn).toBeDisabled();
      fireEvent.click(startBtn);
      expect(onStartMock).not.toHaveBeenCalled();
    });
  });

  describe('Zone 5: AssessmentCalibrationPanel', () => {
    it('5.1 renders dual readiness isolation and four-step pipeline', () => {
      renderWithProviders(<AssessmentCalibrationPanel />);

      expect(screen.getByRole('heading', { level: 2, name: /Subsystem Grounding & Calibration Architecture/i })).toBeInTheDocument();
      expect(screen.getByText(/sourceType: 'test'/i)).toBeInTheDocument();
      expect(screen.getByText(/Step 1: Test Intake/i)).toBeInTheDocument();
      expect(screen.getByText(/Step 2: Diagnosis/i)).toBeInTheDocument();
      expect(screen.getByText(/Step 3: Multipliers/i)).toBeInTheDocument();
      expect(screen.getByText(/Step 4: Calibration/i)).toBeInTheDocument();
    });

    it('5.2 guarantees no mutation of DSA Leitner boxes or practice ladder rungs', () => {
      renderWithProviders(<AssessmentCalibrationPanel />);

      expect(screen.getByText(/Diagnostic testing/i)).toBeInTheDocument();
      expect(screen.getByText(/never mutates/i)).toBeInTheDocument();
      expect(screen.getByText(/DSA Leitner boxes or ordinary practice ladder rungs/i)).toBeInTheDocument();
    });
  });

  describe('Composite Mode A Lobby & AssessmentRunnerView Integration', () => {
    it('6.1 AssessmentLobby renders all 5 zones cohesively', () => {
      const onStartMock = vi.fn();
      renderWithProviders(<AssessmentLobby onStartBaseline={onStartMock} />);

      // Zone 1
      expect(screen.getByRole('heading', { level: 1, name: /Baseline Diagnostic Assessment/i })).toBeInTheDocument();
      // Zone 2
      expect(screen.getByRole('heading', { level: 2, name: /10-Module Construct Blueprint/i })).toBeInTheDocument();
      // Zone 3
      expect(screen.getByRole('heading', { level: 2, name: /Standardized Scoring & Diagnostic Guarantees/i })).toBeInTheDocument();
      // Zone 4
      expect(screen.getByTestId('start-diagnostic-btn')).toBeInTheDocument();
      // Zone 5
      expect(screen.getByRole('heading', { level: 2, name: /Subsystem Grounding & Calibration Architecture/i })).toBeInTheDocument();
    });

    it('6.2 AssessmentRunnerView displays Mode A Lobby when user is unassessed', () => {
      renderWithProviders(<AssessmentRunnerView />);

      expect(screen.getByRole('heading', { level: 1, name: /Baseline Diagnostic Assessment/i })).toBeInTheDocument();
      expect(screen.getByTestId('start-diagnostic-btn')).toBeInTheDocument();
    });

    it('6.3 clicking Start Diagnostic transitions into the active runner attempt', () => {
      renderWithProviders(<AssessmentRunnerView />);

      const startBtn = screen.getByTestId('start-diagnostic-btn');
      fireEvent.click(startBtn);

      // Should transition to active runner view (Question 1 of 84)
      expect(screen.getByText(/Question 1 of 84/i)).toBeInTheDocument();
      expect(screen.getByText(/Question Palette/i)).toBeInTheDocument();
    });
  });
});
