import { randomUUID } from "node:crypto"
import { existsSync, readdirSync } from "node:fs"
import { basename, join } from "node:path"
import type { Node, ts } from "ts-morph"
import type { BenchData } from "./bench/history.ts"
import { updateIsBench, upsertBenchResult } from "./bench/history.ts"
import { getAttestConfig } from "./config.ts"
import { readJson, shell, writeJson } from "./runtime/main.ts"
import type { QueuedUpdate, SnapshotArgs } from "./snapshot.ts"
import {
    queueInlineSnapshotWriteOnProcessExit,
    resolveSnapshotPath
} from "./snapshot.ts"
import { getFileKey } from "./utils.ts"

export type BenchFormat = {
    noInline?: boolean
    noExternal?: boolean
    path?: string
}

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
    const config = getAttestConfig()
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

/**
 * Writes the update and position to cacheDir, which will eventually be read and copied to the source
 * file by a cleanup process after all tests have completed.
 */
export const writeInlineSnapshotUpdateToCacheDir = (args: SnapshotArgs) => {
    writeJson(
        join(getAttestConfig().snapCacheDir, `snap-${randomUUID()}.json`),
        args
    )
}

// Waiting until process exit to write snapshots avoids invalidating existing source positions
export const writeUpdates = (queuedUpdates: QueuedUpdate[]) => {
    if (!queuedUpdates.length) {
        return
    }
    const benchmarksPath = queuedUpdates[0].benchFormat.path
    const benchData: BenchData = existsSync(benchmarksPath)
        ? readJson(benchmarksPath)
        : {}
    for (const update of queuedUpdates) {
        const originalArgs = update.snapCall.getArguments()
        const previousValue = originalArgs.length
            ? originalArgs[0].getText()
            : undefined
        if (updateIsBench(update)) {
            upsertBenchResult(update, benchData)
            if (!update.benchFormat.noInline) {
                writeUpdateToFile(originalArgs, update)
            }
            if (!update.benchFormat.noExternal) {
                writeJson(benchmarksPath, benchData)
            }
        } else {
            writeUpdateToFile(originalArgs, update)
        }
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
        shell(`pnpm prettier --write ${updatedPaths.join(" ")}`)
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
