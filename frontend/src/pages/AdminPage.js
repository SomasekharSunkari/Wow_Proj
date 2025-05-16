import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import Navbar from '../components/Navbar';

function AdminPage() {
  const [user, setUser] = useState(null);
  const [isIssuer, setIsIssuer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    isIssuer: false
  });
  const [stats, setStats] = useState({
    totalCertificates: 0,
    activeUsers: 0
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const userData = await Auth.currentAuthenticatedUser();
        setUser(userData);
        
        // Check if user is in issuers group
        const groups = userData.signInUserSession.accessToken.payload['cognito:groups'] || [];
        const userIsIssuer = groups.includes('issuers');
        setIsIssuer(userIsIssuer);
        
        if (!userIsIssuer) {
          console.log('User is not an issuer, redirecting to dashboard');
          toast.error('You do not have permission to access the admin panel');
          navigate('/');
          return;
        }
        
        // Fetch users and stats
        fetchUsers();
        fetchMyCertificates();
        
        console.log('Admin authenticated:', userData.attributes.email);
      } catch (error) {
        console.log('User not authenticated or not an issuer, redirecting to login');
        navigate('/login');
      }
    };
    
    checkUser();
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = (await Auth.currentSession()).getIdToken().getJwtToken();
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/admin/users`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setUsers(response.data.users);
      setStats(prevStats => ({
        ...prevStats,
        activeUsers: response.data.users.length
      }));
      console.log('Users fetched:', response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCertificates = async () => {
    try {
      const token = (await Auth.currentSession()).getIdToken().getJwtToken();
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/certificates/my-uploads`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setStats(prevStats => ({
        ...prevStats,
        totalCertificates: response.data.certificates.length
      }));
      console.log('My certificates fetched:', response.data.certificates.length);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewUser({
      ...newUser,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    if (!newUser.email || !newUser.password || !newUser.name) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setLoading(true);
    console.log('Creating new user:', newUser.email);
    
    try {
      const token = (await Auth.currentSession()).getIdToken().getJwtToken();
      
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/admin/create-user`,
        {
          email: newUser.email,
          password: newUser.password,
          name: newUser.name,
          group: newUser.isIssuer ? 'issuers' : 'users'  
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('User created successfully:', response.data);
      toast.success(`User ${newUser.email} created successfully`);
      
      // Reset form and refresh users list
      setNewUser({
        email: '',
        password: '',
        name: '',
        isIssuer: false
      });
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || 'Error creating user');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleIssuer = async (email, currentStatus) => {
    try {
      setLoading(true);
      const token = (await Auth.currentSession()).getIdToken().getJwtToken();
      
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/admin/users/${encodeURIComponent(email)}/toggle-issuer`,
        { isIssuer: !currentStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('User issuer status updated:', response.data);
      toast.success(`User ${email} issuer status updated`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Error updating user');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !isIssuer) return <div className="text-center p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center mb-6">
            <div className="bg-purple-100 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
              <p className="text-gray-600">Manage users and view system statistics</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-indigo-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-indigo-800 mb-2">My Certificates</h3>
              <p className="text-3xl font-bold text-indigo-600">{stats.totalCertificates}</p>
              <p className="text-sm text-indigo-500 mt-1">Certificates issued by you</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-purple-800 mb-2">Active Users</h3>
              <p className="text-3xl font-bold text-purple-600">{stats.activeUsers}</p>
              <p className="text-sm text-purple-500 mt-1">Registered users</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">User Management</h2>
              
              {loading && <p className="text-center text-gray-500">Loading users...</p>}
              
              {!loading && users.length === 0 && (
                <p className="text-center text-gray-500 py-4">No users found</p>
              )}
              
              {!loading && users.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.group === "issuers" ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {user.group === "issuers" ? 'Issuer' : 'Verifier'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleToggleIssuer(user.email, user.group === "issuers"? true:false)}
                              className={`px-3 py-1 rounded ${user.group === "issuers" ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                              disabled={loading}
                            >
                              {user.group === "issuers" ? 'Make Verifier' : 'Make Issuer'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Create New User</h2>
              <form onSubmit={handleCreateUser}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={newUser.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={newUser.password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newUser.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isIssuer"
                    name="isIssuer"
                    checked={newUser.isIssuer}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isIssuer" className="ml-2 block text-sm text-gray-700">
                    Grant Issuer Privileges
                  </label>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                >
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;


