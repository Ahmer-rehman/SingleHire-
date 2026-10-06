/**
 * SignalHire MCP Server Implementation
 * Implements official Model Context Protocol (MCP) server for SignalHire
 * Reference: https://docs.signalhire.com/mcp-server.md
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SignalHireApiClient } from "./client.js";
import { SIGNALHIRE_DEPARTMENTS, SIGNALHIRE_INDUSTRIES, SIGNALHIRE_LEVELS, } from "./constants.js";
import { formatBalanceSummary, formatCandidateLookup, formatCompanyFind, formatCompanyInfo, formatCompanyList, formatExportData, formatSearchResults, getTimeUntilMidnightUtc, } from "./formatters.js";
// ─── Tool Definitions ─────────────────────────────────────────────────────────
export const SIGNALHIRE_TOOLS = [
    {
        name: "search_candidates_query",
        description: "Search people, find candidates, discover leads, and source talent from the SignalHire database of hundreds of millions of professionals using advanced filters (title, location, company, keywords, department, seniority level). Uses daily search quota (no contact credits).",
        inputSchema: {
            type: "object",
            properties: {
                current_title: {
                    type: "string",
                    description: "Boolean query for current job title, e.g. '(Software AND Engineer) OR Developer'",
                },
                current_past_title: {
                    type: "string",
                    description: "Boolean query for current or past job title (takes precedence over current_title if both set)",
                },
                location: {
                    type: ["string", "array"],
                    items: { type: "string" },
                    description: "Geographic area, or a list of them: Country ('Saudi Arabia', 'Germany'), State ('California, US'), or City ('Riyadh', 'Dubai', 'London')",
                },
                latitude: {
                    type: "number",
                    description: "Latitude for geo search (with longitude). Overrides location.",
                },
                longitude: {
                    type: "number",
                    description: "Longitude for geo search (with latitude).",
                },
                coordinates: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: { latitude: { type: "number" }, longitude: { type: "number" } },
                        required: ["latitude", "longitude"],
                    },
                    description: "Several geo points to search around. Overrides location. Ignored when latitude/longitude are set.",
                },
                radius: {
                    type: "number",
                    description: "Search radius in km (10-160, default 10) for geo points and city locations.",
                },
                company_size: {
                    type: "string",
                    description: "Keep only people whose current company headcount is in this range, e.g. '201-500', '5001+'. Not a SignalHire search filter: checked afterwards with /company/info (1 Company Credit per new company, needs the firmographics add-on). Requires spend_credits_confirmed=true.",
                },
                spend_credits_confirmed: {
                    type: "boolean",
                    description: "Required with company_size, after the user agrees to spend Company Credits.",
                },
                current_company: {
                    type: "string",
                    description: "Boolean query for current employer name, e.g. 'Elm OR Google'",
                },
                current_past_company: {
                    type: "string",
                    description: "Boolean query for current or past employer name",
                },
                full_name: {
                    type: "string",
                    description: "Filter by candidate's full name",
                },
                keywords: {
                    type: "string",
                    description: "Boolean query for skills, description, education, and attributes, e.g. '(Python AND AWS) OR (GCP AND Java)'",
                },
                industry: {
                    type: "string",
                    description: "Filter by a single industry category from the 146 supported categories (see get_available_industries)",
                },
                industries: {
                    type: "array",
                    items: { type: "string" },
                    description: "Filter by multiple exact industry category names from get_available_industries",
                },
                department: {
                    type: "array",
                    items: { type: "string", enum: [...SIGNALHIRE_DEPARTMENTS] },
                    description: "Filter by professional departments",
                },
                level: {
                    type: "array",
                    items: { type: "string" },
                    description: "Filter by seniority level: 'C-Level', 'VP', 'Directors', 'Head', 'Lead', 'Senior', 'Mid-Level', 'Junior', 'Intern / Entry Level', 'Founder / Owner', 'Board / Advisory'. Combinations like 'C-Level/VP' or lowercase are auto-normalized.",
                },
                exclude_title: {
                    type: "string",
                    description: "Titles to exclude, e.g. 'Intern OR Assistant OR Recruiter'. Applied to returned profiles' current title after the search, so fewer than max_results may come back.",
                },
                strict_current_level: {
                    type: "boolean",
                    description: "If true, strictly filters so candidates' CURRENT role matches executive/seniority terms, excluding people whose executive roles were only in the past.",
                },
                years_experience_from: {
                    type: "number",
                    description: "Minimum years of experience in current role and company",
                },
                years_experience_to: {
                    type: "number",
                    description: "Maximum years of experience in current role and company",
                },
                years_current_past_experience_from: {
                    type: "number",
                    description: "Minimum total career years of experience across all roles",
                },
                years_current_past_experience_to: {
                    type: "number",
                    description: "Maximum total career years of experience across all roles",
                },
                education: {
                    type: "string",
                    description: "Boolean query across university name, faculty, or degree",
                },
                open_to_work: {
                    type: "boolean",
                    description: "Filter candidates explicitly marked as open to work",
                },
                exclude_revealed: {
                    type: "boolean",
                    description: "Exclude profiles whose contacts you have already revealed",
                },
                exclude_watched: {
                    type: "boolean",
                    description: "Exclude profiles viewed in web app or extension",
                },
                exclude_in_lists: {
                    type: "boolean",
                    description: "Exclude profiles already saved to lists",
                },
                exclude_in_progress: {
                    type: "boolean",
                    description: "Exclude profiles currently in candidate pipelines",
                },
                exclude_emailed: {
                    type: "boolean",
                    description: "Exclude profiles already emailed",
                },
                size: {
                    type: "number",
                    description: "Number of profiles to return in this batch (1-100, default: 10)",
                    default: 10,
                },
                auto_paginate: {
                    type: "boolean",
                    description: "If true, automatically fetches multiple pages sequentially in a single call to prevent 15-second scrollId expiration.",
                    default: false,
                },
                max_results: {
                    type: "number",
                    description: "Total candidates to retrieve when auto-paginating (e.g. 10 to 100, default: 10). If > 10, auto-paginates automatically.",
                    default: 10,
                },
                response_format: {
                    type: "string",
                    enum: ["markdown", "json", "csv"],
                    description: "Output format: markdown, json, or csv (default: markdown)",
                    default: "markdown",
                },
            },
        },
    },
    {
        name: "search_people_at_companies",
        description: "Find people at a list of companies in as few searches as possible (companies are batched into OR queries, 10 per search). Use after search_companies_by_filters or bulk_find_company. Uses daily search quota (no contact credits).",
        inputSchema: {
            type: "object",
            properties: {
                companies: {
                    type: "array",
                    items: { type: "string" },
                    description: "Company names, e.g. ['Elm', 'Ejada', 'STC Solutions'] (up to 50)",
                },
                current_title: { type: "string", description: "Boolean query for current job title" },
                exclude_title: { type: "string", description: "Titles to exclude, e.g. 'Intern OR Assistant'" },
                location: { type: "string", description: "Country, state, or city" },
                department: {
                    type: "array",
                    items: { type: "string", enum: [...SIGNALHIRE_DEPARTMENTS] },
                    description: "Filter by professional departments",
                },
                level: { type: "array", items: { type: "string" }, description: "Seniority levels" },
                max_results: { type: "number", description: "Total people to return (1-200, default 50)", default: 50 },
                response_format: {
                    type: "string",
                    enum: ["markdown", "json", "csv"],
                    description: "Output format: markdown, json, or csv",
                    default: "markdown",
                },
            },
            required: ["companies"],
        },
    },
    {
        name: "scroll_search",
        description: "Fetch the next batch of search results for pagination. Must be called within 15 seconds of the previous search response. Tip: Prefer using search_candidates_query with auto_paginate=true or max_results to fetch all pages in one call.",
        inputSchema: {
            type: "object",
            properties: {
                request_id: {
                    type: "number",
                    description: "The requestId returned from the initial search_candidates_query call",
                },
                scroll_id: {
                    type: "string",
                    description: "The scrollId returned from the previous search response (expires in 15s)",
                },
                response_format: {
                    type: "string",
                    enum: ["markdown", "json", "csv"],
                    description: "Output format: markdown, json, or csv",
                    default: "markdown",
                },
            },
            required: ["request_id", "scroll_id"],
        },
    },
    {
        name: "retrieve_person_no_contacts",
        description: "Retrieve a candidate's full professional profile (work history, skills, education, languages, certifications) WITHOUT unlocking contact details. Uses daily without-contacts quota and charges ZERO Contact Credits. Resets daily at 00:00 UTC.",
        inputSchema: {
            type: "object",
            properties: {
                items: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of 32-character SignalHire profile UIDs obtained from search_candidates_query (up to 100 items)",
                },
                response_format: {
                    type: "string",
                    enum: ["markdown", "json", "csv"],
                    description: "Output format: markdown, json, or csv",
                    default: "markdown",
                },
            },
            required: ["items"],
        },
    },
    {
        name: "retrieve_person_profile",
        description: "Retrieve a candidate's full profile INCLUDING contact information (verified personal/work emails, direct phone numbers, social links). ⚠️ Consumes 1 Contact Credit per successful match. Safety guardrail: Requires spend_credits_confirmed=true.",
        inputSchema: {
            type: "object",
            properties: {
                items: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of identifiers: LinkedIn profile URLs, email addresses, phone numbers, or 32-char SignalHire UIDs (up to 100)",
                },
                spend_credits_confirmed: {
                    type: "boolean",
                    description: "MANDATORY: Must be explicitly set to true after asking the user's permission to spend Contact Credits (1 credit per successful profile match).",
                },
                without_waterfall: {
                    type: "boolean",
                    description: "If true (default), returns results synchronously in the response body. If false, uses asynchronous callbackUrl mode.",
                    default: true,
                },
                callback_url: {
                    type: "string",
                    description: "Public callback URL for asynchronous mode (only when without_waterfall is false)",
                },
                response_format: {
                    type: "string",
                    enum: ["markdown", "json", "csv"],
                    description: "Output format: markdown, json, or csv",
                    default: "markdown",
                },
            },
            required: ["items", "spend_credits_confirmed"],
        },
    },
    {
        name: "find_company",
        description: "Look up a company by name or domain to check employee presence, headcount, primary domain/website, industry, and office locations in SignalHire. Enriched data makes wrong matches easy to spot.",
        inputSchema: {
            type: "object",
            properties: {
                company_id_or_slug: {
                    type: "string",
                    description: "Company name or domain, e.g. 'Elm', 'STC', 'elm.sa', 'google', 'accenture'",
                },
                location: {
                    type: "string",
                    description: "Optional country or city to focus employee statistics (e.g. 'Saudi Arabia')",
                },
            },
            required: ["company_id_or_slug"],
        },
    },
    {
        name: "bulk_find_company",
        description: "Bulk search and compare multiple companies in a single call. Checks headcount in SignalHire, verified office locations, sample roles, and primary domains for up to 20 companies at once.",
        inputSchema: {
            type: "object",
            properties: {
                companies: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of company names to inspect (e.g. ['Elm', 'STC Solutions', 'Ejada', 'Apptunix'])",
                },
                location: {
                    type: "string",
                    description: "Optional geographic filter (e.g. 'Saudi Arabia', 'United Arab Emirates')",
                },
                response_format: {
                    type: "string",
                    enum: ["markdown", "json", "csv"],
                    description: "Output format: markdown, json, or csv (default: markdown)",
                    default: "markdown",
                },
            },
            required: ["companies"],
        },
    },
    {
        name: "search_companies_by_filters",
        description: "Search companies by filters like industry (from 146 supported categories), country/location, keywords (e.g. 'Fintech', 'SaaS', 'Logistics'), and company size. Aggregates employee presence from the SignalHire database.",
        inputSchema: {
            type: "object",
            properties: {
                industry: {
                    type: "string",
                    description: "Industry category, e.g. 'Computer Software', 'Information Technology and Services', 'Financial Services', 'Hospital & Health Care' (see get_available_industries)",
                },
                location: {
                    type: "string",
                    description: "Country, state, or city, e.g. 'Saudi Arabia', 'United Arab Emirates', 'Germany', 'United States'",
                },
                keywords: {
                    type: "string",
                    description: "Keywords or niche specialities, e.g. 'Cybersecurity', 'AI', 'Payments', 'E-commerce'",
                },
                company_size: {
                    type: "string",
                    description: "Company size range (e.g. '51-200', '201-500', '501-1000', '1001-5000', '5000+')",
                },
                limit: {
                    type: "number",
                    description: "Max number of companies to return (1-25, default: 10)",
                    default: 10,
                },
                response_format: {
                    type: "string",
                    enum: ["markdown", "json", "csv"],
                    description: "Output format: markdown, json, or csv (default: markdown)",
                    default: "markdown",
                },
            },
        },
    },
    {
        name: "get_company_info",
        description: "Retrieve company firmographics and headcount. Note: If firmographics are not enabled on the account, it automatically provides talent pool analytics. To search employees directly, use search_candidates_query with current_company.",
        inputSchema: {
            type: "object",
            properties: {
                company_id: {
                    type: "string",
                    description: "Numeric company ID or slug (use find_company first if you only have a company name)",
                },
                spend_credits_confirmed: {
                    type: "boolean",
                    description: "MANDATORY: Must be explicitly set to true after confirming user permission to spend 1 Company Credit.",
                },
                response_format: {
                    type: "string",
                    enum: ["markdown", "json", "csv"],
                    description: "Output format: markdown, json, or csv",
                    default: "markdown",
                },
            },
            required: ["company_id", "spend_credits_confirmed"],
        },
    },
    {
        name: "get_company_profile_count",
        description: "Free count of SignalHire profiles for one company (current, past, or both employees). Not real headcount. Needs Company API access.",
        inputSchema: {
            type: "object",
            properties: {
                company_id: { type: "string", description: "Numeric company ID or slug (from find_company)" },
                status: {
                    type: "string",
                    enum: ["current", "past", "both"],
                    description: "Employment status (default: current)",
                    default: "current",
                },
            },
            required: ["company_id"],
        },
    },
    {
        name: "get_company_profiles",
        description: "Request all employee profiles of a company. Profiles (no contacts) are POSTed to callback_url in batches of 100. Uses the daily profile-view quota. Needs Company API access.",
        inputSchema: {
            type: "object",
            properties: {
                company_id: { type: "string", description: "Numeric company ID or slug (from find_company)" },
                status: {
                    type: "string",
                    enum: ["current", "past", "both"],
                    description: "Employment status (default: current)",
                    default: "current",
                },
                callback_url: { type: "string", description: "Public URL that will receive the profiles" },
            },
            required: ["company_id", "callback_url"],
        },
    },
    {
        name: "check_balance",
        description: "Check all SignalHire account balances and quotas: standard Contact Credits, daily Without-Contacts quota (with exact reset countdown), and Company Intelligence API status. Free tool.",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "check_without_contacts_credits",
        description: "Check the remaining daily quota for retrieving candidate profiles without contact details (retrieve_person_no_contacts). Shows exact time until midnight UTC reset.",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "get_available_levels",
        description: "Retrieve the complete list of candidate seniority levels supported by the SignalHire search API and their normalization rules. Free tool.",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "get_available_departments",
        description: "Retrieve the complete list of 15 professional departments supported by the SignalHire search API. Free tool.",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "get_available_industries",
        description: "Retrieve the list of 146 official supported industry categories for candidate search, with optional search filter. Free tool.",
        inputSchema: {
            type: "object",
            properties: {
                filter: {
                    type: "string",
                    description: "Optional search keyword to filter industries (e.g. 'Software', 'Health', 'Finance')",
                },
            },
        },
    },
    {
        name: "export_to_csv",
        description: "Export candidate or company search results into CSV format or Google Sheets / Excel copy-pasteable TSV format. Can export provided items or run search_params and export directly.",
        inputSchema: {
            type: "object",
            properties: {
                data_type: {
                    type: "string",
                    enum: ["candidates", "companies"],
                    description: "Type of data being exported: 'candidates' or 'companies' (default: 'candidates')",
                    default: "candidates",
                },
                format: {
                    type: "string",
                    enum: ["tsv_google_sheets", "csv"],
                    description: "Export format: 'tsv_google_sheets' for 1-click copy-paste directly into Google Sheets or Excel, or 'csv' for RFC 4180 CSV.",
                    default: "tsv_google_sheets",
                },
                search_params: {
                    type: "object",
                    description: "Optional search parameters (e.g. current_company, current_title, location, keywords, max_results) to execute a search and export directly.",
                },
                items: {
                    type: "array",
                    description: "Array of objects to export. Flexible field aliases accepted! For companies: company/name, domain/website/url, headcount/employeeCount/size, location/locations (string or array), sampleRoles/roles, industry/industries. For candidates: fullName/name, title/role, company, location, skills (string or array), uid/id.",
                },
            },
        },
    },
];
// ─── Direct Tool Execution Handler ────────────────────────────────────────────
export async function executeSignalHireTool(toolName, args = {}, client) {
    try {
        switch (toolName) {
            case "search_candidates_query": {
                const targetCount = args.max_results
                    ? Number(args.max_results)
                    : args.size
                        ? Number(args.size)
                        : 10;
                const autoPaginate = Boolean(args.auto_paginate ||
                    targetCount > 10 ||
                    (args.strict_current_level && targetCount > 5));
                const searchParams = {
                    currentTitle: args.current_title,
                    currentPastTitle: args.current_past_title,
                    location: args.location,
                    latitude: args.latitude,
                    longitude: args.longitude,
                    coordinates: args.coordinates,
                    radius: args.radius,
                    currentCompany: args.current_company,
                    currentPastCompany: args.current_past_company,
                    fullName: args.full_name,
                    keywords: args.keywords,
                    industry: args.industry,
                    industries: args.industries,
                    department: args.department,
                    level: args.level,
                    strictCurrentLevel: args.strict_current_level,
                    excludeTitle: args.exclude_title,
                    yearsOfCurrentExperienceFrom: args.years_experience_from,
                    yearsOfCurrentExperienceTo: args.years_experience_to,
                    yearsOfCurrentPastExperienceFrom: args.years_current_past_experience_from,
                    yearsOfCurrentPastExperienceTo: args.years_current_past_experience_to,
                    education: args.education,
                    openToWork: args.open_to_work,
                    excludeRevealed: args.exclude_revealed,
                    excludeWatched: args.exclude_watched,
                    excludeInLists: args.exclude_in_lists,
                    excludeInProgress: args.exclude_in_progress,
                    excludeEmailed: args.exclude_emailed,
                    size: targetCount,
                };
                if (args.company_size && !args.spend_credits_confirmed) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `⚠️ **Company Credit Confirmation Required**\n\nThe \`company_size\` filter is checked with /company/info, which costs **1 Company Credit per distinct company** in the results (cached afterwards). Up to ${targetCount} companies could be checked.\n\nAsk the user for permission, then re-run with \`spend_credits_confirmed: true\`.`,
                            },
                        ],
                    };
                }
                const response = autoPaginate
                    ? await client.searchCandidatesAutoPaginate(searchParams, targetCount)
                    : await client.searchCandidates(searchParams);
                let sizeNote = "";
                if (args.company_size) {
                    try {
                        const before = response.profiles.length;
                        const sized = await client.filterProfilesByCompanySize(response.profiles, String(args.company_size));
                        response.profiles = sized.profiles;
                        sizeNote = `\n\n> Company size filter \`${args.company_size}\`: kept ${sized.profiles.length} of ${before} profiles after checking ${sized.checkedCompanies} companies.${sized.unknownCompanies.length
                            ? ` No headcount found for: ${sized.unknownCompanies.slice(0, 10).join(", ")} (excluded).`
                            : ""} The total above is before this filter.`;
                    }
                    catch (err) {
                        if (err.statusCode === 403) {
                            return {
                                content: [
                                    {
                                        type: "text",
                                        text: "⚠️ **company_size needs the firmographics add-on.** /company/info returned 403 on this account, so headcount can't be checked. Remove company_size or enable Company API access with SignalHire.",
                                    },
                                ],
                            };
                        }
                        throw err;
                    }
                }
                const formatted = formatSearchResults(response, (args.response_format || "markdown"), client.lastCreditsLeft);
                return { content: [{ type: "text", text: formatted + sizeNote }] };
            }
            case "search_people_at_companies": {
                const companies = Array.isArray(args.companies) ? args.companies : [args.companies];
                const response = await client.searchPeopleAtCompanies(companies.slice(0, 50), {
                    currentTitle: args.current_title,
                    excludeTitle: args.exclude_title,
                    location: args.location,
                    department: args.department,
                    level: args.level,
                }, args.max_results ? Number(args.max_results) : 50);
                const formatted = formatSearchResults(response, (args.response_format || "markdown"), client.lastCreditsLeft);
                const note = response.incomplete
                    ? "\n\n> ⚠️ Incomplete: a batch of companies failed, so these are partial results and the total is a lower bound."
                    : "";
                return { content: [{ type: "text", text: formatted + note }] };
            }
            case "scroll_search": {
                const response = await client.scrollSearch(Number(args.request_id), String(args.scroll_id));
                const formatted = formatSearchResults(response, (args.response_format || "markdown"), client.lastCreditsLeft);
                return { content: [{ type: "text", text: formatted }] };
            }
            case "retrieve_person_no_contacts": {
                const items = Array.isArray(args.items) ? args.items : [args.items];
                try {
                    const result = await client.retrievePerson(items, {
                        withoutWaterfall: true,
                        withoutContacts: true,
                    });
                    if (!Array.isArray(result)) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Request initiated with Request ID: ${result.requestId}`,
                                },
                            ],
                        };
                    }
                    const formatted = formatCandidateLookup(result, (args.response_format || "markdown"), client.lastCreditsLeft, false);
                    return { content: [{ type: "text", text: formatted }] };
                }
                catch (err) {
                    // If without-contacts quota is 0 or payment required
                    if (err.statusCode === 402 ||
                        String(err.message).toLowerCase().includes("quota") ||
                        String(err.message).toLowerCase().includes("credit")) {
                        const resetCountdown = getTimeUntilMidnightUtc();
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: [
                                        `### ⚠️ Without-Contacts Daily Quota Exhausted (0 remaining)`,
                                        `- **Daily Free Quota Reset:** In **${resetCountdown}**.`,
                                        `- **Current Contact Credits Balance:** **${client.lastCreditsLeft ?? 2000} Contact Credits** available.`,
                                        "",
                                        `> 💡 **Available Right Now:** You can retrieve full candidate profiles (including verified emails & direct phone numbers) immediately using \`retrieve_person_profile\` with \`spend_credits_confirmed: true\`.`,
                                    ].join("\n"),
                                },
                            ],
                        };
                    }
                    throw err;
                }
            }
            case "retrieve_person_profile": {
                const items = Array.isArray(args.items) ? args.items : [args.items];
                if (!args.spend_credits_confirmed) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `⚠️ **Credit Confirmation Required**\n\nRetrieving contact information for **${items.length} candidate(s)** consumes **1 Contact Credit per successful match**.\n\nPlease ask the user for confirmation to proceed. Once confirmed, re-run this tool with \`spend_credits_confirmed: true\`.\n\n*Identifiers to enrich:*\n${items
                                    .map((i) => `- \`${i}\``)
                                    .join("\n")}`,
                            },
                        ],
                    };
                }
                const isSync = args.without_waterfall !== false;
                const result = await client.retrievePerson(items, {
                    withoutWaterfall: isSync,
                    withoutContacts: false,
                    callbackUrl: isSync ? undefined : args.callback_url,
                });
                if (!Array.isArray(result)) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Async enrichment queued successfully.\n- **Request ID:** \`${result.requestId}\`\n- **Callback URL:** \`${args.callback_url}\`\nResults will be sent via POST once ready.`,
                            },
                        ],
                    };
                }
                const formatted = formatCandidateLookup(result, (args.response_format || "markdown"), client.lastCreditsLeft, true);
                return { content: [{ type: "text", text: formatted }] };
            }
            case "find_company": {
                const idOrSlug = String(args.company_id_or_slug || "").trim();
                const enriched = await client.findCompanyEnriched(idOrSlug, args.location);
                const formatted = formatCompanyFind(enriched, client.lastCreditsLeft);
                return { content: [{ type: "text", text: formatted }] };
            }
            case "bulk_find_company": {
                const companies = Array.isArray(args.companies) ? args.companies : [args.companies];
                const results = await client.bulkFindCompany(companies, args.location);
                const formatted = formatCompanyList(results, "Bulk Company Comparison", (args.response_format || "markdown"), client.lastCreditsLeft);
                return { content: [{ type: "text", text: formatted }] };
            }
            case "search_companies_by_filters": {
                const results = await client.searchCompaniesByFilters({
                    industry: args.industry,
                    location: args.location,
                    keywords: args.keywords,
                    companySize: args.company_size,
                    limit: args.limit ? Number(args.limit) : 10,
                });
                const formatted = formatCompanyList(results, "Filtered Company Search", (args.response_format || "markdown"), client.lastCreditsLeft);
                return { content: [{ type: "text", text: formatted }] };
            }
            case "get_company_info": {
                const companyId = String(args.company_id || "").trim();
                if (!args.spend_credits_confirmed) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `⚠️ **Company Credit Confirmation Required**\n\nRetrieving full company profile data for \`${companyId}\` consumes **1 Company Credit**.\n\nPlease ask the user for permission. Once confirmed, re-run this tool with \`spend_credits_confirmed: true\`.`,
                            },
                        ],
                    };
                }
                try {
                    const result = await client.getCompanyInfo(companyId);
                    const formatted = formatCompanyInfo(result, (args.response_format || "markdown"), client.lastCreditsLeft);
                    return { content: [{ type: "text", text: formatted }] };
                }
                catch (err) {
                    if (err.statusCode === 403 || String(err.message).includes("403")) {
                        const notice = `> ⚠️ **Company firmographics are not enabled on this account (HTTP 403).** No Company Credit was spent. Real headcount needs the SignalHire firmographics add-on. The numbers below are SignalHire profile counts, not real headcount.\n\n`;
                        try {
                            const enriched = await client.findCompanyEnriched(companyId);
                            const formatted = formatCompanyFind(enriched, client.lastCreditsLeft);
                            return { content: [{ type: "text", text: notice + formatted }] };
                        }
                        catch {
                            return {
                                content: [
                                    {
                                        type: "text",
                                        text: `### 🏢 Company: **${companyId}**\n\nThe standalone Company Firmographics API returned 403 on this account. Please use \`search_candidates_query\` with \`current_company: "${companyId}"\` to find employees and leadership directly.`,
                                    },
                                ],
                            };
                        }
                    }
                    throw err;
                }
            }
            case "get_company_profile_count": {
                const companyId = String(args.company_id || "").trim();
                const status = (args.status || "current");
                const res = await client.getCompanyCount(companyId, status);
                return {
                    content: [
                        {
                            type: "text",
                            text: `### 🏢 \`${companyId}\`: **${res.total_profiles.toLocaleString()}** ${status} employee profiles in SignalHire\n\n> Profiles held, not real headcount. Free call.`,
                        },
                    ],
                };
            }
            case "get_company_profiles": {
                const companyId = String(args.company_id || "").trim();
                const status = (args.status || "current");
                const res = await client.getCompanyProfiles(companyId, status, String(args.callback_url));
                return {
                    content: [
                        {
                            type: "text",
                            text: `Profile export started for \`${companyId}\` (${status}).\n- **Search ID:** \`${res.searchId}\`\n- Profiles will be POSTed to \`${args.callback_url}\` in batches of up to 100. Pass their \`uid\` to retrieve_person_profile for contacts.`,
                        },
                    ],
                };
            }
            case "check_balance": {
                let contactBalance = 2000;
                let withoutContactsBalance = 0;
                try {
                    const resContacts = await client.checkCredits(false);
                    contactBalance = client.lastCreditsLeft !== null ? client.lastCreditsLeft : resContacts.credits;
                }
                catch {
                    // fallback to last known
                }
                try {
                    const resWithout = await client.checkCredits(true);
                    withoutContactsBalance = resWithout.credits;
                }
                catch {
                    withoutContactsBalance = 0;
                }
                const summary = formatBalanceSummary(contactBalance, withoutContactsBalance, false);
                return {
                    content: [{ type: "text", text: summary }],
                };
            }
            case "check_without_contacts_credits": {
                let balance = 0;
                try {
                    const res = await client.checkCredits(true);
                    balance = res.credits;
                }
                catch {
                    balance = 0;
                }
                const resetCountdown = getTimeUntilMidnightUtc();
                const msg = [
                    `### 📊 Without-Contacts Daily Quota`,
                    `- **Daily Quota Remaining Today:** **${balance}** profiles`,
                    `- **Quota Reset Time:** In **${resetCountdown}**.`,
                    "",
                    balance === 0
                        ? `> ⚠️ **Quota is 0 for today.** To retrieve candidate work history with verified emails & phone numbers right now, use \`retrieve_person_profile\` with \`spend_credits_confirmed: true\` (consumes 1 Contact Credit).`
                        : `> 💡 This free quota applies when looking up career history without contact details via \`retrieve_person_no_contacts\`.`,
                ].join("\n");
                return { content: [{ type: "text", text: msg }] };
            }
            case "get_available_levels": {
                const markdown = [
                    "### 👔 Supported Seniority Levels (11)",
                    "Pass any of these values in the `level` array of `search_candidates_query`:",
                    "",
                    ...SIGNALHIRE_LEVELS.map((lvl) => `- \`${lvl}\``),
                    "",
                    "💡 **Automatic Normalization:** You can pass combined strings like `['C-Level/VP']` or lowercase `['vp', 'c-level']` — the server automatically normalizes them to the official enums.",
                    "💡 **Strict Matching:** Pass `strict_current_level: true` to ensure the candidate's CURRENT title matches executive terms, filtering out those whose seniority was only in past jobs.",
                ].join("\n");
                return { content: [{ type: "text", text: markdown }] };
            }
            case "get_available_departments": {
                const markdown = [
                    "### 🏢 Supported Professional Departments (15)",
                    "Pass any of these values in the `department` array of `search_candidates_query`:",
                    "",
                    ...SIGNALHIRE_DEPARTMENTS.map((dept) => `- \`${dept}\``),
                ].join("\n");
                return { content: [{ type: "text", text: markdown }] };
            }
            case "get_available_industries": {
                let industries = [...SIGNALHIRE_INDUSTRIES];
                if (args.filter) {
                    const q = String(args.filter).toLowerCase();
                    industries = industries.filter((ind) => ind.toLowerCase().includes(q));
                }
                const markdown = [
                    `### 🌐 Supported Industries (${industries.length} matching of 146 total)`,
                    args.filter ? `*Filtered by: "${args.filter}"*` : "",
                    "Pass exact values to `industry` or `industries` in `search_candidates_query` or `search_companies_by_filters`:",
                    "",
                    ...industries.map((ind) => `- \`${ind}\``),
                ]
                    .filter(Boolean)
                    .join("\n");
                return { content: [{ type: "text", text: markdown }] };
            }
            case "export_to_csv": {
                const dataType = args.data_type === "companies" ? "companies" : "candidates";
                const format = args.format === "csv" ? "csv" : "tsv_google_sheets";
                let items = args.items || [];
                // If search_params provided, execute search first
                if (args.search_params) {
                    if (dataType === "companies") {
                        items = await client.searchCompaniesByFilters({
                            industry: args.search_params.industry,
                            location: args.search_params.location,
                            keywords: args.search_params.keywords,
                            companySize: args.search_params.company_size,
                            limit: args.search_params.limit || 15,
                        });
                    }
                    else {
                        const max = args.search_params.max_results || 25;
                        const searchRes = await client.searchCandidatesAutoPaginate(args.search_params, max);
                        items = searchRes.profiles || [];
                    }
                }
                if (!items || items.length === 0) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: "No items to export. Please provide `items` array or `search_params`.",
                            },
                        ],
                    };
                }
                const exported = formatExportData(dataType, items, format);
                return { content: [{ type: "text", text: exported }] };
            }
            default:
                return {
                    content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
                    isError: true,
                };
        }
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `❌ Error in tool '${toolName}': ${err.message}` }],
            isError: true,
        };
    }
}
export function createSignalHireMcpServer(options = {}) {
    const apiClient = options.client || new SignalHireApiClient({ apiKey: options.apiKey });
    const server = new McpServer({
        name: options.name || "signalhire-mcp",
        version: options.version || "1.0.0",
    });
    // Register each tool with McpServer using Zod
    server.tool("search_candidates_query", "Search people, find candidates, discover leads, and source talent from the SignalHire database of hundreds of millions of professionals using advanced filters (title, location, company, keywords, department, seniority level). Uses daily search quota.", {
        current_title: z.string().optional(),
        current_past_title: z.string().optional(),
        location: z.union([z.string(), z.array(z.string())]).optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        coordinates: z
            .array(z.object({ latitude: z.number(), longitude: z.number() }))
            .optional(),
        radius: z.number().min(10).max(160).optional(),
        company_size: z.string().optional(),
        spend_credits_confirmed: z.boolean().optional(),
        current_company: z.string().optional(),
        current_past_company: z.string().optional(),
        full_name: z.string().optional(),
        keywords: z.string().optional(),
        industry: z.string().optional(),
        industries: z.array(z.string()).optional(),
        department: z
            .array(z.enum(SIGNALHIRE_DEPARTMENTS))
            .optional(),
        level: z.array(z.string()).optional(),
        strict_current_level: z.boolean().optional(),
        exclude_title: z.string().optional(),
        years_experience_from: z.number().optional(),
        years_experience_to: z.number().optional(),
        years_current_past_experience_from: z.number().optional(),
        years_current_past_experience_to: z.number().optional(),
        education: z.string().optional(),
        open_to_work: z.boolean().optional(),
        exclude_revealed: z.boolean().optional(),
        exclude_watched: z.boolean().optional(),
        exclude_in_lists: z.boolean().optional(),
        exclude_in_progress: z.boolean().optional(),
        exclude_emailed: z.boolean().optional(),
        size: z.number().min(1).max(100).default(10).optional(),
        auto_paginate: z.boolean().default(false).optional(),
        max_results: z.number().min(1).max(200).default(10).optional(),
        response_format: z
            .enum(["markdown", "json", "csv"])
            .default("markdown")
            .optional(),
    }, async (args) => executeSignalHireTool("search_candidates_query", args, apiClient));
    server.tool("search_people_at_companies", "Find people at a list of companies in as few searches as possible (companies are batched into OR queries, 10 per search). Use after search_companies_by_filters or bulk_find_company. Uses daily search quota.", {
        companies: z.array(z.string()).min(1).max(50),
        current_title: z.string().optional(),
        exclude_title: z.string().optional(),
        location: z.string().optional(),
        department: z
            .array(z.enum(SIGNALHIRE_DEPARTMENTS))
            .optional(),
        level: z.array(z.string()).optional(),
        max_results: z.number().min(1).max(200).default(50).optional(),
        response_format: z
            .enum(["markdown", "json", "csv"])
            .default("markdown")
            .optional(),
    }, async (args) => executeSignalHireTool("search_people_at_companies", args, apiClient));
    server.tool("scroll_search", "Fetch the next batch of search results for pagination. Must be called within 15 seconds of the previous search response. Tip: Prefer using search_candidates_query with auto_paginate=true or max_results to fetch all pages in one call.", {
        request_id: z.number(),
        scroll_id: z.string(),
        response_format: z
            .enum(["markdown", "json", "csv"])
            .default("markdown")
            .optional(),
    }, async (args) => executeSignalHireTool("scroll_search", args, apiClient));
    server.tool("retrieve_person_no_contacts", "Retrieve a candidate's full professional profile (work history, skills, education, languages, certifications) WITHOUT unlocking contact details. Uses daily without-contacts quota and charges ZERO contact credits. Synchronous response.", {
        items: z.array(z.string()).min(1).max(100),
        response_format: z
            .enum(["markdown", "json", "csv"])
            .default("markdown")
            .optional(),
    }, async (args) => executeSignalHireTool("retrieve_person_no_contacts", args, apiClient));
    server.tool("retrieve_person_profile", "Retrieve a candidate's full profile INCLUDING contact information (verified personal/work emails, direct phone numbers, social links). ⚠️ Consumes 1 Contact Credit per successful match. Safety guardrail: Requires spend_credits_confirmed=true.", {
        items: z.array(z.string()).min(1).max(100),
        spend_credits_confirmed: z.boolean(),
        without_waterfall: z.boolean().default(true).optional(),
        callback_url: z.string().optional(),
        response_format: z
            .enum(["markdown", "json", "csv"])
            .default("markdown")
            .optional(),
    }, async (args) => executeSignalHireTool("retrieve_person_profile", args, apiClient));
    server.tool("find_company", "Look up a company by name or domain to check employee presence, headcount, primary domain/website, industry, and office locations in SignalHire. Enriched data makes wrong matches easy to spot.", {
        company_id_or_slug: z.string(),
        location: z.string().optional(),
    }, async (args) => executeSignalHireTool("find_company", args, apiClient));
    server.tool("bulk_find_company", "Bulk search and compare multiple companies in a single call. Checks headcount in SignalHire, verified office locations, sample roles, and primary domains for up to 20 companies at once.", {
        companies: z.array(z.string()).min(1).max(20),
        location: z.string().optional(),
        response_format: z
            .enum(["markdown", "json", "csv"])
            .default("markdown")
            .optional(),
    }, async (args) => executeSignalHireTool("bulk_find_company", args, apiClient));
    server.tool("search_companies_by_filters", "Search companies by filters like industry (from 146 supported categories), country/location, keywords (e.g. 'Fintech', 'SaaS', 'Logistics'), and company size. Aggregates employee presence from the SignalHire database.", {
        industry: z.string().optional(),
        location: z.string().optional(),
        keywords: z.string().optional(),
        company_size: z.string().optional(),
        limit: z.number().min(1).max(25).default(10).optional(),
        response_format: z
            .enum(["markdown", "json", "csv"])
            .default("markdown")
            .optional(),
    }, async (args) => executeSignalHireTool("search_companies_by_filters", args, apiClient));
    server.tool("get_company_info", "Retrieve company firmographics and headcount. Note: If firmographics are not enabled on the account, it automatically provides talent pool analytics. To search employees directly, use search_candidates_query with current_company.", {
        company_id: z.string(),
        spend_credits_confirmed: z.boolean(),
        response_format: z
            .enum(["markdown", "json", "csv"])
            .default("markdown")
            .optional(),
    }, async (args) => executeSignalHireTool("get_company_info", args, apiClient));
    server.tool("get_company_profile_count", "Free count of SignalHire profiles for one company (current, past, or both employees). Not real headcount. Needs Company API access.", {
        company_id: z.string(),
        status: z.enum(["current", "past", "both"]).default("current").optional(),
    }, async (args) => executeSignalHireTool("get_company_profile_count", args, apiClient));
    server.tool("get_company_profiles", "Request all employee profiles of a company. Profiles (no contacts) are POSTed to callback_url in batches of 100. Uses the daily profile-view quota. Needs Company API access.", {
        company_id: z.string(),
        status: z.enum(["current", "past", "both"]).default("current").optional(),
        callback_url: z.string().url(),
    }, async (args) => executeSignalHireTool("get_company_profiles", args, apiClient));
    server.tool("check_balance", "Check all SignalHire account balances and quotas: standard Contact Credits, daily Without-Contacts quota (with exact reset countdown), and Company Intelligence API status. Free tool.", {}, async () => executeSignalHireTool("check_balance", {}, apiClient));
    server.tool("check_without_contacts_credits", "Check the remaining daily quota for retrieving candidate profiles without contact details. Applies to retrieve_person_no_contacts. Shows exact time until midnight UTC reset.", {}, async () => executeSignalHireTool("check_without_contacts_credits", {}, apiClient));
    server.tool("get_available_levels", "Retrieve the complete list of candidate seniority levels supported by the SignalHire search API and their normalization rules. Free tool.", {}, async () => executeSignalHireTool("get_available_levels", {}, apiClient));
    server.tool("get_available_departments", "Retrieve the complete list of 15 professional departments supported by the SignalHire search API. Free tool.", {}, async () => executeSignalHireTool("get_available_departments", {}, apiClient));
    server.tool("get_available_industries", "Retrieve the list of 146 official supported industry categories for candidate search, with optional search filter. Free tool.", {
        filter: z.string().optional(),
    }, async (args) => executeSignalHireTool("get_available_industries", args, apiClient));
    server.tool("export_to_csv", "Export candidate or company search results into CSV format or Google Sheets / Excel copy-pasteable TSV format. Can export provided items or run search_params and export directly.", {
        data_type: z.enum(["candidates", "companies"]).default("candidates").optional(),
        format: z.enum(["tsv_google_sheets", "csv"]).default("tsv_google_sheets").optional(),
        search_params: z.record(z.any()).optional(),
        items: z.array(z.any()).optional(),
    }, async (args) => executeSignalHireTool("export_to_csv", args, apiClient));
    // MCP Resources
    server.resource("industries", "signalhire://industries", async (uri) => ({
        contents: [
            {
                uri: uri.href,
                text: JSON.stringify(SIGNALHIRE_INDUSTRIES, null, 2),
                mimeType: "application/json",
            },
        ],
    }));
    server.resource("departments", "signalhire://departments", async (uri) => ({
        contents: [
            {
                uri: uri.href,
                text: JSON.stringify(SIGNALHIRE_DEPARTMENTS, null, 2),
                mimeType: "application/json",
            },
        ],
    }));
    server.resource("levels", "signalhire://levels", async (uri) => ({
        contents: [
            {
                uri: uri.href,
                text: JSON.stringify(SIGNALHIRE_LEVELS, null, 2),
                mimeType: "application/json",
            },
        ],
    }));
    server.resource("pricing-and-credits", "signalhire://pricing-and-credits", async (uri) => ({
        contents: [
            {
                uri: uri.href,
                text: `# SignalHire Credit & Quota Rules\n\n- **Search API (search_candidates_query, scroll_search):** Uses daily search quota. ZERO contact credits spent.\n- **Without Contacts Profile Lookup (retrieve_person_no_contacts):** Uses daily without-contacts quota. ZERO contact credits spent.\n- **Contact Enrichment (retrieve_person_profile):** 1 Contact Credit per successful profile match. Guarded by spend_credits_confirmed=true.\n- **Company Info (get_company_info):** 1 Company Credit per lookup. Guarded by spend_credits_confirmed=true.\n- **Company Identification & Search (find_company, bulk_find_company, search_companies_by_filters):** Completely free.\n- **Balance Checks (check_balance, check_without_contacts_credits):** Completely free.\n- **Export (export_to_csv):** Completely free.`,
                mimeType: "text/markdown",
            },
        ],
    }));
    // MCP Prompts
    server.prompt("find_candidates", {
        role: z.string().describe("Target role or title, e.g. 'Senior Python Engineer'"),
        location: z.string().optional().describe("Target location, e.g. 'New York'"),
        skills: z.string().optional().describe("Required skills or keywords, e.g. 'Django, React'"),
        count: z.string().optional().describe("Number of candidates (default: 5)"),
    }, (args) => ({
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Please search for ${args.count || "5"} candidates for the role "${args.role}"${args.location ? ` in ${args.location}` : ""}${args.skills ? ` with skills ${args.skills}` : ""}. Use 'search_candidates_query'. Do not reveal contacts or spend credits yet; show their career overview first.`,
                },
            },
        ],
    }));
    return { server, apiClient };
}
