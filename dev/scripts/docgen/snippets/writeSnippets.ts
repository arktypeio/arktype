import {
    fromPackageRoot,
    readFile,
    readJson,
    shell,
    writeFile
} from "../../../runtime/main.ts"
import type { SnippetsByPath } from "./extractSnippets.ts"
import { referenceTokens } from "./snipTokens.ts"

export const updateSnippetReferences = (snippetsByPath: SnippetsByPath) => {
    const updatedPaths = Object.keys(snippetsByPath).filter((path) =>
        updateSnippetReferencesIfNeeded(path, snippetsByPath)
    )
    if (updatedPaths.length) {
        shell(
            `pnpm exec prettier --write --ignore-unknown ${updatedPaths.join(
                " "
            )}`
        )
    }
}

const TEMPLATE_REPLACE_TOKEN = "{?}"

const updateSnippetReferencesIfNeeded = (
    path: string,
    snippetsByPath: SnippetsByPath
) => {
    let requiresUpdate = false
    const originalLines = readFile(path).split("\n")
    const transformedLines = []
    let waitingForBlockEnd = false
    let skipNextLine = false
    for (const originalLine of originalLines) {
        if (skipNextLine) {
            skipNextLine = false
        } else if (waitingForBlockEnd) {
            if (
                originalLine.includes(referenceTokens["@blockEnd"]) ||
                originalLine.trim() === "```"
            ) {
                transformedLines.push(originalLine)
                waitingForBlockEnd = false
            }
        } else if (originalLine.includes(referenceTokens["@blockFrom"])) {
            requiresUpdate = true
            const updatedBlock = getUpdatedLines(
                originalLine,
                referenceTokens["@blockFrom"],
                snippetsByPath
            )
            transformedLines.push(originalLine, ...updatedBlock)
            // Until we reach a block end token, skip pushing originalLines to transformedLines
            waitingForBlockEnd = true
        } else if (originalLine.includes(referenceTokens["@lineFrom"])) {
            requiresUpdate = true
            const updatedLines = getUpdatedLines(
                originalLine,
                referenceTokens["@lineFrom"],
                snippetsByPath
            )
            if (updatedLines.length !== 1) {
                throw new Error(
                    `Expected ${referenceTokens["@lineFrom"]} result to have exactly one line (got ${updatedLines.length}).`
                )
            }
            transformedLines.push(originalLine, updatedLines[0])
            skipNextLine = true
        } else {
            transformedLines.push(originalLine)
        }
    }
    if (requiresUpdate) {
        writeFile(path, transformedLines.join("\n"))
        return true
    }
    return false
}

const getUpdatedLines = (
    line: string,
    token: string,
    snippetsByPath: SnippetsByPath
) => {
    let lines: string[]
    const lineFromRefeferenceParts = line
        .slice(line.indexOf(token))
        .split(" ")[0]
        .split(":")
    const filePath = lineFromRefeferenceParts[1]
    if (!filePath) {
        throw new Error(
            `${token} expression '${line}' required a file path, e.g. '${token}:check/package.json:version'.`
        )
    }
    if (filePath.endsWith(".json")) {
        lines = getLinesFromJsonFile(
            filePath,
            lineFromRefeferenceParts[2],
            token
        )
    } else {
        lines = getSnippedBlockLines(
            filePath,
            lineFromRefeferenceParts[2],
            snippetsByPath
        )
    }
    const possibleTemplate = line.split("=>")[1]
    if (possibleTemplate) {
        lines = lines.map((line) =>
            possibleTemplate.replace(TEMPLATE_REPLACE_TOKEN, line)
        )
    }
    return lines
}

const getLinesFromJsonFile = (
    pathToFile: string,
    pathToData: string | undefined,
    token: string
) => {
    const dataSegments = pathToData?.split("/") ?? []
    let result = readJson(fromPackageRoot(pathToFile))
    for (const segment of dataSegments) {
        try {
            result = result[segment]
        } catch {
            throw new Error(
                `Path ${pathToData} does not exist in ${pathToFile}.`
            )
        }
    }
    switch (token) {
        case referenceTokens["@lineFrom"]:
            return [JSON.stringify(result)]
        case referenceTokens["@blockFrom"]:
            return JSON.stringify(result, null, 4).split("\n")
        default:
            throw new Error(`Unexpected token ${token}.`)
    }
}

const getSnippedBlockLines = (
    pathToFile: string,
    label: string,
    snippetsByPath: SnippetsByPath
) => {
    if (!(pathToFile in snippetsByPath)) {
        throw new Error(`No snippets were extracted from ${pathToFile}.`)
    }
    const fileSnippets = snippetsByPath[pathToFile]
    let snippetTextToCopy: string
    if (label) {
        if (!(label in fileSnippets)) {
            throw new Error(
                `No snippet with label ${label} exists in file at ${pathToFile}. ` +
                    `Available labels are ${Object.keys(fileSnippets).join(
                        ", "
                    )}.`
            )
        }
        snippetTextToCopy = fileSnippets[label].text
    } else {
        snippetTextToCopy = fileSnippets.all.text
    }
    return snippetTextToCopy.split("\n")
}
