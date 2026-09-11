import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { CATEGORY_LABELS, STATUS_LABELS } from '../utils';
import { PriorityBadge, StatusBadge } from './Badges';

// Fix Leaflet default marker icon issue with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const MARKER_COLORS = {
  escalated: '#dc2626',
  aging: '#ea580c',
  resolved: '#16a34a',
  in_progress: '#2563eb',
  open: '#6b7280',
  default: '#6b7280',
};

function getMarkerHtml(issue) {
  let color = MARKER_COLORS.open;
  if (issue.isEscalated) color = MARKER_COLORS.escalated;
  else if (issue.isAging) color = MARKER_COLORS.aging;
  else if (issue.status === 'RESOLVED') color = MARKER_COLORS.resolved;
  else if (issue.status === 'IN_PROGRESS') color = MARKER_COLORS.in_progress;

  return `<div style="
    background-color: ${color};
    width: 16px; height: 16px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2px solid white;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  "></div>`;
}

function createIssueIcon(issue) {
  return L.divIcon({
    html: getMarkerHtml(issue),
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 16],
    popupAnchor: [0, -16],
  });
}

function LocationMarker({ onLocationFound }) {
  const map = useMap();
  useEffect(() => {
    map.locate({ setView: false });
    map.on('locationfound', (e) => {
      onLocationFound?.(e.latlng);
    });
  }, [map, onLocationFound]);
  return null;
}

/**
 * Issue Map Component — displays issues as colored markers on OpenStreetMap.
 */
export default function IssueMap({ issues = [], center, userLocation, onMarkerClick, height = '400px' }) {
  const defaultCenter = center || userLocation || [28.6139, 77.2090]; // Default: New Delhi

  return (
    <div style={{ height }} className="rounded-lg overflow-hidden border border-gray-200">
      <MapContainer center={defaultCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={L.divIcon({
              html: `<div style="background:#1d4ed8;width:12px;height:12px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px #93c5fd;"></div>`,
              className: '',
              iconSize: [12, 12],
              iconAnchor: [6, 6],
            })}
          >
            <Popup><strong>You are here</strong></Popup>
          </Marker>
        )}

        {/* Issue markers */}
        {issues.map((issue) => (
          <Marker
            key={issue._id}
            position={[issue.latitude, issue.longitude]}
            icon={createIssueIcon(issue)}
            eventHandlers={{ click: () => onMarkerClick?.(issue) }}
          >
            <Popup>
              <div className="min-w-40 text-sm">
                <div className="font-semibold text-blue-800">{issue.ticketId}</div>
                <div className="text-gray-600 text-xs mt-0.5">{CATEGORY_LABELS[issue.category]}</div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  <PriorityBadge priority={issue.priority} />
                  <StatusBadge status={issue.status} />
                </div>
                {issue.reportCount > 1 && (
                  <div className="text-xs text-purple-700 mt-1">👥 {issue.reportCount} reports</div>
                )}
                {issue.isEscalated && (
                  <div className="text-xs text-red-700 mt-1">🚨 Escalated</div>
                )}
                {issue.isAging && !issue.isEscalated && (
                  <div className="text-xs text-orange-700 mt-1">⏳ Aging</div>
                )}
                {issue.department?.name && (
                  <div className="text-xs text-gray-500 mt-1">🏢 {issue.department.name}</div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export { LocationMarker };
