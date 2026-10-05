import test from "node:test";
import assert from "node:assert/strict";
import {
  SIGNALHIRE_DEPARTMENTS,
  SIGNALHIRE_INDUSTRIES,
  SIGNALHIRE_LEVELS,
  normalizeSeniorityLevels,
} from "../constants.js";
import {
  cleanMdTable,
  formatBalanceSummary,
  formatCandidateLookup,
  formatCompanyFind,
  formatCompanyInfo,
  formatExportData,
  formatSearchResults,
} from "../formatters.js";
import { SIGNALHIRE_TOOLS, createSignalHireMcpServer } from "../server.js";
import { SignalHireApiClient } from "../client.js";

test("Constants: industries, departments, levels are properly loaded", () => {
  assert.equal(SIGNALHIRE_INDUSTRIES.length, 146);
  assert.ok(SIGNALHIRE_INDUSTRIES.includes("Computer Software"));
  assert.ok(SIGNALHIRE_INDUSTRIES.includes("Information Technology and Services"));

  assert.equal(SIGNALHIRE_DEPARTMENTS.length, 15);
  assert.ok(SIGNALHIRE_DEPARTMENTS.includes("Engineering / Development"));
  assert.ok(SIGNALHIRE_DEPARTMENTS.includes("Sales"));

  assert.equal(SIGNALHIRE_LEVELS.length, 11);
  assert.ok(SIGNALHIRE_LEVELS.includes("Senior"));
  assert.ok(SIGNALHIRE_LEVELS.includes("C-Level"));
  assert.ok(SIGNALHIRE_LEVELS.includes("VP"));
});

test("Constants: normalizeSeniorityLevels handles slash, comma, and lowercase combinations", () => {
  assert.deepEqual(normalizeSeniorityLevels("C-Level/VP"), ["C-Level", "VP"]);
  assert.deepEqual(normalizeSeniorityLevels(["c-level", "vp"]), ["C-Level", "VP"]);
  assert.deepEqual(normalizeSeniorityLevels("VP, Directors"), ["VP", "Directors"]);
  assert.deepEqual(normalizeSeniorityLevels("ceo"), ["C-Level"]);
  assert.deepEqual(normalizeSeniorityLevels("lead"), ["Lead"]);
  assert.equal(normalizeSeniorityLevels(undefined), undefined);
});

test("Formatters: cleanMdTable escapes pipe characters preventing column breaks", () => {
  const brokenTitle = "General Manager | NUSUK";
  const cleaned = cleanMdTable(brokenTitle);
  assert.equal(cleaned.includes("|"), false);
  assert.ok(cleaned.includes("General Manager - NUSUK"));

  // Newlines replaced with spaces
  const multiline = "Line 1\nLine 2";
  assert.equal(cleanMdTable(multiline), "Line 1 Line 2");
});

test("Formatters: formatSearchResults produces Markdown, JSON, and CSV", () => {
  const sampleSearchResponse = {
    requestId: 101,
    total: 2,
    scrollId: "scroll_test_123",
    profiles: [
      {
        uid: "uid123456789012345678901234567890",
        fullName: "Jane Doe",
        location: "San Francisco, CA",
        experience: [{ title: "Staff Engineer | Lead", company: "Acme Corp" }],
        skills: ["TypeScript", "Python"],
        openToWork: true,
      },
    ],
  };

  const md = formatSearchResults(sampleSearchResponse, "markdown", 50);
  assert.ok(md.includes("### 🔍 Candidate Search Results"));
  assert.ok(md.includes("Jane Doe"));
  // Table pipe was escaped
  assert.ok(md.includes("Staff Engineer - Lead"));
  assert.ok(md.includes("50 Contact Credits"));

  const json = formatSearchResults(sampleSearchResponse, "json", 50);
  assert.ok(json.includes('"total": 2'));
  assert.ok(json.includes('"creditsLeft": 50'));

  const csv = formatSearchResults(sampleSearchResponse, "csv");
  assert.ok(csv.includes("UID,Full Name,Current Title,Current Company,Location,Skills,Open to Work"));
  assert.ok(csv.includes("Jane Doe"));
});

