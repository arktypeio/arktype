import { basename, dirname, isAbsolute, join } from "node:path"
import { readJson } from "@re-/node"
import { toString } from "@re-/tools"
import { CallExpression, SourceFile, SyntaxKind, ts } from "ts-morph"

import { positionToString, SourcePosition } from "./common.js"
import { getDefaultTsMorphProject, getTsNodeAtPosition } from "./type/index.js"
import { BenchFormat, writeUpdates } from "./writeSnapshot.js"

export interface SnapshotArgs {
    position: SourcePosition
    serializedValue: unknown
    value: unknown
    benchFormat: BenchFormat
    snapFunctionName?: string
    baselineName?: string
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

export const resolveSnapshotPath = (
    testFile: string,
    customPath: string | undefined
) => {
    if (customPath && isAbsolute(customPath)) {
        return customPath
    }
    return join(dirname(testFile), customPath ?? "assert.snapshots.json")
}

export const getSnapshotByName = (
    file: string,
    name: string,
    customPath: string | undefined
) => {
    const snapshotPath = resolveSnapshotPath(file, customPath)
    return readJson(snapshotPath)?.[basename(file)]?.[name]
}

export const queueInlineSnapshotWriteOnProcessExit = ({
    position,
    serializedValue,
    value,
    snapFunctionName = "snap",
    baselineName,
    benchFormat
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
        baselineName,
        benchFormat
    })
}

export type QueuedUpdate = {
    file: SourceFile
    position: SourcePosition
    snapCall: CallExpression
    snapFunctionName: string
    newArgText: string
    value: any
    baselineName: string | undefined
    benchFormat: BenchFormat
}

/**
 * Each time we encounter a snapshot that needs to be initialized
 * or updated, we push its context to the global queuedUpdates variable.
 * Then, on process exit, we call writeUpdates which handles updating all
 * of the affected source (for inline snaps) or JSON (for external snaps or
 * bench history) files.
 **/
const queuedUpdates: QueuedUpdate[] = []

process.on("exit", () => {
    try {
        writeUpdates(queuedUpdates)
    } catch (e) {
        console.error(e)
        throw e
    }
})
