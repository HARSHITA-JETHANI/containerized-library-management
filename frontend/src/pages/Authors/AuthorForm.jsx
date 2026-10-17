// src/pages/Authors/AuthorForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { Save, X } from 'lucide-react';

export default function AuthorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      api
        .get(`/authors/${id}`)
        .then((res) => {
          setName(res.data.name);
          setLoading(false);
        })
        .catch((e) => {
          setError(e.response?.data?.message || 'Failed to load author');
          setLoading(false);
        });
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Author name is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (id) {
        await api.put(`/authors/${id}`, { name: name.trim() });
      } else {
        await api.post('/authors', { name: name.trim() });
      }
      navigate('/authors');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save author');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-gray-600 p-4">Loading author…</p>;

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-2xl font-semibold text-gray-800">
        {id ? 'Edit Author' : 'New Author'}
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
            Author Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="e.g. George Orwell"
            required
          />
        </div>

        <div className="flex space-x-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center space-x-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
          >
            <Save size={16} />
            <span>{submitting ? 'Saving...' : 'Save Author'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/authors')}
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
