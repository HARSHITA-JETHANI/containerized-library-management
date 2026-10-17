// src/pages/Categories/CategoryList.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api';
import Table from '../../components/Table';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit2, Search } from 'lucide-react';

export default function CategoryList() {
  const [categories, setCategories] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
      setFiltered(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Client‑side search filter
  useEffect(() => {
    const term = search.toLowerCase();
    setFiltered(
      categories.filter((c) => c.name && c.name.toLowerCase().includes(term))
    );
  }, [search, categories]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      // Optimistically remove from local state
      const updated = categories.filter((c) => c.id !== id);
      setCategories(updated);
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed');
    }
  };

  const columns = [
    { Header: 'Name', accessor: 'name' },
    {
      Header: 'Actions',
      accessor: 'actions',
      Cell: (row) => (
        <div className="flex space-x-2">
          <button onClick={() => navigate(`${row.id}/edit`)} className="text-blue-600">
            <Edit2 size={16} />
          </button>
          <button onClick={() => handleDelete(row.id)} className="text-red-600">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <p className="text-gray-600">Loading categories…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Categories</h2>
        <button
          onClick={() => navigate('new')}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Add Category
        </button>
      </div>
      <div className="flex items-center space-x-2 mb-2">
        <Search size={16} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search categories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-2 py-1 flex-1"
        />
      </div>
      <Table columns={columns} data={filtered} />
    </div>
  );
}
