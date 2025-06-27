"use client";
import { setupClient } from "./utils/clientUtils";
import { useEffect, useState } from "react";
import ToolManagerModal from "./components/ToolManagerModal";

interface ParameterSchema {
  type: string;
  description?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  default?: string | number | boolean;
}

interface Tool {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, ParameterSchema>;
    required?: string[];
  };
  isCustom?: boolean;
  customType?: 'normal' | 'api';
  apiConfig?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
  };
  customLogic?: string;
}

interface FormData {
  [key: string]: string | number | boolean;
}

interface ToolResult {
  content?: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export default function Home() {
  const [allTools, setAllTools] = useState<{ tools: unknown[] } | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [result, setResult] = useState<ToolResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToolManager, setShowToolManager] = useState(false);
  const [customTools, setCustomTools] = useState<Tool[]>([]);

  useEffect(() => {
    // Load custom tools from localStorage
    const savedTools = localStorage.getItem('customTools');
    if (savedTools) {
      try {
        setCustomTools(JSON.parse(savedTools));
      } catch (error) {
        console.error('Error loading custom tools:', error);
      }
    }

    async function fetchTools() {
      try {
        const client = await setupClient();
        const serverTools = await client.listTools();
        setAllTools(serverTools as { tools: unknown[] });
        setError(null); // Clear any previous errors
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(`Failed to fetch tools: ${errorMessage}`);
        console.error('Error fetching tools:', err);
      }
    }
    fetchTools();
  }, []);

