import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Code2,
  FileCode,
} from 'lucide-react';
import type {
  AssessmentItem,
  AssessmentConfidence,
  AssessmentExecutionResult,
} from '../../types';
import { AssessmentResponseControls } from './AssessmentResponseControls';

interface AssessmentQuestionStageProps {
  currentItem?: AssessmentItem;
  currentIndex: number;
  totalCount: number;
  recordedCurrent?: {
    response: number | string;
    confidence?: AssessmentConfidence;
    result: string;
    executionResult?: AssessmentExecutionResult;
  };
  textInput: string;
  onAnswerChange: (userResponse: number | string | null, confidence?: AssessmentConfidence) => void;
  onConfidenceChange: (confidence: AssessmentConfidence) => void;
  onPrevious: () => void;
  onNext: () => void;
  onSubmitClick: () => void;
}

export const AssessmentQuestionStage: React.FC<AssessmentQuestionStageProps> = ({
  currentItem,
  currentIndex,
  totalCount,
  recordedCurrent,
  textInput,
  onAnswerChange,
  onConfidenceChange,
  onPrevious,
  onNext,
  onSubmitClick,
}) => {
  if (!currentItem) {
    return (
      <div className="bg-[#14171D] border border-[#262D38] rounded-md p-12 text-center text-[#8E98A8]">
        No question found in active assessment.
      </div>
    );
  }

  const isFinalQuestion = currentIndex === totalCount - 1;

  return (
    <div className="bg-[#14171D] border border-[#262D38] rounded-md p-6 space-y-6">
      {/* Question Prompt Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#8E98A8] bg-[#1B2028] px-2 py-0.5 rounded border border-[#262D38]">
            ID: {currentItem.id}
          </span>
          <span className="text-[#5C6675] uppercase">
            {currentItem.assessmentRole} stage
          </span>
        </div>

        <div className="text-base text-[#F1F5F9] leading-relaxed whitespace-pre-wrap font-sans bg-[#0D0F12]/60 p-4.5 rounded border border-[#262D38]/60">
          {currentItem.prompt}
        </div>
      </div>

      {/* Response Workspace */}
      <div className="space-y-4 pt-1">
        <h3 className="text-xs font-semibold text-[#8E98A8] uppercase tracking-wider">
          Your Response
        </h3>

        {/* 1. Multiple Choice Options */}
        {currentItem.options && currentItem.options.length > 0 && (
          <div className="space-y-2.5" role="radiogroup" aria-label="Multiple Choice Options">
            {currentItem.options.map((opt, oIdx) => {
              const isSelected = recordedCurrent?.response === oIdx;
              return (
                <button
                  key={oIdx}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onAnswerChange(oIdx)}
                  className={`w-full text-left p-3.5 rounded text-sm transition-all border flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-[#EAB308]/10 border-[#EAB308] text-[#F1F5F9] font-medium ring-1 ring-[#EAB308]'
                      : 'bg-[#1B2028]/60 border-[#262D38] text-[#CBD5E1] hover:bg-[#1B2028] hover:border-[#3B4556]'
                  }`}
                >
                  <span
                    className={`size-5 rounded flex items-center justify-center text-xs font-mono shrink-0 mt-0.5 ${
                      isSelected ? 'bg-[#EAB308] text-[#0D0F12] font-bold' : 'bg-[#262D38] text-[#8E98A8]'
                    }`}
                  >
                    {String.fromCharCode(65 + oIdx)}
                  </span>
                  <span className="leading-snug">{opt}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* 2. SQL Query Normalization Input */}
        {currentItem.scoring.kind === 'normalized_match' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#8E98A8]">
              <span className="flex items-center gap-1.5 font-mono">
                <FileCode className="size-3.5 text-[#EAB308]" aria-hidden="true" />
                <span>SQL Query Editor</span>
              </span>
              <span className="text-[11px] text-[#5C6675]">
                Exact syntactic normalization AST match
              </span>
            </div>

            <textarea
              value={textInput}
              onChange={(e) => onAnswerChange(e.target.value)}
              placeholder="SELECT ... FROM ... WHERE ..."
              rows={5}
              spellCheck={false}
              className="w-full bg-[#0D0F12] text-[#F1F5F9] font-mono text-xs p-3.5 rounded border border-[#262D38] focus:border-[#EAB308] focus:outline-none transition-colors"
            />
          </div>
        )}

        {/* 3. Written Rubric Input */}
        {currentItem.scoring.kind === 'rubric' && (
          <div className="space-y-2">
            <p className="text-xs text-[#8E98A8]">
              Provide your written response below. (Evaluated deterministically according to authored rubric criteria).
            </p>
            <textarea
              value={textInput}
              onChange={(e) => onAnswerChange(e.target.value)}
              placeholder="Write your explanation or reasoning..."
              rows={6}
              spellCheck={false}
              className="w-full bg-[#0D0F12] text-[#F1F5F9] font-sans text-xs p-3.5 rounded border border-[#262D38] focus:border-[#EAB308] focus:outline-none transition-colors"
            />
          </div>
        )}

        {/* 4. Execution-Backed Python/SQL Test */}
        {currentItem.scoring.kind === 'execution_test' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#8E98A8]">
              <span className="flex items-center gap-1.5 font-mono">
                <Code2 className="size-3.5 text-[#EAB308]" aria-hidden="true" />
                <span>{currentItem.domainId === 'python' ? 'Python 3 Sandbox' : 'SQL Relational Fixture'}</span>
              </span>
              <span className="text-[11px] text-[#64748B]">
                Deterministic sandboxed execution
              </span>
            </div>

            <textarea
              value={textInput}
              onChange={(e) => onAnswerChange(e.target.value)}
              placeholder={
                currentItem.domainId === 'python'
                  ? `def ${currentItem.pythonContract?.entryPoint || 'solution'}(...):\n    # Write your solution here\n    pass`
                  : 'SELECT ... FROM ... WHERE ...'
              }
              rows={7}
              spellCheck={false}
              className="w-full bg-[#0D0F12] text-[#F1F5F9] font-mono text-xs p-3.5 rounded border border-[#262D38] focus:border-[#EAB308] focus:outline-none transition-colors"
            />

            {/* Execution Feedback Readout */}
            {recordedCurrent?.executionResult && (
              <div
                data-testid="execution-feedback"
                className={`p-3 rounded border text-xs font-mono transition-all ${
                  recordedCurrent.executionResult.passed
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400'
                    : recordedCurrent.executionResult.status === 'timeout'
                    ? 'bg-amber-950/20 border-amber-800/40 text-amber-400'
                    : recordedCurrent.executionResult.status === 'sandbox_violation'
                    ? 'bg-red-950/30 border-red-800/50 text-red-400'
                    : recordedCurrent.executionResult.status === 'unsupported'
                    ? 'bg-slate-900 border-slate-700 text-slate-400'
                    : 'bg-red-950/20 border-red-800/40 text-rose-400'
                }`}
              >
                <div className="flex items-center justify-between font-sans text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5">
                    {recordedCurrent.executionResult.passed ? (
                      <CheckCircle2 className="size-3.5 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="size-3.5 text-rose-400" aria-hidden="true" />
                    )}
                    {recordedCurrent.executionResult.passed
                      ? 'Execution Passed'
                      : recordedCurrent.executionResult.status === 'timeout'
                      ? 'Execution Timeout'
                      : recordedCurrent.executionResult.status === 'syntax_error'
                      ? 'Syntax Error'
                      : recordedCurrent.executionResult.status === 'sandbox_violation'
                      ? 'Sandbox Violation'
                      : recordedCurrent.executionResult.status === 'unsupported'
                      ? 'Unsupported Execution'
                      : 'Execution Assertion Failed'}
                  </span>
                  <span className="text-[11px] font-normal text-[#8E98A8]">
                    {recordedCurrent.executionResult.executionTimeMs}ms
                  </span>
                </div>

                <div className="text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                  {recordedCurrent.executionResult.message ||
                    (recordedCurrent.executionResult.passed
                      ? `Passed ${recordedCurrent.executionResult.testsPassed}/${recordedCurrent.executionResult.totalTests} tests`
                      : `Error: ${recordedCurrent.executionResult.errorCategory || 'Failure'}`)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Zone 3: Diagnostic Response Controls */}
        <AssessmentResponseControls
          currentResponse={recordedCurrent}
          onAnswerChange={onAnswerChange}
          onConfidenceChange={onConfidenceChange}
        />
      </div>

      {/* Bottom Navigation Controls */}
      <div className="flex items-center justify-between pt-6 border-t border-[#262D38]">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={onPrevious}
          className="flex items-center gap-2 px-4 py-2 rounded text-xs font-medium bg-[#1B2028] text-[#F1F5F9] border border-[#262D38] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#262D38] transition-colors cursor-pointer"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span>Previous Question</span>
        </button>

        <div className="text-xs font-mono text-[#8E98A8]">
          {currentIndex + 1} / {totalCount}
        </div>

        {!isFinalQuestion ? (
          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-2 px-4.5 py-2 rounded text-xs font-semibold bg-[#EAB308] text-[#0D0F12] hover:bg-[#CA8A04] transition-colors shadow-sm cursor-pointer"
          >
            <span>Next Question</span>
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmitClick}
            className="flex items-center gap-2 px-4.5 py-2 rounded text-xs font-bold bg-[#10B981] text-[#0D0F12] hover:bg-[#059669] transition-colors shadow-sm cursor-pointer"
          >
            <span>Finish &amp; Submit</span>
            <CheckCircle2 className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};
