// src/pages/Settings/Settings.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api';
import { Settings as SettingsIcon, Save, CheckCircle, AlertCircle } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    library_name: 'College Library',
    loan_duration_days: '14',
    max_books_per_member: '5',
    renewal_limit: '2',
    fine_per_day: '0.5',
    reservation_pickup_days: '3',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        const map = {};
        res.data.forEach((item) => {
          map[item.key] = item.value;
        });
        setSettings((prev) => ({ ...prev, ...map }));
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load system settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSuccessMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // Update each setting key
      const keys = Object.keys(settings);
      for (const k of keys) {
        await api.put(`/settings/${k}`, { value: String(settings[k]) });
      }
      setSuccessMsg('Settings saved successfully!');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-600 p-4">Loading system settings…</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border-b pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
            <SettingsIcon className="text-indigo-600" size={24} />
            <span>System Settings</span>
          </h2>
          <p className="text-sm text-gray-500">Configure loan policies, fine calculations, and circulation limits</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm flex items-center gap-2">
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="library_name">
            Library Name
          </label>
          <input
            id="library_name"
            type="text"
            value={settings.library_name}
            onChange={(e) => handleChange('library_name', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Displayed in headers, reports, and notices.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="loan_duration_days">
              Default Loan Duration (Days)
            </label>
            <input
              id="loan_duration_days"
              type="number"
              min="1"
              max="365"
              value={settings.loan_duration_days}
              onChange={(e) => handleChange('loan_duration_days', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Due date calculated from issue date.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="max_books_per_member">
              Max Books per Member
            </label>
            <input
              id="max_books_per_member"
              type="number"
              min="1"
              max="50"
              value={settings.max_books_per_member}
              onChange={(e) => handleChange('max_books_per_member', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Borrowing cap for active loans.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="renewal_limit">
              Max Renewals Allowed
            </label>
            <input
              id="renewal_limit"
              type="number"
              min="0"
              max="10"
              value={settings.renewal_limit}
              onChange={(e) => handleChange('renewal_limit', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Times a member can extend a loan.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="fine_per_day">
              Overdue Fine Rate ($/day)
            </label>
            <input
              id="fine_per_day"
              type="number"
              step="0.05"
              min="0"
              value={settings.fine_per_day}
              onChange={(e) => handleChange('fine_per_day', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Accumulated daily past the due date.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reservation_pickup_days">
            Reservation Pickup Window (Days)
          </label>
          <input
            id="reservation_pickup_days"
            type="number"
            min="1"
            max="30"
            value={settings.reservation_pickup_days}
            onChange={(e) => handleChange('reservation_pickup_days', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Days reserved copy is held before notifying next member.</p>
        </div>

        <div className="pt-3 border-t flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
          >
            <Save size={16} />
            <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
