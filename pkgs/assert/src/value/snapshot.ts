import { readJson, writeJson } from "@re-/node"
import { join, isAbsolute, basename, dirname } from "node:path"
import { ts, SyntaxKind, CallExpression } from "ts-morph"
import { SourcePosition, rewriteJson } from "../common.js"
import { getTsProject } from "../type/analysis.js"

export interface BaseSnapshotArgs {
    position: SourcePosition
    value: string
}

export interface QueueInlineSnapshotArgs extends BaseSnapshotArgs {
    cachePath: string
}

export interface ExternalSnapshotArgs extends BaseSnapshotArgs {
    name: string
    customPath: string | undefined
}

const getQueuedSnapshotUpdates = (cachePath: string): BaseSnapshotArgs[] => {
    const cacheData = readJson(cachePath)
    return cacheData.queuedUpdates ?? []
}

export const queueInlineSnapshotUpdate = ({
    position,
    value,
    cachePath
}: QueueInlineSnapshotArgs) => {
    const queuedUpdates = getQueuedSnapshotUpdates(cachePath)
    queuedUpdates.push({ position, value })
    rewriteJson(cachePath, (data) => ({ ...data, queuedUpdates }))
}

export const writeQueuedSnapshotUpdates = (cachePath: string) => {
    const queuedUpdates = getQueuedSnapshotUpdates(cachePath)
    queuedUpdates.forEach((update) => writeInlineSnapshotToFile(update))
}

export const writeInlineSnapshotToFile = ({
    position,
    value
}: BaseSnapshotArgs) => {
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
                ancestor.getText().replace(" ", "").endsWith("snap()")
        ) as CallExpression | undefined
    if (!snapCall) {
        throw new Error(`Unable to update your snapshot.`)
    }
    snapCall.addArgument("`" + value + "`")
    file.saveSync()
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
    value,
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
