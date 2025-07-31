import React, { useState, useEffect,useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [allRoles, setAllRoles] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(''); // State for success messages
    const navigate = useNavigate();

    // 1. Create a function to fetch users
    const fetchUsers = useCallback(async () => {
        try {
            const response = await api.get('/api/admin/users');
            setUsers(response.data.users.map(u => ({ ...u, roles: u.roles ? u.roles.split(',') : [] })));
            setAllRoles(response.data.allRoles);
        } catch (err) {
             if (err.response && err.response.status === 401) {
                navigate('/login');
            } else {
                setError('Could not fetch user data.');
            }
        }
    },[navigate]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleRoleChange = (userId, roleName) => {
        setUsers(users.map(user => {
            if (user.user_id === userId) {
                const newRoles = user.roles.includes(roleName)
                    ? user.roles.filter(r => r !== roleName)
                    : [...user.roles, roleName];
                return { ...user, roles: newRoles };
            }
            return user;
        }));
    };

    const handleUpdateRoles = async (userId) => {
        const user = users.find(u => u.user_id === userId);
        const roleIds = user.roles.map(roleName => {
            const role = allRoles.find(r => r.role_name === roleName);
            return role ? role.role_id : null;
        }).filter(id => id !== null);

        try {
            setSuccess(''); // Clear previous success messages
            setError('');   // Clear previous error messages
            await api.post(`/api/admin/users/update-roles/${userId}`, { roles: roleIds });
            setSuccess('Roles updated successfully!'); // Set success message
            fetchUsers(); // 2. Refetch users to ensure UI is in sync
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update roles.');
        }
    };


    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold">Manage Users</h1>
                 <Link to="/books" className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                    Back to Library
                </Link>
            </div>
            <hr className="mb-4" />
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
            {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}
             <div className="shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Username</th>
                            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Email</th>
                            <th className="w-1/3 text-left py-3 px-4 uppercase font-semibold text-sm">Roles</th>
                            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Action</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {users.map(user => (
                            <tr key={user.user_id} className="border-t hover:bg-gray-100">
                                <td className="py-3 px-4">{user.username}</td>
                                <td className="py-3 px-4">{user.email}</td>
                                <td className="py-3 px-4">
                                    {allRoles.map(role => (
                                        <label key={role.role_id} className="inline-flex items-center mr-3">
                                            <input
                                                type="checkbox"
                                                className="form-checkbox h-5 w-5 text-blue-600"
                                                checked={user.roles.includes(role.role_name)}
                                                onChange={() => handleRoleChange(user.user_id, role.role_name)}
                                            />
                                            <span className="ml-2 text-gray-700">{role.role_name}</span>
                                        </label>
                                    ))}
                                </td>
                                <td className="py-3 px-4">
                                    <button
                                        onClick={() => handleUpdateRoles(user.user_id)}
                                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-xs"
                                    >
                                        Update
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminUsers;