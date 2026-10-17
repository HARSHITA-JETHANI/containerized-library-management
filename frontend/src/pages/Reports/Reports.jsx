// src/pages/Reports/Reports.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, TrendingUp, BookOpen, Layers, DollarSign } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.get('/dashboard/reports');
        setData(res.data);
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to generate library reports');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) return <p className="text-gray-600 p-6">Generating analytics and reports…</p>;
  if (error) return <p className="text-red-600 p-6">Error: {error}</p>;
  if (!data) return null;

  const circulationData = [
    { name: 'Active Loans', value: data.circulation.active_loans || 0, color: '#3b82f6' },
    { name: 'Overdue Loans', value: data.circulation.overdue_loans || 0, color: '#ef4444' },
    { name: 'Returned Loans', value: data.circulation.returned_loans || 0, color: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="text-indigo-600" size={26} />
          <span>Library Analytics & Reports</span>
        </h1>
        <p className="text-sm text-gray-500">Comprehensive inventory, circulation metrics, and financial records</p>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Categories Tracked</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.categories.length}</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
            <Layers size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Total Circulations</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {(data.circulation.active_loans || 0) + (data.circulation.overdue_loans || 0) + (data.circulation.returned_loans || 0)}
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded-full text-green-600">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Fines Collected</p>
            <p className="text-2xl font-bold text-green-600 mt-1">${(data.fines.total_collected || 0).toFixed(2)}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
            <DollarSign size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Uncollected Fines</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">${(data.fines.total_outstanding || 0).toFixed(2)}</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-full text-rose-600">
            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Books & Copies by Category */}
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-3">
          <h2 className="text-base font-semibold text-gray-800">Inventory by Category</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categories} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="book_count" name="Unique Titles" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="copy_count" name="Total Copies" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Circulation Status Pie */}
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-3">
          <h2 className="text-base font-semibold text-gray-800">Circulation Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={circulationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {circulationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Borrowed Titles Table */}
      <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-3">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <BookOpen size={18} className="text-indigo-600" />
          <span>Most Borrowed Books (Popularity Index)</span>
        </h2>
        {data.popular_books.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No circulation activity recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Rank</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Book Title</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Total Times Issued</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.popular_books.map((b, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-bold text-indigo-600">#{idx + 1}</td>
                    <td className="px-4 py-2 font-medium text-gray-900">{b.title}</td>
                    <td className="px-4 py-2 text-gray-700 font-semibold">{b.issue_count} times</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
