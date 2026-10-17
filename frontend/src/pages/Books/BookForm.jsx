// src/pages/Books/BookForm.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { MultiSelect } from 'react-multi-select-component'; // simple multi-select library (install)

export default function BookForm() {
  const { id } = useParams(); // undefined for new
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [isbn, setIsbn] = useState('');
  const [publisher, setPublisher] = useState('');
  const [year, setYear] = useState('');
  const [totalCopies, setTotalCopies] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [authorIds, setAuthorIds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load categories and authors for selects
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, authRes] = await Promise.all([
          api.get('/categories'),
          api.get('/authors'),
        ]);
        setCategories(catRes.data);
        setAuthors(authRes.data);
        if (isEdit) {
          const bookRes = await api.get(`/books/${id}`);
          const b = bookRes.data;
          setTitle(b.title || '');
          setIsbn(b.isbn || '');
          setPublisher(b.publisher || '');
          setYear(b.year || '');
          setTotalCopies(b.total_copies || 1);
          setCategoryId(b.category_id || '');
          setAuthorIds(b.authors?.map((a) => ({ label: a.name, value: a.id })) || []);
        }
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      title,
      isbn: isbn || null,
      publisher: publisher || null,
      year: year ? parseInt(year, 10) : null,
      total_copies: parseInt(totalCopies, 10),
      category_id: categoryId || null,
      author_ids: authorIds.map((a) => a.value),
    };
    try {
      if (isEdit) {
        await api.put(`/books/${id}`, payload);
      } else {
        await api.post('/books', payload);
      }
      navigate('/books');
    } catch (e) {
      alert(e.response?.data?.message || 'Save failed');
    }
  };

  if (loading) return <p className="text-gray-600">Loading…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">{isEdit ? 'Edit' : 'Add'} Book</h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            type="text"
            required
            className="mt-1 block w-full border rounded-md p-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">ISBN</label>
          <input
            type="text"
            className="mt-1 block w-full border rounded-md p-2"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Publisher</label>
          <input
            type="text"
            className="mt-1 block w-full border rounded-md p-2"
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Year</label>
          <input
            type="number"
            min="1000"
            max="2100"
            className="mt-1 block w-full border rounded-md p-2"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Category</label>
          <select
            className="mt-1 block w-full border rounded-md p-2"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">--None--</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Authors</label>
          <MultiSelect
            options={authors.map((a) => ({ label: a.name, value: a.id }))}
            value={authorIds}
            onChange={setAuthorIds}
            labelledBy="Select"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Total Copies</label>
          <input
            type="number"
            min="1"
            className="mt-1 block w-full border rounded-md p-2"
            value={totalCopies}
            onChange={(e) => setTotalCopies(e.target.value)}
          />
        </div>
        <div className="flex space-x-2">
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">
            Save
          </button>
          <button type="button" onClick={() => navigate('/books')} className="bg-gray-300 px-4 py-2 rounded">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
