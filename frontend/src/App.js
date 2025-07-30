import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import all components
import Login from './components/Login.jsx';
import Register from './components/Register.jsx';
import Books from './components/Books.jsx';
import AddBook from './components/AddBook.jsx';
import EditBook from './components/EditBook.jsx';
import MyLoans from './components/MyLoans.jsx';
import ManageLoans from './components/ManageLoans.jsx';
import AdminUsers from './components/AdminUsers.jsx';

function App() {
  return (
    <Router>
      <Routes>
        {/* Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Book Management Routes */}
        <Route path="/books" element={<Books />} />
        <Route path="/books/new" element={<AddBook />} />
        <Route path="/books/edit/:id" element={<EditBook />} />

        {/* User and Loan Management Routes */}
        <Route path="/my-loans" element={<MyLoans />} />
        <Route path="/manage-loans" element={<ManageLoans />} />
        <Route path="/admin/users" element={<AdminUsers />} />

        {/* Default route */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;