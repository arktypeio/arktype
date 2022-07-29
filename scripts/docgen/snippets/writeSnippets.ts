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
        updateTextTarget(fullTargetPath, ctx)
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

const WRITE_FROM_TOKEN = "@writeFrom"

const updateTextTarget = (targetPath: string, ctx: WriteSnippetsContext) => {
    const originalLines = readFile(targetPath).split("\n")
    const transformedLines = []
    let waitingForBlockEnd = false
    for (const originalLine of originalLines) {
        if (waitingForBlockEnd) {
            if (originalLine.trim() === "```") {
                transformedLines.push(originalLine)
                waitingForBlockEnd = false
            }
        } else if (originalLine.includes("@writeFrom")) {
            const parsedLine = parseLineContainingWriteFrom(originalLine)
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
    { snippetFilePath, label }: ParsedWriteFromLine,
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

type ParsedWriteFromLine = {
    snippetFilePath: string
    label: string | undefined
}

// @writeFrom:@re-/tools/package.json:version
// @to:"@re-/tools": "#version"

const parseLineContainingWriteFrom = (line: string): ParsedWriteFromLine => {
    const generatedFromExpressionParts = line
        .slice(line.indexOf(WRITE_FROM_TOKEN))
        .split(" ")[0]
        .split(":")
    const filePath = generatedFromExpressionParts[1]
    if (!filePath) {
        throw new Error(
            `${WRITE_FROM_TOKEN} expression '${line}' required a file path, e.g. '${WRITE_FROM_TOKEN}:demo.ts'.`
        )
    }
    return {
        snippetFilePath: filePath,
        label: generatedFromExpressionParts[2]
    }
}
