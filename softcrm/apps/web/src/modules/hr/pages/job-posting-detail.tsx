import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  useJobPosting,
  useUpdateJobPosting,
  usePublishJobPosting,
  useCloseJobPosting,
  useApplicants,
  useDepartments,
  usePositions,
} from '../api';
import type { JobPostingStatus, ApplicantStatus, EmploymentType } from '../api';

const JOB_STATUS_COLORS: Record<JobPostingStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  OPEN: 'bg-green-100 text-green-700',
  CLOSED: 'bg-yellow-100 text-yellow-700',
  FILLED: 'bg-blue-100 text-blue-700',
};

const APPLICANT_STATUS_COLORS: Record<ApplicantStatus, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  SCREENING: 'bg-purple-100 text-purple-700',
  INTERVIEW: 'bg-yellow-100 text-yellow-700',
  OFFER: 'bg-orange-100 text-orange-700',
  HIRED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const EMPLOYMENT_TYPES: EmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];

type Tab = 'details' | 'applicants';

export default function JobPostingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: jobPosting, isLoading, isError, error } = useJobPosting(id ?? '');
  const { data: applicantsData } = useApplicants(id ? { jobPostingId: id } : undefined);
  const { data: departmentsData } = useDepartments();
  const { data: positionsData } = usePositions();

  const updateJobPosting = useUpdateJobPosting();
  const publishJobPosting = usePublishJobPosting();
  const closeJobPosting = useCloseJobPosting();

  const applicants = applicantsData?.data ?? [];
  const departments = departmentsData?.data ?? [];
  const positions = positionsData?.data ?? [];

  const [tab, setTab] = useState<Tab>('details');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('FULL_TIME');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');

  useEffect(() => {
    if (jobPosting) {
      setTitle(jobPosting.title);
      setDescription(jobPosting.description ?? '');
      setDepartmentId(jobPosting.departmentId ?? '');
      setPositionId(jobPosting.positionId ?? '');
      setLocation(jobPosting.location ?? '');
      setEmploymentType(jobPosting.employmentType);
      setSalaryMin(jobPosting.salaryMin ?? '');
      setSalaryMax(jobPosting.salaryMax ?? '');
    }
  }, [jobPosting]);

  if (!id) return <p className="p-6 text-gray-400">Job posting not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!jobPosting) return <p className="p-6 text-gray-400">Job posting not found.</p>;

  const handleSave = () => {
    updateJobPosting.mutate({
      id,
      version: jobPosting.version,
      title,
      description: description || undefined,
      departmentId: departmentId || undefined,
      positionId: positionId || undefined,
      location: location || undefined,
      employmentType,
      salaryMin: salaryMin || undefined,
      salaryMax: salaryMax || undefined,
    });
  };

  const statusColors = JOB_STATUS_COLORS[jobPosting.status] ?? JOB_STATUS_COLORS['DRAFT'];

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
          onClick={() => navigate('/hr/recruitment')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Recruitment
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{jobPosting.title}</h1>
        <span className={`inline-block rounded px-2 py-0.5 text-xs ${statusColors}`}>
          {jobPosting.status}
        </span>
      </div>

      {/* Actions */}
      <div className="mb-6 flex gap-2">
        {jobPosting.status === 'DRAFT' && (
          <button
            onClick={() => publishJobPosting.mutate(jobPosting.id)}
            disabled={publishJobPosting.isPending}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {publishJobPosting.isPending ? 'Publishing...' : 'Publish'}
          </button>
        )}
        {jobPosting.status === 'OPEN' && (
          <button
            onClick={() => closeJobPosting.mutate(jobPosting.id)}
            disabled={closeJobPosting.isPending}
            className="rounded bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
          >
            {closeJobPosting.isPending ? 'Closing...' : 'Close Posting'}
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="mb-6 flex gap-6 text-sm text-gray-600">
        {jobPosting.department && <span>Department: {jobPosting.department.name}</span>}
        {jobPosting.location && <span>Location: {jobPosting.location}</span>}
        <span>Type: {jobPosting.employmentType.replace('_', ' ')}</span>
        <span>Applicants: {applicants.length}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 bg-gray-50 px-2 pt-2">
        <button onClick={() => setTab('details')} className={tabClass('details')}>
          Details
        </button>
        <button onClick={() => setTab('applicants')} className={tabClass('applicants')}>
          Applicants ({applicants.length})
        </button>
      </div>

      <div className="rounded-b border border-t-0 border-gray-200 bg-white p-4">
        {/* Details tab */}
        {tab === 'details' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Department
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">No Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Position
                </label>
                <select
                  value={positionId}
                  onChange={(e) => setPositionId(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">No Position</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Employment Type
                </label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Min Salary
                </label>
                <input
                  type="number"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Max Salary
                </label>
                <input
                  type="number"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={updateJobPosting.isPending}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {updateJobPosting.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>

            {updateJobPosting.isError && (
              <p className="text-sm text-red-600">
                {updateJobPosting.error.message}
              </p>
            )}
            {updateJobPosting.isSuccess && (
              <p className="text-sm text-green-600">Job posting updated.</p>
            )}
          </div>
        )}

        {/* Applicants tab */}
        {tab === 'applicants' && (
          <div>
            {applicants.length === 0 ? (
              <p className="py-8 text-center text-gray-400">
                No applicants for this position yet.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Applied</th>
                    <th className="px-3 py-3">Rating</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {applicants.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => navigate(`/hr/recruitment/applicants/${a.id}`)}
                      className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-3 py-3 font-medium text-gray-900">
                        {a.firstName} {a.lastName}
                      </td>
                      <td className="px-3 py-3 text-gray-600">{a.email}</td>
                      <td className="px-3 py-3 text-gray-500">
                        {new Date(a.appliedAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {a.rating ? `${a.rating}/5` : '-'}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs ${
                            APPLICANT_STATUS_COLORS[a.status]
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
