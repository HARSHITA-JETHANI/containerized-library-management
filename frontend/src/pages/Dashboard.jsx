// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';
import { Book, CheckCircle, Clock, Users, AlertTriangle, Bookmark, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_books: 0,
    available_copies: 0,
    issued_books: 0,
    active_members: 0,
    overdue_loans: 0,
    pending_reservations: 0,
    outstanding_fines: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await api.get('/dashboard');
        setStats(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="p-6 text-gray-500">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }

  const statCards = [
    { label: 'Total Books', value: stats.total_books, icon: Book, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Available Copies', value: stats.available_copies, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Issued Books', value: stats.issued_books, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Active Members', value: stats.active_members, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Overdue Loans', value: stats.overdue_loans, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Pending Reservations', value: stats.pending_reservations, icon: Bookmark, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Outstanding Fines', value: `$${stats.outstanding_fines || 0}`, icon: DollarSign, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Real-time library statistics and overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{card.value}</p>
            </div>
            <div className={`p-3 rounded-full ${card.bg}`}>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Welcome to Library Management</h2>
        <p className="text-sm text-gray-600">
          Use the sidebar navigation to manage Books, Categories, Authors, Members, Loans, Reservations, Fines, Reports, and System Settings.
        </p>
      </div>
    </div>
  );
}
