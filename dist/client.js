/**
 * SignalHire API Client
 * Official REST client for SignalHire v1 API
 * Reference: https://docs.signalhire.com
 */
import { SIGNALHIRE_API_BASE_URL, normalizeSeniorityLevels } from "./constants.js";
export class SignalHireApiError extends Error {
    statusCode;
    responseBody;
    constructor(statusCode, message, responseBody) {
        super(message);
        this.name = "SignalHireApiError";
        this.statusCode = statusCode;
        this.responseBody = responseBody;
    }
}
export class SignalHireApiClient {
    apiKey;
    baseUrl;
    lastCreditsLeft = null;
    constructor(options) {
        const key = options?.apiKey ||
            process.env.SIGNALHIRE_API_KEY ||
            process.env.SIGNAL_HIRE_API_KEY ||
            "";
        this.apiKey = key.trim();
        this.baseUrl = options?.baseUrl || SIGNALHIRE_API_BASE_URL;
    }
    setApiKey(apiKey) {
        this.apiKey = apiKey.trim();
    }
    getApiKey() {
        return this.apiKey;
    }
    hasApiKey() {
        return Boolean(this.apiKey && this.apiKey.length > 0);
    }
    ensureApiKey() {
        if (!this.hasApiKey()) {
            throw new SignalHireApiError(401, "SignalHire API Key is missing. Please set the SIGNALHIRE_API_KEY environment variable or provide 'Authorization: Bearer <key>' in client headers. Obtain your key at https://www.signalhire.com/apiIntegrations");
        }
    }
    async request(endpoint, options = {}) {
        this.ensureApiKey();
        const { method = "GET", body, query } = options;
        let url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
        if (query) {
            const searchParams = new URLSearchParams();
            for (const [key, val] of Object.entries(query)) {
                if (val !== undefined && val !== null) {
                    searchParams.append(key, String(val));
                }
            }
            const qs = searchParams.toString();
            if (qs) {
                url += (url.includes("?") ? "&" : "?") + qs;
            }
        }
        const headers = {
            apikey: this.apiKey,
            Accept: "application/json",
        };
        if (body) {
            headers["Content-Type"] = "application/json";
        }
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        // Capture X-Credits-Left header
        const creditsHeader = response.headers.get("x-credits-left");
        if (creditsHeader !== null) {
            const parsed = parseInt(creditsHeader, 10);
            if (!isNaN(parsed)) {
                this.lastCreditsLeft = parsed;
            }
        }
        if (!response.ok) {
            let errorBody = null;
            let errorMessage = `SignalHire API error (HTTP ${response.status}): ${response.statusText}`;
            try {
                errorBody = await response.json();
                if (errorBody && typeof errorBody === "object") {
                    errorMessage =
                        errorBody.message ||
                            errorBody.error ||
                            JSON.stringify(errorBody);
                }
            }
            catch {
                try {
                    const text = await response.text();
                    if (text)
                        errorMessage = text;
                }
                catch {
                    // keep fallback errorMessage
                }
            }
            switch (response.status) {
                case 401:
                    throw new SignalHireApiError(401, `401 Unauthorized: Invalid or missing API key. Please check your key at https://www.signalhire.com/apiIntegrations (${errorMessage})`, errorBody);
                case 402:
                    throw new SignalHireApiError(402, `402 Payment Required: Credit limit or daily search quota exhausted. Manage credits at https://www.signalhire.com/profile/billing (${errorMessage})`, errorBody);
                case 403:
                    throw new SignalHireApiError(403, `403 Forbidden: Access not enabled or account restricted (${errorMessage})`, errorBody);
                case 404:
                    throw new SignalHireApiError(404, `404 Not Found: Requested resource was not found. If paginating, note that scrollId expires after 15 seconds. (${errorMessage})`, errorBody);
                case 406:
                    throw new SignalHireApiError(406, `406 Not Acceptable: Invalid parameter combination (e.g. callbackUrl cannot be used together with withoutWaterfall) (${errorMessage})`, errorBody);
                case 422:
                    throw new SignalHireApiError(422, `422 Unprocessable Entity: Invalid request filter or parameter (${errorMessage})`, errorBody);
                case 429:
                    throw new SignalHireApiError(429, `429 Too Many Requests: Rate limit exceeded (SignalHire limits Search API to 3 concurrent requests). Please wait a moment and retry.`, errorBody);
                default:
                    throw new SignalHireApiError(response.status, errorMessage, errorBody);
            }
        }
        return (await response.json());
    }
    // ─── Credits Endpoints ──────────────────────────────────────────────────────
    /**
     * Check remaining contact credits (or without-contacts credits)
     * GET /api/v1/credits
     */
    async checkCredits(withoutContacts = false) {
        const query = withoutContacts ? { withoutContacts: "true" } : undefined;
        return this.request("/credits", { method: "GET", query });
    }
    // ─── Search API Endpoints ───────────────────────────────────────────────────
    /**
     * Search candidates by query filters
     * POST /api/v1/candidate/searchByQuery
     */
    async searchCandidates(params) {
        const payload = { ...params };
        if (payload.level) {
            payload.level = normalizeSeniorityLevels(payload.level);
        }
        const response = await this.request("/candidate/searchByQuery", {
            method: "POST",
            body: payload,
        });
        if (params.strictCurrentLevel && payload.level && payload.level.length > 0) {
            const executiveKeywords = [
                "chief",
                "ceo",
                "cto",
                "cfo",
                "coo",
                "cmo",
                "cio",
                "cso",
                "cpo",
                "cro",
                "vp",
                "vice president",
                "president",
                "director",
                "founder",
                "owner",
                "partner",
                "head",
                "general manager",
                "managing director",
                "executive",
            ];
            const filtered = (response.profiles || []).filter((p) => {
                const title = (p.experience?.[0]?.title || "").toLowerCase();
                // Also check that it is not just associate or assistant without executive
                if (title.includes("associate principal") || title.includes("assistant manager") || title.includes("associate program manager")) {
                    return false;
                }
                return executiveKeywords.some((kw) => title.includes(kw));
            });
            if (filtered.length > 0) {
                response.profiles = filtered;
            }
        }
        return response;
    }
    /**
     * Auto-paginating search that fetches up to `maxResults` sequentially
     * in a single call within milliseconds to prevent 15-second scrollId expiration.
     */
    async searchCandidatesAutoPaginate(params, maxResults = 30) {
        const pageSize = Math.min(Math.max(maxResults, 10), 100);
        const firstPage = await this.searchCandidates({
            ...params,
            size: pageSize,
        });
        const allProfiles = [...(firstPage.profiles || [])];
        let currentScrollId = firstPage.scrollId;
        const requestId = firstPage.requestId;
        while (allProfiles.length < maxResults && currentScrollId) {
            try {
                await new Promise((resolve) => setTimeout(resolve, 60));
                const next = await this.scrollSearch(requestId, currentScrollId);
                if (!next.profiles || next.profiles.length === 0) {
                    break;
                }
                allProfiles.push(...next.profiles);
                currentScrollId = next.scrollId;
                if (!currentScrollId)
                    break;
            }
            catch {
                // If scroll expired or pagination error, stop gracefully with gathered profiles
                break;
            }
        }
        let finalProfiles = allProfiles.slice(0, maxResults);
        // If strictCurrentLevel is requested, post-filter candidates whose CURRENT role title matches
        if (params.strictCurrentLevel && params.level && params.level.length > 0) {
            const executiveKeywords = [
                "chief",
                "ceo",
                "cto",
                "cfo",
                "coo",
                "cmo",
                "cio",
                "cso",
                "cpo",
                "cro",
                "vp",
                "vice president",
                "president",
                "director",
                "founder",
                "partner",
                "head",
            ];
            const filtered = finalProfiles.filter((p) => {
                const title = (p.experience?.[0]?.title || "").toLowerCase();
                return executiveKeywords.some((kw) => title.includes(kw));
            });
            if (filtered.length > 0) {
                finalProfiles = filtered;
            }
        }
        return {
            requestId,
            total: firstPage.total,
            scrollId: currentScrollId,
            profiles: finalProfiles,
        };
    }
    /**
     * Paginate search results using scrollId
     * POST /api/v1/candidate/scrollSearch/{requestId}
     */
    async scrollSearch(requestId, scrollId) {
        return this.request(`/candidate/scrollSearch/${requestId}`, {
            method: "POST",
            body: { scrollId },
        });
    }
    // ─── Person API Endpoints ───────────────────────────────────────────────────
    /**
     * Retrieve person data by LinkedIn URL, email, phone, or profile UID
     * POST /api/v1/candidate/search
     */
    async retrievePerson(items, options = {}) {
        const { withoutWaterfall = true, withoutContacts = false, callbackUrl } = options;
        const payload = { items };
        if (withoutWaterfall) {
            payload.withoutWaterfall = true;
        }
        else if (callbackUrl) {
            payload.callbackUrl = callbackUrl;
        }
        if (withoutContacts) {
            payload.withoutContacts = true;
        }
        return this.request("/candidate/search", {
            method: "POST",
            body: payload,
        });
    }
    // ─── Company API Endpoints ──────────────────────────────────────────────────
    /**
     * Resolve company name or slug to stable numeric ID
     * GET /api/v1/company/findById?id={idOrSlug}
     */
    async findCompany(idOrSlug) {
        return this.request("/company/findById", {
            method: "GET",
            query: { id: idOrSlug },
        });
    }
    /**
     * Enriched company lookup that detects primary domain, industry,
     * headcount, and location from candidate data so wrong matches are easy to spot.
     */
    async findCompanyEnriched(idOrSlug, location) {
        let baseRes;
        try {
            baseRes = await this.findCompany(idOrSlug);
        }
        catch {
            baseRes = {
                id: 0,
                slug: idOrSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                company: idOrSlug,
            };
        }
        try {
            const searchRes = await this.searchCandidates({
                currentCompany: idOrSlug,
                location,
                size: 8,
            });
            baseRes.employeeCount = searchRes.total;
            const domains = new Set();
            const industries = new Set();
            const locations = new Set();
            for (const p of searchRes.profiles || []) {
                if (p.location)
                    locations.add(p.location);
                const exp = p.experience?.[0];
                if (exp?.industry && exp.industry !== "n/a")
                    industries.add(exp.industry);
                if (exp?.website) {
                    try {
                        const parsed = new URL(exp.website.startsWith("http") ? exp.website : `https://${exp.website}`);
                        domains.add(parsed.hostname.replace(/^www\./, ""));
                    }
                    catch {
                        domains.add(exp.website);
                    }
                }
            }
            if (domains.size > 0)
                baseRes.domain = Array.from(domains)[0];
            if (industries.size > 0)
                baseRes.industry = Array.from(industries)[0];
            if (locations.size > 0)
                baseRes.locations = Array.from(locations).slice(0, 3);
        }
        catch {
            // Keep base result if candidate lookup fails
        }
        return baseRes;
    }
    /**
     * Retrieve full company profile information
     * GET /api/v1/company/info?id={idOrSlug}
     */
    async getCompanyInfo(idOrSlug) {
        return this.request("/company/info", {
            method: "GET",
            query: { id: idOrSlug },
        });
    }
    /**
     * Search companies by filters (industry, location, keywords, size)
     * Groups professionals by current company and derives company intelligence.
     */
    async searchCompaniesByFilters(input) {
        const { industry, location, keywords, limit = 10 } = input;
        // Fetch batch of profiles matching industry/location/keywords
        const searchRes = await this.searchCandidatesAutoPaginate({
            industry,
            location,
            keywords,
            size: 50,
        }, 80);
        const profiles = searchRes.profiles || [];
        const companyMap = new Map();
        for (const p of profiles) {
            const exp = p.experience?.[0];
            const compName = (exp?.company || "").trim();
            if (!compName ||
                compName.toLowerCase() === "n/a" ||
                compName.toLowerCase() === "freelance" ||
                compName.toLowerCase() === "self-employed") {
                continue;
            }
            if (!companyMap.has(compName)) {
                companyMap.set(compName, {
                    count: 0,
                    locations: new Set(),
                    industries: new Set(),
                    sampleRoles: new Set(),
                    domains: new Set(),
                    uids: [],
                });
            }
            const rec = companyMap.get(compName);
            rec.count += 1;
            rec.uids.push(p.uid);
            if (p.location)
                rec.locations.add(p.location);
            if (exp?.title)
                rec.sampleRoles.add(exp.title);
            if (exp?.industry && exp.industry !== "n/a")
                rec.industries.add(exp.industry);
            if (exp?.website) {
                try {
                    const parsed = new URL(exp.website.startsWith("http") ? exp.website : `https://${exp.website}`);
                    rec.domains.add(parsed.hostname.replace(/^www\./, ""));
                }
                catch {
                    rec.domains.add(exp.website);
                }
            }
        }
        const sorted = Array.from(companyMap.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, limit);
        const results = [];
        for (const [name, data] of sorted) {
            let totalDb = data.count * 15;
            try {
                await new Promise((r) => setTimeout(r, 40));
                const countRes = await this.searchCandidates({
                    currentCompany: name,
                    location,
                    size: 1,
                });
                totalDb = countRes.total;
            }
            catch {
                // use fallback estimate
            }
            results.push({
                company: name,
                employeeCount: totalDb,
                locations: Array.from(data.locations).slice(0, 3),
                industries: data.industries.size > 0
                    ? Array.from(data.industries).slice(0, 2)
                    : [industry || "Technology"],
                sampleRoles: Array.from(data.sampleRoles).slice(0, 4),
                topDomains: Array.from(data.domains).slice(0, 2),
                sampleUids: data.uids.slice(0, 3),
            });
        }
        return results;
    }
    /**
     * Bulk find multiple companies in one call with parallel batches.
     */
    async bulkFindCompany(companies, location) {
        const results = [];
        const cleanNames = Array.from(new Set(companies.map((c) => c.trim()).filter(Boolean))).slice(0, 20);
        // Concurrency limit of 3 to respect rate limits
        const concurrency = 3;
        for (let i = 0; i < cleanNames.length; i += concurrency) {
            const chunk = cleanNames.slice(i, i + concurrency);
            const chunkPromises = chunk.map(async (name) => {
                try {
                    const searchRes = await this.searchCandidates({
                        currentCompany: name,
                        location,
                        size: 5,
                    });
                    const locations = new Set();
                    const sampleRoles = new Set();
                    const domains = new Set();
                    const industries = new Set();
                    for (const p of searchRes.profiles || []) {
                        if (p.location)
                            locations.add(p.location);
                        const exp = p.experience?.[0];
                        if (exp?.title)
                            sampleRoles.add(exp.title);
                        if (exp?.industry && exp.industry !== "n/a")
                            industries.add(exp.industry);
                        if (exp?.website) {
                            try {
                                const parsed = new URL(exp.website.startsWith("http")
                                    ? exp.website
                                    : `https://${exp.website}`);
                                domains.add(parsed.hostname.replace(/^www\./, ""));
                            }
                            catch {
                                domains.add(exp.website);
                            }
                        }
                    }
                    return {
                        company: name,
                        employeeCount: searchRes.total,
                        locations: Array.from(locations).slice(0, 3),
                        industries: Array.from(industries).slice(0, 2),
                        sampleRoles: Array.from(sampleRoles).slice(0, 3),
                        topDomains: Array.from(domains).slice(0, 2),
                    };
                }
                catch {
                    return {
                        company: name,
                        employeeCount: 0,
                        locations: [],
                        industries: [],
                        sampleRoles: [],
                        topDomains: [],
                    };
                }
            });
            const chunkResults = await Promise.all(chunkPromises);
            results.push(...chunkResults);
            if (i + concurrency < cleanNames.length) {
                await new Promise((r) => setTimeout(r, 60));
            }
        }
        return results;
    }
}
