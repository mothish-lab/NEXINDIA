/**
 * Utility functions shared across the frontend.
 */

export const CATEGORY_LABELS = {
  POTHOLE: 'Pothole',
  GARBAGE: 'Garbage',
  STREETLIGHT: 'Streetlight',
  WATER_LEAK: 'Water Leak',
  WATER_LOGGING: 'Water Logging',
  ROAD_DAMAGE: 'Road Damage',
  DRAINAGE: 'Drainage',
  OTHER: 'Other',
};

export const STATUS_LABELS = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLUTION_SUBMITTED: 'Resolution Submitted',
  CITIZEN_VERIFICATION: 'Awaiting Verification',
  RESOLVED: 'Resolved',
  REWORK_REQUIRED: 'Rework Required',
  CLOSED: 'Closed',
};

export const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

export const STATUS_COLORS = {
  OPEN: 'bg-blue-100 text-blue-800',
  ASSIGNED: 'bg-purple-100 text-purple-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  RESOLUTION_SUBMITTED: 'bg-cyan-100 text-cyan-800',
  CITIZEN_VERIFICATION: 'bg-orange-100 text-orange-800',
  RESOLVED: 'bg-green-100 text-green-800',
  REWORK_REQUIRED: 'bg-red-100 text-red-800',
  CLOSED: 'bg-gray-100 text-gray-700',
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

/**
 * Format a date relative to now (e.g. "2 hours ago").
 */
export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  return `${diffD}d ago`;
}

/**
 * Format SLA remaining time.
 */
export function formatSLA(slaDeadline) {
  if (!slaDeadline) return { label: 'No SLA', color: 'text-gray-500' };
  const now = new Date();
  const deadline = new Date(slaDeadline);
  const diffMs = deadline - now;
  const diffH = diffMs / (1000 * 60 * 60);

  if (diffMs < 0) {
    return { label: `Overdue ${Math.abs(Math.round(diffH))}h`, color: 'text-red-600 font-semibold' };
  }
  if (diffH < 2) {
    return { label: `${Math.round(diffH * 60)}m left`, color: 'text-orange-600 font-semibold' };
  }
  if (diffH < 8) {
    return { label: `${Math.round(diffH)}h left`, color: 'text-yellow-600' };
  }
  return { label: `${Math.round(diffH)}h left`, color: 'text-gray-600' };
}

/**
 * Get color class for map marker based on issue status.
 */
export function getMarkerColor(issue) {
  if (issue.isEscalated) return '#dc2626'; // red
  if (issue.isAging) return '#ea580c'; // orange
  if (issue.status === 'RESOLVED') return '#16a34a'; // green
  if (issue.status === 'IN_PROGRESS') return '#2563eb'; // blue
  return '#6b7280'; // gray
}
