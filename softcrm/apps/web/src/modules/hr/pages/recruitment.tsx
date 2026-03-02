import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  useJobPostings,
  useCreateJobPosting,
  usePublishJobPosting,
  useCloseJobPosting,
  useApplicants,
  useDepartments,
  usePositions,
} from '../api';
import type { JobPosting, Applicant, JobPostingStatus, ApplicantStatus, EmploymentType } from '../api';

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

type Tab = 'postings' | 'applicants';

function CreateJobPostingDialog({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('FULL_TIME');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');

  const createJobPosting = useCreateJobPosting();
  const { data: departmentsData } = useDepartments();
  const { data: positionsData } = usePositions();

  const departments = departmentsData?.data ?? [];
  const positions = positionsData?.data ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createJobPosting.mutate(
      {
        title,
        description: description || undefined,
        departmentId: departmentId || undefined,
        positionId: positionId || undefined,
        location: location || undefined,
        employmentType,
        salaryMin: salaryMin || undefined,
        salaryMax: salaryMax || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          New Job Posting
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Title *
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select Department</option>
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
              <option value="">Select Position</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Remote, New York"
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

        <div className="mb-4 grid grid-cols-2 gap-3">
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

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createJobPosting.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createJobPosting.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>

        {createJobPosting.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createJobPosting.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function RecruitmentPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('postings');
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [applicantStatusFilter, setApplicantStatusFilter] = useState<string>('');

  const jobFilters: Record<string, string> = {};
  if (statusFilter) jobFilters['status'] = statusFilter;

  const applicantFilters: Record<string, string> = {};
  if (applicantStatusFilter) applicantFilters['status'] = applicantStatusFilter;

  const { data: jobsData, isLoading: jobsLoading, isError: jobsError, error: jobsErrorObj } = useJobPostings(
    Object.keys(jobFilters).length > 0 ? jobFilters : undefined
  );
  const { data: applicantsData, isLoading: applicantsLoading } = useApplicants(
    Object.keys(applicantFilters).length > 0 ? applicantFilters : undefined
  );

  const publishJobPosting = usePublishJobPosting();
  const closeJobPosting = useCloseJobPosting();

  const jobPostings: JobPosting[] = jobsData?.data ?? [];
  const applicants: Applicant[] = applicantsData?.data ?? [];

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium ${
      tab === t
        ? 'border-b-2 border-blue-600 text-blue-600'
        : 'text-gray-500 hover:text-gray-700'
    }`;

  const formatSalary = (min?: string, max?: string) => {
    if (min && max) {
      return `$${parseFloat(min).toLocaleString()} - $${parseFloat(max).toLocaleString()}`;
    }
    if (min) return `From $${parseFloat(min).toLocaleString()}`;
    if (max) return `Up to $${parseFloat(max).toLocaleString()}`;
    return '-';
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Recruitment</h1>
        {tab === 'postings' && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Job Posting
          </button>
        )}
      </div>

      {showCreate && (
        <CreateJobPostingDialog onClose={() => setShowCreate(false)} />
      )}

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Open Positions</p>
          <p className="text-2xl font-bold text-green-600">
            {jobPostings.filter((j) => j.status === 'OPEN').length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Applicants</p>
          <p className="text-2xl font-bold text-blue-600">{applicants.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">In Interview</p>
          <p className="text-2xl font-bold text-yellow-600">
            {applicants.filter((a) => a.status === 'INTERVIEW').length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Hired</p>
          <p className="text-2xl font-bold text-emerald-600">
            {applicants.filter((a) => a.status === 'HIRED').length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b border-gray-200">
        <button onClick={() => setTab('postings')} className={tabClass('postings')}>
          Job Postings
        </button>
        <button onClick={() => setTab('applicants')} className={tabClass('applicants')}>
          Applicants
        </button>
      </div>

      {/* Job Postings Tab */}
      {tab === 'postings' && (
        <>
          <div className="mb-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
              <option value="FILLED">Filled</option>
            </select>
          </div>

          {jobsLoading && <p className="text-gray-500">Loading...</p>}
          {jobsError && <p className="text-red-600">{jobsErrorObj.message}</p>}

          {jobsData && (
            <div className="grid gap-4">
              {jobPostings.length === 0 ? (
                <p className="py-8 text-center text-gray-400">No job postings found.</p>
              ) : (
                jobPostings.map((job) => (
                  <div
                    key={job.id}
                    className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/hr/recruitment/postings/${job.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {job.title}
                          </h3>
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-xs ${
                              JOB_STATUS_COLORS[job.status]
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          {job.department?.name ?? 'No Department'} | {job.location ?? 'Location TBD'} |{' '}
                          {job.employmentType.replace('_', ' ')}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          Salary: {formatSalary(job.salaryMin, job.salaryMax)}
                        </p>
                      </div>
                      <div className="text-right" onClick={(e) => e.stopPropagation()}>
                        <p className="text-sm text-gray-500">
                          {job.applicantCount ?? 0} applicants
                        </p>
                        <div className="mt-2 flex gap-2 justify-end">
                          {job.status === 'DRAFT' && (
                            <button
                              onClick={() => publishJobPosting.mutate(job.id)}
                              disabled={publishJobPosting.isPending}
                              className="text-sm text-green-600 hover:text-green-700"
                            >
                              Publish
                            </button>
                          )}
                          {job.status === 'OPEN' && (
                            <button
                              onClick={() => closeJobPosting.mutate(job.id)}
                              disabled={closeJobPosting.isPending}
                              className="text-sm text-yellow-600 hover:text-yellow-700"
                            >
                              Close
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Applicants Tab */}
      {tab === 'applicants' && (
        <>
          <div className="mb-4">
            <select
              value={applicantStatusFilter}
              onChange={(e) => setApplicantStatusFilter(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="SCREENING">Screening</option>
              <option value="INTERVIEW">Interview</option>
              <option value="OFFER">Offer</option>
              <option value="HIRED">Hired</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {applicantsLoading && <p className="text-gray-500">Loading...</p>}

          {applicantsData && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Position</th>
                  <th className="px-3 py-3">Applied</th>
                  <th className="px-3 py-3">Rating</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {applicants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-gray-400"
                    >
                      No applicants found.
                    </td>
                  </tr>
                ) : (
                  applicants.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => navigate(`/hr/recruitment/applicants/${a.id}`)}
                      className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-3 py-3 font-medium text-gray-900">
                        {a.firstName} {a.lastName}
                      </td>
                      <td className="px-3 py-3 text-gray-600">{a.email}</td>
                      <td className="px-3 py-3 text-gray-600">
                        {a.jobPosting?.title ?? '-'}
                      </td>
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
                  ))
                )}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
