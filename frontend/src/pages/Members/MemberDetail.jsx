// src/pages/Members/MemberDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import { ArrowLeft, User, Mail, Phone, BookOpen, Calendar, Clock, Edit2 } from 'lucide-react';

export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/members/${id}`)
      .then((res) => {
        setMember(res.data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.response?.data?.message || 'Failed to load member details');
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="p-6 text-gray-500">Loading member profile...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (!member) return <div className="p-6 text-gray-500">Member not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/members')}
          className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          <span>Back to Members</span>
        </button>
        <button
          onClick={() => navigate(`/members/${id}/edit`)}
          className="flex items-center space-x-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-100"
        >
          <Edit2 size={16} />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{member.name}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  member.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {member.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-gray-500 font-mono mt-0.5">ID: {member.member_id}</p>
          </div>
          <div className="text-xs text-gray-500 flex items-center space-x-1">
            <Calendar size={14} />
            <span>Member since: {member.join_date || 'N/A'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="flex items-center space-x-2 text-sm text-gray-700">
            <Mail size={16} className="text-gray-400" />
            <span>{member.email || 'No email'}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-700">
            <Phone size={16} className="text-gray-400" />
            <span>{member.phone || 'No phone'}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-700">
            <User size={16} className="text-gray-400" />
            <span>Dept: {member.department || 'N/A'}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-700">
            <BookOpen size={16} className="text-gray-400" />
            <span>Course: {member.course || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Borrowing History */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Clock size={18} className="text-indigo-600" />
            <span>Borrowing History & Active Loans</span>
          </h2>
          <span className="text-xs text-gray-500">{member.loans?.length || 0} Total Records</span>
        </div>

        {!member.loans || member.loans.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No borrowing history for this member yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Book</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Copy #</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Issue Date</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Due Date</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Return Date</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {member.loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{loan.title || `Book #${loan.copy_id}`}</td>
                    <td className="px-4 py-2 text-gray-600">{loan.copy_number || loan.copy_id}</td>
                    <td className="px-4 py-2 text-gray-600">{loan.issue_date}</td>
                    <td className="px-4 py-2 text-gray-600">{loan.due_date}</td>
                    <td className="px-4 py-2 text-gray-600">{loan.return_date || '-'}</td>
                    <td className="px-4 py-2">
                      {loan.return_date ? (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">Returned</span>
                      ) : new Date(loan.due_date) < new Date() ? (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Overdue</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Active</span>
                      )}
                    </td>
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
