'use client';

import { File, FileText, Trash2, Download, Info } from 'lucide-react';

export default function DocumentList({ documents, onDelete }) {
  console.log('onDelete:', onDelete);

  const handleDeleteDocument = async (documentId) => {
    try {
      const response = await fetch(
        `http://localhost:3000/document/${documentId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      // Call the onDelete callback to update the parent component
      if (onDelete) {
        onDelete(documentId);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FileText className="h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
        <p className="mt-1 text-sm text-gray-500">
          Upload documents to start asking questions.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {documents.map((doc) => (
        <div key={doc._id} className="flex flex-col">
          <div className="flex items-center justify-between p-4 hover:bg-gray-50">
            <div className="flex items-center">
              <File className="h-5 w-5 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {doc.filename}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(doc.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => window.open(doc.url, '_blank')}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-500"
                title="Download document"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDeleteDocument(doc._id)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                title="Delete document"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
