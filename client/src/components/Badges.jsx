import { PRIORITY_COLORS, STATUS_COLORS, STATUS_LABELS, CATEGORY_LABELS, formatSLA } from '../utils';

export function PriorityBadge({ priority }) {
  if (!priority) return null;
  return (
    <span className={`badge ${PRIORITY_COLORS[priority] || 'bg-gray-100 text-gray-600'}`}>
      {priority}
    </span>
  );
}

export function StatusBadge({ status }) {
  if (!status) return null;
  return (
    <span className={`badge ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function CategoryBadge({ category }) {
  if (!category) return null;
  return (
    <span className="badge bg-slate-100 text-slate-700">
      {CATEGORY_LABELS[category] || category}
    </span>
  );
}

export function AgingBadge() {
  return <span className="badge bg-amber-100 text-amber-800">⏳ AGING</span>;
}

export function EscalatedBadge({ level }) {
  return (
    <span className="badge bg-red-100 text-red-800">
      🚨 ESCALATED L{level}
    </span>
  );
}

export function SLAIndicator({ slaDeadline, status }) {
  if (['RESOLVED', 'CLOSED'].includes(status)) {
    return <span className="text-xs text-green-600">✅ Resolved</span>;
  }
  const { label, color } = formatSLA(slaDeadline);
  return <span className={`text-xs ${color}`}>{label}</span>;
}

export function ReportCountBadge({ count }) {
  if (!count || count < 2) return null;
  return (
    <span className="badge bg-purple-100 text-purple-800">
      👥 {count} reports
    </span>
  );
}
