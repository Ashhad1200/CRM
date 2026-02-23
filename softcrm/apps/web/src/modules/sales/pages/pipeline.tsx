import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useDeals, usePipelines, useMoveDealStage } from '../api';
import type { Deal, Pipeline, DealStage } from '../api';

function formatCurrency(value: string, currency: string): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function DealCard({
  deal,
  onNavigate,
}: {
  deal: Deal;
  onNavigate: (id: string) => void;
}) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', deal.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onNavigate(deal.id)}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md"
    >
      <p className="mb-1 text-sm font-medium text-gray-900">{deal.name}</p>
      <p className="text-sm font-semibold text-gray-700">
        {formatCurrency(deal.value, deal.currency)}
      </p>
      {deal.expectedCloseDate && (
        <p className="mt-1 text-xs text-gray-500">
          Close: {new Date(deal.expectedCloseDate).toLocaleDateString()}
        </p>
      )}
      <span className="mt-1 inline-block rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
        {deal.probability}%
      </span>
    </div>
  );
}

function StageColumn({
  stage,
  deals,
  onMoveDeal,
  onNavigate,
}: {
  stage: DealStage;
  deals: Deal[];
  onMoveDeal: (dealId: string, stageId: string) => void;
  onNavigate: (id: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const totalValue = deals.reduce(
    (sum, d) => sum + (parseFloat(d.value) || 0),
    0,
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dealId = e.dataTransfer.getData('text/plain');
    if (dealId) {
      onMoveDeal(dealId, stage.id);
    }
  };

  const dotColor = stage.color ?? '#9ca3af';

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex min-h-[400px] w-72 shrink-0 flex-col rounded-lg bg-gray-50 p-3 ${
        dragOver ? 'ring-2 ring-blue-400' : ''
      }`}
    >
      {/* Stage header */}
      <div className="mb-3 flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <h3 className="text-sm font-semibold text-gray-900">{stage.name}</h3>
        <span className="ml-auto text-xs text-gray-500">{deals.length}</span>
      </div>
      <p className="mb-3 text-xs text-gray-500">
        Total: {formatCurrency(String(totalValue), 'USD')}
      </p>

      {/* Deal cards */}
      <div className="flex flex-1 flex-col gap-2">
        {deals.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">
            No deals in this stage
          </p>
        ) : (
          deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onNavigate={onNavigate} />
          ))
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const navigate = useNavigate();
  const { data: pipelinesData, isLoading: loadingPipelines } = usePipelines();
  const { data: dealsData, isLoading: loadingDeals, isError, error } = useDeals();
  const moveDealStage = useMoveDealStage();

  const pipelines: Pipeline[] = pipelinesData?.data ?? [];
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');

  const activePipeline: Pipeline | undefined = useMemo(() => {
    if (pipelines.length === 0) return undefined;
    if (selectedPipelineId) {
      return pipelines.find((p) => p.id === selectedPipelineId) ?? pipelines[0];
    }
    return pipelines.find((p) => p.isDefault) ?? pipelines[0];
  }, [pipelines, selectedPipelineId]);

  const stages: DealStage[] = useMemo(
    () =>
      activePipeline
        ? [...activePipeline.stages].sort((a, b) => a.order - b.order)
        : [],
    [activePipeline],
  );

  const deals: Deal[] = dealsData?.data ?? [];

  const dealsByStage = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const stage of stages) {
      map.set(stage.id, []);
    }
    for (const deal of deals) {
      if (activePipeline && deal.pipelineId === activePipeline.id) {
        const list = map.get(deal.stageId);
        if (list) {
          list.push(deal);
        }
      }
    }
    return map;
  }, [deals, stages, activePipeline]);

  const handleMoveDeal = (dealId: string, stageId: string) => {
    moveDealStage.mutate({ id: dealId, stageId });
  };

  const handleNavigate = (id: string) => {
    navigate(`/sales/deals/${id}`);
  };

  const isLoading = loadingPipelines || loadingDeals;

  return (
    <div className="mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>

        {pipelines.length > 1 && (
          <select
            value={activePipeline?.id ?? ''}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {!isLoading && !activePipeline && (
        <p className="text-gray-400">No pipelines configured.</p>
      )}

      {activePipeline && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              deals={dealsByStage.get(stage.id) ?? []}
              onMoveDeal={handleMoveDeal}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
