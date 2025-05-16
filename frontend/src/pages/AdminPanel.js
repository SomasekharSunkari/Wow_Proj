import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

function AdminPanel() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [userGroup, setUserGroup] = useState('users');
  const [usersList, setUsersList] = useState([]);
  const navigate = useNavigate();

   useEffect(() => {
    const checkAdmin = async () => {
      try {
        const userData = await Auth.currentAuthenticatedUser();
        setUser(userData);

        // Get Cognito groups from the access token payload
        const groups = userData.signInUserSession.accessToken.payload["cognito:groups"] || [];

        if (groups.includes('issuers')) {
          setIsAdmin(true);
          fetchUsers();
        } else {
          toast.error('You do not have admin privileges');
          navigate('/');
        }
      } catch (error) {
        navigate('/login');
      }
    };

    checkAdmin();
  }, [navigate]);


  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = (await Auth.currentSession()).getIdToken().getJwtToken();
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/admin/users`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setUsersList(response.data.users);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = (await Auth.currentSession()).getIdToken().getJwtToken();
      
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/admin/create-user`,
        {
          email: newUserEmail,
          password: newUserPassword,
          group: userGroup
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      toast.success(`User created and added to ${userGroup} group`);
      setNewUserEmail('');
      setNewUserPassword('');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeUserGroup = async (username, newGroup) => {
    setLoading(true);
    
    try {
      const token = (await Auth.currentSession()).getIdToken().getJwtToken();
      
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/admin/change-group`,
        {
          username,
          group: newGroup
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      toast.success(`User moved to ${newGroup} group`);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change user group');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return <div className="flex justify-center items-center h-screen">Checking admin privileges...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <div className="flex space-x-4">
            <Link to="/" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
              Dashboard
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New User</h2>
          <form onSubmit={handleCreateUser}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Email</label>
                <input 
                  type="email" 
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                  className="w-full border border-gray-300 p-2 rounded"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Password</label>
                <input 
                  type="password" 
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  required
                  className="w-full border border-gray-300 p-2 rounded"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">User Group</label>
                <select 
                  value={userGroup}
                  onChange={(e) => setUserGroup(e.target.value)}
                  className="w-full border border-gray-300 p-2 rounded"
                >
                  <option value="users">Regular User</option>
                  <option value="issuers">Certificate Issuer</option>
                </select>
              </div>
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Manage Users</h2>
          {loading && <p className="text-gray-500">Loading users...</p>}
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usersList.map((user) => (
                  <tr key={user.username}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.group}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.group === 'users' ? (
                        <button
                          onClick={() => handleChangeUserGroup(user.username, 'issuers')}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Make Issuer
                        </button>
                      ) : (
                        <button
                          onClick={() => handleChangeUserGroup(user.username, 'users')}
                          className="text-red-600 hover:text-red-900"
                        >
                          Make Regular User
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {usersList.length === 0 && !loading && (
            <p className="text-gray-500 text-center py-4">No users found</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;