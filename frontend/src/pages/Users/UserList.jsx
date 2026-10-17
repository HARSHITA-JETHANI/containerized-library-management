// src/pages/Users/UserList.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api';
import Table from '../../components/Table';
import { UserPlus, Shield, Search, X, Check, Lock, User } from 'lucide-react';

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Add User modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'LIBRARIAN' });
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users/users');
      setUsers(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load staff users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (search.trim()) {
      const term = search.toLowerCase();
      setFiltered(users.filter((u) => u.username && u.username.toLowerCase().includes(term)));
    } else {
      setFiltered(users);
    }
  }, [search, users]);

  const handleToggleActive = async (user) => {
    const action = user.active ? 'deactivate' : 'reactivate';
    if (!window.confirm(`Are you sure you want to ${action} ${user.username}?`)) return;
    try {
      await api.delete(`/users/users/${user.id}`);
      fetchUsers();
    } catch (e) {
      alert(e.response?.data?.message || `Failed to ${action} user`);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      setModalError('Username is required');
      return;
    }
    if (formData.password.length < 6) {
      setModalError('Password must be at least 6 characters');
      return;
    }

    setModalSubmitting(true);
    setModalError(null);
    try {
      await api.post('/auth/register', {
        username: formData.username.trim(),
        password: formData.password,
        role: formData.role,
      });
      setShowModal(false);
      setFormData({ username: '', password: '', role: 'LIBRARIAN' });
      fetchUsers();
    } catch (e) {
      setModalError(e.response?.data?.message || e.response?.data?.errors?.[0]?.msg || 'Registration failed');
    } finally {
      setModalSubmitting(false);
    }
  };

  const roleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Administrator</span>;
      case 'LIBRARIAN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Librarian</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">Assistant</span>;
    }
  };

  const columns = [
    { Header: 'ID', accessor: 'id' },
    { Header: 'Username', accessor: 'username' },
    {
      Header: 'Staff Role',
      accessor: 'role',
      Cell: (row) => roleBadge(row.role),
    },
    {
      Header: 'Status',
      accessor: 'active',
      Cell: (row) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            row.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {row.active ? 'Active' : 'Disabled'}
        </span>
      ),
    },
    { Header: 'Created Date', accessor: 'created_at' },
    {
      Header: 'Actions',
      accessor: 'actions',
      Cell: (row) => (
        <button
          onClick={() => handleToggleActive(row)}
          className={`px-2.5 py-1 rounded text-xs font-medium ${
            row.active
              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              : 'bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          {row.active ? 'Disable' : 'Enable'}
        </button>
      ),
    },
  ];

  if (loading) return <p className="text-gray-600 p-4">Loading user accounts…</p>;
  if (error) return <p className="text-red-600 p-4">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
            <Shield className="text-indigo-600" size={24} />
            <span>Staff User Management</span>
          </h2>
          <p className="text-sm text-gray-500">Manage library personnel access credentials and roles</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
        >
          <UserPlus size={16} />
          <span>Add Staff Account</span>
        </button>
      </div>

      <div className="flex items-center space-x-2 bg-white px-3 py-2 border rounded-md max-w-sm">
        <Search size={16} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search by username…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="outline-none text-sm flex-1"
        />
      </div>

      <Table columns={columns} data={filtered} />

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-semibold text-gray-900">Create Staff User</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">
                  Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g. jdoe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Min. 6 characters"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="role">
                  System Role <span className="text-red-500">*</span>
                </label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="LIBRARIAN">Librarian (Circulation, Catalog, Reservations)</option>
                  <option value="ASSISTANT">Assistant (Basic Catalog & Circulation read)</option>
                  <option value="ADMIN">Administrator (Full System & User Access)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {modalSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
