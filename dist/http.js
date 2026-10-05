/**
 * Standalone HTTP / SSE / Streamable HTTP Server for SignalHire MCP
 * Reference: https://docs.signalhire.com/mcp-server.md
 */
import http from "node:http";
import crypto from "node:crypto";
import { SignalHireApiClient } from "./client.js";
import { SIGNALHIRE_TOOLS, executeSignalHireTool } from "./server.js";
import { SIGNALHIRE_DEPARTMENTS, SIGNALHIRE_INDUSTRIES, SIGNALHIRE_LEVELS, } from "./constants.js";
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Last-Event-ID, Mcp-Session-Id, apikey",
};
export function startHttpServer(port = 3333, defaultApiKey) {
    const sessions = new Map();
    // Cleanup sessions older than 30 mins
    const cleanupTimer = setInterval(() => {
        const now = Date.now();
        for (const [id, session] of sessions.entries()) {
            if (now - session.createdAt > 30 * 60 * 1000) {
                try {
                    session.res.end();
                }
                catch {
                    // ignore
                }
                sessions.delete(id);
            }
        }
    }, 5 * 60 * 1000);
    cleanupTimer.unref();
    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
        // Handle OPTIONS (CORS preflight)
        if (req.method === "OPTIONS") {
            res.writeHead(204, CORS_HEADERS);
            res.end();
            return;
        }
        if (url.pathname === "/favicon.ico") {
            res.writeHead(204, CORS_HEADERS);
            res.end();
            return;
        }
        // Extract API key from headers or query param
        let reqApiKey = defaultApiKey || "";
        const authHeader = req.headers["authorization"] || "";
        if (authHeader.startsWith("Bearer ")) {
            reqApiKey = authHeader.slice(7).trim();
        }
        else if (typeof req.headers["apikey"] === "string") {
            reqApiKey = req.headers["apikey"].trim();
        }
        else if (url.searchParams.has("apiKey")) {
            reqApiKey = url.searchParams.get("apiKey") || "";
        }
        const client = new SignalHireApiClient({ apiKey: reqApiKey });
        // ─── GET /health ────────────────────────────────────────────────────────
        if (url.pathname === "/health") {
            res.writeHead(200, { "Content-Type": "application/json", ...CORS_HEADERS });
            res.end(JSON.stringify({
                status: "healthy",
                server: "SignalHire MCP Server",
                version: "1.0.0",
                configuredApiKey: client.hasApiKey(),
            }));
            return;
        }
        // ─── GET /mcp or GET /sse: SSE Connection ───────────────────────────────
        const acceptHeader = req.headers["accept"] || "";
        const wantsSse = acceptHeader.includes("text/event-stream") ||
            url.searchParams.get("transport") === "sse" ||
            url.pathname === "/sse";
        if (req.method === "GET" && wantsSse) {
            const sessionId = crypto.randomUUID();
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no",
                "Mcp-Session-Id": sessionId,
                ...CORS_HEADERS,
            });
            sessions.set(sessionId, { res, createdAt: Date.now() });
            // Initial endpoint event per MCP SSE specification
            res.write(`event: endpoint\ndata: ${url.pathname}?sessionId=${sessionId}\n\n`);
            // 15-second keepalive
            const heartbeat = setInterval(() => {
                try {
                    res.write(": keepalive\n\n");
                }
                catch {
                    clearInterval(heartbeat);
                    sessions.delete(sessionId);
                }
            }, 15000);
            req.on("close", () => {
                clearInterval(heartbeat);
                sessions.delete(sessionId);
            });
            return;
        }
        // ─── GET / or GET /mcp (Browser / JSON info) ─────────────────────────────
        if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/mcp")) {
            const proto = req.headers["x-forwarded-proto"] ||
                req.socket.encrypted ? "https" : "http";
            const host = req.headers["x-forwarded-host"] || req.headers.host || "signalhire.growviah.com";
            const baseUrl = `${proto}://${host}`;
            res.writeHead(200, { "Content-Type": "application/json", ...CORS_HEADERS });
            res.end(JSON.stringify({
                name: "SignalHire MCP Server",
                description: "Model Context Protocol (MCP) server for candidate discovery, contact enrichment, and company intelligence via SignalHire.",
                protocolVersion: "2024-11-05",
                status: "online",
                transports: ["stdio", "streamable-http", "sse"],
                endpoints: {
                    mcp: `${baseUrl}/mcp`,
                    sse: `${baseUrl}/sse`,
                    health: `${baseUrl}/health`,
                },
                tools: SIGNALHIRE_TOOLS.map((t) => ({
                    name: t.name,
                    description: t.description,
                })),
                usage: {
                    auth: "Provide 'Authorization: Bearer <YOUR_SIGNALHIRE_API_KEY>' in headers",
                    cursorOrWindsurf: {
                        type: "http",
                        url: `${baseUrl}/mcp`,
                        headers: {
                            Authorization: "Bearer YOUR_SIGNALHIRE_API_KEY",
                        },
                    },
                    claudeDesktop: {
                        command: "npx",
                        args: [
                            "-y",
                            "mcp-remote",
                            `${baseUrl}/mcp`,
                            "--header",
                            "Authorization: Bearer YOUR_SIGNALHIRE_API_KEY",
                        ],
                    },
                    claudeAiCustomConnector: {
                        url: `${baseUrl}/mcp`,
                    },
                    n8n: {
                        transport: "HTTP Streamable",
                        url: `${baseUrl}/mcp`,
                        auth: "Bearer Auth",
                    },
                },
            }, null, 2));
            return;
        }
        // ─── POST / or POST /mcp: JSON-RPC & MCP Message Receiver ───────────────
        if (req.method === "POST") {
            let bodyData = "";
            req.on("data", (chunk) => {
                bodyData += chunk;
            });
            req.on("end", async () => {
                try {
                    const body = JSON.parse(bodyData);
                    const isBatch = Array.isArray(body);
                    const requests = isBatch ? body : [body];
                    const responses = [];
                    for (const jsonRpcReq of requests) {
                        const resp = await handleJsonRpc(jsonRpcReq, client);
                        if (resp !== null) {
                            responses.push(resp);
                        }
                    }
                    const sessionId = url.searchParams.get("sessionId") ||
                        req.headers["mcp-session-id"];
                    if (sessionId && sessions.has(sessionId)) {
                        const session = sessions.get(sessionId);
                        for (const resp of responses) {
                            try {
                                session.res.write(`event: message\ndata: ${JSON.stringify(resp)}\n\n`);
                            }
                            catch {
                                sessions.delete(sessionId);
                            }
                        }
                        res.writeHead(200, {
                            "Content-Type": "application/json",
                            "Mcp-Session-Id": sessionId,
                            ...CORS_HEADERS,
                        });
                        res.end(responses.length > 0
                            ? JSON.stringify(isBatch ? responses : responses[0])
                            : "Accepted");
                        return;
                    }
                    if (responses.length === 0) {
                        res.writeHead(204, CORS_HEADERS);
                        res.end();
                        return;
                    }
                    res.writeHead(200, { "Content-Type": "application/json", ...CORS_HEADERS });
                    res.end(JSON.stringify(isBatch ? responses : responses[0]));
                }
                catch (err) {
                    res.writeHead(400, { "Content-Type": "application/json", ...CORS_HEADERS });
                    res.end(JSON.stringify({
                        jsonrpc: "2.0",
                        id: null,
                        error: { code: -32700, message: `Parse error: ${err.message}` },
                    }));
                }
            });
            return;
        }
        // Default 404
        res.writeHead(404, { "Content-Type": "application/json", ...CORS_HEADERS });
        res.end(JSON.stringify({ error: "Endpoint not found" }));
    });
    server.listen(port, () => {
        console.error(`🚀 SignalHire MCP HTTP/SSE server listening on port ${port}`);
        console.error(`   Endpoint: http://localhost:${port}/mcp`);
        console.error(`   SSE:      http://localhost:${port}/sse`);
        console.error(`   Health:   http://localhost:${port}/health`);
    });
    return server;
}
// ─── JSON-RPC Dispatcher ──────────────────────────────────────────────────────
async function handleJsonRpc(req, client) {
    const { id = null, method, params } = req;
    const isNotification = req.id === undefined;
    switch (method) {
        case "initialize": {
            return {
                jsonrpc: "2.0",
                id,
                result: {
                    protocolVersion: "2024-11-05",
                    capabilities: {
                        tools: { listChanged: false },
                        resources: { subscribe: false, listChanged: false },
                        prompts: { listChanged: false },
                    },
                    serverInfo: {
                        name: "signalhire-mcp",
                        version: "1.0.0",
                    },
                },
            };
        }
        case "notifications/initialized": {
            return null;
        }
        case "ping": {
            return { jsonrpc: "2.0", id, result: {} };
        }
        case "tools/list": {
            return {
                jsonrpc: "2.0",
                id,
                result: {
                    tools: SIGNALHIRE_TOOLS,
                },
            };
        }
        case "tools/call": {
            const toolName = params?.name;
            const args = params?.arguments || {};
            const toolDef = SIGNALHIRE_TOOLS.find((t) => t.name === toolName);
            if (!toolDef) {
                return {
                    jsonrpc: "2.0",
                    id,
                    error: {
                        code: -32601,
                        message: `Tool not found: ${toolName}`,
                    },
                };
            }
            try {
                const result = await executeSignalHireTool(toolName, args, client);
                return {
                    jsonrpc: "2.0",
                    id,
                    result,
                };
            }
            catch (err) {
                return {
                    jsonrpc: "2.0",
                    id,
                    result: {
                        content: [{ type: "text", text: `Tool error: ${err.message}` }],
                        isError: true,
                    },
                };
            }
        }
        case "resources/list": {
            return {
                jsonrpc: "2.0",
                id,
                result: {
                    resources: [
                        {
                            uri: "signalhire://industries",
                            name: "SignalHire Industries",
                            description: "All 146 supported industry categories for candidate search",
                            mimeType: "application/json",
                        },
                        {
                            uri: "signalhire://departments",
                            name: "SignalHire Departments",
                            description: "15 professional department classifications",
                            mimeType: "application/json",
                        },
                        {
                            uri: "signalhire://levels",
                            name: "SignalHire Seniority Levels",
                            description: "11 seniority levels from Intern to C-Level",
                            mimeType: "application/json",
                        },
                        {
                            uri: "signalhire://pricing-and-credits",
                            name: "Credit & Quota Rules",
                            description: "Official guide on Contact Credits and daily search quotas",
                            mimeType: "text/markdown",
                        },
                    ],
                },
            };
        }
        case "resources/read": {
            const uri = params?.uri;
            if (uri === "signalhire://industries") {
                return {
                    jsonrpc: "2.0",
                    id,
                    result: {
                        contents: [
                            {
                                uri,
                                text: JSON.stringify(SIGNALHIRE_INDUSTRIES, null, 2),
                                mimeType: "application/json",
                            },
                        ],
                    },
                };
            }
            if (uri === "signalhire://departments") {
                return {
                    jsonrpc: "2.0",
                    id,
                    result: {
                        contents: [
                            {
                                uri,
                                text: JSON.stringify(SIGNALHIRE_DEPARTMENTS, null, 2),
                                mimeType: "application/json",
                            },
                        ],
                    },
                };
            }
            if (uri === "signalhire://levels") {
                return {
                    jsonrpc: "2.0",
                    id,
                    result: {
                        contents: [
                            {
                                uri,
                                text: JSON.stringify(SIGNALHIRE_LEVELS, null, 2),
                                mimeType: "application/json",
                            },
                        ],
                    },
                };
            }
            if (uri === "signalhire://pricing-and-credits") {
                return {
                    jsonrpc: "2.0",
                    id,
                    result: {
                        contents: [
                            {
                                uri,
                                text: `# SignalHire Credit & Quota Rules\n\n- **Search API (search_candidates_query, scroll_search):** Uses daily search quota. ZERO contact credits spent.\n- **Without Contacts Profile Lookup (retrieve_person_no_contacts):** Uses daily without-contacts quota. ZERO contact credits spent.\n- **Contact Enrichment (retrieve_person_profile):** 1 Contact Credit per successful profile match. Guarded by spend_credits_confirmed=true.\n- **Company Info (get_company_info):** 1 Company Credit per lookup. Guarded by spend_credits_confirmed=true.\n- **Company Identification (find_company):** Completely free.\n- **Balance Checks (check_balance, check_without_contacts_credits):** Completely free.`,
                                mimeType: "text/markdown",
                            },
                        ],
                    },
                };
            }
            return {
                jsonrpc: "2.0",
                id,
                error: { code: -32602, message: `Resource not found: ${uri}` },
            };
        }
        case "prompts/list": {
            return {
                jsonrpc: "2.0",
                id,
                result: {
                    prompts: [
                        {
                            name: "find_candidates",
                            description: "Template for sourcing target candidate profiles without revealing contacts",
                            arguments: [
                                { name: "role", description: "Target title/role", required: true },
                                { name: "location", description: "Target location" },
                                { name: "skills", description: "Key skills/keywords" },
                                { name: "count", description: "Number of profiles (default: 5)" },
                            ],
                        },
                        {
                            name: "enrich_candidate",
                            description: "Enrich candidate with verified email and phone with safety credit confirmation",
                            arguments: [
                                { name: "identifier", description: "LinkedIn URL, email, or UID", required: true },
                            ],
                        },
                        {
                            name: "research_company",
                            description: "Research company headcount, office locations, and domain",
                            arguments: [
                                { name: "company_name", description: "Name of company", required: true },
                            ],
                        },
                    ],
                },
            };
        }
        default: {
            if (isNotification)
                return null;
            return {
                jsonrpc: "2.0",
                id,
                error: { code: -32601, message: `Method not found: ${method}` },
            };
        }
    }
}
