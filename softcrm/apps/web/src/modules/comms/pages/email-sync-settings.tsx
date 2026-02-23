import { useState } from 'react';
import {
  useEmailSyncs,
  useDisconnectEmailSync,
  useGmailAuthUrl,
  useOutlookAuthUrl,
} from '../api.js';
import type { EmailSyncConfig } from '../api.js';

/* ───────── Status helpers ───────── */

const STATUS_STYLES: Record<EmailSyncConfig['status'], string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  ERROR: 'bg-red-100 text-red-800',
  DISCONNECTED: 'bg-gray-100 text-gray-600',
};

function formatSyncDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString();
}

/* ───────── Component ───────── */

export default function EmailSyncSettingsPage() {
  const [fetchGmailUrl, setFetchGmailUrl] = useState(false);
  const [fetchOutlookUrl, setFetchOutlookUrl] = useState(false);

  const { data: syncs, isLoading, isError, error } = useEmailSyncs();
  const disconnect = useDisconnectEmailSync();

  const { data: gmailAuth, isFetching: gmailFetching } =
    useGmailAuthUrl(fetchGmailUrl);
  const { data: outlookAuth, isFetching: outlookFetching } =
    useOutlookAuthUrl(fetchOutlookUrl);

  /* ───────── Connect handlers ───────── */

  const handleConnectGmail = () => {
    if (gmailAuth?.url) {
      window.open(gmailAuth.url, '_blank', 'noopener');
    } else {
      setFetchGmailUrl(true);
    }
  };

  const handleConnectOutlook = () => {
    if (outlookAuth?.url) {
      window.open(outlookAuth.url, '_blank', 'noopener');
    } else {
      setFetchOutlookUrl(true);
    }
  };

  // Open URL once fetched
  if (fetchGmailUrl && gmailAuth?.url) {
    window.open(gmailAuth.url, '_blank', 'noopener');
    setFetchGmailUrl(false);
  }
  if (fetchOutlookUrl && outlookAuth?.url) {
    window.open(outlookAuth.url, '_blank', 'noopener');
    setFetchOutlookUrl(false);
  }

  const handleDisconnect = (syncId: string) => {
    if (window.confirm('Disconnect this email sync?')) {
      disconnect.mutate({ syncId });
    }
  };

  /* ───────── Render ───────── */

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Email Sync Settings
      </h1>

      {/* Connect buttons */}
      <div className="mb-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleConnectGmail}
          disabled={gmailFetching}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <span className="text-lg">📧</span>
          {gmailFetching ? 'Loading…' : 'Connect Gmail'}
        </button>

        <button
          type="button"
          onClick={handleConnectOutlook}
          disabled={outlookFetching}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <span className="text-lg">📨</span>
          {outlookFetching ? 'Loading…' : 'Connect Outlook'}
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load sync configs: {(error as Error).message}
        </div>
      )}

      {/* Syncs list */}
      {!isLoading && !isError && (
        <>
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            Connected Accounts
          </h2>

          {(!syncs || syncs.length === 0) ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-12 text-gray-400">
              <span className="mb-2 text-4xl">🔗</span>
              <p className="text-sm">
                No email accounts connected. Use the buttons above to connect.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {syncs.map((sync) => (
                <div
                  key={sync.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">
                      {sync.provider === 'GMAIL' ? '📧' : '📨'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {sync.provider}
                      </p>
                      <p className="text-xs text-gray-500">
                        Last synced: {formatSyncDate(sync.lastSyncAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[sync.status]}`}
                    >
                      {sync.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDisconnect(sync.id)}
                      disabled={disconnect.isPending}
                      className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
