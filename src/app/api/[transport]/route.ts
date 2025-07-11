import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import crypto from 'crypto';
import { isDatabaseEnabled, getToolsFromDatabase } from '@/lib/database';

// Types for custom tools
interface ParameterSchema {
  type: string;
  description?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  default?: string | number | boolean;
}

interface CustomTool {
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

// Cache for tools with timestamp
let toolsCache: {
  tools: CustomTool[];
  timestamp: number;
  registered: Set<string>;
} = {
  tools: [],
  timestamp: 0,
  registered: new Set()
};

// Cache duration in milliseconds (5 seconds for more responsive updates)
const CACHE_DURATION = 5 * 1000;

// Convert parameter schema to Zod schema
function parameterToZodSchema(param: ParameterSchema): z.ZodType<unknown> {
  let schema: z.ZodType<unknown>;
  
  switch (param.type) {
    case 'string':
      schema = z.string();
      if (param.enum) {
        schema = z.enum(param.enum as [string, ...string[]]);
      }
      break;
    case 'number':
      schema = z.number();
      if (param.minimum !== undefined) {
        schema = (schema as z.ZodNumber).min(param.minimum);
      }
      if (param.maximum !== undefined) {
        schema = (schema as z.ZodNumber).max(param.maximum);
      }
      break;
    case 'integer':
      schema = z.number().int();
      if (param.minimum !== undefined) {
        schema = (schema as z.ZodNumber).min(param.minimum);
      }
      if (param.maximum !== undefined) {
        schema = (schema as z.ZodNumber).max(param.maximum);
      }
      break;
    case 'boolean':
      schema = z.boolean();
      break;
    default:
      schema = z.string();
  }
  
  if (param.description) {
    schema = schema.describe(param.description);
  }
  
  if (param.default !== undefined) {
    schema = schema.default(param.default);
  }
  
  return schema;
}

// Convert custom tool schema to Zod object
function buildZodSchema(toolSchema?: { properties?: Record<string, ParameterSchema>; required?: string[] }): Record<string, z.ZodType<unknown>> {
  if (!toolSchema?.properties) return {};
  
  const zodSchema: Record<string, z.ZodType<unknown>> = {};
  
  for (const [key, param] of Object.entries(toolSchema.properties)) {
    let schema = parameterToZodSchema(param);
    
    // Make optional if not in required array
    if (!toolSchema.required?.includes(key)) {
      schema = schema.optional();
    }
    
    zodSchema[key] = schema;
  }
  
  return zodSchema;
}

// Execute custom logic tool
async function executeCustomLogic(tool: CustomTool, params: Record<string, unknown>) {
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
}

// Execute API tool
async function executeApiTool(tool: CustomTool, params: Record<string, unknown>) {
  if (!tool.apiConfig) {
    throw new Error('API configuration missing');
  }
  
  const { url, method, headers = {} } = tool.apiConfig;
  let finalUrl = url;
  let body: string | undefined = undefined;

  // Separate query parameters and body parameters
  const queryParams: Record<string, string | number | boolean> = {};
  const bodyParams: Record<string, string | number | boolean> = {};

  // Get query parameter keys from querySchema
  const queryKeys = tool.querySchema?.properties ? Object.keys(tool.querySchema.properties) : [];
  // Get body parameter keys from inputSchema  
  const bodyKeys = tool.inputSchema?.properties ? Object.keys(tool.inputSchema.properties) : [];

  // Helper function to check if value is valid parameter type
  const isValidParamValue = (value: unknown): value is string | number | boolean => {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
  };

  // Distribute parameters based on their schema definitions
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && isValidParamValue(value)) {
      if (queryKeys.includes(key)) {
        queryParams[key] = value;
      } else if (bodyKeys.includes(key)) {
        bodyParams[key] = value;
      } else {
        // If not explicitly defined in either schema, use legacy behavior:
        // Query params for GET, body params for other methods
        if (method === 'GET') {
          queryParams[key] = value;
        } else {
          bodyParams[key] = value;
        }
      }
    }
  });

  // Clear existing query parameters from URL to avoid duplication
  const baseUrl = url.split('?')[0];
  finalUrl = baseUrl;

  // Add query parameters to URL
  if (Object.keys(queryParams).length > 0) {
    const urlParams = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      urlParams.set(key, String(value));
    });
    finalUrl += '?' + urlParams.toString();
  }

  // Add body parameters (only for non-GET requests if there are body params)
  if (method !== 'GET' && Object.keys(bodyParams).length > 0) {
    body = JSON.stringify(bodyParams);
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

  // Return API response in MCP format
  if (!response.ok) {
    return {
      content: [{
        type: "text",
        text: `API Error ${response.status}: ${response.statusText}\n${typeof responseJson === 'string' ? responseJson : JSON.stringify(responseJson, null, 2)}`
      }],
      isError: true
    };
  }

  // If response is a string, return as text
  if (typeof responseJson === 'string') {
    return {
      content: [{
        type: "text",
        text: responseJson
      }]
    };
  }

  // If response is an object/array, return as structured data
  if (typeof responseJson === 'object' && responseJson !== null) {
    // Check if it's already in MCP format
    if (responseJson.content && Array.isArray(responseJson.content)) {
      return responseJson;
    }

    // For JSON objects, return the raw data as text for proper display
    return {
      content: [{
        type: "text",
        text: JSON.stringify(responseJson, null, 2)
      }]
    };
  }

  // For other types, convert to string
  return {
    content: [{
      type: "text", 
      text: String(responseJson)
    }]
  };
}

