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

const bracketMatcher = {
    "}": "{",
    "]": "[",
    ")": "("
}

let currentlyUnbalanced = false
const stack = []
const possibleOpenBrackets = Object.values(bracketMatcher)
const possibleCloseBrackets = Object.keys(bracketMatcher)
// Added ( for the script to skip over imports
const throwInternalRegex = /throwInternal.*\(/

CovSource.prototype._parseIgnore = (lineStr) => {
    if (throwInternalRegex.test(lineStr) || currentlyUnbalanced) {
        if (isBalanced(lineStr)) {
            currentlyUnbalanced = false
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
                possibleOpenBrackets.some((bracket) =>
                    section.includes(bracket)
                ) |
                possibleCloseBrackets.some((bracket) =>
                    section.includes(bracket)
                ) |
                false
        )

    for (let match of filteredMatchers) {
        if (throwInternalRegex.test(match)) {
            currentlyUnbalanced = true
        }
        for (let position = 0; position < match.length; position++) {
            const section = match[position]
            if (
                possibleOpenBrackets.some((bracket) =>
                    section.includes(bracket)
                ) ||
                possibleCloseBrackets.some((bracket) =>
                    section.includes(bracket)
                )
            ) {
                for (let char of section) {
                    if (possibleOpenBrackets.includes(char)) {
                        stack.push(char)
                    } else if (bracketMatcher[char]) {
                        stack.pop()
                    }
                }
            }
        }
    }
    return !stack.length
}
