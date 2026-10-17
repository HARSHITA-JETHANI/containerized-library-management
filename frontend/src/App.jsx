// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard';
import BookList from './pages/Books/BookList';
import BookForm from './pages/Books/BookForm';
import Books from './pages/Books';
import Layout from './layout/Layout';
import Categories from './pages/Categories/Categories';
import CategoryList from './pages/Categories/CategoryList';
import CategoryForm from './pages/Categories/CategoryForm';
import Authors from './pages/Authors/Authors';
import AuthorList from './pages/Authors/AuthorList';
import AuthorForm from './pages/Authors/AuthorForm';
import Members from './pages/Members/Members';
import MemberList from './pages/Members/MemberList';
import MemberForm from './pages/Members/MemberForm';
import MemberDetail from './pages/Members/MemberDetail';
import Loans from './pages/Loans/Loans';
import LoanList from './pages/Loans/LoanList';
import IssueForm from './pages/Loans/IssueForm';
import Reservations from './pages/Reservations/Reservations';
import ReservationList from './pages/Reservations/ReservationList';
import ReservationForm from './pages/Reservations/ReservationForm';
import Fines from './pages/Fines/Fines';
import FineList from './pages/Fines/FineList';
import Settings from './pages/Settings/Settings';
import Reports from './pages/Reports/Reports';
import Users from './pages/Users/Users';
import UserList from './pages/Users/UserList';

// Simple protected route component
const ProtectedRoute = ({ children }) => {
  const { auth } = React.useContext(AuthContext);
  return auth?.token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
                        {/* Books routes */}
            <Route path="books" element={<Books />}>
              <Route index element={<BookList />} />
              <Route path="new" element={<BookForm />} />
              <Route path=":id/edit" element={<BookForm />} />
            </Route>
            {/* Categories routes */}
            <Route path="categories" element={<Categories />}>
              <Route index element={<CategoryList />} />
              <Route path="new" element={<CategoryForm />} />
              <Route path=":id/edit" element={<CategoryForm />} />
            </Route>
            {/* Authors routes */}
            <Route path="authors" element={<Authors />}>
              <Route index element={<AuthorList />} />
              <Route path="new" element={<AuthorForm />} />
              <Route path=":id/edit" element={<AuthorForm />} />
            </Route>
            {/* Members routes */}
            <Route path="members" element={<Members />}>
              <Route index element={<MemberList />} />
              <Route path="new" element={<MemberForm />} />
              <Route path=":id/edit" element={<MemberForm />} />
              <Route path=":id/details" element={<MemberDetail />} />
            </Route>
            {/* Loans routes */}
            <Route path="loans" element={<Loans />}>
              <Route index element={<LoanList />} />
              <Route path="issue" element={<IssueForm />} />
            </Route>
            {/* Reservations routes */}
            <Route path="reservations" element={<Reservations />}>
              <Route index element={<ReservationList />} />
              <Route path="new" element={<ReservationForm />} />
            </Route>
            {/* Fines routes */}
            <Route path="fines" element={<Fines />}>
              <Route index element={<FineList />} />
            </Route>
            {/* Settings route */}
            <Route path="settings" element={<Settings />} />
            {/* Reports route */}
            <Route path="reports" element={<Reports />} />
            {/* Users routes */}
            <Route path="users" element={<Users />}>
              <Route index element={<UserList />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