  // Combine server tools with custom tools
  const combinedTools = {
    tools: [
      ...(allTools?.tools || []).map(tool => tool as Tool),
      ...customTools
    ]
  };

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
    setFormData({});
    setResult(null);
    setError(null);
  };

  const handleInputChange = (key: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTool) return;

    setLoading(true);
    setError(null);
    
    try {
      if (selectedTool.isCustom) {
        // Handle custom tools
        if (selectedTool.customType === 'api') {
          const result = await executeApiTool(selectedTool, formData);
          setResult(result);
        } else {
          // Handle normal custom tools with custom logic
          const result = await executeCustomLogic(selectedTool, formData);
          setResult(result);
        }
      } else {
        // Handle server tools
        const client = await setupClient();
        const toolResult = await client.callTool({
          name: selectedTool.name,
          arguments: formData
        });
        setResult(toolResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute tool');
    } finally {
      setLoading(false);
    }
  };

  const executeApiTool = async (tool: Tool, params: FormData): Promise<ToolResult> => {
    if (!tool.apiConfig) throw new Error('API configuration missing');
    
    const { url, method, headers = {} } = tool.apiConfig;
    let finalUrl = url;
    let body: string | undefined = undefined;

    // Replace URL parameters for GET requests
    if (method === 'GET') {
      const urlParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          urlParams.append(key, String(value));
        }
      });
      if (urlParams.toString()) {
        finalUrl += (url.includes('?') ? '&' : '?') + urlParams.toString();
      }
    } else {
      // For other methods, send as JSON body
      body = JSON.stringify(params);
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(finalUrl, {
      method,
      headers,
      body
    });

    const responseText = await response.text();
    let responseJson;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = responseText;
    }

    return {
      content: [{
        type: "text",
        text: `🌐 API Response (${response.status} ${response.statusText}):\n${JSON.stringify(responseJson, null, 2)}`
      }]
    };
  };

  const executeCustomLogic = async (tool: Tool, params: FormData): Promise<ToolResult> => {
    try {
      if (!tool.customLogic || tool.customLogic.trim() === '') {
        return {
          content: [{
            type: "text",
            text: `🛠️ Custom Tool "${tool.name}" executed with parameters:\n${JSON.stringify(params, null, 2)}\n\n⚠️ No custom logic defined for this tool.`
          }]
        };
      }

      // Create a safe execution environment
      const safeGlobals = {
        console: {
          log: (...args: unknown[]) => console.log(`[${tool.name}]`, ...args),
          error: (...args: unknown[]) => console.error(`[${tool.name}]`, ...args),
          warn: (...args: unknown[]) => console.warn(`[${tool.name}]`, ...args)
        },
        JSON,
        Math,
        Date,
        String,
        Number,
        Boolean,
        Array,
        Object,
        RegExp,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        encodeURIComponent,
        decodeURIComponent,
        btoa,
        atob
      };

      // Wrap the user code in a function
      const functionCode = `
        return (function(params, globals) {
          // Make globals available
          ${Object.keys(safeGlobals).map(key => `const ${key} = globals.${key};`).join('\n')}
          
          // User's custom logic
          ${tool.customLogic}
        })(params, globals);
      `;

      // Execute the user's code
      const userFunction = new Function('params', 'globals', functionCode);
      const result = await userFunction(params, safeGlobals);

      // Format the result
      if (typeof result === 'string') {
        return {
          content: [{
            type: "text",
            text: result
          }]
        };
      } else if (result && typeof result === 'object') {
        // If the result has the MCP format, use it directly
        if (result.content && Array.isArray(result.content)) {
          return result;
        } else {
          // Otherwise, stringify the object
          return {
            content: [{
              type: "text",
              text: `🛠️ ${tool.name} Result:\n${JSON.stringify(result, null, 2)}`
            }]
          };
        }
      } else {
        return {
          content: [{
            type: "text",
            text: `🛠️ ${tool.name} Result: ${String(result)}`
          }]
        };
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error executing custom logic: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your JavaScript code for syntax errors.`
        }]
      };
    }
  };

  const addCustomTool = (tool: Tool) => {
    const newCustomTools = [...customTools, { ...tool, isCustom: true }];
    setCustomTools(newCustomTools);
    localStorage.setItem('customTools', JSON.stringify(newCustomTools));
    setShowToolManager(false);
  };

  const deleteCustomTool = (toolName: string) => {
    const newCustomTools = customTools.filter(tool => tool.name !== toolName);
    setCustomTools(newCustomTools);
    localStorage.setItem('customTools', JSON.stringify(newCustomTools));
    if (selectedTool?.name === toolName) {
      setSelectedTool(null);
      setFormData({});
      setResult(null);
    }
  };

  const editCustomTool = (oldName: string, updatedTool: Tool) => {
    const newCustomTools = customTools.map(tool => 
      tool.name === oldName ? { ...updatedTool, isCustom: true } : tool
    );
    setCustomTools(newCustomTools);
    localStorage.setItem('customTools', JSON.stringify(newCustomTools));
    
    // Update selected tool if it's the one being edited
    if (selectedTool?.name === oldName) {
      setSelectedTool({ ...updatedTool, isCustom: true });
      setFormData({});
      setResult(null);
    }
    setShowToolManager(false);
  };

  const renderFormField = (key: string, schema: ParameterSchema, required: boolean = false) => {
    const { type, description, enum: enumValues, minimum, maximum, default: defaultValue } = schema;
    
    if (enumValues) {
      return (
        <select
          value={String(formData[key] || defaultValue || '')}
          onChange={(e) => handleInputChange(key, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required={required}
        >
          <option value="">Select {key}</option>
          {enumValues.map((value: string) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      );
    }

    switch (type) {
      case 'number':
      case 'integer':
        return (
          <input
            type="number"
            value={String(formData[key] || defaultValue || '')}
            onChange={(e) => handleInputChange(key, type === 'integer' ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0)}
            min={minimum}
            max={maximum}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={description || `Enter ${key}`}
            required={required}
          />
        );
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={Boolean(formData[key] || defaultValue || false)}
            onChange={(e) => handleInputChange(key, e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
        );
      default:
        return (
          <textarea
            value={String(formData[key] || defaultValue || '')}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-y"
            placeholder={description || `Enter ${key}`}
            required={required}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  🛠️ MCP Utilities
                </h1>
              </div>
            </div>

            {/* Tool Management & GitHub Button */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowToolManager(true)}
                className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Tool Manager
              </button>
              <a
                href="https://github.com/modelcontextprotocol/servers"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                </svg>
                Star on GitHub
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
            {/* Tools List - Left Panel */}
            <div className="lg:col-span-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Available Tools</h2>
                <p className="text-sm text-gray-600">Click on a tool to use it</p>
              </div>
              <div className="overflow-y-auto h-full pb-24">
                {combinedTools.tools && combinedTools.tools.length > 0 ? (
                  <div className="p-4 space-y-2 pb-8">
                    {combinedTools.tools.map((tool: Tool, index: number) => (
                      <div
                        key={index}
                        onClick={() => handleToolSelect(tool)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                          selectedTool?.name === tool.name
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900 mb-1">{tool.name}</div>
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {tool.description || 'No description available'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    {error ? `Error: ${error}` : 'Loading tools...'}
                  </div>
                )}
              </div>
            </div>

            {/* Tool Form - Right Panel */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              {selectedTool ? (
                <div className="h-full flex flex-col">
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">{selectedTool.name}</h2>
                    <p className="text-sm text-gray-600">{selectedTool.description}</p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4">
                    {selectedTool.inputSchema?.properties ? (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        {Object.entries(selectedTool.inputSchema.properties).map(([key, schema]: [string, ParameterSchema]) => {
                          const isRequired = selectedTool.inputSchema?.required?.includes(key) || false;
                          return (
                            <div key={key}>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {key}
                                {isRequired && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              {renderFormField(key, schema, isRequired)}
                              {schema.description && (
                                <p className="text-xs text-gray-500 mt-1">{schema.description}</p>
                              )}
                            </div>
                          );
                        })}
                        
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loading ? 'Running...' : `Run ${selectedTool.name}`}
                        </button>
                      </form>
                    ) : (
                      <div className="text-center text-gray-500">
                        <p>This tool doesn&apos;t require any parameters.</p>
                        <button
                          onClick={handleSubmit}
                          disabled={loading}
                          className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loading ? 'Running...' : `Run ${selectedTool.name}`}
                        </button>
                      </div>
                    )}

                    {/* Results Section */}
                    {(result || error) && (
                      <div className="mt-6 border-t pt-4">
                        <h3 className="text-lg font-medium text-gray-800 mb-2">Result</h3>
                        {error ? (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800 text-sm">{error}</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {result?.content?.map((item: { type: string; text?: string; [key: string]: unknown }, index: number) => {
                              if (item.type === 'text') {
                                return (
                                  <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <pre className="text-sm text-green-800 whitespace-pre-wrap overflow-x-auto font-mono">
                                      {item.text}
                                    </pre>
                                  </div>
                                );
                              } else {
                                return (
                                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <p className="text-xs text-gray-500 mb-2">Type: {item.type}</p>
                                    <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">
                                      {JSON.stringify(item, null, 2)}
                                    </pre>
                                  </div>
                                );
                              }
                            }) || (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <p className="text-sm text-gray-600 mb-2">Raw Response:</p>
                                <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">
                                  {JSON.stringify(result, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-4xl mb-4">🛠️</div>
                    <h3 className="text-lg font-medium mb-2">Select a Tool</h3>
                    <p className="text-sm">Choose a tool from the left panel to get started</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Footer */}
      <footer className="text-center mt-12 pt-8 border-t border-gray-200 text-gray-500">
        <p className="text-lg">🚀 MCP Utility Server - Built with Next.js</p>
        <p className="text-sm mt-2">
          Validate • Convert • Generate • Transform • Secure
        </p>
      </footer>

      {/* Tool Management Modal */}
      {showToolManager && (
        <ToolManagerModal 
          onClose={() => setShowToolManager(false)}
          onAddTool={addCustomTool}
          customTools={customTools}
          onDeleteTool={deleteCustomTool}
          onEditTool={editCustomTool}
        />
      )}
    </div>
  );
}