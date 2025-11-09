export function sanitizeHeaderValue(value) {
    if (typeof value !== "string") {
        return value;
    }
    return value
        .replace(/(Authorization\s*:\s*Bearer\s+)[^,;\s]+/gi, "$1[redacted]")
        .replace(/(token\s*[=:]\s*)([A-Za-z0-9._-]+)/gi, "$1[redacted]")
        .replace(/\b(gh[oprsu]_[A-Za-z0-9]{10,})/gi, "[redacted]");
}
export function sanitizeHeaders(headers) {
    return Object.entries(headers ?? {}).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: /authorization/i.test(key) || /token/i.test(key)
            ? "[redacted]"
            : sanitizeHeaderValue(value),
    }), {});
}
export function sanitizeForLog(input) {
    if (input === null || input === undefined) {
        return input;
    }
    if (typeof input === "string") {
        return sanitizeHeaderValue(input);
    }
    if (Array.isArray(input)) {
        return input.map((item) => sanitizeForLog(item));
    }
    if (typeof input === "object") {
        const entries = Object.entries(input);
        return entries.reduce((acc, [key, value]) => {
            if (/authorization/i.test(key) || /token/i.test(key)) {
                return { ...acc, [key]: "[redacted]" };
            }
            if (key === "headers" && value && typeof value === "object") {
                return {
                    ...acc,
                    [key]: sanitizeHeaders(value),
                };
            }
            return { ...acc, [key]: sanitizeForLog(value) };
        }, {});
    }
    return input;
}
//# sourceMappingURL=sanitize.js.map