import { useState, useCallback } from 'react';
import { GlassCard, GlassPanel, Badge } from '@softcrm/ui';

interface FlowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  label: string;
  config: Record<string, unknown>;
  x: number;
  y: number;
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

const NODE_TEMPLATES = {
  triggers: [
    { type: 'trigger' as const, label: 'Form Submitted', config: { event: 'form.submitted' } },
    { type: 'trigger' as const, label: 'Lead Created', config: { event: 'lead.created' } },
    { type: 'trigger' as const, label: 'Deal Won', config: { event: 'deal.won' } },
    { type: 'trigger' as const, label: 'Tag Added', config: { event: 'tag.added' } },
  ],
  conditions: [
    { type: 'condition' as const, label: 'Score Above', config: { field: 'score', operator: 'gt' } },
    { type: 'condition' as const, label: 'Has Tag', config: { field: 'tags', operator: 'contains' } },
    { type: 'condition' as const, label: 'Source Is', config: { field: 'source', operator: 'eq' } },
  ],
  actions: [
    { type: 'action' as const, label: 'Send Email', config: { action: 'send_email' } },
    { type: 'action' as const, label: 'Wait', config: { action: 'wait', duration: '1d' } },
    { type: 'action' as const, label: 'Add Tag', config: { action: 'add_tag' } },
    { type: 'action' as const, label: 'Assign Owner', config: { action: 'assign_owner' } },
    { type: 'action' as const, label: 'Create Task', config: { action: 'create_task' } },
    { type: 'action' as const, label: 'Update Field', config: { action: 'update_field' } },
  ],
};

const NODE_COLORS: Record<string, string> = {
  trigger: 'border-green-500/50 bg-green-500/10',
  condition: 'border-yellow-500/50 bg-yellow-500/10',
  action: 'border-blue-500/50 bg-blue-500/10',
};

const NODE_ICONS: Record<string, string> = {
  trigger: '⚡',
  condition: '🔀',
  action: '▶️',
};

let nodeIdCounter = 0;

export default function AutomationBuilderPage() {
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const addNode = useCallback(
    (template: { type: FlowNode['type']; label: string; config: Record<string, unknown> }) => {
      const id = `node-${++nodeIdCounter}`;
      const y = nodes.length * 100 + 40;
      const newNode: FlowNode = { id, ...template, x: 300, y };
      setNodes((prev) => [...prev, newNode]);

      // Auto-connect to last node of compatible type
      if (nodes.length > 0) {
        const lastNode = nodes[nodes.length - 1]!;
        setEdges((prev) => [...prev, { from: lastNode.id, to: id }]);
      }
    },
    [nodes],
  );

  const removeNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.from !== nodeId && e.to !== nodeId));
    setSelectedNode(null);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Automation Builder
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Build visual marketing automation workflows
          </p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-white/10 transition">
            Save Draft
          </button>
          <button className="rounded-lg bg-gradient-to-r from-[var(--accent-from,#3b82f6)] to-[var(--accent-to,#6366f1)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 transition">
            Activate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 h-[calc(100vh-220px)]">
        {/* Node Palette */}
        <GlassCard tier="medium" padding="md" className="overflow-y-auto">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Triggers</h2>
          {NODE_TEMPLATES.triggers.map((t) => (
            <button
              key={t.label}
              onClick={() => addNode(t)}
              className="w-full text-left rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2 mb-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-green-500/10 transition"
            >
              ⚡ {t.label}
            </button>
          ))}
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3 mt-4">Conditions</h2>
          {NODE_TEMPLATES.conditions.map((t) => (
            <button
              key={t.label}
              onClick={() => addNode(t)}
              className="w-full text-left rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 mb-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-yellow-500/10 transition"
            >
              🔀 {t.label}
            </button>
          ))}
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3 mt-4">Actions</h2>
          {NODE_TEMPLATES.actions.map((t) => (
            <button
              key={t.label}
              onClick={() => addNode(t)}
              className="w-full text-left rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2 mb-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-blue-500/10 transition"
            >
              ▶️ {t.label}
            </button>
          ))}
        </GlassCard>

        {/* Canvas */}
        <div className="col-span-2">
          <GlassCard tier="subtle" padding="md" className="h-full overflow-y-auto">
            {nodes.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                Add nodes from the palette to build your automation flow
              </div>
            ) : (
              <div className="space-y-2">
                {nodes.map((node, idx) => (
                  <div key={node.id}>
                    {idx > 0 && (
                      <div className="flex justify-center py-1">
                        <div className="w-px h-6 bg-gray-400/30" />
                      </div>
                    )}
                    <button
                      onClick={() => setSelectedNode(node.id)}
                      className={`w-full text-left rounded-lg border-2 px-4 py-3 transition ${NODE_COLORS[node.type]} ${
                        selectedNode === node.id ? 'ring-2 ring-[var(--accent-from,#3b82f6)]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {NODE_ICONS[node.type]} {node.label}
                        </span>
                        <Badge variant="outline">{node.type}</Badge>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Properties Panel */}
        <GlassCard tier="medium" padding="md">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Properties</h2>
          {selectedNode ? (() => {
            const node = nodes.find((n) => n.id === selectedNode);
            if (!node) return null;
            return (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
                  <Badge variant={node.type === 'trigger' ? 'success' : node.type === 'condition' ? 'warning' : 'primary'}>
                    {node.type}
                  </Badge>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Label</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{node.label}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Config</label>
                  <pre className="text-xs bg-black/20 rounded p-2 text-gray-300 overflow-auto">
                    {JSON.stringify(node.config, null, 2)}
                  </pre>
                </div>
                <button
                  onClick={() => removeNode(node.id)}
                  className="w-full rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition"
                >
                  Remove Node
                </button>
              </div>
            );
          })() : (
            <p className="text-sm text-gray-400">Select a node to view properties</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
