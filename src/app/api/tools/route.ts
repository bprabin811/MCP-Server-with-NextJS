
import { NextRequest, NextResponse } from 'next/server';
import { 
  isDatabaseEnabled, 
  initializeDatabase, 
  getToolsFromDatabase, 
  saveToolToDatabase, 
  deleteToolFromDatabase,
  updateToolInDatabase 
} from '@/lib/database';

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

// Initialize database on module load
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized && isDatabaseEnabled()) {
    try {
      await initializeDatabase();
      dbInitialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }
}

// GET /api/tools - Get all custom tools
export async function GET() {
  try {
    if (isDatabaseEnabled()) {
      await ensureDbInitialized();
      const tools = await getToolsFromDatabase();
      return NextResponse.json({ tools, source: 'database' });
    } else {
      // Return empty array for localStorage mode (frontend handles localStorage)
      return NextResponse.json({ tools: [], source: 'localStorage' });
    }
  } catch (error) {
    console.error('Error fetching tools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tools', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/tools - Create a new custom tool
export async function POST(request: NextRequest) {
  try {
    const tool: Tool = await request.json();
    
    if (!tool.name?.trim()) {
      return NextResponse.json(
        { error: 'Tool name is required' },
        { status: 400 }
      );
    }

    if (isDatabaseEnabled()) {
      await ensureDbInitialized();
      await saveToolToDatabase(tool);
      return NextResponse.json({ 
        message: 'Tool saved successfully', 
        tool,
        source: 'database' 
      });
    } else {
      // For localStorage mode, just return success (frontend handles storage)
      return NextResponse.json({ 
        message: 'Tool received (localStorage mode)', 
        tool,
        source: 'localStorage' 
      });
    }
  } catch (error) {
    console.error('Error saving tool:', error);
    return NextResponse.json(
      { error: 'Failed to save tool', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT /api/tools - Update an existing custom tool
export async function PUT(request: NextRequest) {
  try {
    const { oldName, tool }: { oldName: string; tool: Tool } = await request.json();
    
    if (!oldName?.trim() || !tool.name?.trim()) {
      return NextResponse.json(
        { error: 'Old name and new tool name are required' },
        { status: 400 }
      );
    }

    if (isDatabaseEnabled()) {
      await ensureDbInitialized();
      await updateToolInDatabase(oldName, tool);
      return NextResponse.json({ 
        message: 'Tool updated successfully', 
        tool,
        source: 'database' 
      });
    } else {
      // For localStorage mode, just return success (frontend handles storage)
      return NextResponse.json({ 
        message: 'Tool update received (localStorage mode)', 
        tool,
        source: 'localStorage' 
      });
    }
  } catch (error) {
    console.error('Error updating tool:', error);
    return NextResponse.json(
      { error: 'Failed to update tool', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tools - Delete a custom tool
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const toolName = searchParams.get('name');
    
    if (!toolName?.trim()) {
      return NextResponse.json(
        { error: 'Tool name is required' },
        { status: 400 }
      );
    }

    if (isDatabaseEnabled()) {
      await ensureDbInitialized();
      await deleteToolFromDatabase(toolName);
      return NextResponse.json({ 
        message: 'Tool deleted successfully',
        source: 'database' 
      });
    } else {
      // For localStorage mode, just return success (frontend handles storage)
      return NextResponse.json({ 
        message: 'Tool deletion received (localStorage mode)',
        source: 'localStorage' 
      });
    }
  } catch (error) {
    console.error('Error deleting tool:', error);
    return NextResponse.json(
      { error: 'Failed to delete tool', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}