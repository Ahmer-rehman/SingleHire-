/**
 * SignalHire API Constants & Dictionaries
 * Reference: https://docs.signalhire.com
 */

export const SIGNALHIRE_API_BASE_URL = "https://www.signalhire.com/api/v1";

/**
 * 146 Official Supported Industries for Search API
 */
export const SIGNALHIRE_INDUSTRIES = [
  "Accounting",
  "Airlines/Aviation",
  "Alternative Dispute Resolution",
  "Alternative Medicine",
  "Animation",
  "Apparel & Fashion",
  "Architecture & Planning",
  "Arts and Crafts",
  "Automotive",
  "Aviation & Aerospace",
  "Banking",
  "Biotechnology",
  "Broadcast Media",
  "Building Materials",
  "Business Supplies and Equipment",
  "Capital Markets",
  "Chemicals",
  "Civic & Social Organization",
  "Civil Engineering",
  "Commercial Real Estate",
  "Computer & Network Security",
  "Computer Games",
  "Computer Hardware",
  "Computer Networking",
  "Computer Software",
  "Construction",
  "Consumer Electronics",
  "Consumer Goods",
  "Consumer Services",
  "Cosmetics",
  "Dairy",
  "Defense & Space",
  "Design",
  "E-Learning",
  "Education Management",
  "Electrical/Electronic Manufacturing",
  "Environmental Services",
  "Events Services",
  "Executive Office",
  "Facilities Services",
  "Farming",
  "Fine Art",
  "Financial Services",
  "Fishery",
  "Food & Beverages",
  "Food Production",
  "Fund-Raising",
  "Furniture",
  "Gambling & Casinos",
  "Glass, Ceramics & Concrete",
  "Government Administration",
  "Government Relations",
  "Graphic Design",
  "Health, Wellness and Fitness",
  "Higher Education",
  "Hospitality",
  "Hospital & Health Care",
  "Human Resources",
  "Import and Export",
  "Individual & Family Services",
  "Industrial Automation",
  "Information Services",
  "Information Technology and Services",
  "Insurance",
  "International Affairs",
  "International Trade and Development",
  "Internet",
  "Investment Banking",
  "Investment Management",
  "Judiciary",
  "Law Enforcement",
  "Law Practice",
  "Legal Services",
  "Legislative Office",
  "Leisure, Travel & Tourism",
  "Libraries",
  "Logistics and Supply Chain",
  "Luxury Goods & Jewelry",
  "Machinery",
  "Management Consulting",
  "Maritime",
  "Market Research",
  "Marketing and Advertising",
  "Mechanical or Industrial Engineering",
  "Media Production",
  "Medical Devices",
  "Medical Practice",
  "Mental Health Care",
  "Military",
  "Mining & Metals",
  "Motion Pictures and Film",
  "Museums and Institutions",
  "Music",
  "Nanotechnology",
  "Newspapers",
  "Nonprofit Organization Management",
  "Oil & Energy",
  "Online Media",
  "Outsourcing/Offshoring",
  "Package/Freight Delivery",
  "Packaging and Containers",
  "Paper & Forest Products",
  "Performing Arts",
  "Pharmaceuticals",
  "Philanthropy",
  "Photography",
  "Plastics",
  "Political Organization",
  "Primary/Secondary Education",
  "Printing",
  "Professional Training & Coaching",
  "Program Development",
  "Public Policy",
  "Public Relations and Communications",
  "Public Safety",
  "Publishing",
  "Railroad Manufacture",
  "Ranching",
  "Real Estate",
  "Recreational Facilities and Services",
  "Religious Institutions",
  "Renewables & Environment",
  "Research",
  "Restaurants",
  "Retail",
  "Security and Investigations",
  "Semiconductors",
  "Shipbuilding",
  "Sporting Goods",
  "Sports",
  "Staffing and Recruiting",
  "Supermarkets",
  "Telecommunications",
  "Textiles",
  "Think Tanks",
  "Tobacco",
  "Translation and Localization",
  "Transportation/Trucking/Railroad",
  "Utilities",
  "Venture Capital & Private Equity",
  "Veterinary",
  "Warehousing",
  "Wholesale",
  "Wine and Spirits",
  "Wireless",
  "Writing and Editing",
] as const;

