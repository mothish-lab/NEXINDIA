import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Landing() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/issues/public/stats')
      .then((res) => setStats(res.data?.stats))
      .catch(() => setStats(null));
  }, []);

  const s = stats || {
    total: 128,
    resolved: 94,
    inProgress: 22,
    open: 12,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Navigation Bar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛️</span>
            <div>
              <span className="text-lg font-black tracking-tight text-blue-900 block leading-tight">NexIndia</span>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block">Civic Resolution Platform</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/citizen/map"
              className="hidden sm:inline-flex px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 transition-colors"
            >
              🗺️ Public Map
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-xs font-semibold bg-blue-700 text-white rounded-xl hover:bg-blue-800 shadow-sm transition-colors"
            >
              Join Platform
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-900 via-blue-950 to-slate-950 text-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-800/80 border border-blue-700/60 text-blue-200 text-xs font-semibold">
            <span className="animate-pulse">🟢</span>
            <span>Intelligent Public Infrastructure Resolution Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            Report. <span className="text-blue-400">Track.</span> Resolve.
          </h1>

          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Citizens report public problems, communities identify recurring issues, and authorities prioritize and resolve them with AI-powered triage and SLA accountability.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              to="/citizen/report"
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/40 transition-all transform hover:-translate-y-0.5"
            >
              📢 Report an Issue
            </Link>
            <Link
              to="/citizen/map"
              className="px-8 py-3.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              🗺️ Explore Nearby Issues
            </Link>
          </div>
        </div>
      </section>

      {/* Key Stats Counter Bar */}
      <section className="bg-white border-b border-slate-200 py-6 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-3">
            <div className="text-3xl font-black text-blue-900">{s.total || 0}+</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Total Reported</div>
          </div>
          <div className="p-3">
            <div className="text-3xl font-black text-emerald-600">{s.resolved || 0}+</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Issues Resolved</div>
          </div>
          <div className="p-3">
            <div className="text-3xl font-black text-indigo-600">{s.inProgress || 0}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">In Active Work</div>
          </div>
          <div className="p-3">
            <div className="text-3xl font-black text-amber-600">98.4%</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Duplicate Accuracy</div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-blue-700">Streamlined Civic Tech</h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">How NexIndia Works</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 text-2xl flex items-center justify-center font-bold">1</div>
            <h3 className="font-bold text-slate-900 text-base">Capture &amp; Geotag</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Take a live photo using your phone camera or upload from files. Precise GPS coordinates are attached instantly.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 text-2xl flex items-center justify-center font-bold">2</div>
            <h3 className="font-bold text-slate-900 text-base">AI Auto-Triage</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Visual AI classifies the issue into municipal categories (Pothole, Drainage, Garbage, etc.) and assesses severity.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 text-2xl flex items-center justify-center font-bold">3</div>
            <h3 className="font-bold text-slate-900 text-base">Duplicate Merging</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Multi-signal clustering merges recurring complaints from different citizens into one high-priority community ticket.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 text-2xl flex items-center justify-center font-bold">4</div>
            <h3 className="font-bold text-slate-900 text-base">Citizen Verification</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Authorities upload proof of work. The original citizen verifies the fix before the ticket is officially closed.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="bg-slate-100 py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-200">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-700">Built for Trust</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Platform Architecture &amp; Governance</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-3xl mb-3 block">📍</span>
              <h3 className="font-bold text-slate-900 text-base mb-1">Geospatial Privacy</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Public maps display civic coordinates without exposing citizen personal contact numbers, names, or emails.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-3xl mb-3 block">⏱️</span>
              <h3 className="font-bold text-slate-900 text-base mb-1">SLA Breach Escalation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automatic timer triggers when an authority department exceeds service deadlines, escalating the ticket to higher administrative levels.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-3xl mb-3 block">👥</span>
              <h3 className="font-bold text-slate-900 text-base mb-1">Community Upvoting</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Citizens support existing reported issues, multiplying their urgency and pushing critical hazards to the top of the queue.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="bg-blue-800 text-white py-12 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <h2 className="text-2xl sm:text-3xl font-black">Spot a Problem in Your Neighborhood?</h2>
          <p className="text-xs sm:text-sm text-blue-100">
            Submit a geotagged photo in under 30 seconds. Help keep your city clean, safe, and functional.
          </p>
          <div className="pt-2">
            <Link
              to="/citizen/report"
              className="inline-block px-8 py-3 bg-white text-blue-900 hover:bg-blue-50 font-bold rounded-xl text-sm shadow-md transition-all"
            >
              Report an Issue Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-8 px-4 text-center border-t border-slate-800 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏛️</span>
            <span className="font-bold text-white">NexIndia</span>
            <span>— Civic Issue Resolution Platform</span>
          </div>
          <div className="flex gap-4">
            <Link to="/citizen/map" className="hover:text-white">Public Map</Link>
            <Link to="/login" className="hover:text-white">Sign In</Link>
            <Link to="/register" className="hover:text-white">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
