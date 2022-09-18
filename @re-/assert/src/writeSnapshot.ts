import { randomUUID } from "node:crypto"
import { existsSync, readdirSync } from "node:fs"
import { basename, dirname, join } from "node:path"
import { fromCwd, readJson, requireResolve, shell, writeJson } from "@re-/node"
import { Node, ts } from "ts-morph"
import {
    assertNoDuplicateBenchNames,
    BenchHistory,
    updateIsBench,
    upsertBenchResult
} from "./bench/benchHistory.js"
import { getFileKey, getReAssertConfig } from "./common.js"
import {
    QueuedUpdate,
    queueInlineSnapshotWriteOnProcessExit,
    resolveSnapshotPath,
    SnapshotArgs
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

const defaultFormat: BenchFormat = {
    noExternal: true,
    noInline: false
}

const benchHistoryPath = join(fromCwd(), "benchHistory.json")

// Waiting until process exit to write snapshots avoids invalidating existing source positions
export const writeUpdates = (queuedUpdates: QueuedUpdate[]) => {
    if (!queuedUpdates.length) {
        return
    }
    assertNoDuplicateBenchNames(queuedUpdates)
    const benchData: BenchHistory[] = existsSync(benchHistoryPath)
        ? readJson(benchHistoryPath)
        : []
    const benchFormat = queuedUpdates[0].benchFormat ?? defaultFormat
    for (const update of queuedUpdates) {
        updateIsBench(update) && upsertBenchResult(update, benchData)
        const originalArgs = update.snapCall.getArguments()
        const previousValue = originalArgs.length
            ? originalArgs[0].getText()
            : undefined
        !benchFormat.noInline && writeUpdateToFile(originalArgs, update)
        summarizeSnapUpdate(originalArgs, update, previousValue)
    }
    runPrettierIfAvailable(queuedUpdates)
    if (!benchFormat.noExternal) {
        writeJson(benchHistoryPath, benchData)
    }
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
