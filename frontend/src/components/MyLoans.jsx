import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig.js'
import { Link, useNavigate } from 'react-router-dom';

const MyLoans = () => {
    const [loans, setLoans] = useState([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLoans = async () => {
            try {
                const response = await api.get('/api/my-loans');
                setLoans(response.data);
            } catch (err) {
                if (err.response && err.response.status === 401) {
                    navigate('/login');
                } else {
                    setError('Could not fetch your loan data.');
                }
            }
        };
        fetchLoans();
    }, [navigate]);

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold">My Borrowed Books</h1>
                <Link to="/books" className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                    Back to Library
                </Link>
            </div>
            <hr className="mb-4" />
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
            <div className="shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="w-1/3 text-left py-3 px-4 uppercase font-semibold text-sm">Title</th>
                            <th className="w-1/3 text-left py-3 px-4 uppercase font-semibold text-sm">Author</th>
                            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Loan Date</th>
                            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Due Date</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {loans.length > 0 ? (
                            loans.map((loan, index) => (
                                <tr key={index} className="border-t hover:bg-gray-100">
                                    <td className="text-left py-3 px-4">{loan.title}</td>
                                    <td className="text-left py-3 px-4">{loan.author}</td>
                                    <td className="text-left py-3 px-4">{new Date(loan.loan_date).toLocaleDateString()}</td>
                                    <td className="text-left py-3 px-4">{new Date(loan.due_date).toLocaleDateString()}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="text-center py-4">You have no books currently on loan.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MyLoans;