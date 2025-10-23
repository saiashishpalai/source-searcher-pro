import { createMcpHandler } from '@vercel/mcp-adapter';
import { z } from 'zod';

// Create the MCP handler with tools
const handler = createMcpHandler(
  (server) => {
    // Search documents tool
    server.tool(
      'search_documents',
      'Search through user documents and files',
      {
        query: z.string().describe('The search query to find relevant documents'),
        userId: z.string().describe('The user ID to search documents for'),
        sourceType: z.enum(['google_drive', 'notion', 'slack']).optional().describe('Optional source type filter'),
      },
      async ({ query, userId, sourceType }) => {
        try {
          // Call your existing search API
          const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000'}/api/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN || 'internal-token'}`,
            },
            body: JSON.stringify({
              query,
              filters: sourceType ? { sourceType } : {},
            }),
          });

          if (!response.ok) {
            throw new Error(`Search failed: ${response.statusText}`);
          }

          const results = await response.json();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(results, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    // Sync documents tool
    server.tool(
      'sync_documents',
      'Sync documents from connected sources',
      {
        userId: z.string().describe('The user ID to sync documents for'),
        sourceType: z.enum(['google_drive', 'notion', 'slack']).describe('Source type to sync from'),
      },
      async ({ userId, sourceType }) => {
        try {
          // Call your existing sync API
          const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000'}/api/sync/${sourceType}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN || 'internal-token'}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Sync failed: ${response.statusText}`);
          }

          const results = await response.json();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(results, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    // Get sync status tool
    server.tool(
      'get_sync_status',
      'Get the current sync status for a user',
      {
        userId: z.string().describe('The user ID to get sync status for'),
      },
      async ({ userId }) => {
        try {
          // Call your existing sync status API
          const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000'}/api/sync/status`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN || 'internal-token'}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Status check failed: ${response.statusText}`);
          }

          const results = await response.json();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(results, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    // Get connections tool
    server.tool(
      'get_connections',
      'Get user connections for data sources',
      {
        userId: z.string().describe('The user ID to get connections for'),
      },
      async ({ userId }) => {
        try {
          // Call your existing connections API
          const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000'}/api/connections/get`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN || 'internal-token'}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Connections check failed: ${response.statusText}`);
          }

          const results = await response.json();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(results, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      },
    );
  },
  {},
  { basePath: '/api' },
);

export { handler as GET, handler as POST, handler as DELETE };
