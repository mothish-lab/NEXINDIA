import { useState, useEffect, useRef } from 'react';
import { notificationService } from '../services';
import { timeAgo } from '../utils';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await notificationService.getAll();
      setNotifications(res.data.data);
      setUnread(res.data.unreadCount);
    } catch {}
  }

  async function handleOpen() {
    setOpen(!open);
    if (!open && unread > 0) {
      await notificationService.markAllRead();
      setUnread(0);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={handleOpen} className="relative p-2 text-gray-600 hover:text-gray-900">
        <span className="text-xl">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            <button
              onClick={async () => { await notificationService.markAllRead(); setUnread(0); setOpen(false); }}
              className="text-xs text-blue-600 hover:underline"
            >
              Mark all read
            </button>
          </div>
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">No notifications</div>
          ) : (
            notifications.map((n) => (
              <div key={n._id} className={`px-4 py-3 border-b border-gray-50 ${!n.read ? 'bg-blue-50' : ''}`}>
                <p className="text-sm text-gray-800">{n.message}</p>
                <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
