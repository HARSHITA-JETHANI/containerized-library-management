// src/pages/Categories/Categories.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';

// Simple wrapper that provides an Outlet for nested category routes
export default function Categories() {
  return <Outlet />;
}
