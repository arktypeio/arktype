import { basename, dirname, isAbsolute, join } from "node:path"
import type { CallExpression, Project, ts } from "ts-morph"
import { SyntaxKind } from "ts-morph"
import { readJson } from "./main.js"
import { getTsMorphProject } from "./type/cacheAssertions.js"
import { getTsNodeAtPosition } from "./type/getTsNodeAtPos.js"
import type { SourcePosition } from "./utils.js"
import { positionToString } from "./utils.js"

export type SnapshotArgs = {
    position: SourcePosition
    serializedValue: unknown
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

export const createQueuedSnapshotUpdate = ({
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
    const newArgText = JSON.stringify(serializedValue)
    return {
        position,
        snapCall,
        snapFunctionName,
        newArgText,
        baselinePath
    }
}

export type QueuedUpdate = {
    position: SourcePosition
    snapCall: CallExpression
    snapFunctionName: string
    newArgText: string
    baselinePath: string[] | undefined
}
