# 🎯 SignalHire MCP Server

Production-ready Model Context Protocol (MCP) server for **[SignalHire](https://www.signalhire.com)**. Provides AI assistants and agents (Claude, Cursor, Windsurf, VS Code, n8n) with access to candidate discovery, contact enrichment, and company firmographics.

- **Public Endpoint:** `https://signalhire.growviah.com/mcp`
- **SSE Stream Endpoint:** `https://signalhire.growviah.com/sse`
- **Health Check:** `https://signalhire.growviah.com/health`
- **Dockerized Container:** `signalhire-mcp` (Port `4010` -> `3333`)
- **SSL / TLS:** Active Let's Encrypt SSL via Nginx reverse proxy

---

## 🛠️ Available MCP Tools (14)

| Tool | Description | Credit Cost |
| :--- | :--- | :--- |
| `search_candidates_query` | Search people, find candidates, discover leads, and source talent from hundreds of millions of profiles using title, location, keywords, department, seniority level, Boolean logic (`AND`/`OR`). Supports `auto_paginate: true`, `max_results`, and `strict_current_level`. | Daily Search Quota *(Zero Contact Credits)* |
| `scroll_search` | Paginate through search batches using `request_id` and `scroll_id` (15s TTL). | Daily Search Quota |
| `retrieve_person_no_contacts` | Retrieve full professional career history, skills, education, and certifications **without** unlocking contacts. Displays reset countdown if quota is reached. | Daily Without-Contacts Quota *(Zero Contact Credits)* |
| `retrieve_person_profile` | Reveal full profile **including verified personal/work emails, direct phone numbers, and social links**. | ⚠️ 1 Contact Credit per match *(Guarded by `spend_credits_confirmed: true`)* |
| `find_company` | Look up company by name or domain to check employee headcount, office locations, industry, founded year tag (`Est. YYYY`), and primary domain in SignalHire. Enriched data makes wrong matches easy to spot. | **Free** |
| `bulk_find_company` | **(NEW)** Bulk search and compare multiple companies in a single call (up to 20 companies). Returns a comparative headcount, founded year tag/column, location, role, and domain table. | **Free** |
| `search_companies_by_filters` | **(NEW)** Search companies by industry (from 146 categories), country/location, keywords (e.g. 'Fintech', 'SaaS', 'Logistics'), and company size with founded year intelligence. | **Free** |
| `get_company_info` | Comprehensive company data: verified headcount, locations, industry, founded year, specialities (with talent pool analytics fallback). | ⚠️ 1 Company Credit *(Guarded by `spend_credits_confirmed: true`)* |
| `check_balance` | Check all balances and quotas: standard Contact Credits (2,000), daily Without-Contacts quota (with reset countdown), and Company Intelligence API status. | **Free** |
| `check_without_contacts_credits` | Check remaining daily without-contacts profile quota with countdown to 00:00 UTC reset. | **Free** |
| `export_to_csv` | **(NEW)** Export candidate or company search results into CSV format or Google Sheets / Excel 1-click copy-pasteable TSV format. | **Free** |
| `get_available_levels` | List of 11 supported seniority levels (`Intern` to `C-Level`) and normalization mapping rules. | **Free** |
| `get_available_departments` | List of 15 supported professional departments (`Engineering`, `Sales`, `Marketing`, etc.). | **Free** |
| `get_available_industries` | List of all 146 supported industry categories with keyword filter. | **Free** |

---

## ⚡ Key Highlights & Problem Solvers

1. **Auto-Pagination (`auto_paginate: true` / `max_results: 50`):**
   SignalHire's native scrollId expires after 15 seconds. By using `auto_paginate: true` or setting `max_results > 10` in `search_candidates_query`, the server automatically fetches sequential pages in milliseconds within the same tool call, completely eliminating timeout errors!

2. **Clean Markdown Tables (No Broken Pipes):**
   Job titles with pipe characters (like `"General Manager | NUSUK"`) are safely sanitized to `"General Manager - NUSUK"`, ensuring markdown table columns never shift or break.

3. **Smart Seniority Normalization & Strict Mode:**
   Levels like `"C-Level/VP"` or `["c-level", "vp"]` are automatically normalized to the official API enums. Setting `strict_current_level: true` ensures candidates' *current* job title matches executive terms, filtering out individuals whose seniority was only in past jobs.

4. **1-Click Google Sheets Export:**
   `export_to_csv` with `format: "tsv_google_sheets"` outputs a Tab-Separated Values block. Simply click "Copy", click cell **A1** in Google Sheets, and hit **Ctrl+V** — all data populates separate columns cleanly!

5. **Company Search & Bulk Lookups:**
   Easily discover companies by industry, country, and keywords with `search_companies_by_filters`, or compare up to 20 companies at once with `bulk_find_company`.

---

## 🔌 Connecting to Claude (No Key or Headers Required)

Since your `SIGNALHIRE_API_KEY` is pre-configured on the server in `.env`, clients connect directly **without passing any headers or tokens**!

### 1. Claude.ai (Web) via Custom Connector

1. Log in to [Claude.ai](https://claude.ai).
2. Go to **Settings** → **Connectors** → **Add custom connector**.
3. Set the endpoint URL:
   ```text
   https://signalhire.growviah.com/mcp
   ```
4. Click **Connect** (no headers or authorization needed).
5. All 14 SignalHire tools will be available directly in your chat!

---

### 2. Claude Desktop (macOS / Windows)

Open your Claude Desktop config file:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the server using `mcp-remote`:

```json
{
  "mcpServers": {
    "signalhire": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://signalhire.growviah.com/mcp"
      ]
    }
  }
}
```

Restart Claude Desktop, and the SignalHire tools will appear automatically.

---

### 3. Cursor IDE

In `~/.cursor/mcp.json` or `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "signalhire": {
      "url": "https://signalhire.growviah.com/mcp"
    }
  }
}
```

---

## 🐳 Docker Management

The server runs inside Docker using `docker compose`:

```bash
# Check status
docker compose ps

# View live logs
docker compose logs -f

# Rebuild and restart after code edits
docker compose build && docker compose up -d
```
# SingleHire-
