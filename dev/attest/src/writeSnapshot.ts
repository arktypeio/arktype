import { existsSync, readdirSync, rmSync } from "node:fs"
import { basename, join } from "node:path"
import type { Node, ts } from "ts-morph"
import { getConfig } from "./config.js"
import { readJson, writeJson } from "./fs.js"
import { shell } from "./shell.js"
import type { QueuedUpdate, SnapshotArgs } from "./snapshot.js"
import { findCallExpressionAncestor, resolveSnapshotPath } from "./snapshot.js"
import { getTsMorphProject } from "./type/cacheAssertions.js"
import { getFileKey } from "./utils.js"

export type ExternalSnapshotArgs = SnapshotArgs & {
    name: string
    customPath: string | undefined
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

export const writeCachedInlineSnapshotUpdates = () => {
    const config = getConfig()
    if (!existsSync(config.snapCacheDir)) {
        throw new Error(
            `Unable to update snapshots as expected cache directory ${config.snapCacheDir} does not exist.`
        )
    }
    const queuedUpdates: QueuedUpdate[] = []
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
                    queuedUpdates.push(snapshotArgsToQueuedUpdate(snapshotData))
                } catch (error) {
                    // If writeInlineSnapshotToFile throws an error, log it and move on to the next update
                    console.error(String(error))
                }
            }
        }
    }
    writeUpdates(queuedUpdates)
    rmSync(config.snapCacheDir, { recursive: true, force: true })
}

const snapshotArgsToQueuedUpdate = ({
    position,
    serializedValue,
    snapFunctionName = "snap",
    baselinePath
}: SnapshotArgs): QueuedUpdate => {
    const snapCall = findCallExpressionAncestor(
        getTsMorphProject(),
        position,
        snapFunctionName
    )
    const newArgText =
        typeof serializedValue === "string" && serializedValue.includes("\n")
            ? "`" + serializedValue.replaceAll("`", "\\`") + "`"
            : JSON.stringify(serializedValue)
    return {
        position,
        snapCall,
        snapFunctionName,
        newArgText,
        baselinePath
    }
}

// Waiting until process exit to write snapshots avoids invalidating existing source positions
export const writeUpdates = (queuedUpdates: QueuedUpdate[]) => {
    if (!queuedUpdates.length) {
        return
    }
    for (const update of queuedUpdates) {
        const originalArgs = update.snapCall.getArguments()
        const previousValue = originalArgs.length
            ? originalArgs[0].getText()
            : undefined
        writeUpdateToFile(originalArgs, update)
        summarizeSnapUpdate(originalArgs, update, previousValue)
    }
    runPrettierIfAvailable(queuedUpdates)
}

const runPrettierIfAvailable = (queuedUpdates: QueuedUpdate[]) => {
    try {
        const updatedPaths = [
            ...new Set(
                queuedUpdates.map((update) =>
                    update.snapCall.getSourceFile().getFilePath()
                )
            )
        ]
        shell(`npm exec --no -- prettier --write ${updatedPaths.join(" ")}`)
    } catch {
        // If prettier is unavailable, do nothing.
    }
}

const summarizeSnapUpdate = (
    originalArgs: Node<ts.Node>[],
    update: QueuedUpdate,
    previousValue: string | undefined
) => {
    let updateSummary = `${
        originalArgs.length ? "🆙  Updated" : "📸  Established"
    } `
    updateSummary += update.baselinePath
        ? `baseline '${update.baselinePath.join("/")}' `
        : `snap at ${getFileKey(
              update.snapCall.getSourceFile().getFilePath()
          )}:${update.position.line} `
    updateSummary += previousValue
        ? `from ${previousValue} to `
        : `${update.baselinePath ? "at" : "as"} `

    updateSummary += update.newArgText
    console.log(updateSummary)
}

const writeUpdateToFile = (
    originalArgs: Node<ts.Node>[],
    update: QueuedUpdate
) => {
    for (const originalArg of originalArgs) {
        update.snapCall.removeArgument(originalArg)
    }
    update.snapCall.addArgument(update.newArgText)
    update.snapCall.getSourceFile().saveSync()
}
