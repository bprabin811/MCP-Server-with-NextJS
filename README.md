# MCP Next.js - Model Context Protocol Tools

A Next.js application that provides a comprehensive set of utility tools through the Model Context Protocol (MCP).

<a href="https://mcp-server-with-next-js.vercel.app" target="_blank">
    <img src="public/preview.png" alt="bg"></img>
</a>

🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd mcp-nextjs
   ```
2. **Install dependencies**

   ```bash
   npm install
   ```
3. **Run the development server**

   ```bash
   npm run dev
   ```
4. **Access the MCP endpoint**
   The MCP server will be available at:

   - HTTP: `http://localhost:3000/api/mcp`
   - SSE: `http://localhost:3000/api/sse`

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- (Optional) Redis for session management

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Optional: Redis URL for session management
REDIS_URL=redis://localhost:6379

# Database Configuration for Custom Tools
# Set USEDB to 'true' to enable database storage for custom tools
# If 'false' or not set, tools will be stored in localStorage
USEDB=false

# PostgreSQL Database URL (required when USEDB=true)
# Format: postgresql://username:password@host:port/database
DATABASE_URL=postgresql://username:password@localhost:5432/mcp_tools

# Examples for different hosting providers:
# Vercel Postgres: postgres://username:password@region-pooler.aws.neon.tech/database
# Supabase: postgresql://postgres:password@project.supabase.co:5432/postgres
# Railway: postgresql://postgres:password@containers.railway.app:5432/railway
# Heroku: postgres://user:password@host:port/database
```

### MCP Client Configuration

To use this server with an MCP client, configure it to connect to:

```
{
  "mcpServers": {
    "remote-mcp": {
      "type": "sse",
      "url": "https://mcp-server-with-next-js.vercel.app/api/mcp"
    }
  }
}
```

To use this server with Google-ADK:

```
from google.adk.agents.llm_agent import Agent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StreamableHTTPServerParams

root_agent = Agent(
    model="gemini-2.0-flash",
    name="utility_agent",
    instruction="You are a utility agent that can use the following tools to help the user.",
    tools=[
        MCPToolset(
            connection_params=StreamableHTTPServerParams(
                url="https://mcp-server-with-next-js.vercel.app/api/mcp"
            )
        ),
    ],
)
```

# 🏗️ Project Structure

```
mcp-nextjs/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── [transport]/
│   │   │       └── route.ts          # MCP handler with all tools
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── utils/
├── public/
├── package.json
└── README.md
```

## 🛠️ Custom Tools & Database Storage

This application supports creating custom tools through the web interface. Custom tools can be stored in two ways:

### Local Storage Mode (Default)

- Custom tools are stored in browser localStorage
- Tools are specific to each browser/client
- No database setup required
- Suitable for development and single-user scenarios

### Database Mode (Production)

- Custom tools are stored in PostgreSQL database
- Tools are shared across all clients and persist between sessions
- Requires database setup
- Recommended for production deployments

### Enabling Database Storage

1. **Set up a PostgreSQL database** (e.g., using Supabase, Vercel Postgres, or Railway)
2. **Configure environment variables:**

   ```env
   USEDB=true
   DATABASE_URL=postgresql://username:password@host:port/database
   ```
3. **The database table will be created automatically** when the application starts

### Custom Tool Types

- **Normal Tools**: Execute custom JavaScript logic
- **API Tools**: Make HTTP requests to external APIs with configurable parameters

## 🔌 MCP Integration

This project uses the `@vercel/mcp-adapter` to provide MCP compatibility. The tools are defined using Zod schemas for type safety and validation.

### Adding New Tools

To add a new tool, edit `src/app/api/[transport]/route.ts`:

```typescript
server.tool(
  "tool_name",
  "Tool description",
  {
    // Zod schema for parameters
    param: z.string().describe("Parameter description"),
  },
  async ({ param }) => {
    // Tool implementation
    return {
      content: [
        {
          type: "text",
          text: "Tool output"
        }
      ],
    };
  }
);
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy with default settings
4. Set environment variables in Vercel dashboard if needed

## 📝 API Reference

All tools are accessible through the MCP protocol. Each tool has:

- **Name**: Unique identifier for the tool
- **Description**: What the tool does
- **Parameters**: Input schema with validation
- **Response**: Structured output with text content

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-tool`)
3. Commit your changes (`git commit -m 'Add amazing tool'`)
4. Push to the branch (`git push origin feature/amazing-tool`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel MCP Adapter](https://www.npmjs.com/package/@vercel/mcp-adapter)

# MCP-Server-with-NextJS
