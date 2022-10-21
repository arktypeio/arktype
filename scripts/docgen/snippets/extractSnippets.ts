import { relative } from "node:path"
import type { Project } from "ts-morph"
import { transformTsFileContents } from "./transformFileText.js"
import { fromPackageRoot, readFile } from "@arktype/node"

/** Represents paths mapped to snippet data for a file */
export type SnippetsByPath = Record<string, SnippetsByLabel>

export type Snippet = {
    text: string
}

export type SnippetTransformToggles = {
    imports: boolean
}

export type ExtractSnippetsArgs = {
    project: Project
}

const TS_FILE_REGEX = /^.*\.(c|m)?tsx?$/
const REPO_ROOT = fromPackageRoot()

export const extractSnippets = (
    sourcePaths: string[],
    project: Project
): SnippetsByPath => {
    const snippetsByPath: SnippetsByPath = {}
    for (const path of sourcePaths) {
        const fileKey = relative(REPO_ROOT, path)
        const fileText = TS_FILE_REGEX.test(path)
            ? transformTsFileContents(path, project)
            : readFile(path)
        snippetsByPath[fileKey] = extractSnippetsFromFile(fileText)
    }
    return snippetsByPath
}

const extractSnippetsFromFile = (sourceFileText: string): SnippetsByLabel => {
    const byLabel = extractLabeledSnippets(sourceFileText)
    const text = linesToOutput(sourceFileText.split("\n"))
    return {
        all: {
            text
        },
        ...byLabel
    }
}

export type SnippetsByLabel = Record<string, Snippet>

// eslint-disable-next-line max-lines-per-function, max-statements
const extractLabeledSnippets = (sourceFileText: string): SnippetsByLabel => {
    const labeledSnippets: Record<string, Snippet> = {}
    const openBlocks: SnipStart[] = []

    const lines = sourceFileText.split("\n")
    for (const [i, lineText] of lines.entries()) {
        let text
        const lineNumber = i + 1
        if (lineText.includes("@snip")) {
            const parsedSnip = parseSnipComment(lineText)
            if (parsedSnip.kind === "@snipStart") {
                openBlocks.push({ ...parsedSnip, lineNumber })
                continue
            } else if (parsedSnip.kind === "@snipEnd") {
                const matchingSnipStart = spliceMatchingSnipStart(
                    openBlocks,
                    parsedSnip.id
                )
                text = linesToOutput(
                    lines.slice(matchingSnipStart.lineNumber, lineNumber)
                )
            } else if (parsedSnip.kind === "@snipLine") {
                text = linesToOutput(lines.slice(lineNumber, lineNumber + 1))
            } else {
                throw new Error(`Unrecognized snip '${parsedSnip.kind}'`)
            }
            labeledSnippets[parsedSnip.id] = { text }
        }
    }
    if (openBlocks.length) {
        throw new Error(buildOpenBlocksErrorMessage(openBlocks))
    }
    return labeledSnippets
}

const spliceMatchingSnipStart = (openBlocks: SnipStart[], id: string) => {
    const matchingSnipStartIndex = openBlocks.findIndex(
        (block) => block.id === id
    )
    if (matchingSnipStartIndex === -1) {
        throw new Error(
            `Found no matching @snipStart for @snipEnd with id ${id}.`
        )
    }
    return openBlocks.splice(matchingSnipStartIndex, 1)[0]
}

const buildOpenBlocksErrorMessage = (openBlocks: SnipStart[]) =>
    `No @snipEnd comments were found corresponding to the following @snipStart ids: ${openBlocks
        .map((block) => block.id)
        .join(",")}.`

const linesToOutput = (lines: string[]) =>
    lines.filter((line) => outputShouldInclude(line)).join("\n")

type SnipKind = `@snip${"Start" | "End" | "Line"}`

type SnipStart = ParsedSnip & {
    lineNumber: number
}

type ParsedSnip = {
    id: string
    kind: SnipKind
}

const parseSnipComment = (snipComment: string): ParsedSnip => {
    const snipText = snipComment.slice(snipComment.indexOf("@snip"))
    const parts = snipText.split(" ")
    const [kind, id] = parts[0].split(":") as [SnipKind, string | undefined]
    if (!id) {
        throw new Error(
            `Snip comment '${snipText}' requires a label like '@snipStatement:mySnipLabel'.`
        )
    }
    return {
        id,
        kind
    }
}

const outputShouldInclude = (line: string) => {
    return !line.includes("@snip")
}
