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

// Check if database mode is enabled by calling the API
async function isDatabaseMode(): Promise<boolean> {
  try {
    const response = await fetch('/api/tools');
    if (response.ok) {
      const data = await response.json();
      return data.source === 'database';
    }
    return false;
  } catch (error) {
    console.error('Error checking database mode:', error);
    return false;
  }
}

// Load tools from localStorage
function loadFromLocalStorage(): Tool[] {
  try {
    const savedTools = localStorage.getItem('customTools');
    return savedTools ? JSON.parse(savedTools) : [];
  } catch (error) {
    console.error('Error loading tools from localStorage:', error);
    return [];
  }
}

// Save tools to localStorage
function saveToLocalStorage(tools: Tool[]): void {
  try {
    localStorage.setItem('customTools', JSON.stringify(tools));
  } catch (error) {
    console.error('Error saving tools to localStorage:', error);
  }
}

// Get all custom tools - handles both localStorage and database modes
export async function getCustomTools(): Promise<Tool[]> {
  const isDbMode = await isDatabaseMode();
  
  if (isDbMode) {
    try {
      const response = await fetch('/api/tools');
      if (response.ok) {
        const data = await response.json();
        return data.tools || [];
      } else {
        console.error('Failed to fetch tools from database');
        return [];
      }
    } catch (error) {
      console.error('Error fetching tools from database:', error);
      return [];
    }
  } else {
    return loadFromLocalStorage();
  }
}

// Refresh MCP server tools cache
async function refreshMcpTools(): Promise<void> {
  try {
    // With the reduced cache duration (5 seconds), tools will be automatically
    // refreshed on the next MCP tool execution. No need for complex refresh logic.
    console.log('✅ MCP tools will refresh automatically within 5 seconds');
  } catch (error) {
    console.warn('⚠️ Error in refresh function:', error);
    // Don't throw error as this is not critical for the UI operation
  }
}

// Add a custom tool - handles both localStorage and database modes
export async function addCustomTool(tool: Tool): Promise<void> {
  const isDbMode = await isDatabaseMode();
  
  if (isDbMode) {
    try {
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...tool, isCustom: true }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save tool to database');
      }
    } catch (error) {
      console.error('Error saving tool to database:', error);
      throw error;
    }
  } else {
    const tools = loadFromLocalStorage();
    tools.push({ ...tool, isCustom: true });
    saveToLocalStorage(tools);
  }
  
  // Tools will refresh automatically within 5 seconds
  refreshMcpTools();
}

// Update a custom tool - handles both localStorage and database modes
export async function updateCustomTool(oldName: string, tool: Tool): Promise<void> {
  const isDbMode = await isDatabaseMode();
  
  if (isDbMode) {
    try {
      const response = await fetch('/api/tools', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldName, tool: { ...tool, isCustom: true } }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update tool in database');
      }
    } catch (error) {
      console.error('Error updating tool in database:', error);
      throw error;
    }
  } else {
    const tools = loadFromLocalStorage();
    const index = tools.findIndex(t => t.name === oldName);
    if (index !== -1) {
      tools[index] = { ...tool, isCustom: true };
      saveToLocalStorage(tools);
    }
  }
  
  // Tools will refresh automatically within 5 seconds
  refreshMcpTools();
}

// Delete a custom tool - handles both localStorage and database modes
export async function deleteCustomTool(toolName: string): Promise<void> {
  const isDbMode = await isDatabaseMode();
  
  if (isDbMode) {
    try {
      const response = await fetch(`/api/tools?name=${encodeURIComponent(toolName)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete tool from database');
      }
    } catch (error) {
      console.error('Error deleting tool from database:', error);
      throw error;
    }
  } else {
    const tools = loadFromLocalStorage();
    const filtered = tools.filter(t => t.name !== toolName);
    saveToLocalStorage(filtered);
  }
  
  // Tools will refresh automatically within 5 seconds
  refreshMcpTools();
}

// Get storage information - correctly reports database status
export async function getStorageInfo(): Promise<{ mode: 'localStorage' | 'database'; isDatabase: boolean }> {
  const isDbMode = await isDatabaseMode();
  return { 
    mode: isDbMode ? 'database' : 'localStorage', 
    isDatabase: isDbMode 
  };
} 