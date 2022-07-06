import { relative } from "node:path"
import { Node, Project, SourceFile, SyntaxKind, ts } from "ts-morph"
import { DocGenSnippetExtractionConfig } from "../config.js"
import { PackageMetadata } from "../extract.js"

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

// NOTE: There should be no references to ts-morph in this file other than passing it through functions so that
// when we get to parseSnipComment, we can pass it to the ts-specific functionality

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
            packageSnippets[fileKey] = extractSnippetsFromFile(sourceFile, {
                packageMetadata,
                transforms: addDefaultsToTransformOptions(source.transforms)
            })
        }
    }
    return packageSnippets
}

export type ExtractFileSnippetContext = {
    packageMetadata: PackageMetadata
    transforms: SnippetTransformToggles
}

export type FileSnippets = {
    all: Snippet
    byLabel: LabeledSnippets
}

export type LabeledSnippets = Record<string, Snippet>

// Update: Take text of sourceFile as first param instead of sourceFile node
const extractSnippetsFromFile = (
    sourceFile: SourceFile,
    ctx: ExtractFileSnippetContext
): FileSnippets => {
    applyTransforms(sourceFile, ctx)
    const snippetRanges = extractSnippetRangesFromFile(sourceFile)
    const byLabel = extractTextFromSnippetRanges(sourceFile, snippetRanges)
    return {
        all: {
            // It's important we get the file text after extracting snippets so snip comments are not included
            // Update: Call extractTextBetweenLines on the file starting with the first ending with the last to exclude snip comments
            text: sourceFile.getFullText().trim()
        },
        byLabel
    }
}

const applyTransforms = (
    sourceFile: SourceFile,
    ctx: ExtractFileSnippetContext
) => {
    if (ctx.transforms.imports) {
        // Replace relative internal imports with standard external imports
        const importDeclarations = sourceFile.getDescendantsOfKind(
            SyntaxKind.ImportDeclaration
        )
        for (const declaration of importDeclarations) {
            const specifier = declaration.getModuleSpecifier()
            if (specifier.getLiteralText().endsWith("src/index.js")) {
                specifier.replaceWithText(`"${ctx.packageMetadata.name}"`)
            }
        }
    }
}

// We probably don't need this anymore now that we're returning LabeledSnippets
// from extractSnippetRanges, although might be useful to reference in the meantime
const extractTextFromSnippetRanges = (
    sourceFile: SourceFile,
    snippetRanges: SnipRange[]
): LabeledSnippets => {
    const labeledSnippets: Record<string, Snippet> = {}
    for (const resolvedSnip of snippetRanges) {
        let text
        if ("node" in resolvedSnip.range) {
            text = resolvedSnip.range.node.getFullText()
        } else {
            text = sourceFile
                .getFullText()
                .slice(
                    resolvedSnip.range.start.getStart(),
                    resolvedSnip.range.end.getEnd()
                )
        }
        labeledSnippets[resolvedSnip.id] = {
            text
        }
    }
    return labeledSnippets
}

// Update: Should iterate over lines of the file contents instead of comments
// It is fine to assume that if a line contains @snip it is a snip comment, don't need to check for comment syntax
// Instead of returning SnipRange[], return LabeledSnippets, which maps snippet.id to the text contents
const extractSnippetRangesFromFile = (sourceFile: SourceFile): SnipRange[] => {
    const snipRanges: SnipRange[] = []
    const openBlocks: SnipStart[] = []
    const comments = sourceFile.getDescendantsOfKind(
        SyntaxKind.SingleLineCommentTrivia
    )
    // Iterate over each line of the file
    for (const comment of comments) {
        if (comment.getText().includes("@snip")) {
            const parsedSnip = parseSnipComment(comment)
            // Move the logic to determine text or position here
            if (parsedSnip.kind === "@snipStatement") {
                // Here, we check if we're in a ts file or not by whether it matches /^.*\.(c|m)?tsx?$/
                // If it is a TS file, call getNextTsStatement()
                // Otherwise, call getNextTextStatement()
            }
            // For @snipStart and @snipEnd, just use the positions (we don't need to do anything with ts-morph)
            if (parsedSnip.kind === "@snipStart") {
                // Add a position here to the parsedSnip
                // We still need a way to make sure that if we're parsing a TS file,
                // That the actual text we end up adding as a labeled snippet comes from ts-morph
                // So that it will reflect the transformations.
                openBlocks.push(parsedSnip)
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
                snipRanges.push({
                    id: parsedSnip.id,
                    range: {
                        start: matchingSnipStart.node,
                        end: parsedSnip.node
                    }
                })
            } else {
                snipRanges.push({
                    id: parsedSnip.id,
                    range: { node: parsedSnip.node }
                })
            }
        }
    }
    if (openBlocks.length) {
        throw new Error(
            `No @snipEnd comments were found corresponding to the following @snipStart ids: ${openBlocks
                .map((block) => block.id)
                .join(",")}.`
        )
    }
    return snipRanges
}

