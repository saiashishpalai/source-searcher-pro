# MCP Server Setup for Vercel

This document explains how to set up and deploy the MCP (Model Context Protocol) server for your Source Searcher application on Vercel.

## What's Been Installed

1. **MCP Dependencies**: Added `@vercel/mcp-adapter` and `@modelcontextprotocol/sdk`
2. **MCP Server**: Created `/api/mcp.ts` with tools for document search, sync, and status
3. **Vercel Configuration**: Updated `vercel.json` to handle MCP server routing

## Environment Variables Required

Set these in your Vercel project settings:

```bash
# API Configuration
API_BASE_URL=https://your-vercel-app.vercel.app
INTERNAL_API_TOKEN=your-internal-api-token

# MCP Server Configuration  
MCP_SERVER_NAME=source-searcher-mcp-server

# Optional: OpenAI API Key for enhanced functionality
OPENAI_API_KEY=your-openai-api-key
```

## MCP Server Tools

The MCP server provides these tools:

1. **search_documents**: Search through user documents and files
   - Parameters: `query`, `userId`, `sourceType` (optional)
   
2. **sync_documents**: Sync documents from connected sources
   - Parameters: `userId`, `sourceType`
   
3. **get_sync_status**: Get current sync status for a user
   - Parameters: `userId`
   
4. **get_connections**: Get user connections for data sources
   - Parameters: `userId`

## Deployment

1. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

2. **Set Environment Variables** in Vercel dashboard:
   - Go to your project settings
   - Add the environment variables listed above

3. **Test the MCP Server**:
   - The MCP server will be available at: `https://your-app.vercel.app/api/mcp`
   - You can test it using MCP clients or tools

## Troubleshooting

### Common Issues:

1. **403 Forbidden Error**: 
   - Ensure your deployment is publicly accessible
   - Check Vercel deployment protection settings

2. **Dynamic Server Usage Error**:
   - Verify MCP server routes are correctly configured
   - Ensure dynamic content is handled appropriately

3. **API Connection Issues**:
   - Verify `API_BASE_URL` points to your deployed app
   - Check that `INTERNAL_API_TOKEN` is set correctly

## Next Steps

1. Deploy your application to Vercel
2. Set the required environment variables
3. Test the MCP server endpoints
4. Configure your MCP client to connect to the server

The MCP server is now ready to be used with AI assistants and other MCP-compatible tools!
