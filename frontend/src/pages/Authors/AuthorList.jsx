// src/pages/Authors/AuthorList.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api';
import Table from '../../components/Table';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit2, Search, Plus } from 'lucide-react';

export default function AuthorList() {
  const [authors, setAuthors] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const fetchAuthors = async () => {
    try {
      const res = await api.get('/authors');
      setAuthors(res.data);
      setFiltered(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load authors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthors();
  }, []);

  useEffect(() => {
    const term = search.toLowerCase();
    setFiltered(
      authors.filter((a) => a.name && a.name.toLowerCase().includes(term))
    );
  }, [search, authors]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this author?')) return;
    try {
      await api.delete(`/authors/${id}`);
      setAuthors(authors.filter((a) => a.id !== id));
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed');
    }
  };

  const columns = [
    { Header: 'ID', accessor: 'id' },
    { Header: 'Author Name', accessor: 'name' },
    {
      Header: 'Actions',
      accessor: 'actions',
      Cell: (row) => (
        <div className="flex space-x-3 items-center">
          <button
            title="Edit Author"
            onClick={() => navigate(`${row.id}/edit`)}
            className="text-blue-600 hover:text-blue-900"
          >
            <Edit2 size={16} />
          </button>
          <button
            title="Delete Author"
            onClick={() => handleDelete(row.id)}
            className="text-red-600 hover:text-red-900"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <p className="text-gray-600 p-4">Loading authors…</p>;
  if (error) return <p className="text-red-600 p-4">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-800">Authors</h2>
        <button
          onClick={() => navigate('new')}
          className="flex items-center space-x-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus size={16} />
          <span>Add Author</span>
        </button>
      </div>

      <div className="flex items-center space-x-2 bg-white px-3 py-2 border rounded-md max-w-sm">
        <Search size={16} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search authors…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="outline-none text-sm flex-1"
        />
      </div>

      <Table columns={columns} data={filtered} />
    </div>
  );
}
