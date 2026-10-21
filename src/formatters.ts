/**
 * Output formatters for SignalHire MCP Server
 * Generates Markdown, JSON, and CSV views of candidate and company data.
 */

import {
  CandidateLookupResponse,
  CandidateObject,
  CompanyFindResponse,
  CompanyInfoResponse,
  ResponseFormat,
  SearchByQueryResponse,
  SearchProfile,
} from "./types.js";

// Helper to sanitize markdown table cells (strips | to prevent column breakage)
export function cleanMdTable(text: string | number | null | undefined): string {
  if (text === null || text === undefined || text === "") return "—";
  return String(text)
    .replace(/\|/g, " - ")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Helper to escape CSV fields (RFC 4180)
export function escapeCsv(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

// Helper to escape TSV fields for copy-pasting directly into Google Sheets / Excel
export function escapeTsv(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/\t/g, " ")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

export function getTimeUntilMidnightUtc(): string {
  const now = new Date();
  const midnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
  );
  const diffMs = midnight.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m (at 00:00 UTC)`;
}

function appendCreditsFooter(output: string, creditsLeft: number | null): string {
  if (creditsLeft === null) return output;
  return `${output}\n\n---\n*💳 **Account Balance Remaining:** ${creditsLeft} Contact Credits*`;
}

// ─── Format Search Results ────────────────────────────────────────────────────

export function formatSearchResults(
  data: SearchByQueryResponse,
  format: ResponseFormat = "markdown",
  creditsLeft: number | null = null
): string {
  if (format === "json") {
    return appendCreditsFooter(
      JSON.stringify({ ...data, creditsLeft }, null, 2),
      null
    );
  }

  if (format === "csv") {
    const headers = [
      "UID",
      "Full Name",
      "Current Title",
      "Current Company",
      "Location",
      "Skills",
      "Open to Work",
    ];

    const rows = (data.profiles || []).map((p) => [
      escapeCsv(p.uid),
      escapeCsv(p.fullName),
      escapeCsv(p.experience?.[0]?.title || ""),
      escapeCsv(p.experience?.[0]?.company || ""),
      escapeCsv(p.location || ""),
      escapeCsv((p.skills || []).join("; ")),
      escapeCsv(p.openToWork ? "Yes" : "No"),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    return csvContent;
  }

  // Default: Markdown with safe table cells (no broken pipes)
  const lines: string[] = [];
  lines.push(`### 🔍 Candidate Search Results`);
  lines.push(`- **Total Matching Profiles in Database:** ${data.total.toLocaleString()}`);
  lines.push(`- **Returned in this Batch:** ${data.profiles?.length || 0}`);
  lines.push(`- **Search Request ID:** \`${data.requestId}\``);

  if (data.scrollId) {
    lines.push(
      `- **Next Page Scroll ID:** \`${data.scrollId}\` *(Note: To fetch more profiles automatically in one call, set \`auto_paginate: true\` or \`max_results\`)*`
    );
  }

  if (!data.profiles || data.profiles.length === 0) {
    lines.push("", "No matching candidate profiles found for this query.");
    return appendCreditsFooter(lines.join("\n"), creditsLeft);
  }

  lines.push("", "| # | Candidate | Current Role | Location | Top Skills | UID |");
  lines.push("| :- | :--- | :--- | :--- | :--- | :--- |");

  data.profiles.forEach((p, idx) => {
    const role = p.experience?.[0];
    const safeTitle = cleanMdTable(role?.title);
    const safeCompany = cleanMdTable(role?.company);
    const roleText = role ? `${safeTitle} @ **${safeCompany}**` : "—";
    const topSkills = cleanMdTable((p.skills || []).slice(0, 3).join(", "));
    const safeName = cleanMdTable(p.fullName);
    const safeLoc = cleanMdTable(p.location);
    const openBadge = p.openToWork ? " 🟢 *(Open)*" : "";

    lines.push(
      `| ${idx + 1} | **${safeName}**${openBadge} | ${roleText} | ${safeLoc} | ${topSkills} | \`${p.uid}\` |`
    );
  });

  lines.push(
    "",
    "> 💡 **Tip:** To view full work history, education, and skills without contact info, use `retrieve_person_no_contacts` with the UID.",
    "> To reveal verified personal/work emails and direct phone numbers, use `retrieve_person_profile` with `spend_credits_confirmed=true`."
  );

  return appendCreditsFooter(lines.join("\n"), creditsLeft);
}

// ─── Format Candidate Profiles ────────────────────────────────────────────────

export function formatCandidateLookup(
  results: CandidateLookupResponse,
  format: ResponseFormat = "markdown",
  creditsLeft: number | null = null,
  withContacts: boolean = true
): string {
  if (format === "json") {
    return appendCreditsFooter(
      JSON.stringify({ results, creditsLeft }, null, 2),
      null
    );
  }

  if (format === "csv") {
    const headers = [
      "Query Item",
      "Status",
      "UID",
      "Full Name",
      "Headline",
      "Work Emails",
      "Personal Emails",
      "Phones",
      "LinkedIn",
      "Current Company",
      "Current Position",
      "Location",
      "Skills",
    ];

    const rows = results.map((r) => {
      const c = r.candidate;
      if (!c) {
        return [
          escapeCsv(r.item),
          escapeCsv(r.status),
          '""',
          '""',
          '""',
          '""',
          '""',
          '""',
          '""',
          '""',
          '""',
          '""',
          '""',
        ];
      }

      const workEmails = (c.contacts || [])
        .filter((cnt) => cnt.type === "email" && cnt.subType === "work")
        .map((cnt) => cnt.value)
        .join("; ");
      const personalEmails = (c.contacts || [])
        .filter((cnt) => cnt.type === "email" && cnt.subType !== "work")
        .map((cnt) => cnt.value)
        .join("; ");
      const phones = (c.contacts || [])
        .filter((cnt) => cnt.type === "phone")
        .map((cnt) => cnt.value)
        .join("; ");
      const linkedin =
        (c.social || []).find((s) => s.type === "li")?.link || "";
      const currentExp = (c.experience || []).find((e) => e.current);
      const loc = (c.locations || []).map((l) => l.name).join("; ");
      const skills = (c.skills || []).join("; ");

      return [
        escapeCsv(r.item),
        escapeCsv(r.status),
        escapeCsv(c.uid),
        escapeCsv(c.fullName),
        escapeCsv(c.headLine || ""),
        escapeCsv(workEmails),
        escapeCsv(personalEmails),
        escapeCsv(phones),
        escapeCsv(linkedin),
        escapeCsv(currentExp?.company || ""),
        escapeCsv(currentExp?.position || ""),
        escapeCsv(loc),
        escapeCsv(skills),
      ];
    });

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  // Default: Markdown
  const lines: string[] = [];
  lines.push(`### 👤 Candidate Profile Intelligence`);
  lines.push(`- **Profiles Looked Up:** ${results.length}`);

  const successful = results.filter((r) => r.status === "success" && r.candidate);
  lines.push(`- **Found & Retrieved:** ${successful.length}`);

  for (const item of results) {
    lines.push("", "---");
    if (item.status !== "success" || !item.candidate) {
      const reasonBadge =
        item.status === "credits_are_over"
          ? `⚠️ No Credits Left (daily quota resets in ${getTimeUntilMidnightUtc()})`
          : item.status === "timeout_exceeded"
          ? "⏱️ Timeout Exceeded"
          : item.status === "duplicate_query"
          ? "🔁 Duplicate Query"
          : "❌ Not Found";
      lines.push(`#### Target: \`${item.item}\` — ${reasonBadge}`);
      continue;
    }

    const c = item.candidate;
    lines.push(`#### 🌟 ${cleanMdTable(c.fullName)}`);
    if (c.headLine) lines.push(`*${cleanMdTable(c.headLine)}*`);
    lines.push(`- **SignalHire UID:** \`${c.uid}\``);

    if (c.locations && c.locations.length > 0) {
      lines.push(`- **Location:** ${c.locations.map((l) => cleanMdTable(l.name)).join(", ")}`);
    }
    if (c.experienceYears) {
      lines.push(`- **Total Experience:** ~${c.experienceYears} years`);
    }
    if (c.summary) {
      lines.push(`- **Summary:** ${cleanMdTable(c.summary)}`);
    }

    // Contacts section
    if (withContacts && c.contacts && c.contacts.length > 0) {
      lines.push("", "##### 📞 Verified Contact Information:");
      lines.push("| Type | Details / Value | Rating | Category |");
      lines.push("| :--- | :--- | :--- | :--- |");
      for (const cnt of c.contacts) {
        const icon =
          cnt.type === "email"
            ? "✉️ Email"
            : cnt.type === "phone"
            ? "📱 Phone"
            : cnt.type === "whatsapp"
            ? "💬 WhatsApp"
            : `🔗 ${cleanMdTable(cnt.type)}`;
        const ratingBadge = cnt.rating >= 90 ? "✅ 100% High" : "⚠️ 70% Likely";
        const safeVal = cleanMdTable(cnt.value);
        const safeSub = cleanMdTable(cnt.subType || "general");
        lines.push(
          `| ${icon} | **\`${safeVal}\`** | ${ratingBadge} | ${safeSub} |`
        );
      }
    } else if (withContacts && (!c.contacts || c.contacts.length === 0)) {
      lines.push("", "*ℹ️ No direct email or phone contacts found for this profile.*");
    }

    // Social Links
    if (c.social && c.social.length > 0) {
      lines.push("", "##### 🌐 Social Profiles:");
      const socialLinks = c.social
        .map((s) => `[${s.type.toUpperCase()}](${s.link}) (${s.rating}%)`)
        .join(" • ");
      lines.push(socialLinks);
    }

    // Experience
    if (c.experience && c.experience.length > 0) {
      lines.push("", "##### 💼 Work History:");
      for (const exp of c.experience.slice(0, 5)) {
        const currentTag = exp.current ? " *(Current)*" : "";
        const dates = [
          exp.started ? exp.started.slice(0, 7) : "",
          exp.current ? "Present" : exp.ended ? exp.ended.slice(0, 7) : "",
        ]
          .filter(Boolean)
          .join(" – ");
        const safePos = cleanMdTable(exp.position || "Role");
        const safeComp = cleanMdTable(exp.company || "Company");
        lines.push(
          `- **${safePos}** at **${safeComp}**${currentTag} ${
            dates ? `\`(${dates})\`` : ""
          }`
        );
        if (exp.industry && exp.industry !== "n/a") {
          lines.push(`  *Industry: ${cleanMdTable(exp.industry)} | Staff: ${exp.staffCount || exp.companySize}*`);
        }
        if (exp.summary) {
          lines.push(`  >${cleanMdTable(exp.summary.slice(0, 150))}${exp.summary.length > 150 ? "..." : ""}`);
        }
      }
    }

    // Education
    if (c.education && c.education.length > 0) {
      lines.push("", "##### 🎓 Education:");
      for (const edu of c.education) {
        const degrees = (edu.degree || []).join(", ");
        const years = [edu.startedYear, edu.endedYear].filter(Boolean).join(" – ");
        lines.push(
          `- **${cleanMdTable(edu.university)}**${degrees ? ` — ${cleanMdTable(degrees)}` : ""}${
            edu.faculty ? ` (${cleanMdTable(edu.faculty)})` : ""
          } ${years ? `\`[${years}]\`` : ""}`
        );
      }
    }

    // Skills
    if (c.skills && c.skills.length > 0) {
      lines.push("", "##### 🛠️ Skills & Technologies:");
      lines.push(c.skills.map((s) => `\`${cleanMdTable(s)}\``).join("  "));
    }
  }

  return appendCreditsFooter(lines.join("\n"), creditsLeft);
}

// ─── Format Company Info ──────────────────────────────────────────────────────

export function formatCompanyInfo(
  company: CompanyInfoResponse,
  format: ResponseFormat = "markdown",
  creditsLeft: number | null = null
): string {
  if (format === "json") {
    return appendCreditsFooter(
      JSON.stringify({ ...company, creditsLeft }, null, 2),
      null
    );
  }

  if (format === "csv") {
    const headers = [
      "Company Name",
      "LinkedIn ID",
      "Industry",
      "Website",
      "Founded",
      "Type",
      "Staff Count",
      "Headquarters",
      "Specialities",
    ];

    const hq = (company.confirmedLocations || []).find((l) => l.headquarter);
    const hqStr = hq
      ? [hq.line1, hq.city, hq.geographicArea, hq.country].filter(Boolean).join(", ")
      : "";

    const row = [
      escapeCsv(company.name),
      escapeCsv(company.linkedInId),
      escapeCsv(company.industry || ""),
      escapeCsv(company.website || ""),
      escapeCsv(company.founded || ""),
      escapeCsv(company.type || ""),
      escapeCsv(company.staffCount || ""),
      escapeCsv(hqStr),
      escapeCsv((company.specialities || []).join("; ")),
    ];

    return [headers.join(","), row.join(",")].join("\n");
  }

  // Default: Markdown
  const lines: string[] = [];
  lines.push(`### 🏢 Company Profile: **${cleanMdTable(company.name)}**`);
  lines.push(`- **LinkedIn ID / Slug:** \`${company.linkedInId}\``);
  if (company.industry) lines.push(`- **Industry:** ${cleanMdTable(company.industry)}`);
  if (company.website) lines.push(`- **Website:** [${company.website}](${company.website})`);
  if (company.url) lines.push(`- **LinkedIn Page:** [${company.url}](${company.url})`);
  if (company.type) lines.push(`- **Company Type:** ${cleanMdTable(company.type)}`);
  if (company.founded) lines.push(`- **Founded Year:** ${company.founded}`);
  if (company.staffCount) {
    lines.push(`- **Total Employees / Headcount:** ~${company.staffCount.toLocaleString()}`);
  }
  if (company.phone) lines.push(`- **Phone:** ${company.phone}`);

  if (company.description) {
    lines.push("", "#### Overview:", `>${cleanMdTable(company.description)}`);
  }

  if (company.specialities && company.specialities.length > 0) {
    lines.push("", "#### Specialities & Expertise:");
    lines.push(company.specialities.map((s) => `\`${cleanMdTable(s)}\``).join("  "));
  }

  if (company.confirmedLocations && company.confirmedLocations.length > 0) {
    lines.push("", "#### Confirmed Office Locations:");
    for (const loc of company.confirmedLocations) {
      const hqBadge = loc.headquarter ? " **[Headquarters]**" : "";
      const address = [loc.line1, loc.line2, loc.city, loc.geographicArea, loc.postalCode, loc.country]
        .filter(Boolean)
        .join(", ");
      lines.push(`- 📍 ${cleanMdTable(address)}${hqBadge}`);
    }
  }

  return appendCreditsFooter(lines.join("\n"), creditsLeft);
}

// ─── Format Company Search ID ─────────────────────────────────────────────────

export function formatCompanyFind(
  res: CompanyFindResponse,
  creditsLeft: number | null = null
): string {
  const safeComp = cleanMdTable(res.company);
  const foundedTag = res.founded ? ` 🏷️ \`Est. ${res.founded}\`` : "";
  const domainText = res.domain
    ? `[${cleanMdTable(res.domain)}](https://${cleanMdTable(res.domain)})`
    : "—";

  const lines = [
    `### 🏢 Company Identified: **${safeComp}**${foundedTag}`,
    `- **Company Name:** **${safeComp}**`,
    res.founded ? `- **Founded Year:** ${res.founded}` : "",
    res.domain ? `- **Domain / Website:** ${domainText}` : "",
    res.industry ? `- **Industry:** ${cleanMdTable(res.industry)}` : "",
    res.employeeCount !== undefined
      ? `- **Estimated Employees in Database:** **~${res.employeeCount.toLocaleString()}** profiles`
      : "",
    res.locations && res.locations.length > 0
      ? `- **Primary Locations:** ${res.locations.map(cleanMdTable).join("; ")}`
      : "",
    res.id ? `- **Numeric ID:** \`${res.id}\`` : "",
    res.slug ? `- **Slug:** \`${res.slug}\`` : "",
    "",
    `> 💡 **Verification Tip:** Check the domain and industry above to confirm this matches your target company. Use \`search_candidates_query\` with \`current_company: "${safeComp}"\` to view all employees, leadership, and decision-makers.`,
  ].filter(Boolean);

  return appendCreditsFooter(lines.join("\n"), creditsLeft);
}

// ─── Format Aggregated Company Search / Bulk Company View ─────────────────────

export interface CompanySummaryItem {
  company: string;
  employeeCount: number;
  locations: string[];
  industries: string[];
  sampleRoles: string[];
  topDomains: string[];
  founded?: number | string | null;
}

export function formatCompanyList(
  companies: CompanySummaryItem[],
  title: string = "Company Search Results",
  format: ResponseFormat = "markdown",
  creditsLeft: number | null = null
): string {
  if (format === "json") {
    return JSON.stringify({ title, total: companies.length, companies, creditsLeft }, null, 2);
  }

  if (format === "csv") {
    const headers = [
      "Company",
      "Founded",
      "Domain",
      "Employees in SignalHire",
      "Primary Locations",
      "Sample Roles",
      "Industries",
    ];

    const rows = companies.map((c) => [
      escapeCsv(c.company),
      escapeCsv(c.founded || ""),
      escapeCsv(c.topDomains?.[0] || ""),
      escapeCsv(c.employeeCount),
      escapeCsv(c.locations.join("; ")),
      escapeCsv(c.sampleRoles.join("; ")),
      escapeCsv(c.industries.join("; ")),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  // Default: Markdown with safe table cells (no broken pipes)
  const lines: string[] = [];
  lines.push(`### 🏢 ${title} (${companies.length} Companies)`);
  lines.push("", "| # | Company | Founded | Domain / Website | Headcount in SignalHire | Primary Locations | Sample Roles |");
  lines.push("| :- | :--- | :--- | :--- | :--- | :--- | :--- |");

  companies.forEach((c, idx) => {
    const safeComp = cleanMdTable(c.company);
    const foundedTag = c.founded ? `🏷️ \`${c.founded}\`` : "—";
    const domainText = c.topDomains?.[0]
      ? `[${cleanMdTable(c.topDomains[0])}](https://${cleanMdTable(c.topDomains[0])})`
      : "—";
    const safeLoc = cleanMdTable(c.locations.slice(0, 2).join(", "));
    const safeRoles = cleanMdTable(c.sampleRoles.slice(0, 3).join(", "));
    lines.push(
      `| ${idx + 1} | **${safeComp}** | ${foundedTag} | ${domainText} | ~${c.employeeCount.toLocaleString()} | ${safeLoc} | ${safeRoles} |`
    );
  });

  lines.push(
    "",
    "> 💡 **Tip:** To inspect decision-makers at any of these companies, call `search_candidates_query` with `current_company: \"<CompanyName>\"` and `level: [\"C-Level\", \"VP\", \"Directors\"]`."
  );

  return appendCreditsFooter(lines.join("\n"), creditsLeft);
}

// ─── Format Account Balances & Quotas ─────────────────────────────────────────

export function formatBalanceSummary(
  contactCredits: number,
  withoutContactsQuota: number,
  companyApiEnabled: boolean = false
): string {
  const resetCountdown = getTimeUntilMidnightUtc();
  const lines = [
    "### 💳 SignalHire Account Balances & Quotas",
    `- **Standard Contact Credits:** **${contactCredits.toLocaleString()} credits remaining**`,
    `  *(Used for unlocking verified personal/work emails & direct phone numbers via \`retrieve_person_profile\`. 1 credit per profile.)*`,
    "",
    `- **Daily Without-Contacts Quota:** **${withoutContactsQuota.toLocaleString()} profiles remaining**`,
    withoutContactsQuota === 0
      ? `  *⚠️ Daily quota is exhausted (0 remaining today). Resets in **${resetCountdown}**.*`
      : `  *(Free daily quota for viewing career histories without contact info via \`retrieve_person_no_contacts\`. Resets in ${resetCountdown}).*`,
    "",
    `- **Company Intelligence API:** **${
      companyApiEnabled ? "✅ Active" : "ℹ️ Candidate Talent Analytics Active"
    }**`,
    companyApiEnabled
      ? "  *(Full firmographics enabled.)*"
      : "  *(Standard firmographics requires separate enterprise add-on; use candidate search aggregation tools (\`search_companies_by_filters\`, \`bulk_find_company\`, \`find_company\`) for full company intelligence.)*",
    "",
    `> 💡 **Available Right Now:** You have **${contactCredits.toLocaleString()} Contact Credits** available to reveal candidate email and phone numbers today!`,
  ];
  return lines.join("\n");
}

// ─── Format Export Data (CSV & Google Sheets TSV) ─────────────────────────────

function extractCompanyExportRow(c: any): string[] {
  const name =
    c.company || c.name || c.companyName || c.company_name || c.Company || c.Name || "";
  const foundedVal =
    c.founded ?? c.foundedYear ?? c.founded_year ?? c.Founded ?? c.FoundedYear ?? "";
  const founded = String(foundedVal);
  const domain =
    c.domain || c.website || c.url || c.topDomains?.[0] || c.Domain || c.Website || c.URL || "";
  const headcountVal =
    c.employeeCount ??
    c.headcount ??
    c.employees ??
    c.staffCount ??
    c.size ??
    c.companySize ??
    c.Headcount ??
    c.EmployeeCount ??
    c.Employees ??
    0;
  const headcount = String(headcountVal);

  const locs = c.locations ?? c.location ?? c.Locations ?? c.Location ?? [];
  const locations = Array.isArray(locs) ? locs.join("; ") : String(locs);

  const rolesVal =
    c.sampleRoles ?? c.sample_roles ?? c.roles ?? c.titles ?? c.Roles ?? c.Titles ?? [];
  const sampleRoles = Array.isArray(rolesVal) ? rolesVal.join("; ") : String(rolesVal);

  const inds = c.industries ?? c.industry ?? c.Industries ?? c.Industry ?? [];
  const industries = Array.isArray(inds) ? inds.join("; ") : String(inds);

  return [name, founded, domain, headcount, locations, sampleRoles, industries];
}

function extractCandidateExportRow(p: any): string[] {
  const uid = p.uid || p.UID || p.id || p.Id || "";
  const name = p.fullName || p.name || p.FullName || p.Name || "";
  const title =
    p.experience?.[0]?.title || p.title || p.currentTitle || p.role || p.Title || p.Role || "";
  const company =
    p.experience?.[0]?.company || p.company || p.currentCompany || p.Company || "";
  const location = p.location || p.Location || "";
  const skillsVal = p.skills || p.Skills || [];
  const skills = Array.isArray(skillsVal) ? skillsVal.join("; ") : String(skillsVal);

  const open = p.openToWork ?? p.open_to_work ?? p.OpenToWork;
  const openStr = open === true || open === "true" || open === "Yes" ? "Yes" : "No";

  return [uid, name, title, company, location, skills, openStr];
}

export function formatExportData(
  dataType: "candidates" | "companies" = "candidates",
  items: any[],
  format: "csv" | "tsv_google_sheets" = "csv"
): string {
  // Auto-detect dataType if items clearly contain company structures
  let targetType = dataType;
  if (items.length > 0) {
    const first = items[0];
    if (
      (first.company || first.headcount || first.employeeCount || first.domain || first.website) &&
      !first.uid &&
      !first.fullName
    ) {
      targetType = "companies";
    }
  }

  if (targetType === "companies") {
    const headers = [
      "Company",
      "Founded",
      "Domain",
      "Headcount in SignalHire",
      "Primary Locations",
      "Sample Roles",
      "Industries",
    ];

    const rows = items.map(extractCompanyExportRow);

    if (format === "tsv_google_sheets") {
      const tsvLines = [
        headers.map(escapeTsv).join("\t"),
        ...rows.map((r) => r.map(escapeTsv).join("\t")),
      ].join("\n");

      return [
        `### 📋 Google Sheets / Excel Ready Export (${items.length} Companies)`,
        "",
        "```tsv",
        tsvLines,
        "```",
        "",
        "> 💡 **How to Paste into Google Sheets:** Click 'Copy' on the code block above, open your Google Sheet or Excel, click on cell **A1**, and press **Ctrl+V** (or **Cmd+V**). All columns and rows will automatically paste into separate cells!",
      ].join("\n");
    }

    // Default: CSV
    const csvContent = [
      headers.map(escapeCsv).join(","),
      ...rows.map((r) => r.map(escapeCsv).join(",")),
    ].join("\n");

    return csvContent;
  }

  // targetType === "candidates"
  const headers = [
    "UID",
    "Full Name",
    "Current Title",
    "Current Company",
    "Location",
    "Skills",
    "Open to Work",
  ];

  const rows = items.map(extractCandidateExportRow);

  if (format === "tsv_google_sheets") {
    const tsvLines = [
      headers.map(escapeTsv).join("\t"),
      ...rows.map((r) => r.map(escapeTsv).join("\t")),
    ].join("\n");

    return [
      `### 📋 Google Sheets / Excel Ready Export (${items.length} Candidates)`,
      "",
      "```tsv",
      tsvLines,
      "```",
      "",
      "> 💡 **How to Paste into Google Sheets:** Click 'Copy' on the code block above, open your Google Sheet or Excel, click on cell **A1**, and press **Ctrl+V** (or **Cmd+V**). All columns and rows will automatically paste into separate cells!",
    ].join("\n");
  }

  // Default: CSV
  const csvContent = [
    headers.map(escapeCsv).join(","),
    ...rows.map((r) => r.map(escapeCsv).join(",")),
  ].join("\n");

  return csvContent;
}
