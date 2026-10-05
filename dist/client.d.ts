/**
 * SignalHire API Client
 * Official REST client for SignalHire v1 API
 * Reference: https://docs.signalhire.com
 */
import { CandidateLookupResponse, CompanyFindResponse, CompanyInfoResponse, CompanySummary, CreditsResponse, SearchByQueryInput, SearchByQueryResponse, SearchCompaniesFilterInput } from "./types.js";
export declare class SignalHireApiError extends Error {
    statusCode: number;
    responseBody?: any;
    constructor(statusCode: number, message: string, responseBody?: any);
}
export interface SignalHireClientOptions {
    apiKey?: string;
    baseUrl?: string;
}
export declare class SignalHireApiClient {
    private apiKey;
    private baseUrl;
    lastCreditsLeft: number | null;
    constructor(options?: SignalHireClientOptions);
    setApiKey(apiKey: string): void;
    getApiKey(): string;
    hasApiKey(): boolean;
    private ensureApiKey;
    private request;
    /**
     * Check remaining contact credits (or without-contacts credits)
     * GET /api/v1/credits
     */
    checkCredits(withoutContacts?: boolean): Promise<CreditsResponse>;
    /**
     * Search candidates by query filters
     * POST /api/v1/candidate/searchByQuery
     */
    searchCandidates(params: SearchByQueryInput): Promise<SearchByQueryResponse>;
    /**
     * Auto-paginating search that fetches up to `maxResults` sequentially
     * in a single call within milliseconds to prevent 15-second scrollId expiration.
     */
    searchCandidatesAutoPaginate(params: SearchByQueryInput, maxResults?: number): Promise<SearchByQueryResponse>;
    /**
     * Paginate search results using scrollId
     * POST /api/v1/candidate/scrollSearch/{requestId}
     */
    scrollSearch(requestId: number, scrollId: string): Promise<SearchByQueryResponse>;
    /**
     * Retrieve person data by LinkedIn URL, email, phone, or profile UID
     * POST /api/v1/candidate/search
     */
    retrievePerson(items: string[], options?: {
        withoutWaterfall?: boolean;
        withoutContacts?: boolean;
        callbackUrl?: string;
    }): Promise<CandidateLookupResponse | {
        requestId: number;
    }>;
    /**
     * Resolve company name or slug to stable numeric ID
     * GET /api/v1/company/findById?id={idOrSlug}
     */
    findCompany(idOrSlug: string): Promise<CompanyFindResponse>;
    /**
     * Enriched company lookup that detects primary domain, industry,
     * headcount, and location from candidate data so wrong matches are easy to spot.
     */
    findCompanyEnriched(idOrSlug: string, location?: string): Promise<CompanyFindResponse>;
    /**
     * Retrieve full company profile information
     * GET /api/v1/company/info?id={idOrSlug}
     */
    getCompanyInfo(idOrSlug: string): Promise<CompanyInfoResponse>;
    /**
     * Search companies by filters (industry, location, keywords, size)
     * Groups professionals by current company and derives company intelligence.
     */
    searchCompaniesByFilters(input: SearchCompaniesFilterInput): Promise<CompanySummary[]>;
    /**
     * Bulk find multiple companies in one call with parallel batches.
     */
    bulkFindCompany(companies: string[], location?: string): Promise<CompanySummary[]>;
}
