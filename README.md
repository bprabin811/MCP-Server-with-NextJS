# MCP Next.js - Model Context Protocol Tools

A Next.js application that provides a comprehensive set of utility tools through the Model Context Protocol (MCP).

## 🛠️ Installation

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
