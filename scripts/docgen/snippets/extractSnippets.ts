import { relative } from "node:path"
import { Node, Project, SourceFile, SyntaxKind, ts } from "ts-morph"

export type SnippetMap = Record<string, Snippet>

export type Snippet = {
    text: string
}

export type ExtractPackageSnippetsArgs = {
    project: Project
    sources: string[]
    rootDir: string
}

type ExtractPackageSnippetsContext = {
    rootDir: string
}

export const extractPackageSnippets = ({
    project,
    sources,
    rootDir
}: ExtractPackageSnippetsArgs): SnippetMap => {
    const snippetMap: SnippetMap = {}
    const snippetSourceFiles = project.addSourceFilesAtPaths(sources)
    const ctx = { rootDir }
    for (const sourceFile of snippetSourceFiles) {
        const fileSnippetRanges = extractSnippetsFromFile(sourceFile, ctx)
        for (const snippetRange of fileSnippetRanges) {
            snippetMap[snippetRange.id] = {
                text: sourceFile
                    .getFullText()
                    .slice(snippetRange.start, snippetRange.end)
            }
        }
    }
    return snippetMap
}

const extractSnippetsFromFile = (
    sourceFile: SourceFile,
    ctx: ExtractPackageSnippetsContext
): ResolvedSnip[] => {
    const resolvedSnips: ResolvedSnip[] = []
    const openBlocks: ParsedSnip[] = []
    const comments = sourceFile.getDescendantsOfKind(
        SyntaxKind.SingleLineCommentTrivia
    )
    for (const comment of comments) {
        if (comment.getText().includes("@snip")) {
            const parsedSnip = parseSnipComment(comment, ctx)
            if (!("end" in parsedSnip)) {
                openBlocks.push(parsedSnip)
            } else if (!("start" in parsedSnip)) {
                const matchingBlockIndex = openBlocks.findIndex(
                    (block) => block.id === parsedSnip.id
                )
                if (matchingBlockIndex === -1) {
                    throw new Error(
                        `Found no matching @snipStart for @snipEnd with id ${parsedSnip.id}.`
                    )
                }
                const matchingBlock = openBlocks.splice(
                    matchingBlockIndex,
                    1
                )[0]
                resolvedSnips.push({
                    ...matchingBlock,
                    ...parsedSnip
                } as ResolvedSnip)
            } else {
                resolvedSnips.push(parsedSnip as ResolvedSnip)
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
    return resolvedSnips
}

type ResolvedSnip = Required<ParsedSnip>

type ParsedSnip = {
    id: string
    start?: number
    end?: number
}

const parseSnipComment = (
    snipComment: Node<ts.Node>,
    ctx: ExtractPackageSnippetsContext
): ParsedSnip => {
    const commentText = snipComment.getText()
    const snipText = commentText.slice(commentText.indexOf("@snip"))
    if (snipText.startsWith("@snipFile")) {
        const sourceFile = snipComment.getSourceFile()
        return {
            id: relative(ctx.rootDir, sourceFile.getFilePath()),
            start: 0,
            end: sourceFile.getEnd()
        }
    }
    const parts = snipText.split(" ")
    const idPart = parts.find((part) => part.match(/id=.+/))
    if (!idPart) {
        throw new Error(
            `Snips other than @fileSnip require a key, e.g. '@snipStatement id=example'.`
        )
    }
    const id = idPart.slice(3)
    if (snipText.startsWith("@snipStatement")) {
        const statementToSnip = snipComment.getNextSiblingOrThrow()
        return {
            id,
            start: statementToSnip.getStart(),
            end: statementToSnip.getEnd()
        }
    } else if (snipText.startsWith("@snipStart")) {
        return {
            id,
            start: snipComment.getNextSiblingOrThrow().getStart()
        }
    } else if (snipText.startsWith("@snipEnd")) {
        return {
            id,
            end: snipComment.getPreviousSiblingOrThrow().getEnd()
        }
    } else {
        throw new Error(`Unable to parse snip type from '${commentText}'.`)
    }
}
