import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  useCampaign,
  useCreateCampaign,
  useUpdateCampaign,
  useScheduleCampaign,
  useSendCampaign,
  useSegments,
} from '../api.js';

export default function CampaignBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id && id !== 'new';

  const { data: existingData } = useCampaign(isEdit ? id : '');
  const { data: segmentsData } = useSegments({ limit: 100 });
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign(isEdit ? id : '');
  const scheduleCampaign = useScheduleCampaign(isEdit ? id : '');
  const sendCampaign = useSendCampaign(isEdit ? id : '');

  const [name, setName] = useState('');
  const [type, setType] = useState('EMAIL');
  const [segmentId, setSegmentId] = useState('');
  const [subjectA, setSubjectA] = useState('');
  const [subjectB, setSubjectB] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [contactIdsInput, setContactIdsInput] = useState('');

  const existing = existingData?.data;

  useEffect(() => {
    if (existing) {
      setName(existing.name ?? '');
      setType(existing.type ?? 'EMAIL');
      setSegmentId(existing.segmentId ?? '');
      setSubjectA(existing.subjectA ?? '');
      setSubjectB(existing.subjectB ?? '');
      setBodyHtml(existing.bodyHtml ?? '');
      setScheduledAt(existing.scheduledAt ?? '');
    }
  }, [existing]);

  const segments = segmentsData?.data ?? [];

  function handleSaveDraft() {
    const payload = {
      name,
      type,
      segmentId: segmentId || undefined,
      subjectA,
      subjectB: subjectB || undefined,
      bodyHtml,
      scheduledAt: scheduledAt || undefined,
    };

    if (isEdit) {
      updateCampaign.mutate(payload, {
        onSuccess: () => navigate(`/marketing/campaigns/${id}`),
      });
    } else {
      createCampaign.mutate(payload, {
        onSuccess: (res) => navigate(`/marketing/campaigns/${res.data.id}`),
      });
    }
  }

  function handleSchedule() {
    if (!isEdit || !scheduledAt) return;
    scheduleCampaign.mutate({ sendAt: scheduledAt }, {
      onSuccess: () => navigate(`/marketing/campaigns/${id}`),
    });
  }

  function handleSendNow() {
    if (!isEdit) return;
    const contactIds = contactIdsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (contactIds.length === 0) return;
    sendCampaign.mutate({ contactIds }, {
      onSuccess: () => navigate(`/marketing/campaigns/${id}`),
    });
  }

  const isSaving = createCampaign.isPending || updateCampaign.isPending;
  const mutError = createCampaign.error || updateCampaign.error || scheduleCampaign.error || sendCampaign.error;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {isEdit ? 'Edit Campaign' : 'New Campaign'}
      </h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Campaign name"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
            <option value="SOCIAL">Social</option>
            <option value="EVENT">Event</option>
          </select>
        </div>

        {/* Segment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Segment</label>
          <select
            value={segmentId}
            onChange={(e) => setSegmentId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">No segment</option>
            {segments.map((seg) => (
              <option key={seg.id} value={seg.id}>
                {seg.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subject A */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject A</label>
          <input
            type="text"
            value={subjectA}
            onChange={(e) => setSubjectA(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Primary email subject"
          />
        </div>

        {/* Subject B (A/B) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject B <span className="text-gray-400">(optional, A/B test)</span>
          </label>
          <input
            type="text"
            value={subjectB}
            onChange={(e) => setSubjectB(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Alternate subject line"
          />
        </div>

        {/* Body HTML */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Body HTML</label>
          <textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={8}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="<html>...</html>"
          />
        </div>

        {/* Scheduled At */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled At</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        {/* Error */}
        {mutError && (
          <p className="text-sm text-red-600">Error: {(mutError as Error).message}</p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleSaveDraft}
            disabled={isSaving || !name.trim() || !subjectA.trim() || !bodyHtml.trim()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>

          {isEdit && (
            <>
              <button
                onClick={handleSchedule}
                disabled={scheduleCampaign.isPending || !scheduledAt}
                className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
              >
                {scheduleCampaign.isPending ? 'Scheduling...' : 'Schedule'}
              </button>
            </>
          )}

          <button
            onClick={() => navigate('/marketing/campaigns')}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>

        {/* Send Now section (edit only) */}
        {isEdit && (
          <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Send Now</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact IDs <span className="text-gray-400">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={contactIdsInput}
                onChange={(e) => setContactIdsInput(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="id1, id2, id3"
              />
            </div>
            <button
              onClick={handleSendNow}
              disabled={sendCampaign.isPending || !contactIdsInput.trim()}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {sendCampaign.isPending ? 'Sending...' : 'Send Now'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
