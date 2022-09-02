import { fromPackageRoot, readFile, walkPaths } from "@re-/node"
import { readFileSync, statSync } from "node:fs"
import { relative } from "node:path"
import { Project } from "ts-morph"
import { DocGenSnippetExtractionConfig } from "../config.js"
import { PackageMetadata } from "../extract.js"
import { getTransformedText } from "./transformFileText.js"

/** Represents paths mapped to snippet data for a file */
export type PackageSnippets = Record<string, FileSnippets>

export type Snippet = {
    text: string
}

export type SnippetTransformToggleOptions = {
    imports?: boolean
}

export type SnippetTransformToggles = Required<SnippetTransformToggleOptions>

export type ExtractPackageSnippetsArgs = {
    project: Project
    sources: DocGenSnippetExtractionConfig[]
    packageMetadata: PackageMetadata
}

export const addDefaultsToTransformOptions = (
    options: SnippetTransformToggleOptions | undefined
): SnippetTransformToggles => ({
    imports: true,
    ...options
})

const TS_FILE_REGEX = /^.*\.(c|m)?tsx?$/

export const extractPackageSnippets = ({
    project,
    sources,
    packageMetadata
}: ExtractPackageSnippetsArgs): PackageSnippets => {
    const packageSnippets: PackageSnippets = {}
    for (const source of sources) {
        const paths = statSync(source.path).isDirectory()
            ? walkPaths(source.path, { excludeDirs: true })
            : [source.path]
        for (const path of paths) {
            const fileKey = relative(fromPackageRoot(), path)
            const ctx = {
                packageMetadata,
                transforms: addDefaultsToTransformOptions(source.transforms)
            }
            const fileText = TS_FILE_REGEX.test(path)
                ? getTransformedText(path, ctx, project)
                : readFile(path)
            packageSnippets[fileKey] = extractSnippetsFromFile(fileText)
        }
    }
    return packageSnippets
}

export type FileSnippets = LabeledSnippets

const extractSnippetsFromFile = (sourceFileText: string): FileSnippets => {
    const byLabel = extractLabeledSnippets(sourceFileText)
    const text = linesToOutput(sourceFileText.split("\n"))
    return {
        all: {
            text
        },
        ...byLabel
    }
}

export type LabeledSnippets = Record<string, Snippet>

const extractLabeledSnippets = (sourceFileText: string): LabeledSnippets => {
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
                const matchingSnipStartIndex = openBlocks.findIndex(
                    (block) => block.id === parsedSnip.id
                )
                if (matchingSnipStartIndex === -1) {
                    throw new Error(
                        `Found no matching @snipStart for @snipEnd with id ${parsedSnip.id}.`
                    )
                }
                const matchingSnipStart = openBlocks.splice(
                    matchingSnipStartIndex,
                    1
                )[0]
                text = linesToOutput(
                    lines.slice(matchingSnipStart.lineNumber, lineNumber)
                )
            } else if ((parsedSnip.kind = "@snipLine")) {
                text = linesToOutput(lines.slice(lineNumber, lineNumber + 1))
            } else {
                throw new Error(`Unrecognized snip '${parsedSnip.kind}'`)
            }
            labeledSnippets[parsedSnip.id] = { text: text }
        }
    }
    if (openBlocks.length) {
        throw new Error(
            `No @snipEnd comments were found corresponding to the following @snipStart ids: ${openBlocks
                .map((block) => block.id)
                .join(",")}.`
        )
    }
    return labeledSnippets
}

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
