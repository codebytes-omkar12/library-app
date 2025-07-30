import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const ManageLoans = () => {
    const [loans, setLoans] = useState([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAllLoans = async () => {
            try {
                const response = await axios.get('/api/manage-loans');
                setLoans(response.data);
            } catch (err) {
                 if (err.response && err.response.status === 401) {
                    navigate('/login');
                } else {
                    setError('Could not fetch loan data.');
                }
            }
        };
        fetchAllLoans();
    }, [navigate]);

    const handleReturn = async (loanId) => {
        try {
            await axios.post(`/api/loans/return/${loanId}`);
            // Remove the returned loan from the list to update the UI
            setLoans(loans.filter(loan => loan.loan_id !== loanId));
        } catch (err) {
            setError('Failed to mark as returned.');
        }
    };

    return (
         <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold">Manage Active Loans</h1>
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
                            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Title</th>
                            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Borrowed By</th>
                            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Due Date</th>
                            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Action</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {loans.length > 0 ? (
                            loans.map(loan => (
                                <tr key={loan.loan_id} className="border-t hover:bg-gray-100">
                                    <td className="py-3 px-4">{loan.title}</td>
                                    <td className="py-3 px-4">{loan.username}</td>
                                    <td className="py-3 px-4">{new Date(loan.due_date).toLocaleDateString()}</td>
                                    <td className="py-3 px-4">
                                        <button
                                            onClick={() => handleReturn(loan.loan_id)}
                                            className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-xs"
                                        >
                                            Mark as Returned
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                             <tr>
                                <td colSpan="4" className="text-center py-4">There are no books currently on loan.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManageLoans;