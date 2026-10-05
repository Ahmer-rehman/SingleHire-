/**
 * Output formatters for SignalHire MCP Server
 * Generates Markdown, JSON, and CSV views of candidate and company data.
 */
import { CandidateLookupResponse, CompanyFindResponse, CompanyInfoResponse, ResponseFormat, SearchByQueryResponse } from "./types.js";
export declare function cleanMdTable(text: string | number | null | undefined): string;
export declare function escapeCsv(value: any): string;
export declare function escapeTsv(value: any): string;
export declare function getTimeUntilMidnightUtc(): string;
export declare function formatSearchResults(data: SearchByQueryResponse, format?: ResponseFormat, creditsLeft?: number | null): string;
export declare function formatCandidateLookup(results: CandidateLookupResponse, format?: ResponseFormat, creditsLeft?: number | null, withContacts?: boolean): string;
export declare function formatCompanyInfo(company: CompanyInfoResponse, format?: ResponseFormat, creditsLeft?: number | null): string;
export declare function formatCompanyFind(res: CompanyFindResponse, creditsLeft?: number | null): string;
export interface CompanySummaryItem {
    company: string;
    employeeCount: number;
    locations: string[];
    industries: string[];
    sampleRoles: string[];
    topDomains: string[];
}
export declare function formatCompanyList(companies: CompanySummaryItem[], title?: string, format?: ResponseFormat, creditsLeft?: number | null): string;
export declare function formatBalanceSummary(contactCredits: number, withoutContactsQuota: number, companyApiEnabled?: boolean): string;
export declare function formatExportData(dataType: "candidates" | "companies", items: any[], format?: "csv" | "tsv_google_sheets"): string;
