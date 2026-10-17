// src/pages/Members/MemberList.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api';
import Table from '../../components/Table';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit2, Search, Eye } from 'lucide-react';

export default function MemberList() {
  const [members, setMembers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const fetchMembers = async () => {
    try {
      const res = await api.get('/members');
      setMembers(res.data);
      setFiltered(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // search filter (by name or member_id)
  useEffect(() => {
    const term = search.toLowerCase();
    setFiltered(
      members.filter(
        (m) =>
          (m.name && m.name.toLowerCase().includes(term)) ||
          (m.member_id && m.member_id.toLowerCase().includes(term)) ||
          (m.email && m.email.toLowerCase().includes(term))
      )
    );
  }, [search, members]);

  const handleDeactivate = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this member?')) return;
    try {
      await api.delete(`/members/${id}`);
      setMembers(members.map((m) => (m.id === id ? { ...m, active: 0 } : m)));
    } catch (e) {
      alert(e.response?.data?.message || 'Operation failed');
    }
  };

  const columns = [
    { Header: 'Member ID', accessor: 'member_id' },
    { Header: 'Name', accessor: 'name' },
    { Header: 'Email', accessor: 'email' },
    { Header: 'Phone', accessor: 'phone' },
    { Header: 'Dept', accessor: 'department' },
    {
      Header: 'Status',
      accessor: 'active',
      Cell: (row) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            row.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {row.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      Header: 'Actions',
      accessor: 'actions',
      Cell: (row) => (
        <div className="flex space-x-3 items-center">
          <button
            title="View Details"
            onClick={() => navigate(`${row.id}/details`)}
            className="text-indigo-600 hover:text-indigo-900"
          >
            <Eye size={16} />
          </button>
          <button
            title="Edit Member"
            onClick={() => navigate(`${row.id}/edit`)}
            className="text-blue-600 hover:text-blue-900"
          >
            <Edit2 size={16} />
          </button>
          {row.active ? (
            <button
              title="Deactivate Member"
              onClick={() => handleDeactivate(row.id)}
              className="text-red-600 hover:text-red-900"
            >
              <Trash2 size={16} />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  if (loading) return <p className="text-gray-600">Loading members…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Members</h2>
        <button
          onClick={() => navigate('new')}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Add Member
        </button>
      </div>
      <div className="flex items-center space-x-2 mb-2">
        <Search size={16} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search members…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-2 py-1 flex-1"
        />
      </div>
      <Table columns={columns} data={filtered} />
    </div>
  );
}
