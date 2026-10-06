/**
 * SignalHire MCP Server Implementation
 * Implements official Model Context Protocol (MCP) server for SignalHire
 * Reference: https://docs.signalhire.com/mcp-server.md
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SignalHireApiClient } from "./client.js";
export declare const SIGNALHIRE_TOOLS: ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            current_title: {
                type: string;
                description: string;
            };
            current_past_title: {
                type: string;
                description: string;
            };
            location: {
                type: string[];
                items: {
                    type: string;
                };
                description: string;
            };
            latitude: {
                type: string;
                description: string;
            };
            longitude: {
                type: string;
                description: string;
            };
            coordinates: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        latitude: {
                            type: string;
                        };
                        longitude: {
                            type: string;
                        };
                    };
                    required: string[];
                };
                description: string;
            };
            radius: {
                type: string;
                description: string;
            };
            company_size: {
                type: string;
                description: string;
            };
            spend_credits_confirmed: {
                type: string;
                description: string;
            };
            current_company: {
                type: string;
                description: string;
            };
            current_past_company: {
                type: string;
                description: string;
            };
            full_name: {
                type: string;
                description: string;
            };
            keywords: {
                type: string;
                description: string;
            };
            industry: {
                type: string;
                description: string;
            };
            industries: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            department: {
                type: string;
                items: {
                    type: string;
                    enum: ("Marketing" | "Sales" | "Product & Project" | "Engineering / Development" | "Data & Analytics" | "Design / UX" | "HR & Recruitment" | "Finance & Accounting" | "Legal / Compliance" | "Customer Support / Success" | "Health, Beauty & Hospitality" | "Education & Training" | "Operations & Admin" | "Facility Services" | "Entertainment / Production")[];
                };
                description: string;
            };
            level: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            exclude_title: {
                type: string;
                description: string;
            };
            strict_current_level: {
                type: string;
                description: string;
            };
            years_experience_from: {
                type: string;
                description: string;
            };
            years_experience_to: {
                type: string;
                description: string;
            };
            years_current_past_experience_from: {
                type: string;
                description: string;
            };
            years_current_past_experience_to: {
                type: string;
                description: string;
            };
            education: {
                type: string;
                description: string;
            };
            open_to_work: {
                type: string;
                description: string;
            };
            exclude_revealed: {
                type: string;
                description: string;
            };
            exclude_watched: {
                type: string;
                description: string;
            };
            exclude_in_lists: {
                type: string;
                description: string;
            };
            exclude_in_progress: {
                type: string;
                description: string;
            };
            exclude_emailed: {
                type: string;
                description: string;
            };
            size: {
                type: string;
                description: string;
                default: number;
            };
            auto_paginate: {
                type: string;
                description: string;
                default: boolean;
            };
            max_results: {
                type: string;
                description: string;
                default: number;
            };
            response_format: {
                type: string;
                enum: string[];
                description: string;
                default: string;
            };
            companies?: undefined;
            request_id?: undefined;
            scroll_id?: undefined;
            items?: undefined;
            without_waterfall?: undefined;
            callback_url?: undefined;
            company_id_or_slug?: undefined;
            limit?: undefined;
            company_id?: undefined;
            status?: undefined;
            filter?: undefined;
            data_type?: undefined;
            format?: undefined;
            search_params?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            companies: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            current_title: {
                type: string;
                description: string;
            };
            exclude_title: {
                type: string;
                description: string;
            };
            location: {
                type: string;
                description: string;
                items?: undefined;
            };
            department: {
                type: string;
                items: {
                    type: string;
                    enum: ("Marketing" | "Sales" | "Product & Project" | "Engineering / Development" | "Data & Analytics" | "Design / UX" | "HR & Recruitment" | "Finance & Accounting" | "Legal / Compliance" | "Customer Support / Success" | "Health, Beauty & Hospitality" | "Education & Training" | "Operations & Admin" | "Facility Services" | "Entertainment / Production")[];
                };
                description: string;
            };
            level: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            max_results: {
                type: string;
                description: string;
                default: number;
            };
            response_format: {
                type: string;
                enum: string[];
                description: string;
                default: string;
            };
            current_past_title?: undefined;
            latitude?: undefined;
            longitude?: undefined;
            coordinates?: undefined;
            radius?: undefined;
            company_size?: undefined;
            spend_credits_confirmed?: undefined;
            current_company?: undefined;
            current_past_company?: undefined;
            full_name?: undefined;
            keywords?: undefined;
            industry?: undefined;
            industries?: undefined;
            strict_current_level?: undefined;
            years_experience_from?: undefined;
            years_experience_to?: undefined;
            years_current_past_experience_from?: undefined;
            years_current_past_experience_to?: undefined;
            education?: undefined;
            open_to_work?: undefined;
            exclude_revealed?: undefined;
            exclude_watched?: undefined;
            exclude_in_lists?: undefined;
            exclude_in_progress?: undefined;
            exclude_emailed?: undefined;
            size?: undefined;
            auto_paginate?: undefined;
            request_id?: undefined;
            scroll_id?: undefined;
            items?: undefined;
            without_waterfall?: undefined;
            callback_url?: undefined;
            company_id_or_slug?: undefined;
            limit?: undefined;
            company_id?: undefined;
            status?: undefined;
            filter?: undefined;
            data_type?: undefined;
            format?: undefined;
            search_params?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            request_id: {
                type: string;
                description: string;
            };
            scroll_id: {
                type: string;
                description: string;
            };
            response_format: {
                type: string;
                enum: string[];
                description: string;
                default: string;
            };
            current_title?: undefined;
            current_past_title?: undefined;
            location?: undefined;
            latitude?: undefined;
            longitude?: undefined;
            coordinates?: undefined;
            radius?: undefined;
            company_size?: undefined;
            spend_credits_confirmed?: undefined;
            current_company?: undefined;
            current_past_company?: undefined;
            full_name?: undefined;
            keywords?: undefined;
            industry?: undefined;
            industries?: undefined;
            department?: undefined;
            level?: undefined;
            exclude_title?: undefined;
            strict_current_level?: undefined;
            years_experience_from?: undefined;
            years_experience_to?: undefined;
            years_current_past_experience_from?: undefined;
            years_current_past_experience_to?: undefined;
            education?: undefined;
            open_to_work?: undefined;
            exclude_revealed?: undefined;
            exclude_watched?: undefined;
            exclude_in_lists?: undefined;
            exclude_in_progress?: undefined;
            exclude_emailed?: undefined;
            size?: undefined;
            auto_paginate?: undefined;
            max_results?: undefined;
            companies?: undefined;
            items?: undefined;
            without_waterfall?: undefined;
            callback_url?: undefined;
            company_id_or_slug?: undefined;
            limit?: undefined;
            company_id?: undefined;
            status?: undefined;
            filter?: undefined;
            data_type?: undefined;
            format?: undefined;
            search_params?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            items: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            response_format: {
                type: string;
                enum: string[];
                description: string;
                default: string;
            };
            current_title?: undefined;
            current_past_title?: undefined;
            location?: undefined;
            latitude?: undefined;
            longitude?: undefined;
            coordinates?: undefined;
            radius?: undefined;
            company_size?: undefined;
            spend_credits_confirmed?: undefined;
            current_company?: undefined;
            current_past_company?: undefined;
            full_name?: undefined;
            keywords?: undefined;
            industry?: undefined;
            industries?: undefined;
            department?: undefined;
            level?: undefined;
            exclude_title?: undefined;
            strict_current_level?: undefined;
            years_experience_from?: undefined;
            years_experience_to?: undefined;
            years_current_past_experience_from?: undefined;
            years_current_past_experience_to?: undefined;
            education?: undefined;
            open_to_work?: undefined;
            exclude_revealed?: undefined;
            exclude_watched?: undefined;
            exclude_in_lists?: undefined;
            exclude_in_progress?: undefined;
            exclude_emailed?: undefined;
            size?: undefined;
            auto_paginate?: undefined;
            max_results?: undefined;
            companies?: undefined;
            request_id?: undefined;
            scroll_id?: undefined;
            without_waterfall?: undefined;
            callback_url?: undefined;
            company_id_or_slug?: undefined;
            limit?: undefined;
            company_id?: undefined;
            status?: undefined;
            filter?: undefined;
            data_type?: undefined;
            format?: undefined;
            search_params?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            items: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            spend_credits_confirmed: {
                type: string;
                description: string;
            };
            without_waterfall: {
                type: string;
                description: string;
                default: boolean;
            };
            callback_url: {
                type: string;
                description: string;
            };
            response_format: {
                type: string;
                enum: string[];
                description: string;
                default: string;
            };
            current_title?: undefined;
            current_past_title?: undefined;
            location?: undefined;
            latitude?: undefined;
            longitude?: undefined;
            coordinates?: undefined;
            radius?: undefined;
            company_size?: undefined;
            current_company?: undefined;
            current_past_company?: undefined;
            full_name?: undefined;
            keywords?: undefined;
            industry?: undefined;
            industries?: undefined;
            department?: undefined;
            level?: undefined;
            exclude_title?: undefined;
            strict_current_level?: undefined;
            years_experience_from?: undefined;
            years_experience_to?: undefined;
            years_current_past_experience_from?: undefined;
            years_current_past_experience_to?: undefined;
            education?: undefined;
            open_to_work?: undefined;
            exclude_revealed?: undefined;
            exclude_watched?: undefined;
            exclude_in_lists?: undefined;
            exclude_in_progress?: undefined;
            exclude_emailed?: undefined;
            size?: undefined;
            auto_paginate?: undefined;
            max_results?: undefined;
            companies?: undefined;
            request_id?: undefined;
            scroll_id?: undefined;
            company_id_or_slug?: undefined;
            limit?: undefined;
            company_id?: undefined;
            status?: undefined;
            filter?: undefined;
            data_type?: undefined;
            format?: undefined;
            search_params?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            company_id_or_slug: {
                type: string;
                description: string;
            };
            location: {
                type: string;
                description: string;
                items?: undefined;
            };
            current_title?: undefined;
            current_past_title?: undefined;
            latitude?: undefined;
            longitude?: undefined;
            coordinates?: undefined;
            radius?: undefined;
            company_size?: undefined;
            spend_credits_confirmed?: undefined;
            current_company?: undefined;
            current_past_company?: undefined;
            full_name?: undefined;
            keywords?: undefined;
            industry?: undefined;
            industries?: undefined;
            department?: undefined;
            level?: undefined;
            exclude_title?: undefined;
            strict_current_level?: undefined;
            years_experience_from?: undefined;
            years_experience_to?: undefined;
            years_current_past_experience_from?: undefined;
            years_current_past_experience_to?: undefined;
            education?: undefined;
            open_to_work?: undefined;
            exclude_revealed?: undefined;
            exclude_watched?: undefined;
            exclude_in_lists?: undefined;
            exclude_in_progress?: undefined;
            exclude_emailed?: undefined;
            size?: undefined;
            auto_paginate?: undefined;
            max_results?: undefined;
            response_format?: undefined;
            companies?: undefined;
            request_id?: undefined;
            scroll_id?: undefined;
            items?: undefined;
            without_waterfall?: undefined;
            callback_url?: undefined;
            limit?: undefined;
            company_id?: undefined;
            status?: undefined;
            filter?: undefined;
            data_type?: undefined;
            format?: undefined;
            search_params?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            companies: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            location: {
                type: string;
                description: string;
                items?: undefined;
            };
            response_format: {
                type: string;
                enum: string[];
                description: string;
                default: string;
            };
            current_title?: undefined;
            current_past_title?: undefined;
            latitude?: undefined;
            longitude?: undefined;
            coordinates?: undefined;
            radius?: undefined;
            company_size?: undefined;
            spend_credits_confirmed?: undefined;
            current_company?: undefined;
            current_past_company?: undefined;
            full_name?: undefined;
            keywords?: undefined;
            industry?: undefined;
            industries?: undefined;
            department?: undefined;
            level?: undefined;
            exclude_title?: undefined;
            strict_current_level?: undefined;
            years_experience_from?: undefined;
            years_experience_to?: undefined;
            years_current_past_experience_from?: undefined;
            years_current_past_experience_to?: undefined;
            education?: undefined;
            open_to_work?: undefined;
            exclude_revealed?: undefined;
            exclude_watched?: undefined;
            exclude_in_lists?: undefined;
            exclude_in_progress?: undefined;
            exclude_emailed?: undefined;
            size?: undefined;
            auto_paginate?: undefined;
            max_results?: undefined;
            request_id?: undefined;
            scroll_id?: undefined;
            items?: undefined;
            without_waterfall?: undefined;
            callback_url?: undefined;
            company_id_or_slug?: undefined;
            limit?: undefined;
            company_id?: undefined;
            status?: undefined;
            filter?: undefined;
            data_type?: undefined;
            format?: undefined;
            search_params?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            industry: {
                type: string;
                description: string;
            };
            location: {
                type: string;
                description: string;
                items?: undefined;
            };
            keywords: {
                type: string;
                description: string;
            };
            company_size: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                description: string;
                default: number;
            };
            response_format: {
                type: string;
                enum: string[];
                description: string;
                default: string;
            };
            current_title?: undefined;
            current_past_title?: undefined;
            latitude?: undefined;
            longitude?: undefined;
            coordinates?: undefined;
            radius?: undefined;
            spend_credits_confirmed?: undefined;
            current_company?: undefined;
            current_past_company?: undefined;
            full_name?: undefined;
            industries?: undefined;
            department?: undefined;
            level?: undefined;
            exclude_title?: undefined;
            strict_current_level?: undefined;
            years_experience_from?: undefined;
            years_experience_to?: undefined;
            years_current_past_experience_from?: undefined;
            years_current_past_experience_to?: undefined;
            education?: undefined;
            open_to_work?: undefined;
            exclude_revealed?: undefined;
            exclude_watched?: undefined;
            exclude_in_lists?: undefined;
            exclude_in_progress?: undefined;
            exclude_emailed?: undefined;
            size?: undefined;
            auto_paginate?: undefined;
            max_results?: undefined;
            companies?: undefined;
            request_id?: undefined;
            scroll_id?: undefined;
            items?: undefined;
            without_waterfall?: undefined;
            callback_url?: undefined;
            company_id_or_slug?: undefined;
            company_id?: undefined;
            status?: undefined;
            filter?: undefined;
            data_type?: undefined;
            format?: undefined;
            search_params?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            company_id: {
                type: string;
                description: string;
            };
            spend_credits_confirmed: {
                type: string;
                description: string;
            };
            response_format: {
                type: string;
                enum: string[];
                description: string;
                default: string;
            };
            current_title?: undefined;
            current_past_title?: undefined;
            location?: undefined;
            latitude?: undefined;
            longitude?: undefined;
            coordinates?: undefined;
            radius?: undefined;
            company_size?: undefined;
            current_company?: undefined;
            current_past_company?: undefined;
            full_name?: undefined;
            keywords?: undefined;
            industry?: undefined;
            industries?: undefined;
            department?: undefined;
            level?: undefined;
            exclude_title?: undefined;
            strict_current_level?: undefined;
            years_experience_from?: undefined;
            years_experience_to?: undefined;
            years_current_past_experience_from?: undefined;
            years_current_past_experience_to?: undefined;
            education?: undefined;
            open_to_work?: undefined;
            exclude_revealed?: undefined;
            exclude_watched?: undefined;
            exclude_in_lists?: undefined;
            exclude_in_progress?: undefined;
            exclude_emailed?: undefined;
            size?: undefined;
            auto_paginate?: undefined;
            max_results?: undefined;
            companies?: undefined;
            request_id?: undefined;
            scroll_id?: undefined;
            items?: undefined;
            without_waterfall?: undefined;
            callback_url?: undefined;
            company_id_or_slug?: undefined;
            limit?: undefined;
            status?: undefined;
            filter?: undefined;
            data_type?: undefined;
            format?: undefined;
            search_params?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            company_id: {
                type: string;
                description: string;
            };
            status: {
                type: string;
                enum: string[];
                description: string;
                default: string;
            };
            current_title?: undefined;
            current_past_title?: undefined;
            location?: undefined;
            latitude?: undefined;
            longitude?: undefined;
            coordinates?: undefined;
            radius?: undefined;
            company_size?: undefined;
            spend_credits_confirmed?: undefined;
            current_company?: undefined;
            current_past_company?: undefined;
            full_name?: undefined;
            keywords?: undefined;
            industry?: undefined;
            industries?: undefined;
            department?: undefined;
            level?: undefined;
            exclude_title?: undefined;
            strict_current_level?: undefined;
            years_experience_from?: undefined;
            years_experience_to?: undefined;
            years_current_past_experience_from?: undefined;
            years_current_past_experience_to?: undefined;
            education?: undefined;
            open_to_work?: undefined;
            exclude_revealed?: undefined;
            exclude_watched?: undefined;
            exclude_in_lists?: undefined;
            exclude_in_progress?: undefined;
            exclude_emailed?: undefined;
            size?: undefined;
            auto_paginate?: undefined;
            max_results?: undefined;
            response_format?: undefined;
            companies?: undefined;
            request_id?: undefined;
            scroll_id?: undefined;
            items?: undefined;
            without_waterfall?: undefined;
            callback_url?: undefined;
            company_id_or_slug?: undefined;
            limit?: undefined;
            filter?: undefined;
            data_type?: undefined;
            format?: undefined;
            search_params?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            company_id: {
                type: string;
                description: string;
            };
            status: {
                type: string;
                enum: string[];
                description: string;
                default: string;
            };
            callback_url: {
                type: string;
                description: string;
            };
            current_title?: undefined;
            current_past_title?: undefined;
            location?: undefined;
            latitude?: undefined;
            longitude?: undefined;
            coordinates?: undefined;
            radius?: undefined;
            company_size?: undefined;
            spend_credits_confirmed?: undefined;
            current_company?: undefined;
            current_past_company?: undefined;
            full_name?: undefined;
            keywords?: undefined;
            industry?: undefined;
            industries?: undefined;
            department?: undefined;
            level?: undefined;
            exclude_title?: undefined;
            strict_current_level?: undefined;
            years_experience_from?: undefined;
            years_experience_to?: undefined;
            years_current_past_experience_from?: undefined;
            years_current_past_experience_to?: undefined;
            education?: undefined;
            open_to_work?: undefined;
            exclude_revealed?: undefined;
            exclude_watched?: undefined;
            exclude_in_lists?: undefined;
            exclude_in_progress?: undefined;
            exclude_emailed?: undefined;
            size?: undefined;
            auto_paginate?: undefined;
            max_results?: undefined;
            response_format?: undefined;
            companies?: undefined;
            request_id?: undefined;
            scroll_id?: undefined;
            items?: undefined;
            without_waterfall?: undefined;
            company_id_or_slug?: undefined;
            limit?: undefined;
            filter?: undefined;
            data_type?: undefined;
            format?: undefined;
            search_params?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            current_title?: undefined;
            current_past_title?: undefined;
            location?: undefined;
            latitude?: undefined;
            longitude?: undefined;
            coordinates?: undefined;
            radius?: undefined;
            company_size?: undefined;
            spend_credits_confirmed?: undefined;
            current_company?: undefined;
            current_past_company?: undefined;
            full_name?: undefined;
            keywords?: undefined;
            industry?: undefined;
            industries?: undefined;
            department?: undefined;
            level?: undefined;
            exclude_title?: undefined;
            strict_current_level?: undefined;
            years_experience_from?: undefined;
            years_experience_to?: undefined;
            years_current_past_experience_from?: undefined;
            years_current_past_experience_to?: undefined;
            education?: undefined;
            open_to_work?: undefined;
            exclude_revealed?: undefined;
            exclude_watched?: undefined;
            exclude_in_lists?: undefined;
            exclude_in_progress?: undefined;
            exclude_emailed?: undefined;
            size?: undefined;
            auto_paginate?: undefined;
            max_results?: undefined;
            response_format?: undefined;
            companies?: undefined;
            request_id?: undefined;
            scroll_id?: undefined;
            items?: undefined;
            without_waterfall?: undefined;
            callback_url?: undefined;
            company_id_or_slug?: undefined;
            limit?: undefined;
            company_id?: undefined;
            status?: undefined;
            filter?: undefined;
            data_type?: undefined;
            format?: undefined;
            search_params?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            filter: {
                type: string;
                description: string;
            };
            current_title?: undefined;
            current_past_title?: undefined;
            location?: undefined;
            latitude?: undefined;
            longitude?: undefined;
            coordinates?: undefined;
            radius?: undefined;
            company_size?: undefined;
            spend_credits_confirmed?: undefined;
            current_company?: undefined;
            current_past_company?: undefined;
            full_name?: undefined;
            keywords?: undefined;
            industry?: undefined;
            industries?: undefined;
            department?: undefined;
            level?: undefined;
            exclude_title?: undefined;
            strict_current_level?: undefined;
            years_experience_from?: undefined;
            years_experience_to?: undefined;
            years_current_past_experience_from?: undefined;
            years_current_past_experience_to?: undefined;
            education?: undefined;
            open_to_work?: undefined;
            exclude_revealed?: undefined;
            exclude_watched?: undefined;
            exclude_in_lists?: undefined;
            exclude_in_progress?: undefined;
            exclude_emailed?: undefined;
            size?: undefined;
            auto_paginate?: undefined;
            max_results?: undefined;
            response_format?: undefined;
            companies?: undefined;
            request_id?: undefined;
            scroll_id?: undefined;
            items?: undefined;
            without_waterfall?: undefined;
            callback_url?: undefined;
            company_id_or_slug?: undefined;
            limit?: undefined;
            company_id?: undefined;
            status?: undefined;
            data_type?: undefined;
            format?: undefined;
            search_params?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            data_type: {
                type: string;
                enum: string[];
                description: string;
                default: string;
            };
            format: {
                type: string;
                enum: string[];
                description: string;
                default: string;
            };
            search_params: {
                type: string;
                description: string;
            };
            items: {
                type: string;
                description: string;
                items?: undefined;
            };
            current_title?: undefined;
            current_past_title?: undefined;
            location?: undefined;
            latitude?: undefined;
            longitude?: undefined;
            coordinates?: undefined;
            radius?: undefined;
            company_size?: undefined;
            spend_credits_confirmed?: undefined;
            current_company?: undefined;
            current_past_company?: undefined;
            full_name?: undefined;
            keywords?: undefined;
            industry?: undefined;
            industries?: undefined;
            department?: undefined;
            level?: undefined;
            exclude_title?: undefined;
            strict_current_level?: undefined;
            years_experience_from?: undefined;
            years_experience_to?: undefined;
            years_current_past_experience_from?: undefined;
            years_current_past_experience_to?: undefined;
            education?: undefined;
            open_to_work?: undefined;
            exclude_revealed?: undefined;
            exclude_watched?: undefined;
            exclude_in_lists?: undefined;
            exclude_in_progress?: undefined;
            exclude_emailed?: undefined;
            size?: undefined;
            auto_paginate?: undefined;
            max_results?: undefined;
            response_format?: undefined;
            companies?: undefined;
            request_id?: undefined;
            scroll_id?: undefined;
            without_waterfall?: undefined;
            callback_url?: undefined;
            company_id_or_slug?: undefined;
            limit?: undefined;
            company_id?: undefined;
            status?: undefined;
            filter?: undefined;
        };
        required?: undefined;
    };
})[];
export declare function executeSignalHireTool(toolName: string, args: any | undefined, client: SignalHireApiClient): Promise<{
    content: Array<{
        type: "text";
        text: string;
    }>;
    isError?: boolean;
}>;
export interface CreateMcpServerOptions {
    client?: SignalHireApiClient;
    apiKey?: string;
    name?: string;
    version?: string;
}
export declare function createSignalHireMcpServer(options?: CreateMcpServerOptions): {
    server: McpServer;
    apiClient: SignalHireApiClient;
};
