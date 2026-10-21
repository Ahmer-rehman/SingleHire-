/**
 * SignalHire API Client
 * Official REST client for SignalHire v1 API
 * Reference: https://docs.signalhire.com
 */
import { CandidateLookupResponse, CompanyCountResponse, CompanyEmploymentStatus, CompanyFindResponse, CompanySizeFilterResult, CompanyInfoResponse, CompanySummary, CreditsResponse, SearchByQueryInput, SearchByQueryResponse, SearchCompaniesFilterInput, SearchProfile } from "./types.js";
export declare class SignalHireApiError extends Error {
    statusCode: number;
    responseBody?: any;
    constructor(statusCode: number, message: string, responseBody?: any);
}
export interface SignalHireClientOptions {
    apiKey?: string;
    baseUrl?: string;
}
export declare function resolveCompanyDomain(companyName: string, location?: string): Promise<string>;
export declare const KNOWN_FOUNDED_YEARS: Record<string, number>;
export declare function resolveCompanyFoundedYear(companyName: string, domain?: string): Promise<number | null>;
/** Best-guess SignalHire company slug from a company name, e.g. 'STC Solutions' -> 'stc-solutions'. */
export declare function toCompanySlug(name: string): string;
export declare function matchesCompanySize(count: number, sizeFilter?: string): boolean;
/**
 * Pick the most common company website from profiles whose current employer
 * matches `companyName`. Uses real data returned by SignalHire instead of guessing.
 */
export declare function domainFromProfiles(profiles: SearchProfile[], companyName?: string): string | undefined;
/** Drop profiles whose current title matches any term in the exclusion query. */
export declare function filterExcludedTitles(profiles: SearchProfile[], excludeTitle?: string): SearchProfile[];
export declare class SignalHireApiClient {
    private apiKey;
    private baseUrl;
    lastCreditsLeft: number | null;
    private companyInfoCache;
    constructor(options?: SignalHireClientOptions);
    setApiKey(apiKey: string): void;
    getApiKey(): string;
    hasApiKey(): boolean;
    private ensureApiKey;
    private request;
    checkCredits(withoutContacts?: boolean): Promise<CreditsResponse>;
    searchCandidates(params: SearchByQueryInput): Promise<SearchByQueryResponse>;
    /**
     * Auto-paginating search that fetches up to `maxResults` sequentially
     * in a single call within milliseconds to prevent 15-second scrollId expiration.
     */
    searchCandidatesAutoPaginate(params: SearchByQueryInput, maxResults?: number): Promise<SearchByQueryResponse>;
    scrollSearch(requestId: number, scrollId: string): Promise<SearchByQueryResponse>;
    retrievePerson(items: string[], options?: {
        withoutWaterfall?: boolean;
        withoutContacts?: boolean;
        callbackUrl?: string;
    }): Promise<CandidateLookupResponse | {
        requestId: number;
    }>;
    findCompany(idOrSlug: string): Promise<CompanyFindResponse>;
    /**
     * Enriched company lookup that detects primary domain, industry,
     * headcount, and location from candidate data so wrong matches are easy to spot.
     */
    findCompanyEnriched(idOrSlug: string, location?: string): Promise<CompanyFindResponse>;
    getCompanyInfo(idOrSlug: string): Promise<CompanyInfoResponse>;
    /** Free employee-profile count for one company (Company API access required). */
    getCompanyCount(idOrSlug: string, status?: CompanyEmploymentStatus): Promise<CompanyCountResponse>;
    /** Request all employee profiles of a company; results are POSTed to callbackUrl. */
    getCompanyProfiles(idOrSlug: string, status: CompanyEmploymentStatus, callbackUrl: string): Promise<{
        searchId: number | string;
    }>;
    /**
     * Profile count for a company. Without a location, tries the free getCount
     * endpoint first so no search quota is used; falls back to a size-1 search.
     */
    countCompanyProfiles(name: string, location?: string): Promise<number>;
    /**
     * Company info lookup cached per company name for this server process.
     * Returns null when the company can't be found. Throws on 403 (no add-on).
     */
    getCompanyInfoCached(name: string): Promise<CompanyInfoResponse | null>;
    /**
     * Keep only profiles whose current company headcount is within `sizeFilter`,
     * using /company/info (1 Company Credit per uncached company).
     */
    filterProfilesByCompanySize(profiles: SearchProfile[], sizeFilter: string): Promise<CompanySizeFilterResult>;
    /**
     * Search companies by filters (industry, location, keywords, size)
     * Intelligently targets industry-specific companies (excluding non-software
     * conglomerates when searching for tech) and verifies corporate domains.
     */
    searchCompaniesByFilters(input: SearchCompaniesFilterInput): Promise<CompanySummary[]>;
    /**
     * Search people across a list of companies. Batches company names into
     * Boolean OR queries on currentCompany so N companies cost ceil(N/chunk) searches.
     */
    searchPeopleAtCompanies(companies: string[], params: Omit<SearchByQueryInput, "currentCompany">, maxResults?: number, chunkSize?: number): Promise<SearchByQueryResponse>;
    /**
     * Bulk find multiple companies in one call with parallel batches.
     */
    bulkFindCompany(companies: string[], location?: string): Promise<CompanySummary[]>;
}
