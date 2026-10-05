/**
 * SignalHire API Client
 * Official REST client for SignalHire v1 API
 * Reference: https://docs.signalhire.com
 */

import dns from "node:dns/promises";
import { SIGNALHIRE_API_BASE_URL, normalizeSeniorityLevels } from "./constants.js";
import {
  BulkFindCompanyInput,
  CandidateLookupResponse,
  CompanyFindResponse,
  CompanyInfoResponse,
  CompanySummary,
  CreditsResponse,
  SearchByQueryInput,
  SearchByQueryResponse,
  SearchCompaniesFilterInput,
  SearchProfile,
} from "./types.js";

export class SignalHireApiError extends Error {
  statusCode: number;
  responseBody?: any;

  constructor(statusCode: number, message: string, responseBody?: any) {
    super(message);
    this.name = "SignalHireApiError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export interface SignalHireClientOptions {
  apiKey?: string;
  baseUrl?: string;
}

// ─── Domain & Size Utilities ──────────────────────────────────────────────────

const KNOWN_DOMAINS: Record<string, string> = {
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

export async function resolveCompanyDomain(
  companyName: string,
  location: string = ""
): Promise<string> {
  const raw = companyName.toLowerCase().trim();
  if (KNOWN_DOMAINS[raw]) return KNOWN_DOMAINS[raw];

  // Clean legal suffixes and common generic terms
  const clean = raw
    .replace(/^(the|al)\s+/i, "")
    .replace(
      /\b(company|co|ltd|llc|inc|corporation|corp|systems|solutions|technologies|group|holding|holdings)\b/gi,
      ""
    )
    .replace(/[^a-z0-9]/g, "");

  if (!clean || clean.length < 2) return `${raw.replace(/[^a-z0-9]/g, "") || "company"}.com`;
  if (KNOWN_DOMAINS[clean]) return KNOWN_DOMAINS[clean];

  const isKSA = /saudi|ksa|riyadh|jeddah|dammam/i.test(location);
  const isUAE = /uae|emirates|dubai|abu dhabi|sharjah/i.test(location);

  const candidates: string[] = [];
  if (isKSA) candidates.push(`${clean}.sa`, `${clean}.com.sa`);
  if (isUAE) candidates.push(`${clean}.ae`);
  candidates.push(`${clean}.com`, `${clean}.ai`, `${clean}.io`, `${clean}.tech`);

  for (const candidate of candidates) {
    try {
      await dns.lookup(candidate);
      return candidate;
    } catch {
      // test next
    }
  }

  return `${clean}.com`;
}

export function matchesCompanySize(
  count: number,
  sizeFilter?: string
): boolean {
  if (!sizeFilter || !sizeFilter.trim()) return true;
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

// ─── Main API Client Class ────────────────────────────────────────────────────

export class SignalHireApiClient {
  private apiKey: string;
  private baseUrl: string;
  public lastCreditsLeft: number | null = null;

  constructor(options?: SignalHireClientOptions) {
    const key =
      options?.apiKey ||
      process.env.SIGNALHIRE_API_KEY ||
      process.env.SIGNAL_HIRE_API_KEY ||
      "";
    this.apiKey = key.trim();
    this.baseUrl = options?.baseUrl || SIGNALHIRE_API_BASE_URL;
  }

  public setApiKey(apiKey: string) {
    this.apiKey = apiKey.trim();
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  public hasApiKey(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  private ensureApiKey() {
    if (!this.hasApiKey()) {
      throw new SignalHireApiError(
        401,
        "SignalHire API Key is missing. Please set the SIGNALHIRE_API_KEY environment variable or provide 'Authorization: Bearer <key>' in client headers. Obtain your key at https://www.signalhire.com/apiIntegrations"
      );
    }
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST";
      body?: any;
      query?: Record<string, string | number | boolean | undefined>;
    } = {}
  ): Promise<T> {
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

    const headers: Record<string, string> = {
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
      let errorBody: any = null;
      let errorMessage = `SignalHire API error (HTTP ${response.status}): ${response.statusText}`;

      try {
        errorBody = await response.json();
        if (errorBody && typeof errorBody === "object") {
          errorMessage =
            errorBody.message ||
            errorBody.error ||
            JSON.stringify(errorBody);
        }
      } catch {
        try {
          const text = await response.text();
          if (text) errorMessage = text;
        } catch {
          // keep fallback errorMessage
        }
      }

      switch (response.status) {
        case 401:
          throw new SignalHireApiError(
            401,
            `401 Unauthorized: Invalid or missing API key. Please check your key at https://www.signalhire.com/apiIntegrations (${errorMessage})`,
            errorBody
          );
        case 402:
          throw new SignalHireApiError(
            402,
            `402 Payment Required: Credit limit or daily search quota exhausted. Manage credits at https://www.signalhire.com/profile/billing (${errorMessage})`,
            errorBody
          );
        case 403:
          throw new SignalHireApiError(
            403,
            `403 Forbidden: Access not enabled or account restricted (${errorMessage})`,
            errorBody
          );
        case 404:
          throw new SignalHireApiError(
            404,
            `404 Not Found: Requested resource was not found. If paginating, note that scrollId expires after 15 seconds. (${errorMessage})`,
            errorBody
          );
        case 406:
          throw new SignalHireApiError(
            406,
            `406 Not Acceptable: Invalid parameter combination (e.g. callbackUrl cannot be used together with withoutWaterfall) (${errorMessage})`,
            errorBody
          );
        case 422:
          throw new SignalHireApiError(
            422,
            `422 Unprocessable Entity: Invalid request filter or parameter (${errorMessage})`,
            errorBody
          );
        case 429:
          throw new SignalHireApiError(
            429,
            `429 Too Many Requests: Rate limit exceeded (SignalHire limits Search API to 3 concurrent requests). Please wait a moment and retry.`,
            errorBody
          );
        default:
          throw new SignalHireApiError(response.status, errorMessage, errorBody);
      }
    }

    return (await response.json()) as T;
  }

  // ─── Credits Endpoints ──────────────────────────────────────────────────────

  async checkCredits(withoutContacts: boolean = false): Promise<CreditsResponse> {
    const query = withoutContacts ? { withoutContacts: "true" } : undefined;
    return this.request<CreditsResponse>("/credits", { method: "GET", query });
  }

  // ─── Search API Endpoints ───────────────────────────────────────────────────

  async searchCandidates(
    params: SearchByQueryInput
  ): Promise<SearchByQueryResponse> {
    const payload = { ...params };
    if (payload.level) {
      payload.level = normalizeSeniorityLevels(payload.level);
    }

    const response = await this.request<SearchByQueryResponse>(
      "/candidate/searchByQuery",
      {
        method: "POST",
        body: payload,
      }
    );

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
        if (
          title.includes("associate principal") ||
          title.includes("assistant manager") ||
          title.includes("associate program manager")
        ) {
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
  async searchCandidatesAutoPaginate(
    params: SearchByQueryInput,
    maxResults: number = 30
  ): Promise<SearchByQueryResponse> {
    const targetResults = Math.max(maxResults, 1);
    const batchSize = Math.min(Math.max(targetResults, 15), 50);

    const firstPage = await this.searchCandidates({
      ...params,
      size: batchSize,
    });

    const allProfiles: SearchProfile[] = [...(firstPage.profiles || [])];
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
            if (
              title.includes("associate principal") ||
              title.includes("assistant manager") ||
              title.includes("associate program manager")
            ) {
              return false;
            }
            return executiveKeywords.some((kw) => title.includes(kw));
          });
        }

        allProfiles.push(...newProfiles);
        currentScrollId = next.scrollId;
        if (!currentScrollId) break;
      } catch {
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

  async scrollSearch(
    requestId: number,
    scrollId: string
  ): Promise<SearchByQueryResponse> {
    return this.request<SearchByQueryResponse>(
      `/candidate/scrollSearch/${requestId}`,
      {
        method: "POST",
        body: { scrollId },
      }
    );
  }

  // ─── Person API Endpoints ───────────────────────────────────────────────────

  async retrievePerson(
    items: string[],
    options: {
      withoutWaterfall?: boolean;
      withoutContacts?: boolean;
      callbackUrl?: string;
    } = {}
  ): Promise<CandidateLookupResponse | { requestId: number }> {
    const { withoutWaterfall = true, withoutContacts = false, callbackUrl } =
      options;

    const payload: Record<string, any> = { items };

    if (withoutWaterfall) {
      payload.withoutWaterfall = true;
    } else if (callbackUrl) {
      payload.callbackUrl = callbackUrl;
    }

    if (withoutContacts) {
      payload.withoutContacts = true;
    }

    return this.request<CandidateLookupResponse | { requestId: number }>(
      "/candidate/search",
      {
        method: "POST",
        body: payload,
      }
    );
  }

  // ─── Company API Endpoints ──────────────────────────────────────────────────

  async findCompany(idOrSlug: string): Promise<CompanyFindResponse> {
    return this.request<CompanyFindResponse>("/company/findById", {
      method: "GET",
      query: { id: idOrSlug },
    });
  }

  /**
   * Enriched company lookup that detects primary domain, industry,
   * headcount, and location from candidate data so wrong matches are easy to spot.
   */
  async findCompanyEnriched(
    idOrSlug: string,
    location?: string
  ): Promise<CompanyFindResponse> {
    let baseRes: CompanyFindResponse;
    try {
      baseRes = await this.findCompany(idOrSlug);
    } catch {
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
        size: 5,
      });

      baseRes.employeeCount = searchRes.total;

      const locations = new Set<string>();
      for (const p of searchRes.profiles || []) {
        if (p.location) locations.add(p.location);
      }
      if (locations.size > 0) baseRes.locations = Array.from(locations).slice(0, 3);
    } catch {
      // keep base
    }

    // Always resolve domain cleanly
    baseRes.domain = await resolveCompanyDomain(idOrSlug, location);

    return baseRes;
  }

  async getCompanyInfo(idOrSlug: string): Promise<CompanyInfoResponse> {
    return this.request<CompanyInfoResponse>("/company/info", {
      method: "GET",
      query: { id: idOrSlug },
    });
  }

  /**
   * Search companies by filters (industry, location, keywords, size)
   * Intelligently targets industry-specific companies (excluding non-software
   * conglomerates when searching for tech) and verifies corporate domains.
   */
  async searchCompaniesByFilters(
    input: SearchCompaniesFilterInput
  ): Promise<CompanySummary[]> {
    const { industry, location, keywords, companySize, limit = 10 } = input;

    // Detect if this is a software/technology search
    const isSoftwareSearch =
      /software|information technology|tech|data|computer|internet|saas|ai/i.test(
        industry || ""
      );

    // Build targeted query parameters
    let effectiveKeywords = keywords || "";
    if (isSoftwareSearch) {
      const softwareTerms =
        '("software company" OR "software development" OR SaaS OR "IT solutions" OR "tech startup" OR "software engineer")';
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
    const searchRes = await this.searchCandidatesAutoPaginate(
      {
        industry: isSoftwareSearch ? "Computer Software" : industry,
        location,
        keywords: effectiveKeywords,
        size: 50,
      },
      80
    );

    const profiles = searchRes.profiles || [];
    const companyMap = new Map<
      string,
      {
        count: number;
        locations: Set<string>;
        industries: Set<string>;
        sampleRoles: Set<string>;
        uids: string[];
      }
    >();

    for (const p of profiles) {
      const exp = p.experience?.[0];
      const compName = (exp?.company || "").trim();
      if (
        !compName ||
        compName.toLowerCase() === "n/a" ||
        compName.toLowerCase() === "freelance" ||
        compName.toLowerCase() === "self-employed"
      ) {
        continue;
      }

      // If software search, exclude companies containing non-tech enterprise keywords
      if (isSoftwareSearch) {
        const isExcluded = NON_TECH_EXCLUSIONS.some((regex) => regex.test(compName));
        if (isExcluded) continue;
      }

      if (!companyMap.has(compName)) {
        companyMap.set(compName, {
          count: 0,
          locations: new Set<string>(),
          industries: new Set<string>(),
          sampleRoles: new Set<string>(),
          uids: [],
        });
      }

      const rec = companyMap.get(compName)!;
      rec.count += 1;
      rec.uids.push(p.uid);

      if (p.location) rec.locations.add(p.location);
      if (exp?.title) rec.sampleRoles.add(exp.title);
    }

    const sorted = Array.from(companyMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit * 2);

    const results: CompanySummary[] = [];

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
      } catch {
        // fallback
      }

      // Check company_size filter
      if (companySize && !matchesCompanySize(totalDb, companySize)) {
        continue;
      }

      // Resolve domain
      const domain = await resolveCompanyDomain(name, location);

      results.push({
        company: name,
        employeeCount: totalDb,
        locations: Array.from(data.locations).slice(0, 3),
        industries: [industry || (isSoftwareSearch ? "Computer Software" : "Information Technology")],
        sampleRoles: Array.from(data.sampleRoles).slice(0, 4),
        topDomains: [domain],
        sampleUids: data.uids.slice(0, 3),
      });

      if (results.length >= limit) break;
    }

    return results;
  }

  /**
   * Bulk find multiple companies in one call with parallel batches.
   */
  async bulkFindCompany(
    companies: string[],
    location?: string
  ): Promise<CompanySummary[]> {
    const results: CompanySummary[] = [];
    const cleanNames = Array.from(
      new Set(companies.map((c) => c.trim()).filter(Boolean))
    ).slice(0, 20);

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

          const locations = new Set<string>();
          const sampleRoles = new Set<string>();

          for (const p of searchRes.profiles || []) {
            if (p.location) locations.add(p.location);
            const exp = p.experience?.[0];
            if (exp?.title) sampleRoles.add(exp.title);
          }

          const domain = await resolveCompanyDomain(name, location);

          return {
            company: name,
            employeeCount: searchRes.total,
            locations: Array.from(locations).slice(0, 3),
            industries: [],
            sampleRoles: Array.from(sampleRoles).slice(0, 3),
            topDomains: [domain],
          };
        } catch {
          const fallbackDomain = await resolveCompanyDomain(name, location);
          return {
            company: name,
            employeeCount: 0,
            locations: [],
            industries: [],
            sampleRoles: [],
            topDomains: [fallbackDomain],
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