test("Formatters: formatCandidateLookup handles contacts and safety", () => {
  const sampleCandidateLookup = [
    {
      item: "https://www.linkedin.com/in/janedoe",
      status: "success" as const,
      candidate: {
        uid: "uid123456789012345678901234567890",
        fullName: "Jane Doe",
        headLine: "VP of Engineering at Acme",
        contacts: [
          { type: "email", value: "jane@acme.com", rating: 100, subType: "work" as const },
          { type: "phone", value: "+1 555-0199", rating: 100, subType: "mobile" as const },
        ],
        social: [{ type: "li", link: "https://www.linkedin.com/in/janedoe", rating: 100 }],
        skills: ["Distributed Systems", "Cloud Architecture"],
      },
    },
  ];

  const md = formatCandidateLookup(sampleCandidateLookup, "markdown", 49, true);
  assert.ok(md.includes("Jane Doe"));
  assert.ok(md.includes("jane@acme.com"));
  assert.ok(md.includes("+1 555-0199"));
  assert.ok(md.includes("49 Contact Credits"));

  const csv = formatCandidateLookup(sampleCandidateLookup, "csv");
  assert.ok(csv.includes("jane@acme.com"));
});

test("Formatters: formatCompanyInfo and formatCompanyFind with enrichment", () => {
  const findResult = {
    id: 1033,
    slug: "elm",
    company: "Elm",
    domain: "elm.sa",
    industry: "Information Technology and Services",
    employeeCount: 3200,
    locations: ["Riyadh, Saudi Arabia"],
  };
  const findMd = formatCompanyFind(findResult);
  assert.ok(findMd.includes("Elm"));
  assert.ok(findMd.includes("elm.sa"));
  assert.ok(findMd.includes("Information Technology and Services"));
  assert.ok(findMd.includes("3,200"));

  const infoResult = {
    name: "Elm",
    linkedInId: "1033",
    industry: "Information Technology and Services",
    website: "https://elm.sa",
    staffCount: 3200,
    specialities: ["Digital Transformation", "Security"],
  };
  const infoMd = formatCompanyInfo(infoResult, "markdown", 2000);
  assert.ok(infoMd.includes("Elm"));
  assert.ok(infoMd.includes("3,200"));
});

test("Formatters: formatBalanceSummary displays contact credits and quota countdown", () => {
  const summary = formatBalanceSummary(2000, 0, false);
  assert.ok(summary.includes("2,000 credits remaining"));
  assert.ok(summary.includes("Daily quota is exhausted"));
  assert.ok(summary.includes("00:00 UTC"));
});

test("Formatters: formatExportData exports candidates and companies to TSV & CSV", () => {
  const candidates = [
    {
      uid: "uid123",
      fullName: "Ahmed Al-Salem",
      experience: [{ title: "CTO", company: "Elm" }],
      location: "Riyadh, Saudi Arabia",
      skills: ["Cloud", "AI"],
      openToWork: false,
    },
  ];

  const tsv = formatExportData("candidates", candidates, "tsv_google_sheets");
  assert.ok(tsv.includes("Ahmed Al-Salem"));
  assert.ok(tsv.includes("Google Sheets / Excel Ready Export"));
  assert.ok(tsv.includes("CTO\tElm"));

  const csv = formatExportData("candidates", candidates, "csv");
  assert.ok(csv.includes('"Ahmed Al-Salem"'));
  assert.ok(csv.includes('"CTO"'));
});

test("Server: registers all 14 tools, resources, and prompts", () => {
  assert.equal(SIGNALHIRE_TOOLS.length, 14);

  const toolNames = SIGNALHIRE_TOOLS.map((t) => t.name);
  assert.ok(toolNames.includes("search_candidates_query"));
  assert.ok(toolNames.includes("find_company"));
  assert.ok(toolNames.includes("bulk_find_company"));
  assert.ok(toolNames.includes("search_companies_by_filters"));
  assert.ok(toolNames.includes("export_to_csv"));
  assert.ok(toolNames.includes("check_balance"));
  assert.ok(toolNames.includes("check_without_contacts_credits"));

  const { server } = createSignalHireMcpServer({ apiKey: "test-key" });
  assert.ok(server);
});

test("Client: handles missing API key gracefully", async () => {
  const client = new SignalHireApiClient({ apiKey: "" });
  assert.equal(client.hasApiKey(), false);

  await assert.rejects(async () => {
    await client.checkCredits();
  }, /SignalHire API Key is missing/);
});
