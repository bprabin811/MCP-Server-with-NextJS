# MCP Next.js - Model Context Protocol Tools

A Next.js application that provides a comprehensive set of utility tools through the Model Context Protocol (MCP). This project offers various text processing, encoding, validation, and generation utilities that can be accessed via MCP-compatible clients.

## 🚀 Features

This MCP server provides 13 powerful utility tools:

### 🔗 Web & URL Tools
- **URL Validator** - Validate and analyze URLs with security and structure insights
- **Email Validator** - Validate email addresses and extract detailed information
- **Slug Generator** - Convert text into URL-friendly slugs

### 🔄 Data Processing
- **JSON Formatter** - Format, validate, and minify JSON data
- **Base64 Converter** - Encode and decode Base64 strings
- **Hash Generator** - Generate MD5, SHA1, SHA256, and SHA512 hashes

### 📅 Time & Date
- **Timestamp Converter** - Convert between Unix timestamps and human-readable dates

### 📱 Generators & Utilities
- **QR Code Data** - Generate QR code URLs for any text
- **Random Number** - Generate random numbers with customizable ranges and decimal places
- **UUID Generator** - Generate secure UUIDs (v4)
- **Password Generator** - Create secure passwords with customizable criteria
- **Color Generator** - Generate random colors in HEX, RGB, or HSL formats

### ✏️ Text Processing
- **Text Transform** - Multiple text operations (uppercase, lowercase, reverse, word count, etc.)

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
http://localhost:3000/api/mcp
```

## 🎯 Tool Usage Examples

### URL Validator
```typescript
// Validates and analyzes any URL
Input: "https://example.com/path?param=value"
Output: Security info, domain analysis, parameter breakdown
```

### JSON Formatter
```typescript
// Format, minify, or validate JSON
Input: '{"name":"John","age":30}'
Actions: "format" | "minify" | "validate"
```

### Base64 Converter
```typescript
// Encode or decode Base64
Input: "Hello World"
Action: "encode" | "decode"
```

### Hash Generator
```typescript
// Generate various hash types
Input: "text to hash"
Algorithms: "md5" | "sha1" | "sha256" | "sha512"
```

### Password Generator
```typescript
// Generate secure passwords
Options: length, includeNumbers, includeSymbols, includeUppercase, includeLowercase
```

## 🏗️ Project Structure

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

### Other Platforms
The application can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Heroku
- Self-hosted

## 🧪 Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

### Linting
```bash
npm run lint
```

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

## 💡 Tips

- Use the development server for testing tools locally
- Check the browser console for detailed MCP communication logs
- Each tool includes comprehensive error handling and validation
- All text outputs include helpful emojis and formatting for better readability
# MCP-Server-with-NextJS
