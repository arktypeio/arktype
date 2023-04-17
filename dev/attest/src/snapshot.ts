import { basename, dirname, isAbsolute, join } from "node:path"
import type { CallExpression, Project, ts } from "ts-morph"
import { SyntaxKind } from "ts-morph"
import { readJson } from "./runtime/main.js"
import { addListener } from "./runtime/shell.js"
import { getTsMorphProject } from "./type/getTsMorphProject.js"
import { getTsNodeAtPosition } from "./type/getTsNodeAtPos.js"
import type { SourcePosition } from "./utils.js"
import { positionToString } from "./utils.js"
import type { BenchFormat } from "./writeSnapshot.js"
import { writeUpdates } from "./writeSnapshot.js"

export type SnapshotArgs = {
    position: SourcePosition
    serializedValue: unknown
    benchFormat: Required<BenchFormat>
    snapFunctionName?: string
    baselinePath?: string[]
}

export const findCallExpressionAncestor = (
    project: Project,
    position: SourcePosition,
    functionName: string
): CallExpression<ts.CallExpression> => {
    const startNode = getTsNodeAtPosition(project, position)
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
    snapFunctionName = "snap",
    baselinePath,
    benchFormat
}: SnapshotArgs) => {
    const snapCall = findCallExpressionAncestor(
        getTsMorphProject(),
        position,
        snapFunctionName
    )
    const newArgText = JSON.stringify(serializedValue)
    queuedUpdates.push({
        position,
        snapCall,
        snapFunctionName,
        newArgText,
        baselinePath,
        benchFormat
    })
}

export type QueuedUpdate = {
    position: SourcePosition
    snapCall: CallExpression
    snapFunctionName: string
    newArgText: string
    baselinePath: string[] | undefined
    benchFormat: Required<BenchFormat>
}

/**
 * Each time we encounter a snapshot that needs to be initialized
 * or updated, we push its context to the global queuedUpdates variable.
 * Then, on process exit, we call writeUpdates which handles updating all
 * of the affected source (for inline snaps) or JSON (for external snaps or
 * bench history) files.
 *
 * NOTE: In precache mode, instead of pushing updates here directly, we
 * serialize the queued updates to snap files. Then, after all tests have
 * completed, all updates are written as part of cleanup.
 **/
const queuedUpdates: QueuedUpdate[] = []

addListener("exit", () => {
    try {
        writeUpdates(queuedUpdates)
    } catch (e) {
        console.error(e)
        throw e
    }
})
