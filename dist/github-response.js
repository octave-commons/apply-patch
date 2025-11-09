import { sanitizeForLog } from "./sanitize.js";
export const buildSuccess = ({ kind, summary, plan, oid, message, }) => ({
    ok: true,
    kind,
    summary,
    ...(plan ? { plan } : {}),
    ...(oid ? { oid } : {}),
    ...(message ? { message } : {}),
});
const firstString = (values) => values.find((value) => typeof value === "string" && value.length > 0) ?? null;
const readConflictFromMessage = (message) => {
    if (typeof message !== "string") {
        return null;
    }
    const match = message.match(/expectedHeadOid[^A-Za-z0-9]*([0-9a-fA-F]{4,40}).*actual[^0-9a-fA-F]*([0-9a-fA-F]{4,40})/);
    if (!match) {
        return null;
    }
    const expected = match[1];
    const actual = match[2];
    if (!expected || !actual) {
        return null;
    }
    return { expectedHeadOid: expected, actualHeadOid: actual };
};
const readConflictFromExtensions = (extensions) => {
    if (!extensions) {
        return null;
    }
    const expected = firstString([
        extensions.expectedHeadOid,
        extensions.expectedOid,
        extensions.expected,
    ]);
    const actual = firstString([
        extensions.currentOid,
        extensions.actualHeadOid,
        extensions.actual,
    ]);
    if (!expected || !actual) {
        return null;
    }
    return { expectedHeadOid: expected, actualHeadOid: actual };
};
const extractConflict = (error) => {
    if (!error || typeof error !== "object") {
        return null;
    }
    const candidate = error;
    return (readConflictFromExtensions(candidate.extensions) ??
        readConflictFromMessage(candidate.message));
};
const buildConflictResult = (conflict, summary) => ({
    ok: false,
    kind: "Conflict",
    expectedHeadOid: conflict.expectedHeadOid,
    actualHeadOid: conflict.actualHeadOid,
    summary,
});
const logGraphqlFailure = (response, errors, context) => {
    const details = {
        status: response.status,
        errors,
        ...(context ? { context } : {}),
    };
    console.error("[apply_patch] GitHub commit failed", JSON.stringify(sanitizeForLog(details)));
};
const readCommitOid = (data) => {
    if (!data || typeof data !== "object") {
        return null;
    }
    const record = data;
    return record.createCommitOnBranch?.commit?.oid ?? null;
};
export const handleGraphqlResponse = ({ response, payload, summary, successMessage, context, }) => {
    const record = payload;
    const errors = Array.isArray(record.errors) ? record.errors : null;
    if (errors && errors.length > 0) {
        const conflict = extractConflict(errors[0]);
        if (conflict) {
            return buildConflictResult(conflict, summary);
        }
        logGraphqlFailure(response, errors, context);
        return { ok: false, kind: "GraphQLError", summary };
    }
    const commitOid = readCommitOid(record.data);
    if (!commitOid) {
        console.error("[apply_patch] Unexpected GitHub response", JSON.stringify(sanitizeForLog(record)));
        return { ok: false, kind: "UnexpectedResponse", summary };
    }
    return buildSuccess({
        kind: "Committed",
        summary,
        oid: commitOid,
        message: successMessage,
    });
};
//# sourceMappingURL=github-response.js.map