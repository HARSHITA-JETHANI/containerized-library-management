// src/pages/Fines/FineList.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api';
import Table from '../../components/Table';
import { DollarSign, CheckCircle, Search, CreditCard, X } from 'lucide-react';

export default function FineList() {
  const [fines, setFines] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('outstanding'); // 'outstanding' | 'paid' | 'all'
  const [search, setSearch] = useState('');

  // Payment Modal state
  const [selectedFine, setSelectedFine] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState(null);

  const fetchFines = async () => {
    try {
      const res = await api.get('/fines');
      setFines(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load fines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFines();
  }, []);

  useEffect(() => {
    let list = [...fines];
    if (tab === 'outstanding') {
      list = list.filter((f) => (f.amount - f.paid) > 0);
    } else if (tab === 'paid') {
      list = list.filter((f) => (f.amount - f.paid) <= 0);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (f) =>
          (f.member_name && f.member_name.toLowerCase().includes(term)) ||
          (f.member_code && f.member_code.toLowerCase().includes(term)) ||
          (f.book_title && f.book_title.toLowerCase().includes(term))
      );
    }

    setFiltered(list);
  }, [tab, search, fines]);

  const openPayModal = (fine) => {
    setSelectedFine(fine);
    setPayAmount((fine.amount - fine.paid).toFixed(2));
    setPayError(null);
  };

  const closePayModal = () => {
    setSelectedFine(null);
    setPayAmount('');
    setPayError(null);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!selectedFine) return;
    const num = parseFloat(payAmount);
    const outstanding = selectedFine.amount - selectedFine.paid;

    if (isNaN(num) || num <= 0) {
      setPayError('Please enter a valid amount greater than 0');
      return;
    }
    if (num > outstanding) {
      setPayError(`Cannot pay more than the outstanding amount of $${outstanding.toFixed(2)}`);
      return;
    }

    setPaySubmitting(true);
    setPayError(null);
    try {
      await api.post(`/fines/pay/${selectedFine.id}`, { amount: num });
      closePayModal();
      fetchFines();
    } catch (e) {
      setPayError(e.response?.data?.message || 'Payment failed');
    } finally {
      setPaySubmitting(false);
    }
  };

  const totalAssessed = fines.reduce((sum, f) => sum + (f.amount || 0), 0);
  const totalPaid = fines.reduce((sum, f) => sum + (f.paid || 0), 0);
  const totalOutstanding = fines.reduce((sum, f) => sum + Math.max(0, (f.amount || 0) - (f.paid || 0)), 0);

  const columns = [
    { Header: 'Fine ID', accessor: 'id' },
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
    { Header: 'Book Title', accessor: 'book_title' },
    {
      Header: 'Total Fine',
      accessor: 'amount',
      Cell: (row) => `$${row.amount.toFixed(2)}`,
    },
    {
      Header: 'Amount Paid',
      accessor: 'paid',
      Cell: (row) => `$${row.paid.toFixed(2)}`,
    },
    {
      Header: 'Outstanding',
      accessor: 'outstanding',
      Cell: (row) => {
        const out = row.amount - row.paid;
        return (
          <span className={`font-semibold ${out > 0 ? 'text-rose-600' : 'text-green-600'}`}>
            ${out.toFixed(2)}
          </span>
        );
      },
    },
    {
      Header: 'Status',
      accessor: 'status',
      Cell: (row) => {
        const out = row.amount - row.paid;
        return out <= 0 ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            Cleared
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            Unpaid
          </span>
        );
      },
    },
    {
      Header: 'Actions',
      accessor: 'actions',
      Cell: (row) => {
        const out = row.amount - row.paid;
        return out > 0 ? (
          <button
            onClick={() => openPayModal(row)}
            className="flex items-center space-x-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 rounded text-xs font-medium"
          >
            <CreditCard size={14} />
            <span>Record Payment</span>
          </button>
        ) : (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle size={14} /> Paid in Full
          </span>
        );
      },
    },
  ];

  if (loading) return <p className="text-gray-600 p-4">Loading fines and payments…</p>;
  if (error) return <p className="text-red-600 p-4">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Fines & Payments</h2>
          <p className="text-sm text-gray-500">Track overdue charges, collections, and settle balances</p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-medium">Total Assessed</p>
          <p className="text-xl font-bold text-gray-900 mt-1">${totalAssessed.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-medium">Total Collected</p>
          <p className="text-xl font-bold text-green-600 mt-1">${totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-medium">Outstanding Balance</p>
          <p className="text-xl font-bold text-rose-600 mt-1">${totalOutstanding.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setTab('outstanding')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              tab === 'outstanding' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Outstanding ({fines.filter((f) => f.amount - f.paid > 0).length})
          </button>
          <button
            onClick={() => setTab('paid')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              tab === 'paid' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Paid ({fines.filter((f) => f.amount - f.paid <= 0).length})
          </button>
          <button
            onClick={() => setTab('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              tab === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All Records ({fines.length})
          </button>
        </div>

        <div className="flex items-center space-x-2 bg-white px-3 py-2 border rounded-md max-w-sm">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search member or book…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="outline-none text-sm flex-1"
          />
        </div>
      </div>

      <Table columns={columns} data={filtered} />

      {/* Payment Modal */}
      {selectedFine && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-semibold text-gray-900">Record Fine Payment</h3>
              <button onClick={closePayModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {payError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
                {payError}
              </div>
            )}

            <div className="text-sm text-gray-600 space-y-1 bg-gray-50 p-3 rounded">
              <p><span className="font-medium text-gray-800">Member:</span> {selectedFine.member_name}</p>
              <p><span className="font-medium text-gray-800">Book:</span> {selectedFine.book_title}</p>
              <p><span className="font-medium text-gray-800">Total Charge:</span> ${selectedFine.amount.toFixed(2)}</p>
              <p><span className="font-medium text-gray-800">Already Paid:</span> ${selectedFine.paid.toFixed(2)}</p>
              <p className="text-rose-600 font-semibold pt-1">
                Outstanding: ${(selectedFine.amount - selectedFine.paid).toFixed(2)}
              </p>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="amount">
                  Payment Amount ($)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={(selectedFine.amount - selectedFine.paid).toFixed(2)}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setPayAmount((selectedFine.amount - selectedFine.paid).toFixed(2))}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Pay Full Outstanding (${(selectedFine.amount - selectedFine.paid).toFixed(2)})
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={closePayModal}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {paySubmitting ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
