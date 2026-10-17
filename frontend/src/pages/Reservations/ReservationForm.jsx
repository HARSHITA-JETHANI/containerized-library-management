// src/pages/Reservations/ReservationForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Save, X, Bookmark } from 'lucide-react';

export default function ReservationForm() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [booksRes, memRes] = await Promise.all([
          api.get('/books'),
          api.get('/members'),
        ]);
        setBooks(booksRes.data);
        setMembers(memRes.data.filter((m) => m.active === 1));
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load reservation data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBook) {
      setError('Please select a book');
      return;
    }
    if (!selectedMember) {
      setError('Please select a member');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.post('/reservations', {
        book_id: parseInt(selectedBook, 10),
        member_id: parseInt(selectedMember, 10),
      });
      navigate('/reservations');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create reservation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-gray-600 p-4">Loading reservation form…</p>;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="border-b pb-3">
        <h2 className="text-2xl font-semibold text-gray-800">Place Reservation</h2>
        <p className="text-sm text-gray-500">Add member to the waiting queue for a title</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="book">
            Select Book Title <span className="text-red-500">*</span>
          </label>
          <select
            id="book"
            value={selectedBook}
            onChange={(e) => setSelectedBook(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          >
            <option value="">-- Choose Book --</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} {b.isbn ? `(${b.isbn})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="member">
            Select Active Member <span className="text-red-500">*</span>
          </label>
          <select
            id="member"
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          >
            <option value="">-- Choose Member --</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.member_id}) - {m.department || 'General'}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-amber-50 p-3 rounded-md text-xs text-amber-800 space-y-1">
          <p className="font-semibold">Queue Policy:</p>
          <p>• Reservations are prioritized based on request timestamp (First-Come, First-Served).</p>
          <p>• Duplicate active reservations for the same book and member are disallowed.</p>
        </div>

        <div className="flex space-x-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center space-x-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
          >
            <Save size={16} />
            <span>{submitting ? 'Placing...' : 'Submit Reservation'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/reservations')}
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
