import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useInspection, useSubmitInspection } from '../api';
import type { ChecklistItem, InspectionResult } from '../api';

interface ResultEntry {
  checklistItemId: string;
  passFail?: boolean;
  numericValue?: number;
  textValue?: string;
  notes?: string;
}

function ChecklistItemInput({
  item,
  value,
  onChange,
}: {
  item: ChecklistItem;
  value: ResultEntry;
  onChange: (entry: ResultEntry) => void;
}) {
  const handleChange = (field: keyof ResultEntry, val: unknown) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3">
        <p className="font-medium text-gray-900">{item.question}</p>
        {item.required && <span className="text-xs text-red-500">* Required</span>}
      </div>

      {item.type === 'PASS_FAIL' && (
        <div className="flex gap-3">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name={`pf-${item.id}`}
              checked={value.passFail === true}
              onChange={() => handleChange('passFail', true)}
              className="h-4 w-4 text-green-600"
            />
            <span className="text-sm text-gray-700">Pass</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name={`pf-${item.id}`}
              checked={value.passFail === false}
              onChange={() => handleChange('passFail', false)}
              className="h-4 w-4 text-red-600"
            />
            <span className="text-sm text-gray-700">Fail</span>
          </label>
        </div>
      )}

      {item.type === 'NUMERIC' && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value.numericValue ?? ''}
            onChange={(e) =>
              handleChange('numericValue', e.target.value ? parseFloat(e.target.value) : undefined)
            }
            className="w-32 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Value"
            step="any"
          />
          {item.unit && <span className="text-sm text-gray-500">{item.unit}</span>}
          {(item.minValue !== undefined || item.maxValue !== undefined) && (
            <span className="text-xs text-gray-400">
              Range: {item.minValue ?? '-'} to {item.maxValue ?? '-'}
            </span>
          )}
        </div>
      )}

      {item.type === 'TEXT' && (
        <textarea
          value={value.textValue ?? ''}
          onChange={(e) => handleChange('textValue', e.target.value || undefined)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          rows={2}
          placeholder="Enter observation..."
        />
      )}

      <div className="mt-3">
        <label className="mb-1 block text-xs text-gray-500">Notes (optional)</label>
        <input
          type="text"
          value={value.notes ?? ''}
          onChange={(e) => handleChange('notes', e.target.value || undefined)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Additional notes..."
        />
      </div>
    </div>
  );
}

export default function InspectionConductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: inspection, isLoading, isError, error } = useInspection(id ?? '');
  const submitInspection = useSubmitInspection();

  const [currentStep, setCurrentStep] = useState(0);
  const [overallResult, setOverallResult] = useState<InspectionResult>('PASS');
  const [finalNotes, setFinalNotes] = useState('');

  const checklistItems: ChecklistItem[] = useMemo(() => {
    if (!inspection?.template?.checklistItems) return [];
    return [...inspection.template.checklistItems].sort((a, b) => a.order - b.order);
  }, [inspection]);

  const [results, setResults] = useState<Record<string, ResultEntry>>(() => {
    const initial: Record<string, ResultEntry> = {};
    checklistItems.forEach((item) => {
      initial[item.id] = { checklistItemId: item.id };
    });
    return initial;
  });

  // Update results when checklistItems change
  useMemo(() => {
    const newResults: Record<string, ResultEntry> = {};
    checklistItems.forEach((item) => {
      newResults[item.id] = results[item.id] ?? { checklistItemId: item.id };
    });
    if (Object.keys(newResults).length !== Object.keys(results).length) {
      setResults(newResults);
    }
  }, [checklistItems, results]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-gray-400">Inspection not found.</p>
      </div>
    );
  }

  const totalSteps = checklistItems.length + 1; // +1 for review step
  const isReviewStep = currentStep === checklistItems.length;
  const currentItem = checklistItems[currentStep];

  const handleResultChange = (entry: ResultEntry) => {
    setResults((prev) => ({ ...prev, [entry.checklistItemId]: entry }));
  };

  const handleSubmit = () => {
    const resultsList = Object.values(results);
    submitInspection.mutate(
      {
        id: inspection.id,
        results: resultsList,
        overallResult,
        notes: finalNotes || undefined,
      },
      {
        onSuccess: () => navigate(`/quality/inspections/${inspection.id}`),
      },
    );
  };

  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/quality/inspections/${inspection.id}`)}
          className="mb-2 text-sm text-blue-600 hover:underline"
        >
          Back to Inspection
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Conduct Inspection {inspection.inspectionNumber}
        </h1>
        <p className="text-sm text-gray-500">
          Template: {inspection.template?.name}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-2 flex justify-between text-xs text-gray-500">
          <span>
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      {!isReviewStep && currentItem && (
        <div className="mb-6">
          <ChecklistItemInput
            item={currentItem}
            value={results[currentItem.id] ?? { checklistItemId: currentItem.id }}
            onChange={handleResultChange}
          />
        </div>
      )}

      {isReviewStep && (
        <div className="mb-6 space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Review & Submit</h2>

            {/* Summary */}
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-gray-700">Results Summary</h3>
              <div className="space-y-2">
                {checklistItems.map((item) => {
                  const result = results[item.id];
                  let displayValue = '-';
                  if (item.type === 'PASS_FAIL' && result?.passFail !== undefined) {
                    displayValue = result.passFail ? 'Pass' : 'Fail';
                  } else if (item.type === 'NUMERIC' && result?.numericValue !== undefined) {
                    displayValue = String(result.numericValue);
                  } else if (item.type === 'TEXT' && result?.textValue) {
                    displayValue = result.textValue;
                  }
                  return (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.question}</span>
                      <span className="font-medium text-gray-900">{displayValue}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Overall result */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Overall Result *
              </label>
              <select
                value={overallResult}
                onChange={(e) => setOverallResult(e.target.value as InspectionResult)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="PASS">Pass</option>
                <option value="FAIL">Fail</option>
                <option value="CONDITIONAL">Conditional</option>
              </select>
            </div>

            {/* Final notes */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Final Notes
              </label>
              <textarea
                value={finalNotes}
                onChange={(e) => setFinalNotes(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                rows={3}
                placeholder="Any additional observations or comments..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        >
          Previous
        </button>

        {!isReviewStep ? (
          <button
            onClick={() => setCurrentStep((s) => s + 1)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitInspection.isPending}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {submitInspection.isPending ? 'Submitting...' : 'Submit Inspection'}
          </button>
        )}
      </div>

      {submitInspection.isError && (
        <p className="mt-4 text-sm text-red-600">{submitInspection.error.message}</p>
      )}
    </div>
  );
}
