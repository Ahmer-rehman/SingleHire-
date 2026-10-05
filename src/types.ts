/**
 * Type definitions for SignalHire API & MCP Server
 * Reference: https://docs.signalhire.com
 */

export type ResponseFormat = "markdown" | "json" | "csv";

// ─── Credits Response ─────────────────────────────────────────────────────────

export interface CreditsResponse {
  credits: number;
}

// ─── Candidate Object Definitions ─────────────────────────────────────────────

export interface CandidateContact {
  type:
    | "email"
    | "phone"
    | "link"
    | "skype"
    | "telegram"
    | "whatsapp"
    | "viber"
    | "hangouts"
    | "wechat"
    | "qq"
    | "icq"
    | "gtalk"
    | "aim"
    | "windows_live_messenger"
    | "yahoo_messenger"
    | string;
  value: string;
  rating: number; // 70 or 100
  subType?: "work" | "personal" | "work_phone" | "mobile" | null;
  info?: string | null;
}

export interface CandidateSocial {
  type: string; // li, fb, tw, x, ig, gh, yt, etc.
  link: string;
  rating: number; // 70 or 100
}

export interface CandidateExperience {
  position: string | null;
  company: string | null;
  location: string | null;
  current: boolean;
  started: string | null; // ISO 8601
  ended: string | null;
  summary: string | null;
  companyUrl: string;
  companySize: string;
  staffCount: number | string;
  industry: string;
  website: string;
}

export interface CandidateEducation {
  university: string;
  faculty: string | null;
  degree: string[];
  url: string | null;
  startedYear: number | null;
  endedYear: number | null;
}

export interface CandidateLanguage {
  name: string;
  proficiency?: string | null;
}

export interface CandidateOrganization {
  name: string;
  position?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface CandidateCertification {
  name: string;
  license?: string | null;
  authority?: string | null;
}

export interface CandidateCourse {
  name: string;
}

export interface CandidateProject {
  name: string;
  description?: string | null;
  url?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface CandidatePublication {
  name: string;
  description?: string | null;
  issue?: string | null;
  url?: string | null;
  date?: string | null;
}

export interface CandidatePatent {
  name: string;
  issue?: string | null;
  patentNumber?: string | null;
  date?: string | null;
}

export interface CandidateHonorAward {
  name: string;
  description?: string | null;
  issue?: string | null;
  date?: string | null;
}

export interface CandidateObject {
  uid: string;
  fullName: string;
  gender?: "male" | "female" | null;
  headLine?: string | null;
  summary?: string | null;
  photo?: { url: string } | null;
  locations?: Array<{ name: string }>;
  skills?: string[];
  experienceYears?: number | null;
  contacts?: CandidateContact[];
  social?: CandidateSocial[];
  experience?: CandidateExperience[];
  education?: CandidateEducation[];
  language?: CandidateLanguage[];
  organization?: CandidateOrganization[];
  certification?: CandidateCertification[];
  course?: CandidateCourse[];
  project?: CandidateProject[];
  publication?: CandidatePublication[];
  patent?: CandidatePatent[];
  honorAward?: CandidateHonorAward[];
  addresses?: Array<{ [key: string]: any }>;
  dob?: string | null;
  names?: string[];
}

export type CandidateLookupStatus =
  | "success"
  | "failed"
  | "credits_are_over"
  | "timeout_exceeded"
  | "duplicate_query";

export interface CandidateLookupResultItem {
  item: string;
  status: CandidateLookupStatus;
  candidate?: CandidateObject;
}

export type CandidateLookupResponse = CandidateLookupResultItem[];

// ─── Search by Query Definitions ──────────────────────────────────────────────

export interface SearchGeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface SearchByQueryInput {
  currentTitle?: string;
  currentPastTitle?: string;
  location?: string | string[];
  latitude?: number;
  longitude?: number;
  coordinates?: SearchGeoCoordinate[];
  radius?: number; // 10 to 160 km
  currentCompany?: string;
  currentPastCompany?: string;
  fullName?: string;
  keywords?: string;
  industry?: string;
  industries?: string[];
  yearsOfCurrentExperienceFrom?: number;
  yearsOfCurrentExperienceTo?: number;
  yearsOfCurrentPastExperienceFrom?: number;
  yearsOfCurrentPastExperienceTo?: number;
  education?: string;
  department?: string[];
  level?: string[];
  openToWork?: boolean;
  excludeRevealed?: boolean;
  excludeWatched?: boolean;
  excludeInLists?: boolean;
  excludeInProgress?: boolean;
  excludeEmailed?: boolean;
  size?: number; // 1 to 100
  autoPaginate?: boolean;
  maxResults?: number;
  strictCurrentLevel?: boolean;
}

export interface SearchProfile {
  uid: string;
  fullName: string;
  location?: string | null;
  experience?: Array<{
    company?: string;
    title?: string;
    website?: string;
    companySize?: string;
    industry?: string;
  }>;
  skills?: string[];
  contactsFetched?: boolean | null;
  openToWork?: boolean;
}

export interface SearchByQueryResponse {
  requestId: number;
  total: number;
  scrollId?: string;
  profiles: SearchProfile[];
}

// ─── Company API Definitions ──────────────────────────────────────────────────

export interface CompanyFindResponse {
  id: number;
  slug: string;
  company: string;
  domain?: string;
  industry?: string;
  employeeCount?: number;
  locations?: string[];
}

export interface CompanyLocation {
  country?: string | null;
  city?: string | null;
  geographicArea?: string | null;
  postalCode?: string | null;
  line1?: string | null;
  line2?: string | null;
  headquarter?: boolean | null;
  streetAddressOptOut?: boolean | null;
}

export interface CompanyInfoResponse {
  name: string;
  linkedInId: string;
  industry?: string | null;
  description?: string | null;
  founded?: number | null;
  logo?: string | null;
  url?: string | null;
  website?: string | null;
  phone?: string | null;
  type?: string | null;
  staffCount?: number | null;
  staffCountRange?: number | null;
  staffingCompany?: boolean;
  specialities?: string[];
  confirmedLocations?: CompanyLocation[];
}

// ─── Aggregated Company & Filter Types ────────────────────────────────────────

export interface CompanySummary {
  company: string;
  employeeCount: number;
  locations: string[];
  industries: string[];
  sampleRoles: string[];
  topDomains: string[];
  sampleUids?: string[];
}

export interface SearchCompaniesFilterInput {
  industry?: string;
  location?: string;
  keywords?: string;
  companySize?: string;
  limit?: number;
}

export interface BulkFindCompanyInput {
  companies: string[];
  location?: string;
}

export interface ExportCsvInput {
  dataType?: "candidates" | "companies";
  format?: "csv" | "tsv_google_sheets";
  items?: any[];
  searchParams?: SearchByQueryInput;
}
