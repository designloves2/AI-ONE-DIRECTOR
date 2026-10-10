import http from 'node:http';
import { URL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { config } from './config.mjs';
import { validateToken } from './security.mjs';
import { registerTools } from './tools.mjs';
import { registerResources } from './resources.mjs';

function createDirectorServer() {
  const mcpServer = new McpServer({
    name: 'ai-one-director',
    version: '0.1.0'
  });

  registerResources(mcpServer);
  registerTools(mcpServer);

  return mcpServer;
}

async function startStdio() {
  const mcpServer = createDirectorServer();
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error('AI ONE DIRECTOR MCP Server running on stdio');
}

async function startHttp() {
  const mcpServer = createDirectorServer();
  const transports = new Map();

  const httpServer = http.createServer(async (req, res) => {
    // Enable CORS for web clients / studio
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const host = req.headers.host || `localhost:${config.port}`;
    const reqUrl = new URL(req.url, `http://${host}`);
    const pathname = reqUrl.pathname;

    // Health check endpoint (no auth required)
    if (pathname === '/health' || pathname === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        name: 'ai-one-director',
        version: '0.1.0',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // Token Auth check for MCP endpoints
    const token = req.headers['authorization'] || reqUrl.searchParams.get('token');
    if (!validateToken(token)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Unauthorized: Invalid or missing token' }));
      return;
    }

    // SSE connection endpoint
    if (req.method === 'GET' && pathname === '/sse') {
      try {
        const transport = new SSEServerTransport('/message', res);
        transports.set(transport.sessionId, transport);

        transport.onclose = () => {
          transports.delete(transport.sessionId);
        };

        await mcpServer.connect(transport);
        return;
      } catch (err) {
        console.error('Error establishing SSE transport:', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
        return;
      }
    }

    // Client message endpoint
    if (req.method === 'POST' && pathname === '/message') {
      const sessionId = reqUrl.searchParams.get('sessionId');
      if (!sessionId || !transports.has(sessionId)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Session not found or expired' }));
        return;
      }

      const transport = transports.get(sessionId);
      await transport.handlePostMessage(req, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Not found' }));
  });

  httpServer.listen(config.port, config.host, () => {
    console.log(`[AI ONE DIRECTOR] MCP Server listening on http://${config.host}:${config.port}`);
    console.log(`[AI ONE DIRECTOR] SSE Endpoint: http://${config.host}:${config.port}/sse`);
    console.log(`[AI ONE DIRECTOR] Health: http://${config.host}:${config.port}/health`);
  });
}

const args = process.argv.slice(2);
if (args.includes('--stdio')) {
  startStdio();
} else {
  startHttp();
}
