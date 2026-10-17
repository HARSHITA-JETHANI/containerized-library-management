// src/layout/Layout.jsx
import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Home, Book, Tags, User, ClipboardList, Calendar, Settings, LogOut } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function Layout() {
  const { auth, logout } = React.useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const location = useLocation();
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Books', path: '/books', icon: Book },
    { name: 'Categories', path: '/categories', icon: Tags },
    { name: 'Authors', path: '/authors', icon: Tags },
    { name: 'Members', path: '/members', icon: User },
    { name: 'Issue & Return', path: '/loans', icon: ClipboardList },
    { name: 'Reservations', path: '/reservations', icon: Calendar },
    { name: 'Fines', path: '/fines', icon: Calendar },
    { name: 'Reports', path: '/reports', icon: ClipboardList },
    { name: 'Users', path: '/users', icon: User },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const renderLink = (item) => (
    <NavLink
      to={item.path}
      key={item.name}
      className={({ isActive }) =>
        `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
          isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
        }`
      }
    >
      <item.icon size={16} />
      <span>{item.name}</span>
    </NavLink>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 md:hidden ${sidebarOpen ? '' : 'pointer-events-none'} `}>
        <div className="fixed inset-0 bg-black opacity-25" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg p-4 overflow-y-auto">
          <button className="mb-4" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
          <nav className="space-y-1">{navItems.map(renderLink)}</nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r p-4 overflow-y-auto">
        <nav className="space-y-1">{navItems.map(renderLink)}</nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 md:ml-64">
        {/* Top bar */}
        <header className="flex items-center justify-between bg-white shadow px-4 py-2 md:py-3">
          <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h1 className="text-lg font-semibold capitalize">
            {navItems.find((i) => location.pathname.startsWith(i.path))?.name || 'Dashboard'}
          </h1>
          {/* User profile & Logout */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <span className="text-sm font-semibold text-gray-900 block leading-tight">
                {auth?.user?.username || 'Staff'}
              </span>
              <span className="text-xs text-indigo-600 font-medium capitalize">
                {auth?.user?.role || 'User'}
              </span>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="flex items-center space-x-1 text-gray-500 hover:text-red-600 p-1.5 rounded-md hover:bg-gray-100 text-sm font-medium transition-colors"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
