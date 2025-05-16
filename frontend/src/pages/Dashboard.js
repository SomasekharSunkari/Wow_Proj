import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import Navbar from '../components/Navbar';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [isIssuer, setIsIssuer] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [certificates, setCertificates] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const userData = await Auth.currentAuthenticatedUser();
        setUser(userData);
        
        // Check if user is in issuers group
        const groups = userData.signInUserSession.accessToken.payload['cognito:groups'] || [];
        setIsIssuer(groups.includes('issuers'));
        
        
        
        console.log('User authenticated:', userData.attributes.email);
      } catch (error) {
        console.log('User not authenticated, redirecting to login');
        navigate('/login');
      }
    };
    
    checkUser();
  }, [navigate]);



  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    console.log('File selected:', e.target.files[0].name);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    
    setLoading(true);
    console.log('Starting certificate upload process');
    
    try {
      const token = (await Auth.currentSession()).getIdToken().getJwtToken();
      
      const formData = new FormData();
      formData.append('certificate', file);
      
      console.log('Uploading certificate to blockchain...');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('Certificate uploaded successfully:', response.data);
      toast.success('Certificate uploaded and verified on blockchain!');
      setCertificates([...certificates, {
        name: file.name,
        hash: response.data.hash,
        date: new Date().toLocaleString(),
        txHash: response.data.txHash
      }]);
      setFile(null);
    } catch (error) {
      console.error('Error uploading certificate:', error);
      toast.error(error.response?.data?.message || 'Error uploading certificate');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="text-center p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center mb-4">
            <div className="bg-indigo-100 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-semibold text-gray-800">Welcome, {user.attributes?.email}</h2>
              <p className="text-gray-600">
                User Type: <span className="font-medium">{isIssuer ? 'Certificate Issuer' : 'Certificate Verifier'}</span>
              </p>
            </div>
          </div>
          
          
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Certificate Issuance</h3>
            <p className="mb-4">Issue tamper-proof certificates secured by blockchain technology.</p>
            {isIssuer ? (
              <Link to="/" className="inline-block px-4 py-2 bg-white text-indigo-600 rounded hover:bg-gray-100">
                Issue Certificate
              </Link>
            ) : (
              <p className="text-sm bg-indigo-700 p-2 rounded">Requires issuer privileges</p>
            )}
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Certificate Verification</h3>
            <p className="mb-4">Verify the authenticity of certificates using blockchain validation.</p>
            <Link to="/verify" className="inline-block px-4 py-2 bg-white text-green-600 rounded hover:bg-gray-100">
              Verify Certificate
            </Link>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Admin Controls</h3>
            <p className="mb-4">Manage users and system settings with admin privileges.</p>
            {isIssuer ? (
              <Link to="/admin" className="inline-block px-4 py-2 bg-white text-purple-600 rounded hover:bg-gray-100">
                Admin Panel
              </Link>
            ) : (
              <p className="text-sm bg-purple-700 p-2 rounded">Requires issuer privileges</p>
            )}
          </div>
        </div>
        
        {isIssuer && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Upload Certificate</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Select Certificate File</label>
                <input 
                  type="file" 
                  onChange={handleFileChange}
                  className="w-full border border-gray-300 p-2 rounded"
                />
              </div>
              <button 
                type="submit"
                disabled={loading || !file}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {loading ? 'Uploading...' : 'Upload to Blockchain'}
              </button>
            </form>
          </div>
        )}
        
        {certificates.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Certificates</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Certificate Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hash
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {certificates.map((cert, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cert.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-mono">{cert.hash.substring(0, 16)}...</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cert.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a 
                          href={`https://sepolia.etherscan.io/tx/${cert.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View on Etherscan
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;


