"use client";
import { useState } from "react";

interface ParameterSchema {
  type: string;
  description?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  default?: string | number | boolean;
}

interface InputSchema {
  type: string;
  properties: Record<string, ParameterSchema>;
  required: string[];
}

interface Tool {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, ParameterSchema>;
    required?: string[];
  };
  querySchema?: {
    type: string;
    properties?: Record<string, ParameterSchema>;
    required?: string[];
  };
  isCustom?: boolean;
  customType?: 'normal' | 'api';
  apiConfig?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
  };
  customLogic?: string;
}

interface ToolManagerModalProps {
  onClose: () => void;
  onAddTool: (tool: Tool) => void;
  customTools: Tool[];
  onDeleteTool: (toolName: string) => void;
  onEditTool?: (oldName: string, newTool: Tool) => void;
}

import CustomLogicEditor from './CustomLogicEditor';
import ApiConfigEditor from './ApiConfigEditor';
import ParameterBuilder from './ParameterBuilder';

export default function ToolManagerModal({ onClose, onAddTool, customTools, onDeleteTool, onEditTool }: ToolManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [editingTool, setEditingTool] = useState<string | null>(null);
  const [newTool, setNewTool] = useState({
    name: '',
    description: '',
    customType: 'normal' as 'normal' | 'api',
    customLogic: '',
    apiConfig: {
      url: '',
      method: 'GET' as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      headers: {} as Record<string, string>
    },
    inputSchema: {
      type: 'object',
      properties: {} as Record<string, ParameterSchema>,
      required: [] as string[]
    },
    querySchema: {
      type: 'object',
      properties: {} as Record<string, ParameterSchema>,
      required: [] as string[]
    }
  });

  const handleSubmit = () => {
    if (!newTool.name.trim()) {
      alert('Tool name is required');
      return;
    }

    if (newTool.customType === 'api' && !newTool.apiConfig.url.trim()) {
      alert('API URL is required for API tools');
      return;
    }

    const tool: Tool = {
      name: newTool.name,
      description: newTool.description,
      customType: newTool.customType,
      inputSchema: Object.keys(newTool.inputSchema.properties).length > 0 ? newTool.inputSchema : undefined,
      querySchema: Object.keys(newTool.querySchema.properties).length > 0 ? newTool.querySchema : undefined,
      apiConfig: newTool.customType === 'api' ? newTool.apiConfig : undefined,
      customLogic: newTool.customType === 'normal' ? newTool.customLogic : undefined
    };

    if (editingTool && onEditTool) {
      onEditTool(editingTool, tool);
    } else {
      onAddTool(tool);
    }
    
    // Reset form
    resetForm();
  };

  const resetForm = () => {
    setNewTool({
      name: '',
      description: '',
      customType: 'normal',
      customLogic: '',
      apiConfig: {
        url: '',
        method: 'GET',
        headers: {}
      },
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      },
      querySchema: {
        type: 'object',
        properties: {},
        required: []
      }
    });
    setEditingTool(null);
    setActiveTab('list');
  };

  const handleEditTool = (tool: Tool) => {
    setNewTool({
      name: tool.name,
      description: tool.description || '',
      customType: tool.customType || 'normal',
      customLogic: tool.customLogic || '',
      apiConfig: {
        url: tool.apiConfig?.url || '',
        method: tool.apiConfig?.method || 'GET',
        headers: tool.apiConfig?.headers || {}
      },
      inputSchema: {
        type: 'object',
        properties: tool.inputSchema?.properties || {},
        required: tool.inputSchema?.required || []
      },
      querySchema: {
        type: 'object',
        properties: tool.querySchema?.properties || {},
        required: tool.querySchema?.required || []
      }
    });
    setEditingTool(tool.name);
    setActiveTab('add');
  };

  const loadTemplate = (template: 'text_processor' | 'calculator' | 'data_formatter') => {
    const templates = {
      text_processor: {
        name: 'text_processor',
        description: 'Process and transform text in various ways',
        customLogic: `// Simple text processor
const { text } = params;
return text ? text.toUpperCase() : "No text provided";`,
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to process'
            }
          },
          required: ['text']
        }
      },
      calculator: {
        name: 'calculator',
        description: 'Perform basic mathematical operations',
        customLogic: `// Calculator
const { num1, num2, operation } = params;
const a = parseFloat(num1) || 0;
const b = parseFloat(num2) || 0;

switch(operation) {
  case 'add': return a + " + " + b + " = " + (a + b);
  case 'subtract': return a + " - " + b + " = " + (a - b);
  case 'multiply': return a + " × " + b + " = " + (a * b);
  case 'divide': return b !== 0 ? a + " ÷ " + b + " = " + (a / b) : "Cannot divide by zero";
  default: return "Unsupported operation";
}`,
        inputSchema: {
          type: 'object',
          properties: {
            num1: {
              type: 'number',
              description: 'First number'
            },
            num2: {
              type: 'number', 
              description: 'Second number'
            },
            operation: {
              type: 'string',
              enum: ['add', 'subtract', 'multiply', 'divide'],
              description: 'Mathematical operation to perform'
            }
          },
          required: ['num1', 'num2', 'operation']
        }
      },
      data_formatter: {
        name: 'data_formatter',
        description: 'Format and process data with timestamps',
        customLogic: `// Data formatter
const data = params;
const timestamp = new Date().toISOString();

return {
  content: [{
    type: "text",
    text: "📊 Processed at: " + timestamp + "\\n\\n📋 Data:\\n" + JSON.stringify(data, null, 2)
  }]
};`,
        inputSchema: {
          type: 'object',
          properties: {
            data: {
              type: 'string',
              description: 'Data to format (JSON string or text)'
            },
            format: {
              type: 'string',
              enum: ['json', 'text'],
              description: 'Output format'
            }
          },
          required: ['data']
        }
      }
    };

    const templateData = templates[template];
    setNewTool(prev => ({
      ...prev,
      name: templateData.name,
      description: templateData.description,
      customLogic: templateData.customLogic,
      inputSchema: templateData.inputSchema
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-100/10 bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">🛠️ Tool Manager</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'list' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Custom Tools ({customTools.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'add' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {editingTool ? 'Edit Tool' : 'Add New Tool'}
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* custome tools are saved in local storage , to make accessable, please use database to store them*/}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Note:</strong> Custom tools are currently stored in local storage. For production use, please implement a database solution to ensure data persistence and accessibility across clients.
                </p>
              </div>
            </div>
          </div>
          {activeTab === 'list' ? (
            <div className="space-y-4">
              {customTools.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-lg mb-2">No custom tools yet</p>
                  <p className="text-sm">Click &ldquo;Add New Tool&rdquo; to create your first custom tool!</p>
                </div>
              ) : (
                customTools.map((tool, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-gray-900">{tool.name}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            tool.customType === 'api' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {tool.customType?.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{tool.description}</p>
                        {tool.apiConfig && (
                          <div className="text-xs text-gray-500 space-y-1">
                            <p>{tool.apiConfig.method} {tool.apiConfig.url}</p>
                            {tool.apiConfig.headers && Object.keys(tool.apiConfig.headers).length > 0 && (
                              <p className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                {Object.keys(tool.apiConfig.headers).length} header(s) configured
                                {Object.keys(tool.apiConfig.headers).some(key => 
                                  key.toLowerCase().includes('auth') || 
                                  key.toLowerCase().includes('key') || 
                                  key.toLowerCase().includes('token')
                                ) && (
                                  <span className="text-green-600 font-medium">• Auth enabled</span>
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleEditTool(tool)}
                          className="text-blue-400 hover:text-blue-600 transition-colors"
                          title="Edit tool"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDeleteTool(tool.name)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="Delete tool"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tool Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tool Type</label>
                <select
                  value={newTool.customType}
                  onChange={(e) => setNewTool(prev => ({ ...prev, customType: e.target.value as 'normal' | 'api' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="normal">Normal Tool (Custom Logic)</option>
                  <option value="api">API Tool (HTTP Request)</option>
                </select>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tool Name *</label>
                  <input
                    type="text"
                    value={newTool.name}
                    onChange={(e) => setNewTool(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="my_custom_tool"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={newTool.description}
                    onChange={(e) => setNewTool(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="What does this tool do?"
                  />
                </div>
              </div>

              {/* Custom Logic Editor (only for normal tools) */}
              {newTool.customType === 'normal' && (
                                 <CustomLogicEditor 
                   customLogic={newTool.customLogic}
                   onLogicChange={(logic: string) => setNewTool(prev => ({ ...prev, customLogic: logic }))}
                   onTemplateLoad={loadTemplate}
                 />
              )}

              {/* API Configuration (only for API tools) */}
              {newTool.customType === 'api' && (
                <ApiConfigEditor 
                  apiConfig={newTool.apiConfig}
                  onConfigChange={(config) => setNewTool(prev => ({ ...prev, apiConfig: config }))}
                />
              )}

              {/* Query Parameters (only for API tools) */}
              {newTool.customType === 'api' && (
                <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">🔗 Query Parameters (URL Parameters)</h3>
                  <p className="text-xs text-gray-600 mb-3">
                    Parameters that will be added to the URL as query string (e.g., ?limit=10&offset=0)
                  </p>
                  <ParameterBuilder 
                    inputSchema={newTool.querySchema}
                    onSchemaChange={(schema: InputSchema) => setNewTool(prev => ({ ...prev, querySchema: schema }))}
                  />
                </div>
              )}

              {/* Body Parameters */}
              <div className={`border border-gray-200 rounded-lg p-4 ${newTool.customType === 'api' ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  {newTool.customType === 'api' ? '📦 Body Parameters (Request Payload)' : '⚙️ Tool Parameters'}
                </h3>
                {newTool.customType === 'api' && (
                  <p className="text-xs text-gray-600 mb-3">
                    Parameters that will be sent in the request body (for POST/PUT/PATCH) or as URL parameters (for GET)
                  </p>
                )}
                <ParameterBuilder 
                  inputSchema={newTool.inputSchema}
                  onSchemaChange={(schema: InputSchema) => setNewTool(prev => ({ ...prev, inputSchema: schema }))}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {editingTool ? 'Update Tool' : 'Create Tool'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 