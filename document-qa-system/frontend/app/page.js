'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import DocumentList from '@/components/DocumentList.js';
import ChatInterface from '@/components/ChatInterface.js';

export default function Home() {
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch documents on component mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('http://localhost:3000/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('documents', files[i]);
    }

    try {
      const response = await fetch('http://localhost:3000/add-data', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload documents');
      }

      const result = await response.json();

      setDocuments((prev) => [
        ...prev,
        ...(result.article ? [result.article] : []),
      ]);

      fetchDocuments();
    } catch (error) {
      console.error('Error uploading documents:', error);
      alert('Failed to upload documents. Please try again.');
    } finally {
      setIsUploading(false);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDocumentDelete = (documentId) => {
    setDocuments((prev) => prev.filter((doc) => doc._id !== documentId));
  };

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Document Q&A System
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Documents
                </>
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
              accept=".pdf"
            />
          </div>
        </div>
      </header>

      <div className="container mx-auto flex flex-1 gap-6 px-4 py-6">
        <div className="w-1/3 overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h2 className="text-lg font-medium text-gray-800">Documents</h2>
          </div>
          <DocumentList documents={documents} onDelete={handleDocumentDelete} />
        </div>

        <div className="w-2/3 overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <ChatInterface />
        </div>
      </div>
    </main>
  );
}
