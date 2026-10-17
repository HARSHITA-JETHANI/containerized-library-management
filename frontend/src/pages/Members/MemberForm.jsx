// src/pages/Members/MemberForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { Save, X } from 'lucide-react';

export default function MemberForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    member_id: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    course: '',
    active: 1,
  });
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      api
        .get(`/members/${id}`)
        .then((res) => {
          setFormData({
            member_id: res.data.member_id || '',
            name: res.data.name || '',
            email: res.data.email || '',
            phone: res.data.phone || '',
            department: res.data.department || '',
            course: res.data.course || '',
            active: res.data.active !== undefined ? res.data.active : 1,
          });
          setLoading(false);
        })
        .catch((e) => {
          setError(e.response?.data?.message || 'Failed to load member');
          setLoading(false);
        });
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.member_id.trim()) {
      setError('Member ID is required');
      return;
    }
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setSubmitting(true);
    try {
      if (id) {
        await api.put(`/members/${id}`, {
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          department: formData.department.trim() || undefined,
          course: formData.course.trim() || undefined,
          active: formData.active,
        });
      } else {
        await api.post('/members', {
          member_id: formData.member_id.trim(),
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          department: formData.department.trim() || undefined,
          course: formData.course.trim() || undefined,
        });
      }
      navigate('/members');
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.data?.errors?.[0]?.msg || 'Save failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-gray-600 p-4">Loading member details…</p>;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex justify-between items-center border-b pb-3">
        <h2 className="text-2xl font-semibold text-gray-800">
          {id ? 'Edit Member' : 'Register New Member'}
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="member_id">
            Member ID <span className="text-red-500">*</span>
          </label>
          <input
            id="member_id"
            name="member_id"
            type="text"
            disabled={!!id}
            value={formData.member_id}
            onChange={handleChange}
            placeholder="e.g. MEM-001"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. John Doe"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="phone">
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="text"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 234 567 890"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="department">
              Department
            </label>
            <input
              id="department"
              name="department"
              type="text"
              value={formData.department}
              onChange={handleChange}
              placeholder="e.g. Computer Science"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="course">
              Course / Program
            </label>
            <input
              id="course"
              name="course"
              type="text"
              value={formData.course}
              onChange={handleChange}
              placeholder="e.g. B.Tech 4th Year"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        {id && (
          <div className="flex items-center space-x-2 pt-2">
            <input
              id="active"
              name="active"
              type="checkbox"
              checked={formData.active === 1}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="active" className="text-sm font-medium text-gray-700">
              Active Member
            </label>
          </div>
        )}

        <div className="flex space-x-3 pt-4 border-t">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
          >
            <Save size={16} />
            <span>{submitting ? 'Saving...' : 'Save Member'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/members')}
            className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 text-sm font-medium"
          >
            <X size={16} />
            <span>Cancel</span>
          </button>
        </div>
      </form>
    </div>
  );
}
