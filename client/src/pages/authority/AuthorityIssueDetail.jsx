import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { issueService, departmentService } from '../../services';
import { PriorityBadge, StatusBadge, CategoryBadge, AgingBadge, EscalatedBadge, SLAIndicator, ReportCountBadge } from '../../components/Badges';
import { PageLoading, ErrorAlert } from '../../components/UI';
import { CATEGORY_LABELS, timeAgo } from '../../utils';

const STATUS_OPTIONS = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REWORK_REQUIRED'];

export default function AuthorityIssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [issue, setIssue] = useState(null);
  const [reports, setReports] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [resolutionDesc, setResolutionDesc] = useState('');
  const [resolutionFile, setResolutionFile] = useState(null);
  const [resolutionPreview, setResolutionPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    try {
      const [issueRes, deptRes] = await Promise.all([
        issueService.getById(id),
        departmentService.getAll(),
      ]);
      setIssue(issueRes.data.issue);
      setReports(issueRes.data.reports || []);
      setDepartments(deptRes.data.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleAssign() {
    if (!selectedDept) { toast.error('Select a department'); return; }
    setSubmitting(true);
    try {
      await issueService.assign(id, { departmentId: selectedDept });
      toast.success('Issue assigned to department');
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  }

  async function handleStatusUpdate() {
    if (!selectedStatus) { toast.error('Select a status'); return; }
    setSubmitting(true);
    try {
      await issueService.updateStatus(id, selectedStatus);
      toast.success(`Status updated to ${selectedStatus}`);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  }

  async function handleResolutionSubmit() {
    if (!resolutionDesc && !resolutionFile) {
      toast.error('Please provide resolution image or description');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (resolutionDesc) fd.append('resolutionDescription', resolutionDesc);
      if (resolutionFile) fd.append('image', resolutionFile);
      await issueService.submitResolution(id, fd);
      toast.success('✅ Resolution submitted. Awaiting citizen verification.');
      load();
      setResolutionDesc(''); setResolutionFile(null); setResolutionPreview(null);
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  }

  if (loading) return <PageLoading />;
  if (error) return <div className="space-y-4"><ErrorAlert message={error} /><button onClick={() => navigate(-1)} className="btn-secondary">Go Back</button></div>;
  if (!issue) return null;

  const canAssign = ['OPEN', 'ASSIGNED'].includes(issue.status);
  const canUpdateStatus = !['RESOLVED', 'CLOSED'].includes(issue.status);
  const canSubmitResolution = ['ASSIGNED', 'IN_PROGRESS', 'REWORK_REQUIRED'].includes(issue.status);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <button onClick={() => navigate(-1)} className="text-sm text-blue-700 hover:underline">← Back to Issues</button>

      {/* Header */}
      <div className={`card p-5 ${issue.isEscalated ? 'border-l-4 border-red-500' : issue.isAging ? 'border-l-4 border-amber-400' : ''}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-blue-800">{issue.ticketId}</h1>
              <CategoryBadge category={issue.category} />
              {issue.isEscalated && <EscalatedBadge level={issue.escalationLevel} />}
              {issue.isAging && !issue.isEscalated && <AgingBadge />}
            </div>
            <h2 className="font-semibold text-gray-900">{issue.title}</h2>
            <p className="text-sm text-gray-500">{issue.locationText} ({issue.latitude?.toFixed(4)}, {issue.longitude?.toFixed(4)})</p>
          </div>
          <div className="text-right space-y-1">
            <div><PriorityBadge priority={issue.priority} /></div>
            <div><StatusBadge status={issue.status} /></div>
            <ReportCountBadge count={issue.reportCount} />
          </div>
        </div>
        <p className="text-sm text-gray-700 mt-3">{issue.description}</p>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div><span className="text-gray-500">Priority Score</span><div className="font-bold text-lg">{issue.priorityScore}/100</div></div>
          <div><span className="text-gray-500">SLA</span><div><SLAIndicator slaDeadline={issue.slaDeadline} status={issue.status} /></div></div>
          <div><span className="text-gray-500">Reporter</span><div>{issue.reportedBy?.name || '—'}</div></div>
          <div><span className="text-gray-500">Reported</span><div>{timeAgo(issue.createdAt)}</div></div>
        </div>
      </div>

      {/* AI Classification */}
      {issue.aiCategory && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 text-sm mb-1">🤖 AI Classification</h3>
          <div className="flex gap-6 text-sm">
            <div><span className="text-gray-500">AI Category: </span><span className="font-medium">{CATEGORY_LABELS[issue.aiCategory]}</span></div>
            <div><span className="text-gray-500">Confidence: </span><span className="font-medium">{Math.round((issue.aiConfidence || 0) * 100)}%</span></div>
          </div>
        </div>
      )}

      {/* Original image */}
      {issue.imageUrl && (
        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 mb-2">📸 Issue Image</h3>
          <img src={issue.imageUrl} alt="Issue" className="w-full max-h-64 object-cover rounded" />
        </div>
      )}

      {/* Linked citizen reports */}
      {reports.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 mb-2">👥 {reports.length} Additional Citizen Report{reports.length > 1 ? 's' : ''}</h3>
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r._id} className="flex items-start justify-between text-sm border-b border-gray-50 pb-2">
                <div>
                  <span className="font-medium text-gray-700">{r.reportedBy?.name}</span>
                  <span className="text-gray-400 ml-2 text-xs">{r.description?.slice(0, 80)}</span>
                  <div className="text-xs text-gray-400 mt-0.5">Similarity: {Math.round((r.similarityScore || 0) * 100)}%</div>
                </div>
                <span className="text-xs text-gray-400">{timeAgo(r.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ASSIGN */}
      {canAssign && (
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-gray-800">🏢 Assign Department</h3>
          <div className="flex gap-3">
            <select className="form-select flex-1" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
              <option value="">Select department...</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.name} (SLA: {d.slaHours}h)</option>)}
            </select>
            <button onClick={handleAssign} disabled={submitting} className="btn-primary px-6">
              {submitting ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </div>
      )}

      {/* STATUS UPDATE */}
      {canUpdateStatus && (
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-gray-800">🔄 Update Status</h3>
          <div className="flex gap-3">
            <select className="form-select flex-1" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
              <option value="">Select status...</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <button onClick={handleStatusUpdate} disabled={submitting} className="btn-primary px-6">Update</button>
          </div>
        </div>
      )}

      {/* RESOLUTION SUBMISSION */}
      {canSubmitResolution && (
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-gray-800">✅ Submit Resolution Proof</h3>
          {issue.citizenVerificationStatus === 'REJECTED' && issue.verificationComment && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-red-800 text-sm font-medium">❌ Previous resolution was rejected</p>
              <p className="text-red-700 text-sm mt-1">Citizen's reason: {issue.verificationComment}</p>
            </div>
          )}
          <div>
            <label className="form-label">Resolution Description</label>
            <textarea rows={3} className="form-input resize-none" placeholder="Describe what was done to fix the issue..."
              value={resolutionDesc} onChange={e => setResolutionDesc(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Resolution Photo (Before/After)</label>
            {resolutionPreview ? (
              <div className="space-y-2">
                <img src={resolutionPreview} alt="Resolution" className="w-full h-48 object-cover rounded border" />
                <button type="button" onClick={() => { setResolutionFile(null); setResolutionPreview(null); fileRef.current.value = ''; }}
                  className="text-xs text-red-600 hover:underline">Remove photo</button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center cursor-pointer hover:border-blue-400"
                onClick={() => fileRef.current?.click()}>
                <p className="text-sm text-gray-500">📸 Upload resolution photo</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => {
                const f = e.target.files[0];
                if (f) { setResolutionFile(f); setResolutionPreview(URL.createObjectURL(f)); }
              }} />
          </div>
          <button onClick={handleResolutionSubmit} disabled={submitting} className="btn-success w-full py-3">
            {submitting ? 'Submitting...' : 'Submit Resolution for Citizen Verification'}
          </button>
        </div>
      )}

      {/* Awaiting verification notice */}
      {issue.status === 'CITIZEN_VERIFICATION' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-orange-800 font-medium">⏳ Awaiting citizen verification</p>
          <p className="text-sm text-orange-700 mt-1">The original reporter has been notified to verify your resolution.</p>
          {issue.resolutionDescription && (
            <p className="text-sm text-gray-700 mt-2"><span className="font-medium">Resolution submitted:</span> {issue.resolutionDescription}</p>
          )}
        </div>
      )}

      {/* Resolved */}
      {issue.status === 'RESOLVED' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">✅ Issue RESOLVED</p>
          {issue.resolvedAt && <p className="text-xs text-green-600 mt-1">Resolved: {new Date(issue.resolvedAt).toLocaleString()}</p>}
        </div>
      )}
    </div>
  );
}
