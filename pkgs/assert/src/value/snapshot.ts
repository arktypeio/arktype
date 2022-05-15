import { join, dirname, isAbsolute, basename } from "deno/std/path/mod.ts"
import { readJsonSync, SourcePosition, writeJsonSync } from "src/common.ts"
import { getAssertionDataForPosition } from "src/type/ts.ts"
import { Project, ts, SyntaxKind, CallExpression } from "ts-morph"

export interface BaseSnapshotArgs {
    position: SourcePosition
    value: string
}

export interface QueueInlineSnapshotArgs extends BaseSnapshotArgs {
    cachePath: string
}

export interface WriteInlineSnapshotArgs extends BaseSnapshotArgs {
    project: Project
}

export interface ExternalSnapshotArgs extends BaseSnapshotArgs {
    name: string
    customPath?: string
}

export const queueInlineSnapshotUpdate = ({
    position,
    value,
    cachePath
}: QueueInlineSnapshotArgs) => {
    const cacheData = readJsonSync(cachePath)
    const queuedUpdates = cacheData.queuedUpdates ?? []
    queuedUpdates.push({ position, value })
    writeJsonSync(cachePath, { ...cacheData, queuedUpdates })
}

export const writeInlineSnapshotToFile = ({
    position,
    value,
    project
}: WriteInlineSnapshotArgs) => {
    const file = project.getSourceFile(position.file)
    if (!file) {
        throw new Error(`Unknown file ${file}.`)
    }
    const assertIdentifier = file.getDescendantAtPos(
        ts.getPositionOfLineAndCharacter(
            file.compilerNode,
            // TS uses 0-based line and char #s
            position.line - 1,
            position.char - 1
        )
    )
    if (
        assertIdentifier?.getKind() !== SyntaxKind.Identifier ||
        assertIdentifier.getText() !== "assert"
    ) {
        throw new Error(`Unable to update your snapshot.`)
    }
    const snapCall = assertIdentifier
        .getAncestors()
        .find(
            (ancestor) =>
                ancestor.getKind() === SyntaxKind.CallExpression &&
                ancestor.getText().replace(" ", "").endsWith("snap()")
        ) as CallExpression
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
    customPath: path
}: ExternalSnapshotArgs) => {
    const snapshotPath = resolveSnapshotPath(position.file, path)
    const snapshotData = readJsonSync(snapshotPath) ?? {}
    const fileKey = basename(position.file)
    snapshotData[fileKey] = {
        ...snapshotData[fileKey],
        [name]: value
    }
    writeJsonSync(snapshotPath, snapshotData)
}

export const getSnapshotByName = (
    file: string,
    name: string,
    customPath: string | undefined
) => {
    const snapshotPath = resolveSnapshotPath(file, customPath)
    return readJsonSync(snapshotPath)?.[basename(file)]?.[name]
}
