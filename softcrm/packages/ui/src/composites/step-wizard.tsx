import * as React from 'react';
import { cn } from '../utils/cn.js';

// ── Types ───────────────────────────────────────────────────────────────────────

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  isValid?: boolean;
  isOptional?: boolean;
}

export interface StepWizardProps {
  steps: WizardStep[];
  activeStep: number;
  onStepChange: (step: number) => void;
  onComplete?: () => void;
  orientation?: 'horizontal' | 'vertical';
  allowSkip?: boolean;
  className?: string;
}

// ── Step Indicator ──────────────────────────────────────────────────────────────

function StepIndicator({
  step,
  index,
  isActive,
  isCompleted,
  isClickable,
  onClick,
  orientation,
}: {
  step: WizardStep;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  isClickable: boolean;
  onClick: () => void;
  orientation: 'horizontal' | 'vertical';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        'group flex items-center gap-3 text-left transition-colors',
        orientation === 'horizontal' && 'flex-col',
        isClickable ? 'cursor-pointer' : 'cursor-default',
      )}
      aria-current={isActive ? 'step' : undefined}
    >
      {/* Circle */}
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all',
          isCompleted &&
            'border-brand-500 bg-brand-500 text-white',
          isActive &&
            !isCompleted &&
            'border-brand-500 bg-brand-50 text-brand-600',
          !isActive &&
            !isCompleted &&
            'border-neutral-300 bg-white text-neutral-400',
          isClickable && !isActive && 'group-hover:border-brand-400',
        )}
      >
        {isCompleted ? (
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : step.icon ? (
          step.icon
        ) : (
          index + 1
        )}
      </span>

      {/* Label */}
      <span className={cn('flex flex-col', orientation === 'horizontal' && 'items-center')}>
        <span
          className={cn(
            'text-sm font-medium transition-colors',
            isActive ? 'text-brand-600' : isCompleted ? 'text-neutral-700' : 'text-neutral-400',
          )}
        >
          {step.title}
          {step.isOptional && (
            <span className="ml-1 text-xs font-normal text-neutral-400">(optional)</span>
          )}
        </span>
        {step.description && (
          <span className="text-xs text-neutral-400">{step.description}</span>
        )}
      </span>
    </button>
  );
}

// ── Progress Line ───────────────────────────────────────────────────────────────

function ProgressLine({
  isCompleted,
  orientation,
}: {
  isCompleted: boolean;
  orientation: 'horizontal' | 'vertical';
}) {
  return (
    <div
      className={cn(
        'transition-colors duration-300',
        orientation === 'horizontal' ? 'mx-2 h-0.5 flex-1' : 'ml-[1.0625rem] my-1 w-0.5 h-8',
        isCompleted ? 'bg-brand-500' : 'bg-neutral-200',
      )}
      aria-hidden
    />
  );
}

// ── StepWizard ──────────────────────────────────────────────────────────────────

export function StepWizard({
  steps,
  activeStep,
  onStepChange,
  onComplete,
  orientation = 'horizontal',
  allowSkip = false,
  className,
}: StepWizardProps): React.ReactElement {
  const isFirst = activeStep === 0;
  const isLast = activeStep === steps.length - 1;
  const currentStep = steps[activeStep];

  const handleNext = () => {
    if (isLast) {
      onComplete?.();
    } else {
      onStepChange(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) onStepChange(activeStep - 1);
  };

  const handleStepClick = (index: number) => {
    // Allow clicking completed steps or if skip is enabled
    if (index < activeStep || allowSkip) {
      onStepChange(index);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Step Indicators */}
      <nav
        aria-label="Progress"
        className={cn(
          'flex',
          orientation === 'horizontal' ? 'items-center' : 'flex-col',
        )}
      >
        {steps.map((step, i) => (
          <React.Fragment key={step.id}>
            <StepIndicator
              step={step}
              index={i}
              isActive={i === activeStep}
              isCompleted={i < activeStep}
              isClickable={i < activeStep || (allowSkip && i !== activeStep)}
              onClick={() => handleStepClick(i)}
              orientation={orientation}
            />
            {i < steps.length - 1 && (
              <ProgressLine isCompleted={i < activeStep} orientation={orientation} />
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Step Content — glass-2 card */}
      <div className="glass-2 rounded-xl border border-white/10 p-6">
        {currentStep?.content}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={isFirst}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors',
            isFirst
              ? 'cursor-not-allowed opacity-40'
              : 'hover:bg-neutral-50 active:bg-neutral-100',
          )}
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Back
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 active:bg-brand-800"
        >
          {isLast ? 'Complete' : 'Next'}
          {!isLast && (
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
