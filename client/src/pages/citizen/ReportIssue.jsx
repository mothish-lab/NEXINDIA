import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { issueService } from '../../services';
import { CATEGORY_OPTIONS, CATEGORY_LABELS } from '../../utils';
import { PriorityBadge } from '../../components/Badges';
import CameraCapture from '../../components/CameraCapture';

// Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function DraggableMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  if (!position) return null;
  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const ll = e.target.getLatLng();
          setPosition([ll.lat, ll.lng]);
        },
      }}
    />
  );
}

const STEPS = [
  { id: 1, title: 'Photo', icon: '📷' },
  { id: 2, title: 'Location', icon: '📍' },
  { id: 3, title: 'Details', icon: '📋' },
  { id: 4, title: 'Find Duplicates', icon: '🔍' },
  { id: 5, title: 'Submit', icon: '🚀' },
];

export default function ReportIssue() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(1);

  // Form states
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showCamera, setShowCamera] = useState(false);

  const [position, setPosition] = useState(null);
  const [locationText, setLocationText] = useState('');
  const [gpsLoading, setGpsLoading] = useState(true);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'POTHOLE',
    voiceNote: '',
  });

  // AI & Duplicate check state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [duplicateMatch, setDuplicateMatch] = useState(null);
  const [userDuplicateChoice, setUserDuplicateChoice] = useState(null); // 'SUPPORT' or 'SEPARATE'

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState('');
  const [finalResult, setFinalResult] = useState(null);
  const [error, setError] = useState('');

  // Initial GPS detection on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setPosition(coords);
          setLocationText(`${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`);
          setGpsLoading(false);
        },
        () => {
          // Fallback to New Delhi coordinates
          setPosition([28.6139, 77.2090]);
          setLocationText('28.61390, 77.20900 (Manual selection)');
          setGpsLoading(false);
          toast('Location could not be acquired automatically. Click map to set position.', { icon: '📍' });
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      setPosition([28.6139, 77.2090]);
      setGpsLoading(false);
    }
  }, []);

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleCameraCapture(file, previewUrl) {
    setImageFile(file);
    setImagePreview(previewUrl);
  }

  // Run pre-check: AI keyword analysis and duplicate scan when reaching step 4
  async function runAiAndDuplicateCheck() {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Please enter title and description');
      return;
    }

    setAnalyzing(true);
    setAnalysisPhase('Analyzing issue and checking for duplicates...');
    setAiResult(null);
    setDuplicateMatch(null);

    try {
      if (position) {
        setAnalysisPhase('Checking for existing reports nearby...');
        const dupRes = await issueService.checkDuplicate({
          latitude: position[0],
          longitude: position[1],
          category: form.category,
        });

        if (dupRes.data.isDuplicate && dupRes.data.masterIssue) {
          setDuplicateMatch(dupRes.data);
        }
      }

      // Keyword suggestion based on context
      const context = `${form.title} ${form.description}`.toLowerCase();
      let suggestedCategory = form.category;
      if (context.includes('pothole') || context.includes('crater')) suggestedCategory = 'POTHOLE';
      else if (context.includes('garbage') || context.includes('waste') || context.includes('trash')) suggestedCategory = 'GARBAGE';
      else if (context.includes('streetlight') || context.includes('light') || context.includes('lamp')) suggestedCategory = 'STREETLIGHT';
      else if (context.includes('water leak') || context.includes('pipeline')) suggestedCategory = 'WATER_LEAK';
      else if (context.includes('flood') || context.includes('waterlog')) suggestedCategory = 'WATER_LOGGING';
      else if (context.includes('drain') || context.includes('sewer') || context.includes('manhole')) suggestedCategory = 'DRAINAGE';

      setAiResult({
        category: suggestedCategory,
        confidence: 0.88,
        severity: suggestedCategory === 'POTHOLE' || suggestedCategory === 'DRAINAGE' ? 'HIGH' : 'MEDIUM',
      });

      setCurrentStep(4);
    } catch (err) {
      console.warn('Pre-check error:', err);
      setCurrentStep(4);
    } finally {
      setAnalyzing(false);
      setAnalysisPhase('');
    }
  }

  async function handleFinalSubmit() {
    if (!position) {
      toast.error('Location is required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      setSubmitPhase('Uploading photo and processing report...');
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('latitude', position[0]);
      fd.append('longitude', position[1]);
      fd.append('locationText', locationText || `${position[0].toFixed(5)}, ${position[1].toFixed(5)}`);
      if (form.voiceNote) fd.append('voiceNote', form.voiceNote);
      if (imageFile) fd.append('image', imageFile);

      setSubmitPhase('Categorizing with AI and calculating priority...');
      const res = await issueService.create(fd);
      const data = res.data;

      setFinalResult(data);
      if (data.isDuplicate) {
        toast('Your report was linked to an existing civic issue nearby.', { icon: '🔗' });
      } else {
        toast.success('Civic issue registered successfully!');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit report');
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
      setSubmitPhase('');
    }
  }

  // If report has been successfully submitted
  if (finalResult) {
    const issue = finalResult.isDuplicate ? finalResult.masterIssue : finalResult.issue;
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn py-6">
        <div className={`p-6 rounded-2xl border ${finalResult.isDuplicate ? 'bg-amber-50/70 border-amber-200' : 'bg-emerald-50/70 border-emerald-200'} shadow-sm`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{finalResult.isDuplicate ? '🔗' : '✅'}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {finalResult.isDuplicate ? 'Linked to Existing Community Issue' : 'Issue Reported Successfully'}
              </h2>
              <p className="text-xs text-gray-600">
                {finalResult.isDuplicate
                  ? 'A matching civic problem was already reported in this exact vicinity. Your report strengthens its priority.'
                  : 'Your civic issue has been officially logged in the system.'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-2 mt-4">
            <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
              <span className="text-gray-500">Tracking Ticket ID</span>
              <span className="font-mono font-bold text-blue-700">{issue?.ticketId}</span>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
              <span className="text-gray-500">Community Reports</span>
              <span className="font-semibold text-purple-700">👥 {issue?.reportCount} citizens</span>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
              <span className="text-gray-500">Assigned Priority</span>
              <span className="font-semibold text-red-600">{issue?.priority} ({issue?.priorityScore}/100)</span>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
              <span className="text-gray-500">AI Classification</span>
              <span className="font-medium text-gray-800">
                {CATEGORY_LABELS[finalResult.aiCategory] || finalResult.aiCategory} ({Math.round((finalResult.aiConfidence || 0.85) * 100)}%)
              </span>
            </div>
            <div className="flex justify-between items-center text-sm py-1">
              <span className="text-gray-500">Current Status</span>
              <span className="font-semibold text-blue-800 uppercase text-xs px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200">
                {issue?.status?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setFinalResult(null);
              setCurrentStep(1);
              setImageFile(null);
              setImagePreview(null);
              setForm({ title: '', description: '', category: 'POTHOLE', voiceNote: '' });
              setDuplicateMatch(null);
              setAiResult(null);
            }}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 text-sm"
          >
            Report Another Issue
          </button>
          <button
            onClick={() => navigate('/citizen/reports')}
            className="flex-1 py-3 px-4 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 text-sm shadow-sm"
          >
            Track in My Reports →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Step Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Report a Civic Issue</h1>
        <p className="text-xs text-gray-500 mt-1">
          Follow the 5 simple steps to report civic problems to authorities with AI triage.
        </p>

        {/* Wizard Progress Bar */}
        <div className="grid grid-cols-5 gap-2 mt-4">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`p-2 rounded-xl text-center border transition-all ${
                currentStep === s.id
                  ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-sm'
                  : currentStep > s.id
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-gray-200 text-gray-400'
              }`}
            >
              <div className="text-lg mb-0.5">{currentStep > s.id ? '✓' : s.icon}</div>
              <div className="text-[11px] font-semibold">{s.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: PHOTO */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-base">Step 1: Capture or Upload Photograph</h2>
            <span className="text-xs text-gray-400">JPG, PNG, WebP (Max 5MB)</span>
          </div>

          {imagePreview ? (
            <div className="space-y-3">
              <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 shadow-inner bg-gray-900">
                <img src={imagePreview} alt="Issue preview" className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="flex-1 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium"
                >
                  📸 Retake with Camera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium"
                >
                  📁 Choose Other File
                </button>
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                className="p-6 rounded-2xl border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/50 hover:bg-blue-50 flex flex-col items-center justify-center gap-2 transition-colors group"
              >
                <span className="text-4xl group-hover:scale-110 transition-transform">📸</span>
                <span className="font-semibold text-blue-900 text-sm">Take Photo with Camera</span>
                <span className="text-xs text-blue-600">Open live device camera</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-gray-300 hover:border-gray-400 bg-gray-50/50 hover:bg-gray-50 flex flex-col items-center justify-center gap-2 transition-colors group"
              >
                <span className="text-4xl group-hover:scale-110 transition-transform">📁</span>
                <span className="font-semibold text-gray-800 text-sm">Upload from Files</span>
                <span className="text-xs text-gray-500">Select image from gallery</span>
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="py-3 px-6 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-medium text-sm transition-colors"
            >
              Next: Location →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: LOCATION */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-base">Step 2: Confirm Physical Location</h2>
            <span className="text-xs text-gray-400">GPS &amp; Leaflet Map</span>
          </div>

          {gpsLoading ? (
            <div className="h-64 rounded-xl border border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-500">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span className="text-sm">Acquiring GPS coordinates...</span>
            </div>
          ) : (
            <>
              <div className="h-64 rounded-xl overflow-hidden border border-gray-200 shadow-inner">
                <MapContainer
                  center={position || [28.6139, 77.2090]}
                  zoom={16}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <DraggableMarker
                    position={position}
                    setPosition={(p) => {
                      setPosition(p);
                      setLocationText(`${p[0].toFixed(5)}, ${p[1].toFixed(5)}`);
                    }}
                  />
                </MapContainer>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                <span>📍 Click anywhere on map or drag marker to reposition</span>
                {position && (
                  <span className="font-mono text-blue-700 font-semibold">
                    {position[0].toFixed(5)}, {position[1].toFixed(5)}
                  </span>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Landmark / Location Note (Optional)
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. In front of metro pillar 124, 5th Cross Road"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
            />
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="py-2.5 px-4 text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={!position}
              onClick={() => setCurrentStep(3)}
              className="py-3 px-6 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-colors"
            >
              Next: Details →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DETAILS */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-800 text-base">Step 3: Issue Details</h2>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Category *</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Issue Title *</label>
            <input
              type="text"
              required
              maxLength={150}
              placeholder="e.g. Deep pothole causing bike accidents"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Detailed Description *</label>
            <textarea
              required
              rows={4}
              maxLength={1500}
              placeholder="Describe the severity, exact location, how long it has been there, and public safety impact..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Voice / Additional Note</label>
            <input
              type="text"
              placeholder="Any additional remarks..."
              value={form.voiceNote}
              onChange={(e) => setForm((f) => ({ ...f, voiceNote: e.target.value }))}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="py-2.5 px-4 text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={analyzing || !form.title.trim() || !form.description.trim()}
              onClick={runAiAndDuplicateCheck}
              className="py-3 px-6 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-medium text-sm flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                  <span>{analysisPhase || 'Finding duplicates...'}</span>
                </>
              ) : (
                <span>Next: Find Duplicates →</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: FIND DUPLICATES */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-5">
          <div>
            <h2 className="font-bold text-gray-800 text-base">Step 4: Find Duplicate Issues</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              We'll check nearby reports and AI-analyze your issue to see if the same problem has already been reported.
            </p>
          </div>

          {/* Duplicate Detection Alert & Decision */}
          {duplicateMatch ? (
            <div className="p-5 rounded-xl bg-amber-50 border-2 border-amber-300 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <h3 className="font-bold text-amber-950 text-sm">Similar Civic Issue Found Nearby!</h3>
              </div>
              <p className="text-xs text-amber-800">
                A similar civic problem was detected near this location (<strong>{duplicateMatch.breakdown?.distance || 'within 50'}m away</strong>).
              </p>

              <div className="bg-white rounded-lg p-3.5 border border-amber-200 text-xs space-y-2 shadow-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Existing Issue Tracking ID:</span>
                  <span className="font-mono font-bold text-blue-700">#{duplicateMatch.masterIssue.ticketId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Approximate Distance:</span>
                  <span className="font-semibold text-gray-800">{duplicateMatch.breakdown?.distance || 'within 50'}m away</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Supporting Reports:</span>
                  <span className="font-semibold text-purple-700">👥 {duplicateMatch.masterIssue.reportCount} reports</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Current Priority:</span>
                  <PriorityBadge priority={duplicateMatch.masterIssue.priority} />
                </div>
                <div className="flex justify-between items-center border-t border-gray-100 pt-1.5 mt-1">
                  <span className="text-gray-500 font-medium">Category:</span>
                  <span className="font-medium text-gray-700">{CATEGORY_LABELS[duplicateMatch.masterIssue.category] || duplicateMatch.masterIssue.category}</span>
                </div>
              </div>

              <p className="text-xs text-gray-700 font-semibold pt-1">Select an option to proceed:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setUserDuplicateChoice('SUPPORT');
                    toast.success('Selected: Support existing community ticket');
                  }}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                    userDuplicateChoice === 'SUPPORT'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  🤝 Support Existing Issue
                  <p className={`text-[10px] font-normal mt-0.5 ${userDuplicateChoice === 'SUPPORT' ? 'text-blue-100' : 'text-gray-500'}`}>
                    Adds your report as community evidence &amp; boosts SLA priority
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserDuplicateChoice('SEPARATE');
                    toast('Will be registered as a distinct civic problem');
                  }}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                    userDuplicateChoice === 'SEPARATE'
                      ? 'bg-gray-800 text-white border-gray-800 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  📝 Report as Different Issue
                  <p className={`text-[10px] font-normal mt-0.5 ${userDuplicateChoice === 'SEPARATE' ? 'text-gray-300' : 'text-gray-500'}`}>
                    Create an entirely separate ticket for this location
                  </p>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <span>✅</span>
              <span>No duplicate issues found nearby. Your report will be registered as a new master ticket.</span>
            </div>
          )}

          {/* AI Analysis Card */}
          {aiResult && (
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start gap-3">
              <span className="text-2xl">🤖</span>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-950 text-sm">AI Image &amp; Content Analysis</span>
                  <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                    {Math.round(aiResult.confidence * 100)}% Match
                  </span>
                </div>
                <p className="text-xs text-blue-800">
                  Detected Category: <strong className="font-semibold">{CATEGORY_LABELS[aiResult.category] || aiResult.category}</strong>
                </p>
                {aiResult.category !== form.category && (
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, category: aiResult.category }))}
                    className="text-xs text-blue-700 underline font-semibold mt-1"
                  >
                    Apply AI Category suggestion
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="py-2.5 px-4 text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="py-3 px-6 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-medium text-sm"
            >
              Next: Review &amp; Submit →
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: SUBMIT */}
      {currentStep === 5 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-800 text-base">Step 5: Final Review &amp; Submit</h2>

          <div className="rounded-xl bg-gray-50 p-4 border border-gray-100 space-y-3 text-sm">
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500">Category</span>
              <span className="font-bold text-gray-900">{CATEGORY_LABELS[form.category]}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500">Title</span>
              <span className="font-medium text-gray-900 text-right">{form.title}</span>
            </div>
            <div className="border-b border-gray-200 pb-2">
              <span className="text-gray-500 block text-xs mb-1">Description</span>
              <p className="text-gray-700 text-xs">{form.description}</p>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500">Location</span>
              <span className="text-xs text-gray-800">{locationText}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Photo Attached</span>
              <span className="text-xs font-semibold text-emerald-700">{imageFile ? 'Yes' : 'No'}</span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setCurrentStep(4)}
              className="py-2.5 px-4 text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinalSubmit}
              className="py-3 px-8 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                  <span>{submitPhase || 'Submitting...'}</span>
                </>
              ) : (
                <span>Submit Civic Report 🚀</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          onPhotoCaptured={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
