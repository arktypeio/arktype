import { existsSync } from "node:fs"
import { basename, join } from "node:path"
import { readFile, writeFile } from "@re-/node"
import { DocGenPackageConfig, DocGenSnippetConsumer } from "../config.js"
import { PackageExtractionData } from "../extract.js"

export type WriteSnippetsContext = {
    packageConfig: DocGenPackageConfig
    extractedPackage: PackageExtractionData
}

export const writePackageSnippets = (ctx: WriteSnippetsContext) => {
    if (!ctx.packageConfig.snippets) {
        return
    }
    if (ctx.packageConfig.snippets.targets) {
        updateTargets(ctx.packageConfig.snippets.targets, ctx)
    }
    if (ctx.packageConfig.snippets.consumers) {
        runConsumers(ctx.packageConfig.snippets.consumers, ctx)
    }
}

const updateTargets = (targets: string[], ctx: WriteSnippetsContext) => {
    for (const relativeTargetPath of targets) {
        const fullTargetPath = join(
            ctx.extractedPackage.metadata.rootDir,
            relativeTargetPath
        )
        if (!existsSync(fullTargetPath)) {
            throw new Error(`Target did not exist at path '${fullTargetPath}'.`)
        }
        if (fullTargetPath.toLowerCase().endsWith(".md")) {
            updateMarkdownTarget(fullTargetPath, ctx)
        } else {
            throw new Error(
                `Unable to update target of unknown type at '${basename(
                    relativeTargetPath
                )}'.`
            )
        }
    }
}

const runConsumers = (
    consumers: DocGenSnippetConsumer[],
    ctx: WriteSnippetsContext
) => {
    for (const consumer of consumers) {
        consumer(ctx.extractedPackage.snippets ?? {})
    }
}

const SNIP_FROM_TOKEN = "@snipFrom"

const updateMarkdownTarget = (
    targetPath: string,
    ctx: WriteSnippetsContext
) => {
    const originalLines = readFile(targetPath).split("\n")
    const transformedLines = []
    let waitingForBlockEnd = false
    for (const originalLine of originalLines) {
        if (waitingForBlockEnd) {
            if (originalLine.trim() === "```") {
                transformedLines.push(originalLine)
                waitingForBlockEnd = false
            }
        } else if (originalLine.includes(SNIP_FROM_TOKEN)) {
            const parsedLine = parseLineContainingGeneratedToken(originalLine)
            transformedLines.push(
                originalLine,
                ...getReplacementLines(parsedLine, targetPath, ctx)
            )
            // Until we reach a block end token, skip pushing originalLines to transformedLines
            waitingForBlockEnd = true
        } else {
            transformedLines.push(originalLine)
        }
    }
    writeFile(targetPath, transformedLines.join("\n"))
}

const getReplacementLines = (
    { snippetFilePath, label }: ParsedGeneratedLine,
    targetPath: string,
    ctx: WriteSnippetsContext
) => {
    if (!(snippetFilePath in ctx.extractedPackage.snippets)) {
        throw new Error(
            `No snippets were extracted from ${snippetFilePath} referenced in update target ${targetPath}.`
        )
    }
    const fileSnippets = ctx.extractedPackage.snippets[snippetFilePath]
    let snippetTextToCopy: string
    if (label) {
        if (!(label in fileSnippets.byLabel)) {
            throw new Error(
                `No snippet with label ${label} exists in file at ${snippetFilePath} referenced by ${targetPath}. ` +
                    `Available labels are ${Object.keys(
                        fileSnippets.byLabel
                    ).join(", ")}.`
            )
        }
        snippetTextToCopy = fileSnippets.byLabel[label].text
    } else {
        snippetTextToCopy = fileSnippets.all.text
    }
    return snippetTextToCopy.split("\n")
}

type ParsedGeneratedLine = {
    snippetFilePath: string
    label: string | undefined
}

const parseLineContainingGeneratedToken = (
    line: string
): ParsedGeneratedLine => {
    const generatedFromExpressionParts = line
        .slice(line.indexOf(SNIP_FROM_TOKEN))
        .split(" ")[0]
        .split(":")
    const snippetFilePath = generatedFromExpressionParts[1]
    if (!snippetFilePath) {
        throw new Error(
            `${SNIP_FROM_TOKEN} expression '${line}' required a file path, e.g. '${SNIP_FROM_TOKEN}:demo.ts'.`
        )
    }
    return {
        snippetFilePath,
        label: generatedFromExpressionParts[2]
    }
}
