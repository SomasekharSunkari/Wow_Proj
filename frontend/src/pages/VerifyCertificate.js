import React, { useState } from 'react';
import { Auth } from 'aws-amplify';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

function VerifyCertificate() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('certificate', file);
      
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/verify`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      setResult({
        hash: response.data.hash,
        isAuthentic: response.data.isAuthentic
      });
      
      if (response.data.isAuthentic) {
        toast.success('Certificate verified as authentic!');
      } else {
        toast.error('Certificate could not be verified!');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error verifying certificate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Certificate Verification</h1>
          <Link to="/" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            Back to Dashboard
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Verify Certificate Authenticity</h2>
          <form onSubmit={handleVerify}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Select Certificate (PDF or Image)</label>
              <input 
                type="file" 
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="w-full border border-gray-300 p-2 rounded"
              />
            </div>
            <button 
              type="submit"
              disabled={loading || !file}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? 'Verifying...' : 'Verify Certificate'}
            </button>
          </form>
        </div>
        
        {result && (
          <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${result.isAuthentic ? 'border-green-500' : 'border-red-500'}`}>
            <h2 className="text-xl font-semibold mb-4">Verification Result</h2>
            <div className="mb-4">
              <p className="text-gray-700 mb-2">Certificate Hash:</p>
              <p className="font-mono bg-gray-100 p-2 rounded">{result.hash}</p>
            </div>
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${result.isAuthentic ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
                {result.isAuthentic ? '✓' : '⚠️'}
              </div>
              <p className={`font-semibold ${result.isAuthentic ? 'text-green-600' : 'text-red-600'}`}>
                {result.isAuthentic ? 'Certificate is authentic' : 'Certificate could not be verified'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyCertificate;