import { join, dirname, isAbsolute, basename } from "../deps.ts"
import { tsMorph } from "../deps.ts"
const { ts, SyntaxKind } = tsMorph
import {
    readJsonSync,
    setJsonKey,
    SourcePosition,
    writeJsonSync
} from "../common.ts"
import { getTsProject } from "../type/analysis.ts"

export interface BaseSnapshotArgs {
    position: SourcePosition
    value: string
}

export interface QueueInlineSnapshotArgs extends BaseSnapshotArgs {
    cachePath: string
}

export interface WriteInlineSnapshotArgs extends BaseSnapshotArgs {}

export interface ExternalSnapshotArgs extends BaseSnapshotArgs {
    name: string
    customPath: string | undefined
}

const getQueuedSnapshotUpdates = (
    cachePath: string
): WriteInlineSnapshotArgs[] => {
    const cacheData = readJsonSync(cachePath)
    return cacheData.queuedUpdates ?? []
}

export const queueInlineSnapshotUpdate = ({
    position,
    value,
    cachePath
}: QueueInlineSnapshotArgs) => {
    const queuedUpdates = getQueuedSnapshotUpdates(cachePath)
    queuedUpdates.push({ position, value })
    setJsonKey(cachePath, "queuedUpdates", queuedUpdates)
}

export const writeQueuedSnapshotUpdates = (cachePath: string) => {
    const queuedUpdates = getQueuedSnapshotUpdates(cachePath)
    queuedUpdates.forEach((update) => writeInlineSnapshotToFile(update))
}

export const writeInlineSnapshotToFile = ({
    position,
    value
}: WriteInlineSnapshotArgs) => {
    const project = getTsProject()
    const file = project.getSourceFile(position.file)
    if (!file) {
        throw new Error(`No type information available for '${position.file}'.`)
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
        ) as tsMorph.CallExpression
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
