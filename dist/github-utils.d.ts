import type { Addition, Deletion } from "./github-types.js";
import type { DiffPlan, GithubCommitOptions } from "./types.js";
export type GitEnvironment = NodeJS.ProcessEnv & {
    readonly GIT_INDEX_FILE?: string;
};
export declare const summarizeFiles: (plan: DiffPlan, limit?: number) => string;
export declare const appendTrailers: (body: string | undefined, trailers: readonly string[]) => string;
export declare const runGit: (args: readonly string[], repoRoot: string, env: GitEnvironment) => string;
export declare const computeAdditions: (plan: DiffPlan, diff: string, repoRoot: string) => Addition[];
export declare const computeDeletions: (plan: DiffPlan) => readonly Deletion[];
export declare const ensureCheckSucceeds: (diff: string, repoRoot: string) => {
    readonly ok: true;
} | {
    readonly ok: false;
    readonly stdout: string;
    readonly stderr: string;
};
export declare const buildGraphqlPayload: (options: GithubCommitOptions, additions: readonly Addition[], deletions: readonly {
    readonly path: string;
}[], bodyWithTrailers: string) => {
    readonly query: string;
    readonly variables: Record<string, unknown>;
};
export declare const ensureDiffProvided: (options: GithubCommitOptions) => void;
//# sourceMappingURL=github-utils.d.ts.map