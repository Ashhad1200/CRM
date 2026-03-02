import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GlassCard, GlassPanel, Badge } from '@softcrm/ui';
import { apiClient } from '../../../lib/api-client.js';

interface ChatSession {
  id: string;
  visitorName?: string;
  visitorEmail?: string;
  status: string;
  startedAt: string;
  messages: Array<{ content: string; createdAt: string }>;
}

interface ChatMessage {
  id: string;
  senderType: string;
  content: string;
  createdAt: string;
}

function useActiveSessions() {
  return useQuery({
    queryKey: ['chat', 'sessions'],
    queryFn: () =>
      apiClient<{ data: ChatSession[] }>('/api/v1/support/chat/sessions').then((r) => r.data),
    refetchInterval: 5000,
  });
}

function useSessionMessages(sessionId: string | null) {
  return useQuery({
    queryKey: ['chat', 'messages', sessionId],
    queryFn: () =>
      apiClient<{ data: ChatMessage[] }>(
        `/api/v1/support/chat/sessions/${sessionId}/messages`,
      ).then((r) => r.data),
    enabled: !!sessionId,
    refetchInterval: 3000,
  });
}

export default function ChatAgentPage() {
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const qc = useQueryClient();

  const { data: sessions = [] } = useActiveSessions();
  const { data: messages = [] } = useSessionMessages(activeSession);

  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      apiClient(`/api/v1/support/chat/sessions/${activeSession}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderType: 'agent', content }),
      }),
    onSuccess: () => {
      setMessage('');
      qc.invalidateQueries({ queryKey: ['chat', 'messages', activeSession] });
    },
  });

  const closeSession = useMutation({
    mutationFn: (sessionId: string) =>
      apiClient(`/api/v1/support/chat/sessions/${sessionId}/close`, {
        method: 'POST',
      }),
    onSuccess: () => {
      setActiveSession(null);
      qc.invalidateQueries({ queryKey: ['chat', 'sessions'] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Live Chat</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage real-time customer conversations
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Session List */}
        <GlassCard tier="medium" padding="none" className="overflow-y-auto">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Sessions ({sessions.length})
            </h2>
          </div>
          <div className="divide-y divide-white/10">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setActiveSession(session.id)}
                className={`w-full text-left px-4 py-3 transition hover:bg-white/5 ${
                  activeSession === session.id ? 'bg-white/10' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {session.visitorName ?? 'Visitor'}
                  </span>
                  <Badge variant={session.status === 'WAITING' ? 'warning' : 'success'}>
                    {session.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {session.messages[0]?.content ?? 'No messages'}
                </p>
              </button>
            ))}
            {sessions.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No active sessions</div>
            )}
          </div>
        </GlassCard>

        {/* Chat Panel */}
        <div className="col-span-2 flex flex-col">
          <GlassCard tier="subtle" padding="none" className="flex-1 flex flex-col">
            {activeSession ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {sessions.find((s) => s.id === activeSession)?.visitorName ?? 'Visitor'}
                  </span>
                  <button
                    onClick={() => closeSession.mutate(activeSession)}
                    className="text-xs text-red-500 hover:text-red-400 transition"
                  >
                    Close Session
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderType === 'agent' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                          msg.senderType === 'agent'
                            ? 'bg-gradient-to-r from-[var(--accent-from,#3b82f6)] to-[var(--accent-to,#6366f1)] text-white'
                            : 'bg-white/10 text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input */}
                <div className="border-t border-white/10 p-3">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (message.trim()) sendMessage.mutate(message.trim());
                    }}
                    className="flex gap-2"
                  >
                    <input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-from,#3b82f6)]"
                    />
                    <button
                      type="submit"
                      disabled={!message.trim() || sendMessage.isPending}
                      className="rounded-lg bg-gradient-to-r from-[var(--accent-from,#3b82f6)] to-[var(--accent-to,#6366f1)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                Select a session to start chatting
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
