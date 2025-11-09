import type { DiffPlan, GithubCommitResult, GithubCommitSuccess } from "./types.js";
type BuildSuccessOptions = {
    readonly kind: "Committed" | "CheckOnly";
    readonly summary: string;
    readonly plan?: DiffPlan;
    readonly oid?: string;
    readonly message?: GithubCommitSuccess["message"];
};
export declare const buildSuccess: ({ kind, summary, plan, oid, message, }: BuildSuccessOptions) => GithubCommitSuccess;
type HandleGraphqlResponseArgs = {
    readonly response: Response;
    readonly payload: unknown;
    readonly summary: string;
    readonly successMessage?: GithubCommitSuccess["message"];
    readonly context?: Record<string, unknown>;
};
export declare const handleGraphqlResponse: ({ response, payload, summary, successMessage, context, }: HandleGraphqlResponseArgs) => GithubCommitResult;
export {};
//# sourceMappingURL=github-response.d.ts.map