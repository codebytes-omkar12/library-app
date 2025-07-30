import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig.js'
import { useNavigate, useParams, Link } from 'react-router-dom';

const EditBook = () => {
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [quantity, setQuantity] = useState(0);
    const [error, setError] = useState('');
    const { id } = useParams(); // Gets the book ID from the URL
    const navigate = useNavigate();

    useEffect(() => {
        const fetchBook = async () => {
            try {
                const response = await api.get(`/api/books/${id}`);
                const book = response.data;
                setTitle(book.title);
                setAuthor(book.author);
                setQuantity(book.quantity_available);
            } catch (err) {
                setError('Could not fetch book data.');
            }
        };
        fetchBook();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/api/books/${id}`, { title, author, quantity_available: quantity });
            navigate('/books');
        } catch (err) {
            setError('Failed to update book.');
        }
    };

    return (
        <div className="bg-gray-100 flex items-center justify-center min-h-screen">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
                <h1 className="text-2xl font-bold text-center mb-4">Edit Book</h1>
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
                 <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2">Title</label>
                        <input
                            type="text"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="author" className="block text-gray-700 text-sm font-bold mb-2">Author</label>
                        <input
                            type="text"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label htmlFor="quantity" className="block text-gray-700 text-sm font-bold mb-2">Quantity Available</label>
                        <input
                            type="number"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            min="0"
                            required
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                            Save Changes
                        </button>
                        <Link to="/books" className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditBook;