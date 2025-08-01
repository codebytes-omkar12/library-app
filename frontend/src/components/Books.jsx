import React, { useState, useEffect } from 'react';
// 1. Make sure to import your custom api instance
import api from '../api/axiosConfig'; 
import { useNavigate, Link } from 'react-router-dom';

const Books = () => {
    const [books, setBooks] = useState([]);
    const [user, setUser] = useState(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                // 2. This call is already correct if you've been following along
                const response = await api.get('/api/books');
                setBooks(response.data.books);
                setUser(response.data.user);
            } catch (err) {
                if (err.response && err.response.status === 401) {
                    navigate('/login');
                } else {
                    setError('Could not fetch books.');
                }
            }
        };
        fetchBooks();
    }, [navigate]);

    const handleLogout = async () => {
        try {
            // 3. Update the logout call to use 'api'
            await api.post('/api/logout');
            navigate('/login');
        } catch (err) {
            setError('Logout failed. Please try again.');
        }
    };

    const handleDelete = async (bookId) => {
        if (window.confirm('Are you sure you want to delete this book?')) {
            try {
                // 4. THE MAIN FIX: Update the delete call to use 'api'
                await api.delete(`/api/books/${bookId}`);
                setBooks(books.filter(b => b.book_id !== bookId));
            } catch (err) {
                setError('Failed to delete book.');
            }
        }
    };

    const handleBorrow = async (bookId) => {
        try {
            // 5. Update the borrow call to use 'api'
            await api.post(`/api/books/borrow/${bookId}`);
            setBooks(books.map(b => b.book_id === bookId ? {...b, quantity_available: b.quantity_available - 1} : b));
        } catch (err) {
            setError('Failed to borrow book.');
        }
    };


    if (!user) {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    return (
        <div className="container mx-auto p-4">
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
            
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-3xl font-bold">Available Books</h1>
                    <h2 className="text-xl text-gray-600 mt-1">
                        Welcome {user.roles.join(' & ')} {user.username}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    {user.roles.includes('Admin') && <Link to="/admin/users" className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Admin Panel</Link>}
                    {user.roles.includes('Librarian') && <Link to="/manage-loans" className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded">Manage Loans</Link>}
                    <Link to="/my-loans" className="bg-teal-500 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded">My Loans</Link>
                    <button onClick={handleLogout} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">Logout</button>
                </div>
            </div>
            <hr className="mb-4"/>

            {user.roles.includes('Librarian') && (
                <div className="mb-4">
                     <Link to="/books/new" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Add New Book</Link>
                </div>
            )}

            <div className="shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="w-1/3 text-left py-3 px-4 uppercase font-semibold text-sm">Title</th>
                            <th className="w-1/3 text-left py-3 px-4 uppercase font-semibold text-sm">Author</th>
                            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Available</th>
                            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {books.map(book => (
                            <tr key={book.book_id} className="border-t hover:bg-gray-100">
                                <td className="text-left py-3 px-4">{book.title}</td>
                                <td className="text-left py-3 px-4">{book.author}</td>
                                <td className="text-left py-3 px-4">{book.quantity_available}</td>
                                <td className="text-left py-3 px-4 flex gap-2">
                                    {user.roles.includes('Librarian') && (
                                        <>
                                            <Link to={`/books/edit/${book.book_id}`} className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded text-xs">Edit</Link>
                                            <button onClick={() => handleDelete(book.book_id)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-xs">Delete</button>
                                        </>
                                    )}
                                    {user.roles.includes('Member') && book.quantity_available > 0 && (
                                        <form onSubmit={(e) => { e.preventDefault(); handleBorrow(book.book_id); }}>
                                            <button type="submit" className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-xs">Borrow</button>
                                        </form>
                                    )}
                                     {book.quantity_available === 0 && <span className="text-xs text-gray-500">Out of Stock</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {books.length === 0 && <p className="text-center p-4">No books found in the library.</p>}
            </div>
        </div>
    );
};

export default Books;