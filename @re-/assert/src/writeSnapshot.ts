import { randomUUID } from "node:crypto"
import { existsSync, readdirSync } from "node:fs"
import { basename, dirname, join } from "node:path"
import { fromCwd, readJson, requireResolve, shell, writeJson } from "@re-/node"
import type { Node, ts } from "ts-morph"
import type { BenchData } from "./bench/history.js"
import { updateIsBench, upsertBenchResult } from "./bench/history.js"
import { getFileKey, getReAssertConfig } from "./common.js"
import type { QueuedUpdate, SnapshotArgs } from "./snapshot.js"
import {
    queueInlineSnapshotWriteOnProcessExit,
    resolveSnapshotPath
} from "./snapshot.js"

export type BenchFormat = {
    noInline?: boolean
    noExternal?: boolean
}

export interface ExternalSnapshotArgs extends SnapshotArgs {
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

/**
 * Writes the update and position to cacheDir, which will eventually be read and copied to the source
 * file by a cleanup process after all tests have completed.
 */
export const writeInlineSnapshotUpdateToCacheDir = (args: SnapshotArgs) => {
    writeJson(
        join(getReAssertConfig().snapCacheDir, `snap-${randomUUID()}.json`),
        args
    )
}

const benchHistoryPath = join(fromCwd(), "benchmarks.json")

// Waiting until process exit to write snapshots avoids invalidating existing source positions
export const writeUpdates = (queuedUpdates: QueuedUpdate[]) => {
    if (!queuedUpdates.length) {
        return
    }
    const benchData: BenchData = existsSync(benchHistoryPath)
        ? readJson(benchHistoryPath)
        : {}
    for (const update of queuedUpdates) {
        updateIsBench(update) && upsertBenchResult(update, benchData)
        const originalArgs = update.snapCall.getArguments()
        const previousValue = originalArgs.length
            ? originalArgs[0].getText()
            : undefined
        if (!update.benchFormat.noInline) {
            writeUpdateToFile(originalArgs, update)
        }
        if (!update.benchFormat.noExternal) {
            writeJson(benchHistoryPath, benchData)
        }
        summarizeSnapUpdate(originalArgs, update, previousValue)
    }
    runPrettierIfAvailable(queuedUpdates)
}

const runPrettierIfAvailable = (queuedUpdates: QueuedUpdate[]) => {
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
        : `snap at ${getFileKey(update.file.getFilePath())}:${
              update.position.line
          } `
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
    update.file.saveSync()
}
