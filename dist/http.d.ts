/**
 * Standalone HTTP / SSE / Streamable HTTP Server for SignalHire MCP
 * Reference: https://docs.signalhire.com/mcp-server.md
 */
import http from "node:http";
export declare function startHttpServer(port?: number, defaultApiKey?: string): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
