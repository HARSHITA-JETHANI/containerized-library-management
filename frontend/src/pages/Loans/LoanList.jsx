// src/pages/Loans/LoanList.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api';
import Table from '../../components/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, RotateCcw, CheckCircle, Search, AlertCircle } from 'lucide-react';

export default function LoanList() {
  const [loans, setLoans] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all'); // 'all' | 'active' | 'overdue'
  const navigate = useNavigate();

  const fetchLoans = async () => {
    try {
      const res = await api.get('/loans');
      setLoans(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  useEffect(() => {
    let list = [...loans];
    const today = new Date().toISOString().split('T')[0];

    if (tab === 'active') {
      list = list.filter((l) => !l.return_date);
    } else if (tab === 'overdue') {
      list = list.filter((l) => !l.return_date && l.due_date < today);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (l) =>
          (l.book_title && l.book_title.toLowerCase().includes(term)) ||
          (l.member_name && l.member_name.toLowerCase().includes(term)) ||
          (l.member_code && l.member_code.toLowerCase().includes(term))
      );
    }

    setFiltered(list);
  }, [tab, search, loans]);

  const handleReturn = async (loanId) => {
    if (!window.confirm('Confirm returning this book?')) return;
    try {
      const res = await api.post('/loans/return', { loan_id: loanId });
      alert(
        res.data.overdue_days > 0
          ? `Book returned! An overdue fine was generated for ${res.data.overdue_days} overdue days.`
          : 'Book returned successfully!'
      );
      fetchLoans();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to return book');
    }
  };

  const handleRenew = async (loanId) => {
    if (!window.confirm('Renew this loan for another period?')) return;
    try {
      const res = await api.post('/loans/renew', { loan_id: loanId });
      alert(`Loan renewed! New due date: ${res.data.new_due_date}`);
      fetchLoans();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to renew loan');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const columns = [
    { Header: 'ID', accessor: 'id' },
    { Header: 'Book Title', accessor: 'book_title' },
    { Header: 'Copy #', accessor: 'copy_number' },
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
    { Header: 'Issued', accessor: 'issue_date' },
    { Header: 'Due Date', accessor: 'due_date' },
    {
      Header: 'Status',
      accessor: 'status',
      Cell: (row) => {
        if (row.return_date) {
          return (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
              Returned ({row.return_date})
            </span>
          );
        }
        if (row.due_date < todayStr) {
          return (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 flex items-center w-max gap-1">
              <AlertCircle size={12} /> Overdue
            </span>
          );
        }
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            Active
          </span>
        );
      },
    },
    {
      Header: 'Renewed',
      accessor: 'renewed',
      Cell: (row) => `${row.renewed || 0}x`,
    },
    {
      Header: 'Actions',
      accessor: 'actions',
      Cell: (row) =>
        !row.return_date ? (
          <div className="flex space-x-2">
            <button
              onClick={() => handleReturn(row.id)}
              className="flex items-center space-x-1 bg-green-50 text-green-700 hover:bg-green-100 px-2.5 py-1 rounded text-xs font-medium"
              title="Return Book"
            >
              <CheckCircle size={14} />
              <span>Return</span>
            </button>
            <button
              onClick={() => handleRenew(row.id)}
              className="flex items-center space-x-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 rounded text-xs font-medium"
              title="Renew Loan"
            >
              <RotateCcw size={14} />
              <span>Renew</span>
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">Completed</span>
        ),
    },
  ];

  if (loading) return <p className="text-gray-600 p-4">Loading loans…</p>;
  if (error) return <p className="text-red-600 p-4">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Circulation & Loans</h2>
          <p className="text-sm text-gray-500">Track book issues, returns, and renewals</p>
        </div>
        <button
          onClick={() => navigate('issue')}
          className="flex items-center space-x-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus size={16} />
          <span>Issue Book</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex space-x-2 border-b sm:border-b-0">
          <button
            onClick={() => setTab('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              tab === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All Loans ({loans.length})
          </button>
          <button
            onClick={() => setTab('active')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              tab === 'active' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Active ({loans.filter((l) => !l.return_date).length})
          </button>
          <button
            onClick={() => setTab('overdue')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              tab === 'overdue' ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Overdue ({loans.filter((l) => !l.return_date && l.due_date < todayStr).length})
          </button>
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
