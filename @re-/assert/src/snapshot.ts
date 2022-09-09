import { randomUUID } from "node:crypto"
import { existsSync, readdirSync } from "node:fs"
import { basename, dirname, isAbsolute, join } from "node:path"
import { fromCwd, readJson, requireResolve, shell, writeJson } from "@re-/node"
import { toString } from "@re-/tools"
import { CallExpression, Node, SourceFile, SyntaxKind, ts } from "ts-morph"
import { BenchFormat, getBenchFormat } from "./bench/benchFormat.js"
import {
    assertNoDuplicateBenchNames,
    BenchHistory,
    updateIsBench,
    upsertBenchResult
} from "./bench/benchHistory.js"
import {
    getFileKey,
    getReAssertConfig,
    positionToString,
    SourcePosition
} from "./common.js"
import { getDefaultTsMorphProject, getTsNodeAtPosition } from "./type/index.js"

export type BenchFormat = {
    noInline?: boolean
    noExternal?: boolean
}

export interface SnapshotArgs {
    position: SourcePosition
    serializedValue: unknown
    value: unknown
    snapFunctionName?: string
    baselineName?: string
    benchFormat?: BenchFormat
}
export interface ExternalSnapshotArgs extends SnapshotArgs {
    name: string
    customPath: string | undefined
}

/** Writes the update and position to cacheDir, which will eventually be read and copied to the source
 * file by a cleanup process after all tests have completed.
 */
export const writeInlineSnapshotUpdateToCacheDir = ({
    position,
    serializedValue
}: SnapshotArgs) => {
    writeJson(
        join(getReAssertConfig().snapCacheDir, `snap-${randomUUID()}.json`),
        {
            position,
            serializedValue
        }
    )
}

export const writeCachedInlineSnapshotUpdates = () => {
    const config = getReAssertConfig()
    if (!existsSync(config.snapCacheDir)) {
        throw new Error(
            `Unable to update snapshots as expected cache directory ${config.snapCacheDir} does not exist.`
        )
    }
    for (const updateFile of readdirSync(config.snapCacheDir)) {
        if (/snap.*\.json$/.test(updateFile)) {
            let snapshotData: SnapshotArgs | undefined
            try {
                snapshotData = readJson(join(config.snapCacheDir, updateFile))
            } catch {
                // If we can't read the snapshot, log an error and move onto the next update
                console.error(
                    `Unable to read snapshot data from expected location ${updateFile}.`
                )
            }
            if (snapshotData) {
                try {
                    queueInlineSnapshotWriteOnProcessExit(snapshotData)
                } catch (error) {
                    // If writeInlineSnapshotToFile throws an error, log it and move on to the next update
                    console.error(String(error))
                }
            }
        }
    }
}

export const findCallExpressionAncestor = (
    position: SourcePosition,
    functionName: string
): CallExpression<ts.CallExpression> => {
    const startNode = getTsNodeAtPosition(position)
    const matchingCall = startNode.getAncestors().find((ancestor) => {
        const expression = ancestor
            .asKind(SyntaxKind.CallExpression)
            ?.getExpression()
        if (expression) {
            const name =
                // If the call is made directly, e.g. snap(...), the expression will be an identifier, so can use its whole text
                expression.asKind(SyntaxKind.Identifier)?.getText() ??
                // If the call is made from a prop, e.g. snap in assert(...).snap(), check the name of the prop accessed
                expression
                    .asKind(SyntaxKind.PropertyAccessExpression)
                    ?.getName()
            return name === functionName
        }
    }) as CallExpression | undefined
    if (!matchingCall) {
        throw new Error(
            `Unable to locate expected inline ${functionName} call from assertion at ${positionToString(
                position
            )}.`
        )
    }
    return matchingCall
}

