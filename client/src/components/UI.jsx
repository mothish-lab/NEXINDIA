export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizes[size]} animate-spin rounded-full border-2 border-gray-300 border-t-blue-700`} />
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-64">
      <LoadingSpinner size="lg" />
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">📋</div>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorAlert({ message }) {
  if (!message) return null;
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
      ⚠️ {message}
    </div>
  );
}

export function SuccessAlert({ message }) {
  if (!message) return null;
  return (
    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
      ✅ {message}
    </div>
  );
}

export function StatsCard({ title, value, subtitle, color = 'blue', icon }) {
  const colors = {
    blue: 'text-blue-700 bg-blue-50',
    red: 'text-red-700 bg-red-50',
    green: 'text-green-700 bg-green-50',
    yellow: 'text-yellow-700 bg-yellow-50',
    orange: 'text-orange-700 bg-orange-50',
    gray: 'text-gray-700 bg-gray-50',
    purple: 'text-purple-700 bg-purple-50',
  };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${colors[color].split(' ')[0]}`}>{value ?? '—'}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`text-2xl p-2 rounded-lg ${colors[color]}`}>{icon}</div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
        <p className="text-gray-600 text-sm mt-2">{message}</p>
        <div className="flex gap-3 mt-4 justify-end">
          <button onClick={onCancel} className="btn-secondary">{`Cancel`}</button>
          <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
