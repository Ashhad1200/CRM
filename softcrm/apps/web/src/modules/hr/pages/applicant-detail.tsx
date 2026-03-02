import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  useApplicant,
  useUpdateApplicant,
  useUpdateApplicantStatus,
} from '../api';
import type { ApplicantStatus } from '../api';

const APPLICANT_STATUS_COLORS: Record<ApplicantStatus, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  SCREENING: 'bg-purple-100 text-purple-700',
  INTERVIEW: 'bg-yellow-100 text-yellow-700',
  OFFER: 'bg-orange-100 text-orange-700',
  HIRED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const STATUS_FLOW: ApplicantStatus[] = [
  'NEW',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'HIRED',
];

export default function ApplicantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: applicant, isLoading, isError, error } = useApplicant(id ?? '');
  const updateApplicant = useUpdateApplicant();
  const updateApplicantStatus = useUpdateApplicantStatus();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [rating, setRating] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  useEffect(() => {
    if (applicant) {
      setFirstName(applicant.firstName);
      setLastName(applicant.lastName);
      setEmail(applicant.email);
      setPhone(applicant.phone ?? '');
      setRating(applicant.rating);
      setNotes(applicant.notes ?? '');
    }
  }, [applicant]);

  if (!id) return <p className="p-6 text-gray-400">Applicant not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!applicant) return <p className="p-6 text-gray-400">Applicant not found.</p>;

  const handleSave = () => {
    updateApplicant.mutate({
      id,
      version: applicant.version,
      firstName,
      lastName,
      email,
      phone: phone || undefined,
      rating,
      notes: notes || undefined,
    });
  };

  const handleStatusChange = (newStatus: ApplicantStatus) => {
    updateApplicantStatus.mutate({
      id,
      status: newStatus,
      notes: statusNotes || undefined,
    });
    setStatusNotes('');
  };

  const statusColors = APPLICANT_STATUS_COLORS[applicant.status] ?? APPLICANT_STATUS_COLORS['NEW'];
  const currentStatusIndex = STATUS_FLOW.indexOf(applicant.status);

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/hr/recruitment')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Recruitment
        </button>
        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-medium text-gray-600">
          {applicant.firstName[0]}{applicant.lastName[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {applicant.firstName} {applicant.lastName}
          </h1>
          <p className="text-sm text-gray-500">
            Applied for: {applicant.jobPosting?.title ?? 'Unknown Position'}
          </p>
        </div>
        <span className={`inline-block rounded px-2 py-0.5 text-xs ${statusColors}`}>
          {applicant.status}
        </span>
      </div>

      {/* Status Pipeline */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Hiring Pipeline</h3>
        <div className="flex items-center gap-2">
          {STATUS_FLOW.map((status, index) => {
            const isPast = index < currentStatusIndex;
            const isCurrent = index === currentStatusIndex;
            const isNext = index === currentStatusIndex + 1;

            return (
              <div key={status} className="flex items-center">
                <button
                  onClick={() => isNext && handleStatusChange(status)}
                  disabled={!isNext && !isCurrent}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : isPast
                      ? 'bg-green-100 text-green-700'
                      : isNext
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                      : 'bg-gray-50 text-gray-400'
                  }`}
                >
                  {status}
                </button>
                {index < STATUS_FLOW.length - 1 && (
                  <div className={`mx-2 h-0.5 w-8 ${
                    index < currentStatusIndex ? 'bg-green-400' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
          {applicant.status !== 'REJECTED' && applicant.status !== 'HIRED' && (
            <button
              onClick={() => handleStatusChange('REJECTED')}
              className="ml-4 rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Reject
            </button>
          )}
        </div>
      </div>

      {/* Status Change Notes */}
      {(currentStatusIndex < STATUS_FLOW.length - 1 || applicant.status !== 'HIRED') && (
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Status Change Notes (optional)
          </label>
          <input
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
            placeholder="Add notes for the next status change..."
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Details Form */}
        <div className="col-span-2 rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Applicant Details</h3>

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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Rating (1-5)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRating(r)}
                    className={`h-10 w-10 rounded ${
                      rating !== undefined && r <= rating
                        ? 'bg-yellow-400 text-white'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={updateApplicant.isPending}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {updateApplicant.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>

            {updateApplicant.isError && (
              <p className="text-sm text-red-600">
                {updateApplicant.error.message}
              </p>
            )}
            {updateApplicant.isSuccess && (
              <p className="text-sm text-green-600">Applicant updated.</p>
            )}
          </div>
        </div>

        {/* Right Column - Info */}
        <div className="space-y-4">
          {/* Application Info */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Application Info</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Position</dt>
                <dd className="font-medium text-gray-900">
                  {applicant.jobPosting?.title ?? 'Unknown'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Applied</dt>
                <dd className="text-gray-900">
                  {new Date(applicant.appliedAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd>
                  <span className={`inline-block rounded px-2 py-0.5 text-xs ${statusColors}`}>
                    {applicant.status}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Documents */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Documents</h3>
            {applicant.resumeUrl ? (
              <a
                href={applicant.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded bg-gray-100 px-3 py-2 text-sm text-blue-600 hover:bg-gray-200"
              >
                <span>Resume</span>
                <span className="text-gray-400">View</span>
              </a>
            ) : (
              <p className="text-sm text-gray-400">No resume uploaded</p>
            )}
          </div>

          {/* Cover Letter */}
          {applicant.coverLetter && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Cover Letter</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {applicant.coverLetter}
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Quick Actions</h3>
            <div className="space-y-2">
              <a
                href={`mailto:${applicant.email}`}
                className="block rounded bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
              >
                Send Email
              </a>
              {applicant.phone && (
                <a
                  href={`tel:${applicant.phone}`}
                  className="block rounded bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
                >
                  Call
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
