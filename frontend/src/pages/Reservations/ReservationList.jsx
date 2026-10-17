// src/pages/Reservations/ReservationList.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api';
import Table from '../../components/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Check, X, Search, Clock } from 'lucide-react';

export default function ReservationList() {
  const [reservations, setReservations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const fetchReservations = async () => {
    try {
      const res = await api.get('/reservations');
      setReservations(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  useEffect(() => {
    let list = [...reservations];
    if (statusFilter !== 'ALL') {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r.book_title && r.book_title.toLowerCase().includes(term)) ||
          (r.member_name && r.member_name.toLowerCase().includes(term))
      );
    }
    setFiltered(list);
  }, [statusFilter, search, reservations]);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this reservation?')) return;
    try {
      await api.delete(`/reservations/${id}`);
      fetchReservations();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to cancel reservation');
    }
  };

  const handleFulfill = async (id) => {
    if (!window.confirm('Mark this reservation as fulfilled?')) return;
    try {
      await api.put(`/reservations/${id}/fulfill`);
      fetchReservations();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to fulfill reservation');
    }
  };

  const columns = [
    { Header: 'ID', accessor: 'id' },
    { Header: 'Book Title', accessor: 'book_title' },
    {
      Header: 'Member',
      accessor: 'member_name',
      Cell: (row) => (
        <div>
          <span className="font-medium text-gray-900">{row.member_name}</span>
          {row.member_code && (
            <span className="text-xs text-gray-500 block">({row.member_code})</span>
          )}
        </div>
      ),
    },
    { Header: 'Requested', accessor: 'request_date' },
    {
      Header: 'Queue Status',
      accessor: 'queue_position',
      Cell: (row) =>
        row.status === 'PENDING' ? (
          <span className="inline-flex items-center gap-1 font-semibold text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
            <Clock size={12} /> #{row.queue_position} in line
          </span>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        ),
    },
    {
      Header: 'Status',
      accessor: 'status',
      Cell: (row) => {
        let style = 'bg-gray-100 text-gray-700';
        if (row.status === 'PENDING') style = 'bg-amber-100 text-amber-800';
        if (row.status === 'FULFILLED') style = 'bg-green-100 text-green-800';
        if (row.status === 'CANCELLED') style = 'bg-red-100 text-red-800';
        return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>{row.status}</span>;
      },
    },
    {
      Header: 'Actions',
      accessor: 'actions',
      Cell: (row) =>
        row.status === 'PENDING' ? (
          <div className="flex space-x-2">
            <button
              onClick={() => handleFulfill(row.id)}
              className="flex items-center space-x-1 bg-green-50 text-green-700 hover:bg-green-100 px-2 py-1 rounded text-xs font-medium"
              title="Fulfill Reservation"
            >
              <Check size={14} />
              <span>Fulfill</span>
            </button>
            <button
              onClick={() => handleCancel(row.id)}
              className="flex items-center space-x-1 bg-red-50 text-red-700 hover:bg-red-100 px-2 py-1 rounded text-xs font-medium"
              title="Cancel Reservation"
            >
              <X size={14} />
              <span>Cancel</span>
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">Locked</span>
        ),
    },
  ];

  if (loading) return <p className="text-gray-600 p-4">Loading reservations…</p>;
  if (error) return <p className="text-red-600 p-4">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Reservations</h2>
          <p className="text-sm text-gray-500">Manage book reservation queues and waitlists</p>
        </div>
        <button
          onClick={() => navigate('new')}
          className="flex items-center space-x-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus size={16} />
          <span>New Reservation</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex space-x-2">
          {['ALL', 'PENDING', 'FULFILLED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                statusFilter === st ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 bg-white px-3 py-2 border rounded-md max-w-sm">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search book or member…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="outline-none text-sm flex-1"
          />
        </div>
      </div>

      <Table columns={columns} data={filtered} />
    </div>
  );
}
