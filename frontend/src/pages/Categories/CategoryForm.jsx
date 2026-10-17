// src/pages/Categories/CategoryForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { Save, X } from 'lucide-react';

/**
 * CategoryForm handles both creation and editing of a category.
 * If `id` param is present we fetch the existing category and issue a PUT request on submit.
 * Otherwise we POST a new category.
 * After a successful operation the user is redirected back to the category list.
 */
export default function CategoryForm() {
  const { id } = useParams(); // undefined for new category
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState(null);

  // Load existing category when editing
  useEffect(() => {
    if (id) {
      api
        .get(`/categories/${id}`)
        .then((res) => {
          setName(res.data.name);
          setLoading(false);
        })
        .catch((e) => {
          setError(e.response?.data?.message || 'Failed to load category');
          setLoading(false);
        });
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    try {
      if (id) {
        // Update
        await api.put(`/categories/${id}`, { name: name.trim() });
      } else {
        // Create
        await api.post('/categories', { name: name.trim() });
      }
      navigate('/categories');
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed');
    }
  };

  const handleCancel = () => {
    navigate('/categories');
  };

  if (loading) return <p className="text-gray-600">Loading…</p>;

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-2xl font-semibold">
        {id ? 'Edit Category' : 'New Category'}
      </h2>
      {error && <p className="text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>
        <div className="flex space-x-2">
          <button
            type="submit"
            className="flex items-center space-x-1 bg-indigo-600 text-white px-4 py-2 rounded"
          >
            <Save size={16} />
            <span>Save</span>
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center space-x-1 bg-gray-300 text-gray-800 px-4 py-2 rounded"
          >
            <X size={16} />
            <span>Cancel</span>
          </button>
        </div>
      </form>
    </div>
  );
}
