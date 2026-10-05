#!/usr/bin/env node
/**
 * SignalHire Model Context Protocol (MCP) Server Entrypoint
 * Supports both stdio transport (Claude Desktop, Cursor, Windsurf, VS Code)
 * and HTTP / SSE transport (Claude Web Connectors, n8n, Remote MCP).
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { startHttpServer } from "./http.js";
import { createSignalHireMcpServer } from "./server.js";

// Load .env if present
dotenv.config();

function printHelp() {
  console.log(`
SignalHire MCP Server
---------------------
Model Context Protocol server for candidate sourcing, verified email/phone enrichment,
and company intelligence via SignalHire (https://www.signalhire.com).

USAGE:
  signalhire-mcp [OPTIONS]

OPTIONS:
  --stdio                Run in stdio mode (default for Claude Desktop, Cursor, Windsurf, VS Code)
  --http                 Run standalone HTTP / SSE server (default port: 3333)
  --port <number>        Specify port for HTTP / SSE server (default: 3333)
  --api-key <key>        SignalHire API Key (or set SIGNALHIRE_API_KEY environment variable)
  --help, -h             Show this help screen

ENVIRONMENT VARIABLES:
  SIGNALHIRE_API_KEY     Your SignalHire API Key from https://www.signalhire.com/apiIntegrations
  PORT                   Port to listen on in HTTP mode (default: 3333)

CONFIGURATION EXAMPLES:

1. Claude Desktop (claude_desktop_config.json):
  {
    "mcpServers": {
      "signalhire": {
        "command": "node",
        "args": ["/home/ubuntu/signlehire/dist/index.js"],
        "env": {
          "SIGNALHIRE_API_KEY": "YOUR_API_KEY_HERE"
        }
      }
    }
  }

2. Cursor (~/.cursor/mcp.json):
  {
    "mcpServers": {
      "signalhire": {
        "command": "node",
        "args": ["/home/ubuntu/signlehire/dist/index.js"],
        "env": {
          "SIGNALHIRE_API_KEY": "YOUR_API_KEY_HERE"
        }
      }
    }
  }

3. HTTP Mode (Remote MCP / Claude Connectors / n8n):
  Run: node dist/index.js --http --port 3333
  Connect to: http://localhost:3333/mcp
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const isHttp = args.includes("--http");
  const portIndex = args.indexOf("--port");
  const port =
    portIndex !== -1 && args[portIndex + 1]
      ? parseInt(args[portIndex + 1], 10)
      : parseInt(process.env.PORT || "3333", 10);

  const keyIndex = args.indexOf("--api-key");
  const cliApiKey =
    keyIndex !== -1 && args[keyIndex + 1] ? args[keyIndex + 1] : undefined;

  const apiKey =
    cliApiKey ||
    process.env.SIGNALHIRE_API_KEY ||
    process.env.SIGNAL_HIRE_API_KEY ||
    "";

  if (isHttp) {
    // Start HTTP / SSE Server
    startHttpServer(port, apiKey);
  } else {
    // Start Stdio Server
    const { server } = createSignalHireMcpServer({ apiKey });
    const transport = new StdioServerTransport();

    process.stderr.write("🔌 Starting SignalHire MCP Server in stdio mode...\n");
    if (!apiKey) {
      process.stderr.write(
        "⚠️ Notice: SIGNALHIRE_API_KEY environment variable is not set. You can set it in your MCP client config or pass --api-key.\n"
      );
    } else {
      process.stderr.write("🔑 SignalHire API Key configured successfully.\n");
    }

    await server.connect(transport);
    process.stderr.write("✅ SignalHire MCP Server connected and ready on stdio.\n");
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal error starting SignalHire MCP server: ${err?.stack || err}\n`);
  process.exit(1);
});
