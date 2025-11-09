const EMPTY_STATE = { files: [], current: null, lastHunk: null };
const stripPrefix = (path) => {
    if (!path) {
        return null;
    }
    if (path.startsWith("a/")) {
        return path.slice(2);
    }
    if (path.startsWith("b/")) {
        return path.slice(2);
    }
    return path;
};
const finalizeCurrent = (state) => state.current
    ? { files: [...state.files, state.current], current: null, lastHunk: null }
    : state;
const withCurrent = (state, updater, hunk) => state.current
    ? {
        files: state.files,
        current: updater(state.current),
        lastHunk: hunk === undefined ? state.lastHunk : hunk,
    }
    : state;
const startNewFile = (state, line) => {
    const [rawOld = "", rawNew = ""] = line
        .slice("diff --git ".length)
        .split(" ");
    const oldPath = stripPrefix(rawOld.trim());
    const newPath = stripPrefix(rawNew.trim());
    const nextFile = {
        oldPath: oldPath === "/dev/null" ? null : oldPath,
        newPath: newPath === "/dev/null" ? null : newPath,
        headers: [],
        hunks: [],
        status: "modified",
        binary: false,
    };
    const flushed = finalizeCurrent(state);
    return { files: flushed.files, current: nextFile, lastHunk: null };
};
const pushHeader = (state, line) => withCurrent(state, (file) => ({
    ...file,
    headers: [...file.headers, line],
}));
const updateStatus = (state, status) => withCurrent(state, (file) => ({
    ...file,
    status,
}));
const updateBinary = (state, binary) => withCurrent(state, (file) => ({
    ...file,
    binary,
}));
const updateOldPath = (state, raw) => {
    const normalized = stripPrefix(raw.trim());
    return withCurrent(state, (file) => ({
        ...file,
        oldPath: normalized === "/dev/null" ? null : normalized,
    }));
};
const updateNewPath = (state, raw) => {
    const normalized = stripPrefix(raw.trim());
    return withCurrent(state, (file) => ({
        ...file,
        newPath: normalized === "/dev/null" ? null : normalized,
    }));
};
const startHunk = (state, header) => {
    if (!state.current) {
        return state;
    }
    const hunk = { header, lines: [] };
    return {
        files: state.files,
        current: {
            ...state.current,
            hunks: [...state.current.hunks, hunk],
        },
        lastHunk: hunk,
    };
};
const appendHunkLine = (state, line) => {
    if (!state.current || !state.lastHunk) {
        return state;
    }
    const updatedHunk = {
        ...state.lastHunk,
        lines: [...state.lastHunk.lines, line],
    };
    const updatedHunks = state.current.hunks.map((hunk) => hunk === state.lastHunk ? updatedHunk : hunk);
    return {
        files: state.files,
        current: {
            ...state.current,
            hunks: updatedHunks,
        },
        lastHunk: updatedHunk,
    };
};
const handleDiffStart = (state, line) => line.startsWith("diff --git ") ? startNewFile(state, line) : null;
const handleStatusLine = (state, line) => {
    if (line.startsWith("new file mode")) {
        return pushHeader(updateStatus(state, "added"), line);
    }
    if (line.startsWith("deleted file mode")) {
        return pushHeader(updateStatus(state, "deleted"), line);
    }
    return null;
};
const handleRename = (state, line) => {
    if (line.startsWith("rename from ")) {
        return pushHeader(withCurrent(state, (file) => ({
            ...file,
            status: "renamed",
            oldPath: line.slice("rename from ".length).trim(),
        })), line);
    }
    if (line.startsWith("rename to ")) {
        return pushHeader(withCurrent(state, (file) => ({
            ...file,
            newPath: line.slice("rename to ".length).trim(),
        })), line);
    }
    return null;
};
const handleHeaderLine = (state, line) => {
    if (line.startsWith("similarity index")) {
        return pushHeader(state, line);
    }
    if (line.startsWith("index ")) {
        return pushHeader(state, line);
    }
    return null;
};
const handleBinaryLine = (state, line) => line.startsWith("Binary files ")
    ? pushHeader(updateBinary(state, true), line)
    : null;
const handlePathLine = (state, line) => {
    if (line.startsWith("--- ")) {
        return pushHeader(updateOldPath(state, line.slice(4)), line);
    }
    if (line.startsWith("+++ ")) {
        return pushHeader(updateNewPath(state, line.slice(4)), line);
    }
    return null;
};
const handleHunkStart = (state, line) => line.startsWith("@@") ? startHunk(state, line) : null;
const lineHandlers = [
    handleDiffStart,
    handleStatusLine,
    handleRename,
    handleHeaderLine,
    handleBinaryLine,
    handlePathLine,
    handleHunkStart,
];
const applyLine = (state, line) => {
    for (const handler of lineHandlers) {
        const nextState = handler(state, line);
        if (nextState) {
            return nextState;
        }
    }
    return state.lastHunk ? appendHunkLine(state, line) : state;
};
const resolveRenamePath = (headers, prefix) => headers
    .find((header) => header.startsWith(prefix))
    ?.slice(prefix.length)
    .trim() ?? null;
const normalizeFile = (file) => {
    if (file.binary) {
        return file;
    }
    const derivedStatus = file.newPath === null && file.oldPath !== null
        ? "deleted"
        : file.oldPath === null && file.newPath !== null
            ? "added"
            : file.status;
    if (derivedStatus === "renamed") {
        const resolvedOld = file.oldPath ?? resolveRenamePath(file.headers, "rename from ");
        const resolvedNew = file.newPath ?? resolveRenamePath(file.headers, "rename to ");
        return {
            ...file,
            status: derivedStatus,
            oldPath: resolvedOld,
            newPath: resolvedNew,
        };
    }
    return {
        ...file,
        status: derivedStatus,
    };
};
export function parseUnifiedDiff(diff) {
    if (!diff) {
        return { files: [] };
    }
    const lines = diff.split(/\r?\n/);
    const reduced = lines.reduce(applyLine, EMPTY_STATE);
    const completed = finalizeCurrent(reduced);
    return {
        files: completed.files.map(normalizeFile),
    };
}
//# sourceMappingURL=diff.js.map