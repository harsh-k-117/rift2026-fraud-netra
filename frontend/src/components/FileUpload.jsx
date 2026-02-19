import React, { useState } from 'react';
import { uploadCSV } from '../services/api';

function FileUpload({ onAnalysisComplete, setSystemStatus }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Please upload a CSV file');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please upload a CSV file');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);
    setSystemStatus && setSystemStatus('loading');

    try {
      setLoadingStage('Uploading file');
      setProgress(10);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setLoadingStage('Building transaction graph');
      setProgress(30);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setLoadingStage('Running fraud detection');
      setProgress(50);
      const result = await uploadCSV(file);
      
      setLoadingStage('Finalizing analysis');
      setProgress(90);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setProgress(100);
      onAnalysisComplete(result);
      setSystemStatus && setSystemStatus('ready');
      
    } catch (err) {
      console.error('Upload failed:', err);
      const errorMessage = err.message || 'Failed to process file. Is the backend server running?';
      setError(errorMessage);
      setSystemStatus && setSystemStatus('error');
      setProgress(0);
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  return (
    <div className="card max-w-3xl">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-gray-900">Upload Transaction Data</h2>
        <p className="text-sm text-gray-500 mt-1">Upload CSV file to begin fraud detection analysis</p>
      </div>

      <div className="card-body">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : file
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            
            <label htmlFor="file-upload" className="cursor-pointer block">
              {!file ? (
                <div className="space-y-3">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600 hover:text-blue-500">Click to upload</span>
                    {' '}or drag and drop
                  </div>
                  <p className="text-xs text-gray-500">CSV files only</p>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                  <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </label>
          </div>

          {/* File Requirements */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800 font-medium mb-2">Required CSV Columns:</p>
            <p className="text-xs text-blue-600 font-mono">
              transaction_id, sender_id, receiver_id, amount, timestamp
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Loading Progress */}
          {loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-blue-900">{loadingStage}</span>
                <span className="text-blue-600">{progress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!file || loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Processing...' : 'Run Fraud Detection Analysis'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default FileUpload;
