import { useNavigate } from 'react-router';
import { useTickets } from '../../api.js';

const statusColor: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  WAITING_ON_CUSTOMER: 'bg-purple-100 text-purple-800',
  ESCALATED: 'bg-orange-100 text-orange-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-700',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function PortalTicketList() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useTickets();

  const tickets = data?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">My Tickets</h1>
        <button
          type="button"
          onClick={() => void navigate('/portal/tickets/new')}
          className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Submit New Ticket
        </button>
      </div>

      <div className="rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
        {isLoading && (
          <div className="p-8 text-center text-gray-500 text-sm">Loading tickets…</div>
        )}

        {isError && (
          <div className="p-8 text-center text-red-600 text-sm">
            Failed to load tickets. Please try again later.
          </div>
        )}

        {!isLoading && !isError && tickets.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">
            You haven't submitted any tickets yet.
          </div>
        )}

        {!isLoading && tickets.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => void navigate(`/portal/tickets/${t.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-gray-600">{t.ticketNumber}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{t.subject}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor[t.status] ?? 'bg-gray-100 text-gray-700'}`}
                    >
                      {t.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
