import React, { useEffect } from 'react';
import type {
  AssessmentAttempt,
  AssessmentItem,
  AssessmentConfidence,
  AssessmentExecutionResult,
} from '../../types';
import { AssessmentCommandBar } from './AssessmentCommandBar';
import { AssessmentQuestionStage } from './AssessmentQuestionStage';
import { AssessmentQuestionPalette } from './AssessmentQuestionPalette';
import { AssessmentSubmitModal } from './AssessmentSubmitModal';
import { AssessmentCancelModal } from './AssessmentCancelModal';

interface AssessmentExecutionRunnerProps {
  activeAttempt: AssessmentAttempt;
  orderedItems: AssessmentItem[];
  currentIndex: number;
  responseMap: Map<
    string,
    {
      response: number | string;
      confidence?: AssessmentConfidence;
      result: string;
      executionResult?: AssessmentExecutionResult;
    }
  >;
  timeRemainingSeconds: number;
  showSubmitModal: boolean;
  showCancelModal: boolean;
  textInput: string;
  onSelectIndex: (index: number) => void;
  onAnswerChange: (userResponse: number | string | null, confidence?: AssessmentConfidence) => void;
  onConfidenceChange: (confidence: AssessmentConfidence) => void;
  onPrevious: () => void;
  onNext: () => void;
  onOpenSubmitModal: () => void;
  onCloseSubmitModal: () => void;
  onConfirmSubmit: () => void;
  onOpenCancelModal: () => void;
  onCloseCancelModal: () => void;
  onConfirmCancel: () => void;
}

export const AssessmentExecutionRunner: React.FC<AssessmentExecutionRunnerProps> = ({
  activeAttempt,
  orderedItems,
  currentIndex,
  responseMap,
  timeRemainingSeconds,
  showSubmitModal,
  showCancelModal,
  textInput,
  onSelectIndex,
  onAnswerChange,
  onConfidenceChange,
  onPrevious,
  onNext,
  onOpenSubmitModal,
  onCloseSubmitModal,
  onConfirmSubmit,
  onOpenCancelModal,
  onCloseCancelModal,
  onConfirmCancel,
}) => {
  const currentItem = orderedItems[currentIndex];
  const answeredCount = responseMap.size;
  const totalCount = orderedItems.length;
  const recordedCurrent = currentItem ? responseMap.get(currentItem.id) : undefined;

  // Handle Escape key for cancel modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCancelModal) {
          onCloseCancelModal();
        } else if (!showSubmitModal) {
          onOpenCancelModal();
        }
      }
    };

    if (showCancelModal || showSubmitModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCancelModal, showSubmitModal, onOpenCancelModal, onCloseCancelModal]);

  return (
    <main
      data-subsystem="assessment"
      data-testid="assessment-execution-runner"
      aria-label="Assessment Execution Workspace"
      className="max-w-[1280px] mx-auto space-y-6 pb-12 animate-fade-in"
    >
      {/* Zone 1: Sticky Command Bar & Countdown Bar */}
      <AssessmentCommandBar
        attempt={activeAttempt}
        currentIndex={currentIndex}
        totalCount={totalCount}
        answeredCount={answeredCount}
        timeRemainingSeconds={timeRemainingSeconds}
        currentItem={currentItem}
        onSubmitClick={onOpenSubmitModal}
        onCancelClick={onOpenCancelModal}
      />

      {/* Main Workspace Grid (3 cols Question Stage + 1 col Question Palette) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Zone 2 & 3: Question Stage & Response Controls */}
        <div className="lg:col-span-3">
          <AssessmentQuestionStage
            currentItem={currentItem}
            currentIndex={currentIndex}
            totalCount={totalCount}
            recordedCurrent={recordedCurrent}
            textInput={textInput}
            onAnswerChange={onAnswerChange}
            onConfidenceChange={onConfidenceChange}
            onPrevious={onPrevious}
            onNext={onNext}
            onSubmitClick={onOpenSubmitModal}
          />
        </div>

        {/* Zone 4: Question Stepper & 84-Item Palette Navigator */}
        <div className="lg:col-span-1">
          <AssessmentQuestionPalette
            orderedItems={orderedItems}
            currentIndex={currentIndex}
            answeredCount={answeredCount}
            totalCount={totalCount}
            responseMap={responseMap}
            onSelectIndex={onSelectIndex}
          />
        </div>
      </div>

      {/* Zone 5: Submission Shield Gateway Modal */}
      <AssessmentSubmitModal
        isOpen={showSubmitModal}
        attempt={activeAttempt}
        answeredCount={answeredCount}
        totalCount={totalCount}
        onCancel={onCloseSubmitModal}
        onConfirm={onConfirmSubmit}
      />

      {/* Zone 6: Cancellation Confirmation Modal */}
      <AssessmentCancelModal
        isOpen={showCancelModal}
        answeredCount={answeredCount}
        totalCount={totalCount}
        onCancel={onCloseCancelModal}
        onConfirm={onConfirmCancel}
      />
    </main>
  );
};