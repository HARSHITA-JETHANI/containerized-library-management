// src/pages/Loans/IssueForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Save, X, BookOpen, User } from 'lucide-react';

export default function IssueForm() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [copies, setCopies] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedCopy, setSelectedCopy] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [memRes, copiesRes] = await Promise.all([
          api.get('/members'),
          api.get('/loans/available-copies'),
        ]);
        setMembers(memRes.data.filter((m) => m.active === 1));
        setCopies(copiesRes.data);
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load issue form data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMember) {
      setError('Please select a member');
      return;
    }
    if (!selectedCopy) {
      setError('Please select an available book copy');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post('/loans/issue', {
        member_id: parseInt(selectedMember, 10),
        copy_id: parseInt(selectedCopy, 10),
      });
      alert(`Book issued successfully! Due date: ${res.data.due_date}`);
      navigate('/loans');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to issue book');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-gray-600 p-4">Loading issue details…</p>;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="border-b pb-3">
        <h2 className="text-2xl font-semibold text-gray-800">Issue Book</h2>
        <p className="text-sm text-gray-500">Assign a physical copy to an active library member</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="member">
            Select Member <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              id="member"
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            >
              <option value="">-- Choose Active Member --</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.member_id}) - {m.department || 'General'}
                </option>
              ))}
            </select>
          </div>
          {members.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">No active members found. Register a member first.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="copy">
            Select Available Book Copy <span className="text-red-500">*</span>
          </label>
          <select
            id="copy"
            value={selectedCopy}
            onChange={(e) => setSelectedCopy(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          >
            <option value="">-- Choose Available Copy --</option>
            {copies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.book_title} (Copy #{c.copy_number})
              </option>
            ))}
          </select>
          {copies.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">No available book copies at this moment.</p>
          )}
        </div>

        <div className="bg-indigo-50 p-3 rounded-md text-xs text-indigo-700 space-y-1">
          <p className="font-semibold">Circulation Policy:</p>
          <p>• Due date is automatically computed based on system loan duration.</p>
          <p>• Members cannot exceed maximum concurrent book borrowing limits.</p>
        </div>

        <div className="flex space-x-3 pt-2">
          <button
            type="submit"
            disabled={submitting || copies.length === 0 || members.length === 0}
            className="flex items-center space-x-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
          >
            <Save size={16} />
            <span>{submitting ? 'Issuing...' : 'Confirm Issue'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/loans')}
            className="flex items-center space-x-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 text-sm font-medium"
          >
            <X size={16} />
            <span>Cancel</span>
          </button>
        </div>
      </form>
    </div>
  );
}