// This should be called when extracting text from the entire file as well
const extractTextBetweenLines = (
    lines: string[],
    firstLine: number,
    lastLine: number
) => {
    // For each line from first to last, check if the line text is included using the
    // "outputWillInclude" function  (or equivalent text-based version)
    // If it is, append it to the text, otherwise do nothing
}

// Note: For plain text provider, statement will refer to next line
type SnipKind = `@snip${"Statement" | "Start" | "End"}`

type SnipRange = {
    id: string
    range:
        | { node: Node<ts.Node> }
        | { start: Node<ts.Node>; end: Node<ts.Node> }
}

// parseSnip is now just responsible for extracting ID and kind, which  will be used to get text/position
type UpdatedParsedSnip = {
    id: string
    kind: SnipKind
}

type SnipStart = UpdatedParsedSnip & {
    lineNumber: number
}

type ParsedSnip = {
    id: string
    node: Node<ts.Node>
    kind: SnipKind
}

// Update: snipComment to be a text value
const parseSnipComment = (snipComment: Node<ts.Node>): ParsedSnip => {
    // This first block looks fine and can be reused
    const commentText = snipComment.getText()
    const snipText = commentText.slice(commentText.indexOf("@snip"))
    const parts = snipText.split(" ")
    const [kind, id] = parts[0].split(":") as [SnipKind, string | undefined]
    if (!id) {
        throw new Error(
            `Snip comment '${snipText}' requires a label like '@snipStatement:mySnipLabel'.`
        )
    }
    // Just return the kind and id here, the logic from this block will move to the extractFromFile function
    let node
    if (kind === "@snipStatement") {
        node = getNextIncludedSibling(snipComment)
    } else if (kind === "@snipStart") {
        node = getNextIncludedSibling(snipComment)
    } else if (kind === "@snipEnd") {
        node = getLastIncludedSibling(snipComment)
    } else {
        throw new Error(`Unable to parse snip type from '${commentText}'.`)
    }
    // Once we've parsed our snip comments, remove the nodes (only in memory) so they are not included in output
    snipComment.replaceWithText("")
    return {
        id,
        node,
        kind
    }
}

const getNextTsStatement = (
    project: Project,
    filePath: string,
    position: number
): string => {
    // Add filePath to project
    // get node at position
    // Then call getNextIncludedSibling on that node
    // Return text of that node
    return ""
}

const getNextIncludedTextStatement = (lines: string[]): string => {
    return ""
}

const getNextIncludedSibling = (snipComment: Node<ts.Node>) => {
    const nextIncluded = getFirstIncluded(snipComment.getNextSiblings())
    if (!nextIncluded) {
        throw new Error(
            `Snip comment '${snipComment.getText()}' requires at least one statement follows it.`
        )
    }
    return nextIncluded
}

const getLastIncludedSibling = (snipComment: Node<ts.Node>) => {
    const lastIncluded = getFirstIncluded(snipComment.getPreviousSiblings())
    if (!lastIncluded) {
        throw new Error(
            `Snip comment '${snipComment.getText()}' requires at least one statement precede it.`
        )
    }
    return lastIncluded
}

// This needs a text-based implementation alongside this TS based implementation
const getFirstIncluded = (nodes: Node<ts.Node>[]) =>
    nodes.find(outputWillInclude)

/** Whether a node will be included in snip output */
const outputWillInclude = (node: Node<ts.Node>) => {
    return (
        !node.isKind(SyntaxKind.SingleLineCommentTrivia) ||
        !node.getText().includes("@snip")
    )
}
