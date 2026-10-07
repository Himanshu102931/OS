import React from 'react';
import { AssessmentDiagnosticHeader } from './AssessmentDiagnosticHeader';
import { AssessmentConstructBlueprint } from './AssessmentConstructBlueprint';
import { AssessmentRulesPanel } from './AssessmentRulesPanel';
import { AssessmentLaunchPanel } from './AssessmentLaunchPanel';
import { AssessmentCalibrationPanel } from './AssessmentCalibrationPanel';

interface AssessmentLobbyProps {
  onStartBaseline: () => void;
}

export const AssessmentLobby: React.FC<AssessmentLobbyProps> = ({ onStartBaseline }) => {
  return (
    <div
      data-subsystem="assessment"
      className="max-w-[1200px] mx-auto space-y-8 pb-16 animate-fade-in"
    >
      {/* Zone 1: Diagnostic Mission Header & Pre-Flight Briefing */}
      <AssessmentDiagnosticHeader />

      {/* Zone 2: 10-Module Construct Blueprint Grid */}
      <AssessmentConstructBlueprint />

      {/* Zone 3: Standardized Rules & Deterministic Scoring Guarantees */}
      <AssessmentRulesPanel />

      {/* Zone 4: Defining Hero Action Launch Strip */}
      <AssessmentLaunchPanel onStart={onStartBaseline} />

      {/* Zone 5: Subsystem Grounding & Longitudinal Calibration Policy */}
      <AssessmentCalibrationPanel />
    </div>
  );
};