// Load and register custom tools with caching
async function loadCustomTools(forceReload = false) {
  try {
    const now = Date.now();
    
    // Return cached tools if they're still fresh and not forcing reload
    if (!forceReload && toolsCache.timestamp > 0 && (now - toolsCache.timestamp) < CACHE_DURATION) {
      return toolsCache.tools;
    }
    
    let tools: CustomTool[] = [];
    if (isDatabaseEnabled()) {
      tools = await getToolsFromDatabase();
    } else {
      // In MCP server context, we can't access localStorage directly
      // Custom tools will only be available if database is enabled
      tools = [];
    }
    
    // Update cache
    toolsCache = {
      tools,
      timestamp: now,
      registered: new Set()
    };
    
    return tools;
  } catch (error) {
    console.error('Error loading custom tools for MCP:', error);
    return toolsCache.tools; // Return cached tools on error
  }
}

// Dynamic tool registration function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function registerCustomTools(server: any, forceReload = false) {
  const customTools = await loadCustomTools(forceReload);
  
  customTools.forEach((tool: CustomTool) => {
    try {
      // Skip if already registered (unless force reloading)
      if (!forceReload && toolsCache.registered.has(tool.name)) {
        return;
      }
      
      // Combine input and query schemas for the tool parameters
      const allParams = {
        ...buildZodSchema(tool.inputSchema),
        ...buildZodSchema(tool.querySchema)
      };

      // Register the custom tool
      server.tool(
        tool.name,
        tool.description || `Custom tool: ${tool.name}`,
        allParams,
        async (params: Record<string, unknown>) => {
          // Reload tools before executing if cache is stale
          const now = Date.now();
          if (toolsCache.timestamp === 0 || (now - toolsCache.timestamp) >= CACHE_DURATION) {
            await registerCustomTools(server, true);
          }
          
          // Find the current tool definition (might have been updated)
          const currentTools = await loadCustomTools();
          const currentTool = currentTools.find(t => t.name === tool.name) || tool;
          
          if (currentTool.customType === 'api') {
            return await executeApiTool(currentTool, params);
          } else {
            return await executeCustomLogic(currentTool, params);
          }
        }
      );
      
      // Mark as registered
      toolsCache.registered.add(tool.name);
      console.log(`✅ Registered custom tool: ${tool.name} (${tool.customType})`);
    } catch (error) {
      console.error(`❌ Failed to register custom tool ${tool.name}:`, error);
    }
  });
  
  if (customTools.length > 0) {
    console.log(`🛠️ Loaded ${customTools.length} custom tools into MCP server`);
  }
}

