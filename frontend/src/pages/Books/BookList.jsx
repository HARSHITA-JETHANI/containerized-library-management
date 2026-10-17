// src/pages/Books/BookList.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api';
import Table from '../../components/Table';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit2 } from 'lucide-react';

export default function BookList() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchBooks = async () => {
    try {
      const res = await api.get('/books');
      setBooks(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    try {
      await api.delete(`/books/${id}`);
      setBooks(books.filter((b) => b.id !== id));
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed');
    }
  };

  const columns = [
    { Header: 'Title', accessor: 'title' },
    { Header: 'ISBN', accessor: 'isbn' },
    { Header: 'Category', accessor: 'category_name' },
    {
      Header: 'Authors',
      accessor: 'authors',
      Cell: (row) => row.authors?.map((a) => a.name).join(', '),
    },
    { Header: 'Total', accessor: 'total_copies' },
    { Header: 'Available', accessor: 'available_copies' },
    {
      Header: 'Actions',
      accessor: 'actions',
      Cell: (row) => (
        <div className="flex space-x-2">
          <button onClick={() => navigate(`${row.id}/edit`)} className="text-blue-600">
            <Edit2 size={16} />
          </button>
          <button onClick={() => handleDelete(row.id)} className="text-red-600">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <p className="text-gray-600">Loading books…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Books</h2>
        <button
          onClick={() => navigate('new')}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Add New Book
        </button>
      </div>
      <Table columns={columns} data={books} />
    </div>
  );
}
