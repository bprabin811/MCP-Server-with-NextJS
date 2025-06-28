"use client";
import { useState } from "react";

interface ApiConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: Record<string, string>;
}

interface ApiConfigEditorProps {
  apiConfig: ApiConfig;
  onConfigChange: (config: ApiConfig) => void;
}

export default function ApiConfigEditor({ apiConfig, onConfigChange }: ApiConfigEditorProps) {
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');

  const addHeader = () => {
    if (!headerKey.trim() || !headerValue.trim()) return;
    
    onConfigChange({
      ...apiConfig,
      headers: {
        ...apiConfig.headers,
        [headerKey]: headerValue
      }
    });
    
    setHeaderKey('');
    setHeaderValue('');
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...apiConfig.headers };
    delete newHeaders[key];
    
    onConfigChange({
      ...apiConfig,
      headers: newHeaders
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
      <h3 className="text-sm font-medium text-gray-700 mb-3">API Configuration</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
          <select
            value={apiConfig.method}
            onChange={(e) => onConfigChange({
              ...apiConfig,
              method: e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">API URL *</label>
          <input
            type="url"
            value={apiConfig.url}
            onChange={(e) => onConfigChange({
              ...apiConfig,
              url: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://api.example.com/endpoint"
          />
        </div>
      </div>

      {/* Headers Section */}
      <div className="border-t border-gray-300 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Headers (Authentication & Custom)</h4>
        
        {/* Add Header Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          <div>
            <select
              value={headerKey}
              onChange={(e) => setHeaderKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Select header type</option>
              <option value="Authorization">Authorization (Bearer Token)</option>
              <option value="X-API-Key">X-API-Key</option>
              <option value="apikey">apikey</option>
              <option value="X-Auth-Token">X-Auth-Token</option>
              <option value="Content-Type">Content-Type</option>
              <option value="Accept">Accept</option>
              <option value="User-Agent">User-Agent</option>
              <option value="custom">Custom Header</option>
            </select>
          </div>
          {headerKey === 'custom' && (
            <input
              type="text"
              value=""
              onChange={(e) => setHeaderKey(e.target.value)}
              placeholder="Custom header name"
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          )}
          <div className={headerKey === 'custom' ? '' : 'md:col-span-1'}>
            <input
              type={headerKey === 'Authorization' ? 'password' : 'text'}
              value={headerValue}
              onChange={(e) => setHeaderValue(e.target.value)}
              placeholder={
                headerKey === 'Authorization' ? 'Bearer your-token-here' :
                headerKey === 'X-API-Key' || headerKey === 'apikey' ? 'your-api-key-here' :
                headerKey === 'Content-Type' ? 'application/json' :
                'Header value'
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <button
            onClick={addHeader}
            disabled={!headerKey.trim() || !headerValue.trim()}
            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Add Header
          </button>
        </div>

        {/* Headers List */}
        <div className="space-y-2">
          {Object.entries(apiConfig.headers).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between bg-white p-2 rounded border">
              <div className="flex-1">
                <span className="font-medium text-sm">{key}:</span>
                <span className="text-sm text-gray-600 ml-2">
                  {key.toLowerCase().includes('auth') || key.toLowerCase().includes('key') || key.toLowerCase().includes('token') 
                    ? '••••••••' 
                    : value}
                </span>
              </div>
              <button
                onClick={() => removeHeader(key)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {Object.keys(apiConfig.headers).length === 0 && (
            <p className="text-xs text-gray-500 italic">No headers added yet</p>
          )}
        </div>

        {/* Common Examples */}
        <div className="mt-3 p-3 bg-gray-50 rounded border text-xs">
          <p className="font-medium text-gray-700 mb-1">💡 Common Examples:</p>
          <ul className="text-gray-600 space-y-1">
            <li>• <strong>Bearer Token:</strong> Authorization → Bearer your-jwt-token</li>
            <li>• <strong>API Key:</strong> X-API-Key → your-secret-api-key</li>
            <li>• <strong>Basic Auth:</strong> Authorization → Basic base64(username:password)</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 