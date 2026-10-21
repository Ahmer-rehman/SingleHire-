/**
 * SignalHire API Client
 * Official REST client for SignalHire v1 API
 * Reference: https://docs.signalhire.com
 */
import dns from "node:dns/promises";
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
// ─── Domain & Size Utilities ──────────────────────────────────────────────────
const KNOWN_DOMAINS = {
    "elm": "elm.sa",
    "elm company": "elm.sa",
    "elm co": "elm.sa",
    "stc": "stc.com.sa",
    "stc solutions": "solutions.com.sa",
    "solutions by stc": "solutions.com.sa",
    "ejada": "ejada.com",
    "ejada systems": "ejada.com",
    "apptunix": "apptunix.com",
    "careem": "careem.com",
    "talabat": "talabat.com",
    "bayzat": "bayzat.com",
    "kitopi": "kitopi.com",
    "property finder": "propertyfinder.ae",
    "damac": "damacproperties.com",
    "damac properties": "damacproperties.com",
    "emaar": "emaar.com",
    "emaar properties": "emaar.com",
    "rta": "rta.ae",
    "dewa": "dewa.gov.ae",
    "oracle": "oracle.com",
    "microsoft": "microsoft.com",
    "google": "google.com",
    "ibm": "ibm.com",
    "amazon": "amazon.com",
    "accenture": "accenture.com",
    "tcs": "tcs.com",
    "wipro": "wipro.com",
    "infosys": "infosys.com",
    "novigo": "novigo.com",
    "novigo solutions": "novigo.com",
    "humain": "humain.ai",
    "nhc": "nhc.sa",
    "inobitec": "inobitec.com",
    "inobitec, llc": "inobitec.com",
    "it-aces": "it-aces.com",
    "flapyid": "flapyid.com",
    "masterkey": "masterkey.ae",
    "techmind": "techmindsoftware.com",
    "newage": "newage-global.com",
    "auracube": "auracube.com",
};
export async function resolveCompanyDomain(companyName, location = "") {
    const raw = companyName.toLowerCase().trim();
    if (KNOWN_DOMAINS[raw])
        return KNOWN_DOMAINS[raw];
    // Clean legal suffixes and common generic terms
    const clean = raw
        .replace(/^(the|al)\s+/i, "")
        .replace(/\b(company|co|ltd|llc|inc|corporation|corp|systems|solutions|technologies|group|holding|holdings)\b/gi, "")
        .replace(/[^a-z0-9]/g, "");
    if (!clean || clean.length < 2)
        return `${raw.replace(/[^a-z0-9]/g, "") || "company"}.com`;
    if (KNOWN_DOMAINS[clean])
        return KNOWN_DOMAINS[clean];
    const isKSA = /saudi|ksa|riyadh|jeddah|dammam/i.test(location);
    const isUAE = /uae|emirates|dubai|abu dhabi|sharjah/i.test(location);
    const candidates = [];
    if (isKSA)
        candidates.push(`${clean}.sa`, `${clean}.com.sa`);
    if (isUAE)
        candidates.push(`${clean}.ae`);
    candidates.push(`${clean}.com`, `${clean}.ai`, `${clean}.io`, `${clean}.tech`);
    for (const candidate of candidates) {
        try {
            await dns.lookup(candidate);
            return candidate;
        }
        catch {
            // test next
        }
    }
    return `${clean}.com`;
}
export const KNOWN_FOUNDED_YEARS = {
    google: 1998,
    alphabet: 2015,
    apple: 1976,
    microsoft: 1975,
    amazon: 1994,
    meta: 2004,
    facebook: 2004,
    netflix: 1997,
    stripe: 2010,
    uber: 2009,
    airbnb: 2008,
    shopify: 2006,
    spotify: 2006,
    tesla: 2003,
    twitter: 2006,
    x: 2006,
    linkedin: 2002,
    salesforce: 1999,
    oracle: 1977,
    ibm: 1911,
    intel: 1968,
    nvidia: 1993,
    cisco: 1984,
    adobe: 1982,
    accenture: 1989,
    elm: 1988,
    "elm company": 1988,
    stc: 1998,
    "stc solutions": 2007,
    "saudi telecom company": 1998,
    aramco: 1933,
    "saudi aramco": 1933,
    ejada: 2005,
    apptunix: 2013,
    infosys: 1981,
    tcs: 1968,
    wipro: 1945,
    openai: 2015,
    anthropic: 2021,
    slack: 2009,
    zoom: 2011,
    snowflake: 2012,
    databricks: 2013,
    bytedance: 2012,
    tiktok: 2016,
};
const FOUNDED_YEAR_CACHE = new Map();
export async function resolveCompanyFoundedYear(companyName, domain) {
    if (!companyName)
        return null;
    const raw = companyName.toLowerCase().trim();
    if (KNOWN_FOUNDED_YEARS[raw])
        return KNOWN_FOUNDED_YEARS[raw];
    const clean = raw
        .replace(/^(the|al)\s+/i, "")
        .replace(/\b(company|co|ltd|llc|inc|corporation|corp|systems|solutions|technologies|group|holding|holdings)\b/gi, "")
        .trim();
    if (KNOWN_FOUNDED_YEARS[clean])
        return KNOWN_FOUNDED_YEARS[clean];
    if (FOUNDED_YEAR_CACHE.has(raw))
        return FOUNDED_YEAR_CACHE.get(raw);
    if (FOUNDED_YEAR_CACHE.has(clean))
        return FOUNDED_YEAR_CACHE.get(clean);
    // Build targeted search queries
    const queries = [companyName];
    if (clean && clean !== raw) {
        queries.push(`${clean} company`);
    }
    if (domain) {
        const domainRoot = domain.replace(/^(https?:\/\/)?(www\.)?/, "").split(".")[0];
        if (domainRoot && domainRoot.length > 2 && !queries.includes(domainRoot)) {
            queries.push(`${domainRoot} company`);
        }
    }
    for (const q of queries) {
        try {
            const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(q)}&language=en&format=json&limit=3`;
            const res = await fetch(searchUrl, {
                headers: { "User-Agent": "SignalHireMCP/1.0 (admin@growviah.com)" },
                signal: AbortSignal.timeout(2500),
            });
            if (!res.ok)
                continue;
            const data = (await res.json());
            const searchResults = data?.search || [];
            for (const item of searchResults) {
                const id = item.id;
                const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${id}&property=P571&format=json`;
                const claimRes = await fetch(entityUrl, {
                    headers: { "User-Agent": "SignalHireMCP/1.0 (admin@growviah.com)" },
                    signal: AbortSignal.timeout(2500),
                });
                if (!claimRes.ok)
                    continue;
                const claimData = (await claimRes.json());
                const timeVal = claimData?.claims?.P571?.[0]?.mainsnak?.datavalue?.value?.time;
                if (timeVal) {
                    const match = String(timeVal).match(/([12][0-9]{3})/);
                    if (match) {
                        const yr = parseInt(match[1], 10);
                        if (yr >= 1800 && yr <= new Date().getFullYear()) {
                            FOUNDED_YEAR_CACHE.set(raw, yr);
                            FOUNDED_YEAR_CACHE.set(clean, yr);
                            return yr;
                        }
                    }
                }
            }
        }
        catch {
            // ignore and try next query
        }
    }
    FOUNDED_YEAR_CACHE.set(raw, null);
    return null;
}
/** Best-guess SignalHire company slug from a company name, e.g. 'STC Solutions' -> 'stc-solutions'. */
export function toCompanySlug(name) {
    const trimmed = name.trim();
    if (/^\d+$/.test(trimmed))
        return trimmed;
    return trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
export function matchesCompanySize(count, sizeFilter) {
    if (!sizeFilter || !sizeFilter.trim())
        return true;
    const s = sizeFilter.toLowerCase().trim();
    // Case: "5000+" or "1000+" or "+500"
    if (s.includes("+")) {
        const min = parseInt(s.replace(/[^0-9]/g, ""), 10);
        return !isNaN(min) && count >= min;
    }
    // Case: "51-200" or "1001 - 5000"
    const parts = s
        .split(/[-–to]+/)
        .map((p) => parseInt(p.replace(/[^0-9]/g, ""), 10))
        .filter((n) => !isNaN(n));
    if (parts.length === 2) {
        return count >= parts[0] && count <= parts[1];
    }
    // Case: "< 100" or "under 50" or "> 500"
    if (parts.length === 1) {
        if (s.includes("<") || s.includes("under") || s.includes("less")) {
            return count <= parts[0];
        }
        if (s.includes(">") || s.includes("over") || s.includes("more")) {
            return count >= parts[0];
        }
        return count <= parts[0];
    }
    return true;
}
/**
 * Pick the most common company website from profiles whose current employer
 * matches `companyName`. Uses real data returned by SignalHire instead of guessing.
 */
export function domainFromProfiles(profiles, companyName) {
    const target = companyName?.toLowerCase().trim();
    const counts = new Map();
    for (const p of profiles) {
        const exp = p.experience?.[0];
        if (!exp?.website)
            continue;
        if (target && (exp.company || "").toLowerCase().trim() !== target)
            continue;
        const host = exp.website
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, "")
            .replace(/^www\./, "")
            .split(/[/?#]/)[0];
        if (!host || !host.includes(".") || /linkedin\.com$/.test(host))
            continue;
        counts.set(host, (counts.get(host) || 0) + 1);
    }
    let best;
    let bestCount = 0;
    for (const [host, n] of counts) {
        if (n > bestCount) {
            best = host;
            bestCount = n;
        }
    }
    return best;
}
/** Drop profiles whose current title matches any term in the exclusion query. */
export function filterExcludedTitles(profiles, excludeTitle) {
    if (!excludeTitle || !excludeTitle.trim())
        return profiles;
    const terms = excludeTitle
        .split(/\s+OR\s+|,|\|/i)
        .map((t) => t.replace(/[()"]/g, "").trim().toLowerCase())
        .filter(Boolean);
    if (terms.length === 0)
        return profiles;
    return profiles.filter((p) => {
        const title = (p.experience?.[0]?.title || "").toLowerCase();
        return !terms.some((t) => title.includes(t));
    });
}
// ─── Main API Client Class ────────────────────────────────────────────────────
export class SignalHireApiClient {
    apiKey;
    baseUrl;
    lastCreditsLeft = null;
    companyInfoCache = new Map();
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
    async checkCredits(withoutContacts = false) {
        const query = withoutContacts ? { withoutContacts: "true" } : undefined;
        return this.request("/credits", { method: "GET", query });
    }
    // ─── Search API Endpoints ───────────────────────────────────────────────────
    async searchCandidates(params) {
        const { excludeTitle, ...payload } = params;
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
                if (title.includes("associate principal") ||
                    title.includes("assistant manager") ||
                    title.includes("associate program manager")) {
                    return false;
                }
                return executiveKeywords.some((kw) => title.includes(kw));
            });
            if (filtered.length > 0) {
                response.profiles = filtered;
            }
        }
        response.profiles = filterExcludedTitles(response.profiles || [], excludeTitle);
        return response;
    }
    /**
     * Auto-paginating search that fetches up to `maxResults` sequentially
     * in a single call within milliseconds to prevent 15-second scrollId expiration.
     */
    async searchCandidatesAutoPaginate(params, maxResults = 30) {
        const targetResults = Math.max(maxResults, 1);
        const batchSize = Math.min(Math.max(targetResults, 15), 50);
        const firstPage = await this.searchCandidates({
            ...params,
            size: batchSize,
        });
        const allProfiles = [...(firstPage.profiles || [])];
        let currentScrollId = firstPage.scrollId;
        const requestId = firstPage.requestId;
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
        while (allProfiles.length < targetResults && currentScrollId) {
            try {
                await new Promise((resolve) => setTimeout(resolve, 60));
                const next = await this.scrollSearch(requestId, currentScrollId);
                if (!next.profiles || next.profiles.length === 0) {
                    break;
                }
                let newProfiles = next.profiles;
                if (params.strictCurrentLevel && params.level && params.level.length > 0) {
                    newProfiles = newProfiles.filter((p) => {
                        const title = (p.experience?.[0]?.title || "").toLowerCase();
                        if (title.includes("associate principal") ||
                            title.includes("assistant manager") ||
                            title.includes("associate program manager")) {
                            return false;
                        }
                        return executiveKeywords.some((kw) => title.includes(kw));
                    });
                }
                newProfiles = filterExcludedTitles(newProfiles, params.excludeTitle);
                allProfiles.push(...newProfiles);
                currentScrollId = next.scrollId;
                if (!currentScrollId)
                    break;
            }
            catch {
                break;
            }
        }
        return {
            requestId,
            total: firstPage.total,
            scrollId: currentScrollId,
            profiles: allProfiles.slice(0, targetResults),
        };
    }
    async scrollSearch(requestId, scrollId) {
        return this.request(`/candidate/scrollSearch/${requestId}`, {
            method: "POST",
            body: { scrollId },
        });
    }
    // ─── Person API Endpoints ───────────────────────────────────────────────────
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
        let profileDomain;
        try {
            const searchRes = await this.searchCandidates({
                currentCompany: idOrSlug,
                location,
                size: 5,
            });
            baseRes.employeeCount = searchRes.total;
            profileDomain = domainFromProfiles(searchRes.profiles || []);
            const locations = new Set();
            for (const p of searchRes.profiles || []) {
                if (p.location)
                    locations.add(p.location);
            }
            if (locations.size > 0)
                baseRes.locations = Array.from(locations).slice(0, 3);
        }
        catch {
            // keep base
        }
        // Always resolve domain cleanly
        baseRes.domain = profileDomain || (await resolveCompanyDomain(idOrSlug, location));
        if (!baseRes.founded && baseRes.foundedYear) {
            baseRes.founded = baseRes.foundedYear;
        }
        if (!baseRes.founded) {
            baseRes.founded = await resolveCompanyFoundedYear(baseRes.company || idOrSlug, baseRes.domain);
        }
        return baseRes;
    }
    async getCompanyInfo(idOrSlug) {
        return this.request("/company/info", {
            method: "GET",
            query: { id: idOrSlug },
        });
    }
    /** Free employee-profile count for one company (Company API access required). */
    async getCompanyCount(idOrSlug, status = "current") {
        return this.request("/company/getCount", {
            method: "GET",
            query: { id: idOrSlug, status },
        });
    }
    /** Request all employee profiles of a company; results are POSTed to callbackUrl. */
    async getCompanyProfiles(idOrSlug, status, callbackUrl) {
        return this.request("/company/getProfiles", {
            method: "GET",
            query: { id: idOrSlug, status, callbackUrl },
        });
    }
    /**
     * Profile count for a company. Without a location, tries the free getCount
     * endpoint first so no search quota is used; falls back to a size-1 search.
     */
    async countCompanyProfiles(name, location) {
        if (!location) {
            try {
                const res = await this.getCompanyCount(toCompanySlug(name), "current");
                if (typeof res.total_profiles === "number")
                    return res.total_profiles;
            }
            catch {
                // fall back to search
            }
        }
        const res = await this.searchCandidates({ currentCompany: name, location, size: 1 });
        return res.total;
    }
    /**
     * Company info lookup cached per company name for this server process.
     * Returns null when the company can't be found. Throws on 403 (no add-on).
     */
    async getCompanyInfoCached(name) {
        const key = name.toLowerCase().trim();
        if (this.companyInfoCache.has(key))
            return this.companyInfoCache.get(key);
        let info = null;
        try {
            info = await this.getCompanyInfo(toCompanySlug(name));
        }
        catch (err) {
            if (err.statusCode === 403 || err.statusCode === 402)
                throw err;
            info = null;
        }
        this.companyInfoCache.set(key, info);
        return info;
    }
    /**
     * Keep only profiles whose current company headcount is within `sizeFilter`,
     * using /company/info (1 Company Credit per uncached company).
     */
    async filterProfilesByCompanySize(profiles, sizeFilter) {
        const sizes = new Map();
        const unknownCompanies = [];
        for (const p of profiles) {
            const name = (p.experience?.[0]?.company || "").trim();
            if (!name || sizes.has(name))
                continue;
            const info = await this.getCompanyInfoCached(name);
            const size = info?.staffCount ?? info?.staffCountRange ?? null;
            sizes.set(name, size);
            if (size === null)
                unknownCompanies.push(name);
        }
        const kept = profiles.filter((p) => {
            const size = sizes.get((p.experience?.[0]?.company || "").trim());
            return size !== null && size !== undefined && matchesCompanySize(size, sizeFilter);
        });
        return { profiles: kept, checkedCompanies: sizes.size, unknownCompanies };
    }
    /**
     * Search companies by filters (industry, location, keywords, size)
     * Intelligently targets industry-specific companies (excluding non-software
     * conglomerates when searching for tech) and verifies corporate domains.
     */
    async searchCompaniesByFilters(input) {
        const { industry, location, keywords, companySize, limit = 10 } = input;
        // Detect if this is a software/technology search
        const isSoftwareSearch = /software|information technology|tech|data|computer|internet|saas|ai/i.test(industry || "");
        // Build targeted query parameters
        let effectiveKeywords = keywords || "";
        if (isSoftwareSearch) {
            const softwareTerms = '("software company" OR "software development" OR SaaS OR "IT solutions" OR "tech startup" OR "software engineer")';
            effectiveKeywords = effectiveKeywords
                ? `(${effectiveKeywords}) AND ${softwareTerms}`
                : softwareTerms;
        }
        // Non-software company exclusions (prevents real estate / gov / banks from matching)
        const NON_TECH_EXCLUSIONS = [
            /\b(real\s*estate|properties|property|realty|developer)\b/i,
            /\b(transport\s*authority|municipality|police|ministry|government)\b/i,
            /\b(islamic\s*bank|bank|commercial\s*bank)\b/i,
            /\b(airline|airways|airport)\b/i,
            /\b(hospital|clinic|healthcare\s*group|medical\s*center)\b/i,
            /\b(hypermarket|supermarket|retail\s*group)\b/i,
            /\b(hotel|resort|hospitality)\b/i,
            /\b(construction|contracting|petroleum|oil\s*&\s*gas)\b/i,
            /\b(damac|emaar|rta|dewa|al\s*futtaim|al\s*shaya)\b/i,
        ];
        // Fetch batch of profiles matching industry/location/keywords
        const searchRes = await this.searchCandidatesAutoPaginate({
            industry: isSoftwareSearch ? "Computer Software" : industry,
            location,
            keywords: effectiveKeywords,
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
            // If software search, exclude companies containing non-tech enterprise keywords
            if (isSoftwareSearch) {
                const isExcluded = NON_TECH_EXCLUSIONS.some((regex) => regex.test(compName));
                if (isExcluded)
                    continue;
            }
            if (!companyMap.has(compName)) {
                companyMap.set(compName, {
                    count: 0,
                    locations: new Set(),
                    industries: new Set(),
                    sampleRoles: new Set(),
                    uids: [],
                    profiles: [],
                });
            }
            const rec = companyMap.get(compName);
            rec.count += 1;
            rec.profiles.push(p);
            rec.uids.push(p.uid);
            if (p.location)
                rec.locations.add(p.location);
            if (exp?.title)
                rec.sampleRoles.add(exp.title);
        }
        const sorted = Array.from(companyMap.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, limit * 2);
        const results = [];
        for (const [name, data] of sorted) {
            // Profiles held in SignalHire for this company (NOT real headcount).
            let totalDb = null;
            try {
                await new Promise((r) => setTimeout(r, 40));
                totalDb = await this.countCompanyProfiles(name, location);
            }
            catch {
                // count unavailable
            }
            // A size filter can't be checked without a real count, so skip the company
            if (companySize && (totalDb === null || !matchesCompanySize(totalDb, companySize))) {
                continue;
            }
            const domain = domainFromProfiles(data.profiles, name) || (await resolveCompanyDomain(name, location));
            let founded = null;
            try {
                const findRes = await this.findCompany(name);
                if (findRes) {
                    founded = findRes.founded ?? findRes.foundedYear ?? null;
                }
            }
            catch {
                // ignore
            }
            if (!founded) {
                founded = await resolveCompanyFoundedYear(name, domain);
            }
            results.push({
                company: name,
                employeeCount: totalDb ?? data.count,
                locations: Array.from(data.locations).slice(0, 3),
                industries: [industry || (isSoftwareSearch ? "Computer Software" : "Information Technology")],
                sampleRoles: Array.from(data.sampleRoles).slice(0, 4),
                topDomains: [domain],
                sampleUids: data.uids.slice(0, 3),
                founded,
            });
            if (results.length >= limit)
                break;
        }
        return results;
    }
    /**
     * Search people across a list of companies. Batches company names into
     * Boolean OR queries on currentCompany so N companies cost ceil(N/chunk) searches.
     */
    async searchPeopleAtCompanies(companies, params, maxResults = 50, chunkSize = 10) {
        const names = Array.from(new Set(companies.map((c) => c.trim()).filter(Boolean)));
        const allProfiles = [];
        let total = 0;
        let requestId = 0;
        for (let i = 0; i < names.length && allProfiles.length < maxResults; i += chunkSize) {
            const chunk = names.slice(i, i + chunkSize);
            const query = chunk.map((n) => `"${n.replace(/"/g, "")}"`).join(" OR ");
            let res;
            try {
                res = await this.searchCandidatesAutoPaginate({ ...params, currentCompany: query }, maxResults - allProfiles.length);
            }
            catch (err) {
                if (allProfiles.length === 0)
                    throw err;
                return { requestId, total, profiles: allProfiles, incomplete: true };
            }
            total += res.total || 0;
            requestId = res.requestId;
            allProfiles.push(...(res.profiles || []));
        }
        return { requestId, total, profiles: allProfiles.slice(0, maxResults) };
    }
    /**
     * Bulk find multiple companies in one call with parallel batches.
     */
    async bulkFindCompany(companies, location) {
        const results = [];
        const cleanNames = Array.from(new Set(companies.map((c) => c.trim()).filter(Boolean))).slice(0, 20);
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
                    for (const p of searchRes.profiles || []) {
                        if (p.location)
                            locations.add(p.location);
                        const exp = p.experience?.[0];
                        if (exp?.title)
                            sampleRoles.add(exp.title);
                    }
                    const domain = domainFromProfiles(searchRes.profiles || []) ||
                        (await resolveCompanyDomain(name, location));
                    let founded = null;
                    try {
                        const findRes = await this.findCompany(name);
                        if (findRes) {
                            founded = findRes.founded ?? findRes.foundedYear ?? null;
                        }
                    }
                    catch {
                        // ignore
                    }
                    if (!founded) {
                        founded = await resolveCompanyFoundedYear(name, domain);
                    }
                    return {
                        company: name,
                        employeeCount: searchRes.total,
                        locations: Array.from(locations).slice(0, 3),
                        industries: [],
                        sampleRoles: Array.from(sampleRoles).slice(0, 3),
                        topDomains: [domain],
                        founded,
                    };
                }
                catch {
                    const fallbackDomain = await resolveCompanyDomain(name, location);
                    const fallbackFounded = await resolveCompanyFoundedYear(name, fallbackDomain);
                    return {
                        company: name,
                        employeeCount: 0,
                        locations: [],
                        industries: [],
                        sampleRoles: [],
                        topDomains: [fallbackDomain],
                        founded: fallbackFounded,
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