/**
 * 15 Official Professional Departments
 */
export const SIGNALHIRE_DEPARTMENTS = [
  "Marketing",
  "Sales",
  "Product & Project",
  "Engineering / Development",
  "Data & Analytics",
  "Design / UX",
  "HR & Recruitment",
  "Finance & Accounting",
  "Legal / Compliance",
  "Customer Support / Success",
  "Health, Beauty & Hospitality",
  "Education & Training",
  "Operations & Admin",
  "Facility Services",
  "Entertainment / Production",
] as const;

/**
 * 11 Official Seniority Levels
 */
export const SIGNALHIRE_LEVELS = [
  "Intern / Entry Level",
  "Junior",
  "Mid-Level",
  "Senior",
  "Lead",
  "Head",
  "VP",
  "C-Level",
  "Founder / Owner",
  "Board / Advisory",
  "Directors",
] as const;

export type SignalHireLevel = (typeof SIGNALHIRE_LEVELS)[number];

const LEVEL_MAP: Record<string, SignalHireLevel> = {
  "c-level": "C-Level",
  "clevel": "C-Level",
  "c level": "C-Level",
  "c-suite": "C-Level",
  "cxo": "C-Level",
  "ceo": "C-Level",
  "cto": "C-Level",
  "cfo": "C-Level",
  "coo": "C-Level",
  "cmo": "C-Level",
  "vp": "VP",
  "vice president": "VP",
  "vice-president": "VP",
  "director": "Directors",
  "directors": "Directors",
  "head": "Head",
  "lead": "Lead",
  "senior": "Senior",
  "sr": "Senior",
  "mid-level": "Mid-Level",
  "mid level": "Mid-Level",
  "mid": "Mid-Level",
  "junior": "Junior",
  "jr": "Junior",
  "intern": "Intern / Entry Level",
  "entry": "Intern / Entry Level",
  "entry-level": "Intern / Entry Level",
  "intern / entry level": "Intern / Entry Level",
  "founder": "Founder / Owner",
  "owner": "Founder / Owner",
  "founder / owner": "Founder / Owner",
  "board": "Board / Advisory",
  "advisory": "Board / Advisory",
  "board / advisory": "Board / Advisory",
};

/**
 * Normalizes input seniority levels, converting combined values like
 * "C-Level/VP" or "c-level" into the exact SignalHire API enum strings.
 */
export function normalizeSeniorityLevels(
  input?: string | string[] | null
): string[] | undefined {
  if (!input) return undefined;

  const rawItems = Array.isArray(input) ? input : [input];
  const tokens: string[] = [];

  for (const item of rawItems) {
    if (!item || typeof item !== "string") continue;
    // Split on slashes, commas, or semicolons (e.g. "C-Level/VP", "VP, Directors")
    const parts = item.split(/[\/,;]+/).map((s) => s.trim()).filter(Boolean);
    tokens.push(...parts);
  }

  const normalizedSet = new Set<string>();

  for (const token of tokens) {
    const lower = token.toLowerCase();
    // Direct match in dictionary
    if (LEVEL_MAP[lower]) {
      normalizedSet.add(LEVEL_MAP[lower]);
      continue;
    }
    // Match against official levels
    const exactMatch = SIGNALHIRE_LEVELS.find(
      (lvl) => lvl.toLowerCase() === lower
    );
    if (exactMatch) {
      normalizedSet.add(exactMatch);
      continue;
    }
    // Partial substring match
    const partialMatch = SIGNALHIRE_LEVELS.find((lvl) =>
      lvl.toLowerCase().includes(lower)
    );
    if (partialMatch) {
      normalizedSet.add(partialMatch);
      continue;
    }
    // Keep raw token if unmatched
    normalizedSet.add(token);
  }

  return normalizedSet.size > 0 ? Array.from(normalizedSet) : undefined;
}
