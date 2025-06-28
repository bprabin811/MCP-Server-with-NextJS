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

// Get all custom tools
export async function getCustomTools(): Promise<Tool[]> {
  return loadFromLocalStorage();
}

// Add a custom tool
export async function addCustomTool(tool: Tool): Promise<void> {
  const tools = loadFromLocalStorage();
  tools.push({ ...tool, isCustom: true });
  saveToLocalStorage(tools);
}

// Update a custom tool
export async function updateCustomTool(oldName: string, tool: Tool): Promise<void> {
  const tools = loadFromLocalStorage();
  const index = tools.findIndex(t => t.name === oldName);
  if (index !== -1) {
    tools[index] = { ...tool, isCustom: true };
    saveToLocalStorage(tools);
  }
}

// Delete a custom tool
export async function deleteCustomTool(toolName: string): Promise<void> {
  const tools = loadFromLocalStorage();
  const filtered = tools.filter(t => t.name !== toolName);
  saveToLocalStorage(filtered);
}

// Get storage information (now always localStorage)
export async function getStorageInfo(): Promise<{ mode: 'localStorage'; isDatabase: boolean }> {
  return { mode: 'localStorage', isDatabase: false };
} 