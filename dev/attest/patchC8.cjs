/* eslint-disable @typescript-eslint/no-var-requires */
// Patch the c8 ignore comment parser to ignore internal errors
const c8Paths = require.resolve.paths("c8")
const covSourcePath = require.resolve("v8-to-istanbul/lib/source", {
    paths: c8Paths
})
const CovSource = require(covSourcePath)

// Wrap the function found here:
// https://github.com/istanbuljs/v8-to-istanbul/blob/fca5e6a9e6ef38a9cdc3a178d5a6cf9ef82e6cab/lib/source.js#L53
const original = CovSource.prototype._parseIgnore
if (!original) {
    throw new Error(
        `Failed to patch c8: unable to find the _parseIgnore function.`
    )
}

CovSource.prototype._parseIgnore = (lineStr) =>
    lineStr.match(/throwInternalError|throwPruneFailure/)
        ? { count: 1 }
        : original(lineStr)
