import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Request OTP
  async function handleRequestOtp(e) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      toast.success(res.data.message || 'OTP sent! Please check your email or server log.');
      setStep(2);
    } catch (err) {
      toast.error(err.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify OTP
  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (!otp) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, otp });
      setResetToken(res.data.resetToken);
      toast.success('OTP verified successfully!');
      setStep(3);
    } catch (err) {
      toast.error(err.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Set new password
  async function handleResetPassword(e) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { resetToken, newPassword });
      toast.success(res.data.message || 'Password reset successfully! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-black text-blue-900 mb-2">
            <span>🏛️</span>
            <span>NexIndia</span>
          </Link>
          <h2 className="text-xl font-bold text-gray-900">
            {step === 1 && 'Reset Your Password'}
            {step === 2 && 'Enter Verification Code'}
            {step === 3 && 'Create New Password'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {step === 1 && 'Enter your registered email address to receive a secure OTP code.'}
            {step === 2 && `Enter the 6-digit code sent for ${email}`}
            {step === 3 && 'Choose a strong password with at least 8 characters.'}
          </p>
        </div>

        {/* Step 1 Form */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              {loading ? 'Sending OTP...' : 'Send Verification OTP'}
            </button>
          </form>
        )}

        {/* Step 2 Form */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">6-Digit OTP Code</label>
              <input
                type="text"
                required
                maxLength={6}
                className="w-full text-center tracking-widest font-mono text-2xl px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
              <p className="text-[11px] text-gray-400 mt-1 text-center">
                (For demo mode, check server logs if email provider is unconfigured)
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-blue-700 hover:underline"
              >
                Change Email
              </button>
            </div>
          </form>
        )}

        {/* Step 3 Form */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={8}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              {loading ? 'Updating Password...' : 'Reset Password & Login'}
            </button>
          </form>
        )}

        <div className="text-center text-xs text-gray-500 border-t border-gray-100 pt-4">
          Remember your password?{' '}
          <Link to="/login" className="text-blue-700 font-semibold hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
