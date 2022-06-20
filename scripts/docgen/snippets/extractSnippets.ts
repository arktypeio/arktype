import { relative } from "node:path"
import { Node, Project, SourceFile, SyntaxKind, ts } from "ts-morph"

export type ExtractedSnippets = {
    files: Record<string, Snippet>
    blocks: Record<string, Snippet>
}

export type Snippet = {
    text: string
}

export type ExtractPackageSnippetsArgs = {
    project: Project
    sources: string[]
    rootDir: string
}

export const extractPackageSnippets = ({
    project,
    sources,
    rootDir
}: ExtractPackageSnippetsArgs): ExtractedSnippets => {
    const extractedSnippets: ExtractedSnippets = {
        files: {},
        blocks: {}
    }
    const snippetSourceFiles = project.addSourceFilesAtPaths(sources)
    for (const sourceFile of snippetSourceFiles) {
        const resolvedSnips = extractSnippetsFromFile(sourceFile)
        for (const resolvedSnip of resolvedSnips) {
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
            extractedSnippets.blocks[resolvedSnip.id] = {
                text
            }
        }
        extractedSnippets.files[relative(rootDir, sourceFile.getFilePath())] = {
            text: sourceFile.getFullText()
        }
    }
    return extractedSnippets
}

const extractSnippetsFromFile = (sourceFile: SourceFile): ResolvedSnip[] => {
    const resolvedSnips: ResolvedSnip[] = []
    const openBlocks: ParsedSnip[] = []
    const comments = sourceFile.getDescendantsOfKind(
        SyntaxKind.SingleLineCommentTrivia
    )
    for (const comment of comments) {
        if (comment.getText().includes("@snip")) {
            const parsedSnip = parseSnipComment(comment)
            if (parsedSnip.kind === "@snipStart") {
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
                resolvedSnips.push({
                    id: parsedSnip.id,
                    range: {
                        start: matchingSnipStart.node,
                        end: parsedSnip.node
                    }
                })
            } else {
                resolvedSnips.push({
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
    return resolvedSnips
}

type SnipKind = `@snip${"Statement" | "Start" | "End"}`

type ResolvedSnip = {
    id: string
    range:
        | { node: Node<ts.Node> }
        | { start: Node<ts.Node>; end: Node<ts.Node> }
}

type ParsedSnip = {
    id: string
    node: Node<ts.Node>
    kind: SnipKind
}

const parseSnipComment = (snipComment: Node<ts.Node>): ParsedSnip => {
    const commentText = snipComment.getText()
    const snipText = commentText.slice(commentText.indexOf("@snip"))
    const parts = snipText.split(" ")
    const kind = parts[0] as SnipKind
    const id = parts.find((part) => part.match(/id=.+/))?.slice(3)
    if (!id) {
        throw new Error(
            `Snip comment '${snipText}' requires an id like '@snipStatement id=example'.`
        )
    }
    let node
    if (kind === "@snipStatement" || kind === "@snipStart") {
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

const getFirstIncluded = (nodes: Node<ts.Node>[]) =>
    nodes.find(outputWillInclude)

/** Whether a node will be included in snip output */
const outputWillInclude = (node: Node<ts.Node>) => {
    return (
        !node.isKind(SyntaxKind.SingleLineCommentTrivia) ||
        !node.getText().includes("@snip")
    )
}
