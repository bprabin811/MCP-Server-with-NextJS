import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export async function setupClient() {
  const client = new Client({
    name: "MyClient",
    version: "1.0.0",
  });
  
  // Get the base URL - in browser use current origin, in server use env var or localhost
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      // Browser environment
      return window.location.origin;
    } else {
      // Server environment
      return process.env.NEXT_BASE_URL || 'http://localhost:3000';
    }
  };
  
  const baseUrl = getBaseUrl();
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/api/mcp`));
  await client.connect(transport);
  return client;
}
