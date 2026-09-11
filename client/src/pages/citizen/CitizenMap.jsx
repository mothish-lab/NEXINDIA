import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import IssueMap from '../../components/IssueMap';
import { PageLoading } from '../../components/UI';
import { PriorityBadge, StatusBadge, CategoryBadge, ReportCountBadge } from '../../components/Badges';
import { CATEGORY_OPTIONS, timeAgo } from '../../utils';

const DISTANCE_OPTIONS = [
  { label: '1 km', value: 1000 },
  { label: '3 km', value: 3000 },
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
  { label: '25 km', value: 25000 },
];

const STATUS_FILTERS = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'];

export default function CitizenMap() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState([28.6139, 77.2090]); // Default New Delhi
  const [hasLocation, setHasLocation] = useState(false);

  const [category, setCategory] = useState('ALL');
  const [distance, setDistance] = useState(5000);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const loc = [p.coords.latitude, p.coords.longitude];
          setUserLocation(loc);
          setHasLocation(true);
          fetchNearbyIssues(loc[0], loc[1], distance, category);
        },
        () => {
          fetchNearbyIssues(userLocation[0], userLocation[1], distance, category);
        }
      );
    } else {
      fetchNearbyIssues(userLocation[0], userLocation[1], distance, category);
    }
  }, []);

  async function fetchNearbyIssues(lat, lon, rad, cat) {
    setLoading(true);
    try {
      const params = {
        lat,
        lon,
        radius: rad,
        limit: 100,
      };
      if (cat && cat !== 'ALL') params.category = cat;

      const res = await api.get('/issues/public/nearby', { params });
      setIssues(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch nearby issues:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleDistanceChange(newDist) {
    setDistance(newDist);
    fetchNearbyIssues(userLocation[0], userLocation[1], newDist, category);
  }

  function handleCategoryChange(newCat) {
    setCategory(newCat);
    fetchNearbyIssues(userLocation[0], userLocation[1], distance, newCat);
  }

  const filteredIssues = issues.filter((i) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'OPEN') return i.status === 'OPEN';
    if (statusFilter === 'IN_PROGRESS') return ['IN_PROGRESS', 'ASSIGNED'].includes(i.status);
    if (statusFilter === 'RESOLVED') return i.status === 'RESOLVED';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>🗺️</span>
            <span>Nearby Civic Issues</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time public transparency map within your neighborhood (privacy-conscious)
          </p>
        </div>

        {/* View Switch */}
        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === 'map' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'
            }`}
          >
            🗺️ Map View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'
            }`}
          >
            📋 List View ({filteredIssues.length})
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Category:</span>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Categories</option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Distance Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Radius:</span>
            <div className="flex gap-1">
              {DISTANCE_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => handleDistanceChange(d.value)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                    distance === d.value
                      ? 'bg-blue-700 text-white border-blue-700 font-semibold shadow-xs'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Status:</span>
            <div className="flex gap-1">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                    statusFilter === s
                      ? 'bg-gray-800 text-white border-gray-800 font-medium'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <PageLoading />
      ) : viewMode === 'map' ? (
        <div className="space-y-2">
          <IssueMap issues={filteredIssues} userLocation={userLocation} height="520px" />
          <div className="flex justify-between items-center text-xs text-gray-500 px-1">
            <span>Showing {filteredIssues.length} issues within {(distance / 1000).toFixed(0)} km</span>
            <span>Click any marker to inspect community ticket details</span>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
          {filteredIssues.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <span className="text-3xl">🌿</span>
              <p className="font-semibold text-gray-600">No issues reported in this area</p>
              <p className="text-xs">Try extending the radius or changing the category filter.</p>
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div key={issue._id} className="p-4 hover:bg-gray-50/80 transition-colors flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-blue-800">#{issue.ticketId}</span>
                    <CategoryBadge category={issue.category} />
                    <PriorityBadge priority={issue.priority} />
                    <StatusBadge status={issue.status} />
                    {issue.reportCount > 1 && <ReportCountBadge count={issue.reportCount} />}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{issue.title}</h3>
                  <p className="text-xs text-gray-500 truncate">{issue.locationText || 'Approximate area'}</p>
                </div>
                <div className="text-right text-xs text-gray-400 shrink-0">
                  <span>{timeAgo(issue.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