export const queueInlineSnapshotWriteOnProcessExit = ({
    position,
    serializedValue,
    value,
    snapFunctionName = "snap",
    baselineName
}: SnapshotArgs) => {
    const project = getDefaultTsMorphProject()
    const file = project.getSourceFileOrThrow(position.file)
    const snapCall = findCallExpressionAncestor(position, snapFunctionName)
    const newArgText = toString(serializedValue, {
        quote: "backtick",
        nonAlphaNumKeyQuote: "double"
    }).replace(`\\`, `\\\\`)
    queuedUpdates.push({
        file,
        position,
        snapCall,
        snapFunctionName,
        newArgText,
        value,
        baselineName
    })
}

export const resolveSnapshotPath = (
    testFile: string,
    customPath: string | undefined
) => {
    if (customPath && isAbsolute(customPath)) {
        return customPath
    }
    return join(dirname(testFile), customPath ?? "assert.snapshots.json")
}

export const updateExternalSnapshot = ({
    serializedValue: value,
    position,
    name,
    customPath
}: ExternalSnapshotArgs) => {
    const snapshotPath = resolveSnapshotPath(position.file, customPath)
    const snapshotData = readJson(snapshotPath) ?? {}
    const fileKey = basename(position.file)
    snapshotData[fileKey] = {
        ...snapshotData[fileKey],
        [name]: value
    }
    writeJson(snapshotPath, snapshotData)
}

export const getSnapshotByName = (
    file: string,
    name: string,
    customPath: string | undefined
) => {
    const snapshotPath = resolveSnapshotPath(file, customPath)
    return readJson(snapshotPath)?.[basename(file)]?.[name]
}

export type QueuedUpdate = {
    file: SourceFile
    position: SourcePosition
    snapCall: CallExpression
    snapFunctionName: string
    newArgText: string
    value: any
    baselineName: string | undefined
}
const queuedUpdates: QueuedUpdate[] = []
const path = join(fromCwd(), "benchHistory.json")

// Waiting until process exit to write snapshots avoids invalidating existing source positions
const writeUpdates = (benchFormat: BenchFormat) => {
    if (!queuedUpdates.length) {
        return
    }
    assertNoDuplicateBenchNames(queuedUpdates)
    const benchData: BenchHistory[] = existsSync(path) ? readJson(path) : []
    for (const update of queuedUpdates) {
        updateIsBench(update) && upsertBenchResult(update, benchData)
        const originalArgs = update.snapCall.getArguments()
        const previousValue = originalArgs.length
            ? originalArgs[0].getText()
            : undefined
        writeUpdateToFile(originalArgs, update)
        summarizeSnapUpdate(originalArgs, update, previousValue)
    }
    try {
        const prettierPath = requireResolve("prettier")
        const prettierBin = join(dirname(prettierPath), "bin-prettier.js")
        const updatedPaths = [
            ...new Set(queuedUpdates.map((update) => update.file.getFilePath()))
        ]
        shell(`node ${prettierBin} --write ${updatedPaths.join(" ")}`)
    } catch {
        // If prettier is unavailable, do nothing.
    }
    !benchFormat.noExternal && writeJson(path, benchData)
}
process.on("exit", () => {
    try {
        const format: BenchFormat = getBenchFormat()
        writeUpdates(format)
    } catch (e) {
        console.error(e)
        throw e
    }
})

const writeUpdateToFile = (
    originalArgs: Node<ts.Node>[],
    update: QueuedUpdate
) => {
    for (const originalArg of originalArgs) {
        update.snapCall.removeArgument(originalArg)
    }
    update.snapCall.addArgument(update.newArgText)
    update.file.saveSync()
}

const summarizeSnapUpdate = (
    originalArgs: Node<ts.Node>[],
    update: QueuedUpdate,
    previousValue: string | undefined
) => {
    let updateSummary = `${
        originalArgs.length ? "🆙  Updated" : "📸  Established"
    } `
    updateSummary += update.baselineName
        ? `baseline '${update.baselineName}' `
        : `snap on line ${update.position.line} of ${getFileKey(
              update.file.getFilePath()
          )} `
    updateSummary += previousValue
        ? `from ${previousValue} to `
        : `${update.baselineName ? "at" : "as"} `

    updateSummary += update.newArgText
    console.log(updateSummary)
}