const handler = createMcpHandler(
  async (server) => {
    // Register custom tools with dynamic loading support
    await registerCustomTools(server);

    // Tool to manually refresh custom tools cache
    server.tool(
      "refresh_custom_tools",
      "Refresh the cache of custom tools to pick up newly added tools",
      {},
      async () => {
        try {
          // Force invalidate cache and reload
          toolsCache.timestamp = 0;
          toolsCache.registered.clear();
          
          await registerCustomTools(server, true);
          const currentTools = await loadCustomTools(true);
          
          return {
            content: [{
              type: "text",
              text: `🔄 Custom tools cache refreshed successfully!\n📊 Currently loaded: ${currentTools.length} custom tools\n\n${currentTools.length > 0 ? currentTools.map(t => `• ${t.name} (${t.customType || 'normal'})`).join('\n') : 'No custom tools found.'}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `❌ Failed to refresh tools cache: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }
      }
    );

    // URL Shortener/Validator
    server.tool(
      "url_validator",
      "Validate and analyze URLs",
      {
        url: z.string().url().describe("URL to validate and analyze"),
      },
      async ({ url }) => {
        try {
          const urlObj = new URL(url);
          const isSecure = urlObj.protocol === 'https:';
          const domain = urlObj.hostname;
          const hasParams = urlObj.searchParams.toString().length > 0;
          
          return {
            content: [
              {
                type: "text",
                text: `🔗 URL Analysis:
✅ Valid URL: ${url}
🔒 Protocol: ${urlObj.protocol} ${isSecure ? '(Secure)' : '(Not Secure)'}
🌐 Domain: ${domain}
📁 Path: ${urlObj.pathname}
${hasParams ? `🔍 Parameters: ${urlObj.searchParams.toString()}` : '📄 No parameters'}
📊 Total Length: ${url.length} characters`
              }
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Invalid URL: ${url}\nError: ${error instanceof Error ? error.message : 'Unknown error'}`
              }
            ],
          };
        }
      }
    );

    // JSON Formatter/Validator
    server.tool(
      "json_formatter",
      "Format, validate and minify JSON",
      {
        json: z.string().describe("JSON string to format or validate"),
        action: z.enum(["format", "minify", "validate"]).default("format").describe("Action to perform"),
      },
      async ({ json, action = "format" }) => {
        try {
          const parsed = JSON.parse(json);
          
          switch (action) {
            case "format":
              return {
                content: [
                  {
                    type: "text",
                    text: `✅ Valid JSON (Formatted):\n${JSON.stringify(parsed, null, 2)}`
                  }
                ],
              };
            case "minify":
              return {
                content: [
                  {
                    type: "text",
                    text: `✅ Valid JSON (Minified):\n${JSON.stringify(parsed)}`
                  }
                ],
              };
            case "validate":
              return {
                content: [
                  {
                    type: "text",
                    text: `✅ JSON is valid!\n📊 Object has ${Object.keys(parsed).length} top-level properties`
                  }
                ],
              };
            default:
              return {
                content: [
                  {
                    type: "text",
                    text: `✅ Valid JSON:\n${JSON.stringify(parsed, null, 2)}`
                  }
                ],
              };
          }
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
              }
            ],
          };
        }
      }
    );

    // Base64 Encoder/Decoder
    server.tool(
      "base64_converter",
      "Encode or decode Base64 strings",
      {
        text: z.string().describe("Text to encode/decode"),
        action: z.enum(["encode", "decode"]).describe("Whether to encode or decode"),
      },
      async ({ text, action }) => {
        try {
          if (action === "encode") {
            const encoded = Buffer.from(text, 'utf8').toString('base64');
            return {
              content: [
                {
                  type: "text",
                  text: `🔒 Base64 Encoded:\n${encoded}\n\n📊 Original: ${text.length} chars → Encoded: ${encoded.length} chars`
                }
              ],
            };
          } else {
            const decoded = Buffer.from(text, 'base64').toString('utf8');
            return {
              content: [
                {
                  type: "text",
                  text: `🔓 Base64 Decoded:\n${decoded}\n\n📊 Encoded: ${text.length} chars → Decoded: ${decoded.length} chars`
                }
              ],
            };
          }
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error ${action}ing Base64: ${error instanceof Error ? error.message : 'Unknown error'}`
              }
            ],
          };
        }
      }
    );

    // Hash Generator
    server.tool(
      "hash_generator",
      "Generate various hash types for text",
      {
        text: z.string().describe("Text to hash"),
        algorithm: z.enum(["md5", "sha1", "sha256", "sha512"]).default("sha256").describe("Hash algorithm"),
      },
      async ({ text, algorithm = "sha256" }) => {
        try {
          const hash = crypto.createHash(algorithm).update(text).digest('hex');
          return {
            content: [
              {
                type: "text",
                text: `🔐 ${algorithm.toUpperCase()} Hash:\n${hash}\n\n📝 Original text: "${text}"\n📊 Hash length: ${hash.length} characters`
              }
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error generating ${algorithm} hash: ${error instanceof Error ? error.message : 'Unknown error'}`
              }
            ],
          };
        }
      }
    );

    // Timestamp Converter
    server.tool(
      "timestamp_converter",
      "Convert between timestamps and human-readable dates",
      {
        input: z.string().describe("Timestamp (unix/iso) or date string to convert"),
        timezone: z.string().default("UTC").describe("Timezone for conversion (e.g., 'America/New_York', 'UTC')"),
      },
      async ({ input, timezone = "UTC" }) => {
        try {
          let date: Date;
          
          // Try to parse as unix timestamp (if it's all digits)
          if (/^\d+$/.test(input)) {
            const timestamp = parseInt(input);
            // Handle both seconds and milliseconds timestamps
            date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
          } else {
            // Try to parse as date string
            date = new Date(input);
          }

          if (isNaN(date.getTime())) {
            throw new Error("Invalid date/timestamp format");
          }

          const unixSeconds = Math.floor(date.getTime() / 1000);
          const unixMilliseconds = date.getTime();
          const isoString = date.toISOString();
          const humanReadable = date.toLocaleString('en-US', { 
            timeZone: timezone,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
          });

          return {
            content: [
              {
                type: "text",
                text: `🕐 Timestamp Conversion:
📅 Human Readable: ${humanReadable}
🌍 ISO 8601: ${isoString}
⏱️ Unix (seconds): ${unixSeconds}
⏰ Unix (milliseconds): ${unixMilliseconds}
🌐 Timezone: ${timezone}`
              }
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error converting timestamp: ${error instanceof Error ? error.message : 'Unknown error'}`
              }
            ],
          };
        }
      }
    );

    // QR Code Data Generator (text-based representation)
    server.tool(
      "qr_code_data",
      "Generate QR code data and URL for text",
      {
        text: z.string().describe("Text to encode in QR code"),
        size: z.number().int().min(100).max(500).default(200).describe("QR code size in pixels"),
      },
      async ({ text, size = 200 }) => {
        // Generate QR code URL using a public API
        const encodedText = encodeURIComponent(text);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedText}`;
        
        return {
          content: [
            {
              type: "text",
              text: `📱 QR Code Generated:
📝 Text: "${text}"
🔗 QR Code URL: ${qrUrl}
📏 Size: ${size}x${size} pixels
💡 Tip: Copy the URL to view/download the QR code image`
            }
          ],
        };
      }
    );

    // Email Validator
    server.tool(
      "email_validator",
      "Validate email addresses and extract information",
      {
        email: z.string().email().describe("Email address to validate"),
      },
      async ({ email }) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(email);
        
        if (!isValid) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Invalid email format: ${email}`
              }
            ],
          };
        }

        const [localPart, domain] = email.split('@');
        const domainParts = domain.split('.');
        const tld = domainParts[domainParts.length - 1];
        
        return {
          content: [
            {
              type: "text",
              text: `✅ Valid Email: ${email}
👤 Local Part: ${localPart}
🌐 Domain: ${domain}
🏷️ TLD: .${tld}
📊 Total Length: ${email.length} characters
💡 Domain has ${domainParts.length} parts`
            }
          ],
        };
      }
    );

    // Slug Generator
    server.tool(
      "slug_generator",
      "Generate URL-friendly slugs from text",
      {
        text: z.string().describe("Text to convert to slug"),
        separator: z.enum(["-", "_"]).default("-").describe("Separator character"),
        maxLength: z.number().int().min(10).max(200).default(100).describe("Maximum slug length"),
      },
      async ({ text, separator = "-", maxLength = 100 }) => {
        let slug = text
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '') // Remove special characters
          .replace(/[\s_-]+/g, separator) // Replace spaces and underscores with separator
          .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), ''); // Remove leading/trailing separators

        if (slug.length > maxLength) {
          slug = slug.substring(0, maxLength).replace(new RegExp(`${separator}+$`), '');
        }

        return {
          content: [
            {
              type: "text",
              text: `🔗 Generated Slug:
📝 Original: "${text}"
🌐 Slug: "${slug}"
📏 Length: ${slug.length}/${maxLength} characters
🔧 Separator: "${separator}"`
            }
          ],
        };
      }
    );

    // Random number generator
    server.tool(
      "random_number",
      "Generate a random number within a specified range",
      {
        min: z.number().describe("Minimum value (inclusive)"),
        max: z.number().describe("Maximum value (inclusive)"),
        decimals: z.number().int().min(0).max(10).default(0).describe("Number of decimal places"),
      },
      async ({ min, max, decimals = 0 }) => {
        const range = max - min;
        const random = Math.random() * range + min;
        const value = decimals === 0 ? Math.floor(random) : Number(random.toFixed(decimals));
        
        return {
          content: [
            {
              type: "text",
              text: `🔢 Random number between ${min} and ${max}: ${value}`
            }
          ],
        };
      }
    );

    // Text utilities
    server.tool(
      "text_transform",
      "Transform text with various operations",
      {
        text: z.string().describe("The text to transform"),
        operation: z.enum([
          "uppercase", 
          "lowercase", 
          "reverse", 
          "word_count", 
          "char_count",
          "title_case",
          "remove_spaces",
          "add_spaces"
        ]).describe("The transformation to apply"),
      },
      async ({ text, operation }) => {
        let result: string;
        
        switch (operation) {
          case "uppercase":
            result = text.toUpperCase();
            break;
          case "lowercase":
            result = text.toLowerCase();
            break;
          case "reverse":
            result = text.split("").reverse().join("");
            break;
          case "word_count":
            result = `Word count: ${text.trim().split(/\s+/).filter(word => word.length > 0).length}`;
            break;
          case "char_count":
            result = `Character count: ${text.length}`;
            break;
          case "title_case":
            result = text.replace(/\w\S*/g, (txt) => 
              txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
            );
            break;
          case "remove_spaces":
            result = text.replace(/\s+/g, "");
            break;
          case "add_spaces":
            result = text.split("").join(" ");
            break;
          default:
            result = text;
        }
        
        return {
          content: [
            {
              type: "text",
              text: `✨ ${operation.replace("_", " ").toUpperCase()}: ${result}`
            }
          ],
        };
      }
    );

    // Color picker/generator
    server.tool(
      "generate_color",
      "Generate random colors in various formats",
      {
        format: z.enum(["hex", "rgb", "hsl"]).default("hex").describe("Color format"),
        count: z.number().int().min(1).max(10).default(1).describe("Number of colors to generate"),
      },
      async ({ format = "hex", count = 1 }) => {
        const colors = [];
        
        for (let i = 0; i < count; i++) {
          const r = Math.floor(Math.random() * 256);
          const g = Math.floor(Math.random() * 256);
          const b = Math.floor(Math.random() * 256);
          
          let colorString: string;
          switch (format) {
            case "hex":
              colorString = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
              break;
            case "rgb":
              colorString = `rgb(${r}, ${g}, ${b})`;
              break;
            case "hsl":
              const h = Math.floor(Math.random() * 360);
              const s = Math.floor(Math.random() * 100);
              const l = Math.floor(Math.random() * 100);
              colorString = `hsl(${h}, ${s}%, ${l}%)`;
              break;
            default:
              colorString = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          }
          colors.push(colorString);
        }
        
        return {
          content: [
            {
              type: "text",
              text: `🎨 Generated ${count} ${format.toUpperCase()} color${count > 1 ? 's' : ''}: ${colors.join(', ')}`
            }
          ],
        };
      }
    );

    // UUID generator
    server.tool(
      "generate_uuid",
      "Generate UUIDs (v4)",
      {
        count: z.number().int().min(1).max(10).default(1).describe("Number of UUIDs to generate"),
      },
      async ({ count = 1 }) => {
        const uuids = [];
        
        for (let i = 0; i < count; i++) {
          const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
          uuids.push(uuid);
        }
        
        return {
          content: [
            {
              type: "text",
              text: `🆔 Generated UUID${count > 1 ? 's' : ''}: ${uuids.join('\n')}`
            }
          ],
        };
      }
    );

    // Password generator
    server.tool(
      "generate_password",
      "Generate secure passwords",
      {
        length: z.number().int().min(4).max(128).default(16).describe("Password length"),
        includeNumbers: z.boolean().default(true).describe("Include numbers"),
        includeSymbols: z.boolean().default(true).describe("Include symbols"),
        includeUppercase: z.boolean().default(true).describe("Include uppercase letters"),
        includeLowercase: z.boolean().default(true).describe("Include lowercase letters"),
      },
      async ({ length = 16, includeNumbers = true, includeSymbols = true, includeUppercase = true, includeLowercase = true }) => {
        let charset = '';
        if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
        if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (includeNumbers) charset += '0123456789';
        if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        if (charset === '') {
          return {
            content: [
              {
                type: "text",
                text: "❌ Error: At least one character type must be selected"
              }
            ],
          };
        }
        
        let password = '';
        for (let i = 0; i < length; i++) {
          password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        return {
          content: [
            {
              type: "text",
              text: `🔐 Generated password: ${password}`
            }
          ],
        };
      }
    );
  },
  {
    capabilities: {
      tools: {},
    },
  },
  {
    basePath: "/api",
    maxDuration: 60,
    verboseLogs: true,
    sseEndpoint: "/sse",
    streamableHttpEndpoint: "/mcp",
    // redisUrl: process.env.REDIS_URL,
  }
);

export { handler as GET, handler as POST };