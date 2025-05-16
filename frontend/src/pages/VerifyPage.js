import React, { useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { Auth } from 'aws-amplify';
import Navbar from '../components/Navbar';

function VerifyPage() {
  const [file, setFile] = useState(null);
  const [hash, setHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationMethod, setVerificationMethod] = useState('file');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    console.log('File selected for verification:', e.target.files[0].name);
  };

  const handleHashChange = (e) => {
    setHash(e.target.value);
  };

  const handleVerifyByFile = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    
    setLoading(true);
    console.log('Starting file verification process');
    
    try {
      const token = (await Auth.currentSession()).getIdToken().getJwtToken();
      
      const formData = new FormData();
      formData.append('certificate', file);
      
      console.log('Verifying certificate on blockchain...');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/verify/file`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('Verification result:', response.data);
      setVerificationResult(response.data);
      
      if (response.data.verified) {
        toast.success('Certificate verified successfully!');
      } else {
        toast.error('Certificate verification failed!');
      }
    } catch (error) {
      console.error('Error verifying certificate:', error);
      toast.error(error.response?.data?.message || 'Error verifying certificate');
      setVerificationResult({
        verified: false,
        error: error.response?.data?.message || 'Error verifying certificate'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyByHash = async (e) => {
    e.preventDefault();
    
    if (!hash) {
      toast.error('Please enter a certificate hash');
      return;
    }
    
    setLoading(true);
    console.log('Starting hash verification process');
    
    try {
      const token = (await Auth.currentSession()).getIdToken().getJwtToken();
      
      console.log('Verifying hash on blockchain...');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/verify/hash`,
        { hash },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('Verification result:', response.data);
      setVerificationResult(response.data);
      
      if (response.data.verified) {
        toast.success('Certificate hash verified successfully!');
      } else {
        toast.error('Certificate hash verification failed!');
      }
    } catch (error) {
      console.error('Error verifying hash:', error);
      toast.error(error.response?.data?.message || 'Error verifying hash');
      setVerificationResult({
        verified: false,
        error: error.response?.data?.message || 'Error verifying hash'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Verify Certificate</h1>
          
          <div className="mb-6">
            <div className="flex border-b border-gray-200">
              <button
                className={`py-2 px-4 font-medium ${verificationMethod === 'file' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setVerificationMethod('file')}
              >
                Verify by File
              </button>
              <button
                className={`py-2 px-4 font-medium ${verificationMethod === 'hash' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setVerificationMethod('hash')}
              >
                Verify by Hash
              </button>
            </div>
          </div>
          
          {verificationMethod === 'file' ? (
            <form onSubmit={handleVerifyByFile} className="space-y-4">
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
                {loading ? 'Verifying...' : 'Verify Certificate'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyByHash} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Certificate Hash</label>
                <input 
                  type="text" 
                  value={hash}
                  onChange={handleHashChange}
                  placeholder="Enter certificate hash"
                  className="w-full border border-gray-300 p-2 rounded"
                />
              </div>
              <button 
                type="submit"
                disabled={loading || !hash}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {loading ? 'Verifying...' : 'Verify Hash'}
              </button>
            </form>
          )}
          
          {verificationResult && (
            <div className={`mt-8 p-4 rounded-lg ${verificationResult.verified ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center">
                {verificationResult.verified ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <h3 className={`ml-2 text-lg font-medium ${verificationResult.verified ? 'text-green-800' : 'text-red-800'}`}>
                  {verificationResult.verified ? 'Certificate Verified' : 'Certificate Not Verified'}
                </h3>
              </div>
              
              {verificationResult.verified ? (
                <div className="mt-4 bg-white p-4 rounded border border-gray-200">
                  <h4 className="font-medium text-gray-700 mb-2">Certificate Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Hash</p>
                      <p className="font-mono text-xs break-all">{verificationResult.hash}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Issuer</p>
                      <p>{verificationResult.issuer || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Issue Date</p>
                      <p>{verificationResult.issueDate || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Transaction</p>
                      <a 
                        href={`https://sepolia.etherscan.io/tx/${verificationResult.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View on Etherscan
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-red-700">
                  {verificationResult.error || 'The certificate could not be verified on the blockchain.'}
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">How Certificate Verification Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mb-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-medium mb-2">Upload Certificate</h3>
              <p className="text-gray-600 text-sm">Upload your certificate file or enter its hash value to begin the verification process.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mb-3">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h3 className="font-medium mb-2">Blockchain Verification</h3>
              <p className="text-gray-600 text-sm">Our system checks the certificate against records stored on the Ethereum blockchain.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mb-3">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h3 className="font-medium mb-2">Instant Results</h3>
              <p className="text-gray-600 text-sm">Get immediate verification results and view certificate details if verified.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyPage;
