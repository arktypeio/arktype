import { existsSync } from "node:fs"
import {
    fromPackageRoot,
    readFile,
    readJson,
    shell,
    writeFile
} from "@re-/node"
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
    for (const path of targets) {
        if (!existsSync(path)) {
            throw new Error(`Target did not exist at path '${path}'.`)
        }
        updateTextTarget(path, ctx)
    }
    if (targets.length) {
        shell(`pnpm exec prettier --write ${targets.join(" ")}`)
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

const LINE_FROM_TOKEN = "@lineFrom"
const TEMPLATE_REPLACE_TOKEN = "{?}"
const BLOCK_FROM_TOKEN = "@blockFrom"

const updateTextTarget = (targetPath: string, ctx: WriteSnippetsContext) => {
    const originalLines = readFile(targetPath).split("\n")
    const transformedLines = []
    let waitingForBlockEnd = false
    let skipNextLine = false
    for (const originalLine of originalLines) {
        if (skipNextLine) {
            skipNextLine = false
        } else if (waitingForBlockEnd) {
            if (originalLine.trim() === "```") {
                transformedLines.push(originalLine)
                waitingForBlockEnd = false
            }
        } else if (originalLine.includes(BLOCK_FROM_TOKEN)) {
            const updatedBlock = getUpdatedLines(
                originalLine,
                BLOCK_FROM_TOKEN,
                ctx
            )
            transformedLines.push(originalLine, ...updatedBlock)
            // Until we reach a block end token, skip pushing originalLines to transformedLines
            waitingForBlockEnd = true
        } else if (originalLine.includes(LINE_FROM_TOKEN)) {
            const updatedLines = getUpdatedLines(
                originalLine,
                LINE_FROM_TOKEN,
                ctx
            )
            if (updatedLines.length !== 1) {
                throw new Error(
                    `Expected ${LINE_FROM_TOKEN} result to have exactly one line (got ${updatedLines.length}).`
                )
            }
            transformedLines.push(originalLine, updatedLines[0])
            skipNextLine = true
        } else {
            transformedLines.push(originalLine)
        }
    }
    writeFile(targetPath, transformedLines.join("\n"))
}

const getUpdatedLines = (
    line: string,
    token: string,
    ctx: WriteSnippetsContext
) => {
    let lines: string[]
    const lineFromRefeferenceParts = line
        .slice(line.indexOf(token))
        .split(" ")[0]
        .split(":")
    const filePath = lineFromRefeferenceParts[1]
    if (!filePath) {
        throw new Error(
            `${token} expression '${line}' required a file path, e.g. '${token}:@re-/type/package.json:version'.`
        )
    }
    if (filePath.endsWith(".json")) {
        lines = getLinesFromJsonFile(
            filePath,
            lineFromRefeferenceParts[2],
            token
        )
    } else {
        lines = getSnippedBlockLines(filePath, lineFromRefeferenceParts[2], ctx)
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
    const contents = readJson(fromPackageRoot(pathToFile))
    let result = contents
    for (const segment of dataSegments) {
        try {
            result = contents[segment]
        } catch {
            throw new Error(
                `Path ${pathToData} does not exist in ${pathToFile}.`
            )
        }
    }
    switch (token) {
        case LINE_FROM_TOKEN:
            return [JSON.stringify(result)]
        case BLOCK_FROM_TOKEN:
            return JSON.stringify(result, null, 4).split("\n")
        default:
            throw new Error(`Unexpected token ${token}.`)
    }
}

const getSnippedBlockLines = (
    pathToFile: string,
    label: string,
    ctx: WriteSnippetsContext
) => {
    if (!(pathToFile in ctx.extractedPackage.snippets)) {
        throw new Error(`No snippets were extracted from ${pathToFile}.`)
    }
    const fileSnippets = ctx.extractedPackage.snippets[pathToFile]
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
