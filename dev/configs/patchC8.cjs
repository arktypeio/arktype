/* eslint-disable @typescript-eslint/no-var-requires */
// Patch the c8 ignore comment parser to ignore internal errors
const c8Paths = require.resolve("c8")
const covSourcePath = require.resolve("v8-to-istanbul/lib/source", {
    paths: [c8Paths]
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

let inThrowInternalCall = false
const stack = []
const throwInternalRegex = /throwInternal.*\(/

CovSource.prototype._parseIgnore = (lineStr) => {
    if (throwInternalRegex.test(lineStr)) {
        inThrowInternalCall = true
    }
    if (inThrowInternalCall) {
        if (isBalanced(lineStr)) {
            inThrowInternalCall = false
        }
        return { count: 1 }
    } else {
        return original(lineStr)
    }
}

const isBalanced = (lineStr) => {
    const filteredMatchers = lineStr
        .split(" ")
        .filter(
            (section) =>
                throwInternalRegex.test(section) |
                section.includes("(") |
                section.includes(")") |
                false
        )

    for (let match of filteredMatchers) {
        for (let position = 0; position < match.length; position++) {
            const section = match[position]
            for (let char of section) {
                if (char === "(") {
                    stack.push(char)
                } else if (char === ")") {
                    stack.pop()
                }
            }
        }
    }
    return !stack.length
}
