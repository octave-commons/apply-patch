import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
export const summarizeFiles = (plan, limit = 5) => {
    const names = plan.files
        .map((file) => file.newPath || file.oldPath)
        .filter((name) => Boolean(name));
    if (names.length === 0) {
        return "no files";
    }
    if (names.length <= limit) {
        return names.join(", ");
    }
    const shown = names.slice(0, limit).join(", ");
    return `${shown}, +${names.length - limit} more`;
};
export const appendTrailers = (body, trailers) => {
    const trimmed = body ? body.trimEnd() : "";
    const entries = trimmed ? [trimmed, ...trailers] : [...trailers];
    return entries.join("\n");
};
export const runGit = (args, repoRoot, env) => {
    const result = spawnSync("git", args, {
        cwd: repoRoot,
        encoding: "utf8",
        env,
    });
    if (result.status !== 0) {
        const message = result.stderr || result.stdout || `git ${args.join(" ")} failed`;
        throw new Error(message.trim());
    }
    return result.stdout;
};
const withTemporaryIndex = (diff, repoRoot, task) => {
    const tempDir = mkdtempSync(join(tmpdir(), "apply-patch-"));
    const indexPath = join(tempDir, "index");
    const patchPath = join(tempDir, "plan.patch");
    writeFileSync(patchPath, diff, "utf8");
    const env = { ...process.env, GIT_INDEX_FILE: indexPath };
    try {
        runGit(["read-tree", "HEAD"], repoRoot, env);
        runGit(["apply", "--cached", "--whitespace=nowarn", patchPath], repoRoot, env);
        return task(env);
    }
    finally {
        rmSync(tempDir, { recursive: true, force: true });
    }
};
const materializeFile = (file, repoRoot, env) => {
    if (file.binary) {
        throw new Error(`Binary patch not supported: ${file.newPath || file.oldPath || "unknown"}`);
    }
    if (file.status === "deleted") {
        return null;
    }
    const target = file.newPath || file.oldPath;
    if (!target) {
        return null;
    }
    const result = spawnSync("git", ["show", `:${target}`], {
        cwd: repoRoot,
        encoding: "utf8",
        env,
    });
    if (result.status !== 0) {
        const message = result.stderr || result.stdout || `Unable to materialize ${target}`;
        throw new Error(message.trim());
    }
    return {
        path: target,
        contents: Buffer.from(result.stdout, "utf8").toString("base64"),
    };
};
export const computeAdditions = (plan, diff, repoRoot) => withTemporaryIndex(diff, repoRoot, (env) => plan.files
    .map((file) => materializeFile(file, repoRoot, env))
    .filter((addition) => addition !== null));
export const computeDeletions = (plan) => plan.files
    .filter((file) => file.status === "deleted" ||
    (file.status === "renamed" && Boolean(file.oldPath)))
    .map((file) => file.oldPath)
    .filter((path) => Boolean(path))
    .map((path) => ({ path }));
export const ensureCheckSucceeds = (diff, repoRoot) => {
    const result = spawnSync("git", ["apply", "--check", "--whitespace=nowarn"], {
        cwd: repoRoot,
        encoding: "utf8",
        input: diff,
    });
    return result.status === 0
        ? { ok: true }
        : { ok: false, stdout: result.stdout, stderr: result.stderr };
};
export const buildGraphqlPayload = (options, additions, deletions, bodyWithTrailers) => ({
    query: `mutation ApplyPatch($input: CreateCommitOnBranchInput!) {
    createCommitOnBranch(input: $input) {
      commit {
        oid
        messageHeadline
      }
    }
  }`,
    variables: {
        input: {
            branch: {
                repositoryNameWithOwner: options.repositoryNameWithOwner,
                branchName: options.branchName,
            },
            expectedHeadOid: options.expectedHeadOid,
            message: {
                headline: options.message?.headline ?? "apply patch",
                body: bodyWithTrailers,
            },
            fileChanges: {
                additions,
                deletions,
            },
        },
    },
});
export const ensureDiffProvided = (options) => {
    if (!options.diff || !options.diff.trim()) {
        throw new Error('GitHub commit mode requires a unified diff in "patch" or "diff"');
    }
    if (!options.repositoryNameWithOwner || !options.branchName) {
        throw new Error("GitHub commit mode requires repositoryNameWithOwner and branchName");
    }
    if (!options.expectedHeadOid) {
        throw new Error("GitHub commit mode requires expectedHeadOid");
    }
    if (!options.repoRoot) {
        throw new Error("GitHub commit mode requires repoRoot");
    }
};
//# sourceMappingURL=github-utils.js.map