import { relative } from "node:path"
import { Project } from "ts-morph"
import { DocGenSnippetExtractionConfig } from "../config.js"
import { PackageMetadata } from "../extract.js"
import { extractTransformText } from "./transformFileText.js"

const TS_FILE_REGEX = /^.*\.(c|m)?tsx?$/
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

export const extractPackageSnippets = ({
    project,
    sources,
    packageMetadata
}: ExtractPackageSnippetsArgs): PackageSnippets => {
    const packageSnippets: PackageSnippets = {}
    for (const source of sources) {
        const snippetSourceFiles = project.addSourceFilesAtPaths(
            source.fileGlob
        )
        for (const sourceFile of snippetSourceFiles) {
            const fileKey = relative(
                packageMetadata.rootDir,
                sourceFile.getFilePath()
            )
            const ctx = {
                packageMetadata,
                transforms: addDefaultsToTransformOptions(source.transforms)
            }
            const fileText = TS_FILE_REGEX.test(sourceFile.getExtension())
                ? extractTransformText(sourceFile, ctx)
                : sourceFile.getFullText()
            packageSnippets[fileKey] = extractSnippetsFromFile(fileText)
        }
    }
    return packageSnippets
}

export type FileSnippets = {
    all: Snippet
    byLabel: LabeledSnippets
}

const extractSnippetsFromFile = (sourceFileText: string): FileSnippets => {
    const byLabel = extractLabeledSnippets(sourceFileText)
    const text = filterSnipStatements(sourceFileText.split("\n"))
    return {
        all: {
            text
        },
        byLabel
    }
}

export type LabeledSnippets = Record<string, Snippet>

const extractLabeledSnippets = (sourceFileText: string): LabeledSnippets => {
    const labeledSnippets: Record<string, Snippet> = {}
    const openBlocks: SnipStart[] = []

    const textSplitByNewLine = sourceFileText.split("\n")
    let text
    for (const [i, lineText] of textSplitByNewLine.entries()) {
        if (lineText.includes("@snip")) {
            const parsedSnip = parseSnipComment(lineText)
            if (parsedSnip.kind === "@snipStart") {
                let startSnip = parsedSnip as SnipStart
                startSnip.lineNumber = i + 1
                openBlocks.push(startSnip)
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
                text = sourceFileText.slice(matchingSnipStart.lineNumber, i + 1)
                text = extractTextBetweenLines(
                    textSplitByNewLine,
                    matchingSnipStart.lineNumber,
                    i
                )
            } else if ((parsedSnip.kind = "@snipLine")) {
                text = extractTextBetweenLines(textSplitByNewLine, i, i + 1)
            }
            labeledSnippets[parsedSnip.id] = { text: text as string }
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

const extractTextBetweenLines = (
    lines: string[],
    firstLine: number,
    lastLine: number
) => {
    const filteredTextArray = []
    for (let i = firstLine; i <= lastLine; i++) {
        if (outputWillInclude(lines[i])) {
            filteredTextArray.push(lines[i])
        }
    }
    return filteredTextArray.join("\n")
}
const filterSnipStatements = (lines: string[]) =>
    lines.filter((line) => outputWillInclude(line)).join("\n")

type SnipKind = `@snip${"Statement" | "Start" | "End" | "Line"}`

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

/** Whether a node will be included in snip output */
const outputWillInclude = (line: string) => {
    return !line.includes("@snip")
}
