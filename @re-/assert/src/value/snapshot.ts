import { randomUUID } from "node:crypto"
import { existsSync, readdirSync } from "node:fs"
import { basename, dirname, isAbsolute, join } from "node:path"
import { readJson, writeJson } from "@re-/node"
import { CallExpression, SyntaxKind, ts } from "ts-morph"
import { getReAssertConfig, SourcePosition } from "../common.js"
import { getTsProject } from "../type/analysis.js"

export interface SnapshotArgs {
    position: SourcePosition
    serializedValue: string
}

export interface ExternalSnapshotArgs extends SnapshotArgs {
    name: string
    customPath: string | undefined
}

export const queueInlineSnapshotUpdate = ({
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

export const writeQueuedSnapshotUpdates = () => {
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
                    writeInlineSnapshotToFile(snapshotData)
                } catch (error) {
                    // If writeInlineSnapshotToFile throws an error, log it and move on to the next update
                    console.error(String(error))
                }
            }
        }
    }
}

export const writeInlineSnapshotToFile = ({
    position,
    serializedValue
}: SnapshotArgs) => {
    const project = getTsProject()
    const file = project.getSourceFile(position.file)
    if (!file) {
        throw new Error(`No type information available for '${position.file}'.`)
    }
    const assertNode = file.getDescendantAtPos(
        ts.getPositionOfLineAndCharacter(
            file.compilerNode,
            // TS uses 0-based line and char #s
            position.line - 1,
            position.char - 1
        )
    )
    const snapCall = assertNode
        ?.getAncestors()
        .find(
            (ancestor) =>
                ancestor.getKind() === SyntaxKind.CallExpression &&
                ancestor
                    .asKind(SyntaxKind.CallExpression)
                    ?.getExpressionIfKind(SyntaxKind.PropertyAccessExpression)
                    ?.getName() === "snap"
        ) as CallExpression | undefined
    if (!snapCall) {
        throw new Error(
            `Unable to locate expected inline snap associated with assertion from ${position.file} ` +
                `on line ${position.line}, char ${position.char}.`
        )
    }
    process.on("exit", () => {
        for (const originalArg of snapCall.getArguments()) {
            snapCall.removeArgument(originalArg)
        }
        snapCall.addArgument(serializedValue)
        file.saveSync()
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
