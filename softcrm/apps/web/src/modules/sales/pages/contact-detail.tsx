import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useContact, useUpdateContact } from '../api';
import { Timeline } from '../../comms/pages/timeline';

const STAGE_COLORS: Record<string, string> = {
  SUBSCRIBER: 'bg-gray-100 text-gray-700',
  LEAD: 'bg-blue-100 text-blue-700',
  MQL: 'bg-indigo-100 text-indigo-700',
  SQL: 'bg-purple-100 text-purple-700',
  OPPORTUNITY: 'bg-yellow-100 text-yellow-700',
  CUSTOMER: 'bg-green-100 text-green-700',
  EVANGELIST: 'bg-emerald-100 text-emerald-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

const LIFECYCLE_STAGES = [
  'SUBSCRIBER',
  'LEAD',
  'MQL',
  'SQL',
  'OPPORTUNITY',
  'CUSTOMER',
  'EVANGELIST',
  'OTHER',
] as const;

type Tab = 'details' | 'deals' | 'timeline';

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contact, isLoading, isError, error } = useContact(id ?? '');
  const updateContact = useUpdateContact();

  const [tab, setTab] = useState<Tab>('details');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emails, setEmails] = useState('');
  const [phones, setPhones] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [lifecycleStage, setLifecycleStage] = useState('SUBSCRIBER');
  const [source, setSource] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (contact) {
      setFirstName(contact.firstName);
      setLastName(contact.lastName);
      setEmails(contact.emails.join(', '));
      setPhones(contact.phones.join(', '));
      setCompany(contact.company ?? '');
      setJobTitle(contact.jobTitle ?? '');
      setLifecycleStage(contact.lifecycleStage);
      setSource(contact.source ?? '');
      setTags(contact.tags.join(', '));
    }
  }, [contact]);

  if (!id) return <p className="p-6 text-gray-400">Contact not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading…</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!contact) return <p className="p-6 text-gray-400">Contact not found.</p>;

  const handleSave = () => {
    updateContact.mutate({
      id,
      version: contact.version,
      firstName,
      lastName,
      emails: emails
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      phones: phones
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      company: company || undefined,
      jobTitle: jobTitle || undefined,
      lifecycleStage,
      source: source || undefined,
      tags: tags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  const stageColors =
    STAGE_COLORS[contact.lifecycleStage] ?? STAGE_COLORS['OTHER'];

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t ${
      tab === t
        ? 'bg-white text-blue-600 border border-b-0 border-gray-200'
        : 'text-gray-500 hover:text-gray-700'
    }`;

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/sales/contacts')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Contacts
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {contact.firstName} {contact.lastName}
        </h1>
        <span className={`inline-block rounded px-2 py-0.5 text-xs ${stageColors}`}>
          {contact.lifecycleStage}
        </span>
      </div>

      {/* Sub-header info */}
      <div className="mb-6 flex gap-6 text-sm text-gray-600">
        {contact.company && <span>🏢 {contact.company}</span>}
        {contact.emails[0] && <span>✉ {contact.emails[0]}</span>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 bg-gray-50 px-2 pt-2">
        <button onClick={() => setTab('details')} className={tabClass('details')}>
          Details
        </button>
        <button onClick={() => setTab('deals')} className={tabClass('deals')}>
          Deals
        </button>
        <button onClick={() => setTab('timeline')} className={tabClass('timeline')}>
          Timeline
        </button>
      </div>

      <div className="rounded-b border border-t-0 border-gray-200 bg-white p-4">
        {/* Details tab */}
        {tab === 'details' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Emails (comma-separated)
              </label>
              <input
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Phones (comma-separated)
              </label>
              <input
                value={phones}
                onChange={(e) => setPhones(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Company
                </label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Job Title
                </label>
                <input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Lifecycle Stage
                </label>
                <select
                  value={lifecycleStage}
                  onChange={(e) => setLifecycleStage(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {LIFECYCLE_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Source
                </label>
                <input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tags (comma-separated)
              </label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={updateContact.isPending}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {updateContact.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>

            {updateContact.isError && (
              <p className="text-sm text-red-600">
                {updateContact.error.message}
              </p>
            )}
            {updateContact.isSuccess && (
              <p className="text-sm text-green-600">Contact updated.</p>
            )}
          </div>
        )}

        {/* Deals tab placeholder */}
        {tab === 'deals' && (
          <p className="py-8 text-center text-gray-400">
            Deals associated with this contact will appear here.
          </p>
        )}

        {/* Timeline */}
        {tab === 'timeline' && id && (
          <Timeline contactId={id} />
        )}
      </div>
    </div>
  );
}
