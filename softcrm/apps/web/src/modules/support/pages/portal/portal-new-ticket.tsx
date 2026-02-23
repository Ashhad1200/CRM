import { useNavigate } from 'react-router';
import { useState, type FormEvent } from 'react';
import { useCreateTicket } from '../../api.js';

const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export default function PortalNewTicket() {
  const navigate = useNavigate();
  const createTicket = useCreateTicket();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('MEDIUM');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    createTicket.mutate(
      { subject: subject.trim(), description: description.trim(), priority },
      { onSuccess: () => void navigate('/portal/tickets') },
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Submit New Ticket</h1>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg bg-white shadow-sm border border-gray-200 p-6 space-y-5"
      >
        {/* Subject */}
        <div>
          <label htmlFor="ticket-subject" className="block text-sm font-medium text-gray-700 mb-1">
            Subject
          </label>
          <input
            id="ticket-subject"
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of your issue"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="ticket-desc" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="ticket-desc"
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your issue in detail…"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y"
          />
        </div>

        {/* Priority */}
        <div>
          <label htmlFor="ticket-priority" className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            id="ticket-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            {priorities.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => void navigate('/portal/tickets')}
            className="border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!subject.trim() || createTicket.isPending}
            className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createTicket.isPending ? 'Submitting…' : 'Submit Ticket'}
          </button>
        </div>

        {createTicket.isError && (
          <p className="text-sm text-red-600">
            Something went wrong. Please try again.
          </p>
        )}
      </form>
    </div>
  );
}
