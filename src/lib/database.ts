import { Pool } from 'pg';

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

let pool: Pool | null = null;

export function isDatabaseEnabled(): boolean {
  return process.env.USEDB === 'true' && !!process.env.DATABASE_URL;
}

export function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

export async function initializeDatabase(): Promise<void> {
  if (!isDatabaseEnabled()) {
    return;
  }

  const client = getPool();
  
  try {
    // Create custom_tools table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS custom_tools (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        custom_type VARCHAR(10) DEFAULT 'normal',
        input_schema JSONB,
        query_schema JSONB,
        api_config JSONB,
        custom_logic TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on name for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_custom_tools_name ON custom_tools(name)
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export async function saveToolToDatabase(tool: Tool): Promise<void> {
  if (!isDatabaseEnabled()) {
    throw new Error('Database is not enabled');
  }

  const client = getPool();
  
  try {
    await client.query(
      `INSERT INTO custom_tools (name, description, custom_type, input_schema, query_schema, api_config, custom_logic)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (name) 
       DO UPDATE SET 
         description = EXCLUDED.description,
         custom_type = EXCLUDED.custom_type,
         input_schema = EXCLUDED.input_schema,
         query_schema = EXCLUDED.query_schema,
         api_config = EXCLUDED.api_config,
         custom_logic = EXCLUDED.custom_logic,
         updated_at = CURRENT_TIMESTAMP`,
      [
        tool.name,
        tool.description || null,
        tool.customType || 'normal',
        tool.inputSchema ? JSON.stringify(tool.inputSchema) : null,
        tool.querySchema ? JSON.stringify(tool.querySchema) : null,
        tool.apiConfig ? JSON.stringify(tool.apiConfig) : null,
        tool.customLogic || null
      ]
    );
  } catch (error) {
    console.error('Error saving tool to database:', error);
    throw error;
  }
}

export async function getToolsFromDatabase(): Promise<Tool[]> {
  if (!isDatabaseEnabled()) {
    throw new Error('Database is not enabled');
  }

  const client = getPool();
  
  try {
    const result = await client.query(
      'SELECT * FROM custom_tools ORDER BY created_at DESC'
    );

    return result.rows.map(row => ({
      name: row.name,
      description: row.description,
      customType: row.custom_type as 'normal' | 'api',
      inputSchema: row.input_schema || undefined,
      querySchema: row.query_schema || undefined,
      apiConfig: row.api_config || undefined,
      customLogic: row.custom_logic,
      isCustom: true
    }));
  } catch (error) {
    console.error('Error getting tools from database:', error);
    throw error;
  }
}

export async function deleteToolFromDatabase(toolName: string): Promise<void> {
  if (!isDatabaseEnabled()) {
    throw new Error('Database is not enabled');
  }

  const client = getPool();
  
  try {
    await client.query('DELETE FROM custom_tools WHERE name = $1', [toolName]);
  } catch (error) {
    console.error('Error deleting tool from database:', error);
    throw error;
  }
}

export async function updateToolInDatabase(oldName: string, tool: Tool): Promise<void> {
  if (!isDatabaseEnabled()) {
    throw new Error('Database is not enabled');
  }

  const client = getPool();
  
  try {
    // If name changed, we need to update the name field too
    await client.query(
      `UPDATE custom_tools 
       SET name = $1, description = $2, custom_type = $3, input_schema = $4, 
           query_schema = $5, api_config = $6, custom_logic = $7, updated_at = CURRENT_TIMESTAMP
       WHERE name = $8`,
      [
        tool.name,
        tool.description || null,
        tool.customType || 'normal',
        tool.inputSchema ? JSON.stringify(tool.inputSchema) : null,
        tool.querySchema ? JSON.stringify(tool.querySchema) : null,
        tool.apiConfig ? JSON.stringify(tool.apiConfig) : null,
        tool.customLogic || null,
        oldName
      ]
    );
  } catch (error) {
    console.error('Error updating tool in database:', error);
    throw error;
  }
} 