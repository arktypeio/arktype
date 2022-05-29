import { randomUUID } from "node:crypto"
import { existsSync, readdirSync } from "node:fs"
import { basename, dirname, isAbsolute, join } from "node:path"
import { readJson, writeJson } from "@re-/node"
import { CallExpression, Node, SyntaxKind, ts } from "ts-morph"
import {
    getReAssertConfig,
    positionToString,
    SourcePosition
} from "../common.js"
import { getTsProject, tsNodeAtPosition } from "../type/analysis.js"

export interface SnapshotArgs {
    position: SourcePosition
    serializedValue: string
    snapFunctionName?: string
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

export const findCallExpressionAncestor = (
    position: SourcePosition,
    functionName: string
) => {
    const startNode = tsNodeAtPosition(position)
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

export const writeInlineSnapshotToFile = ({
    position,
    serializedValue,
    snapFunctionName = "snap"
}: SnapshotArgs) => {
    const project = getTsProject()
    const file = project.getSourceFileOrThrow(position.file)
    const snapCall = findCallExpressionAncestor(position, snapFunctionName)
    process.on("exit", () => {
        for (const originalArg of snapCall.getArguments()) {
            snapCall.removeArgument(originalArg)
        }
        snapCall.addArgument(serializedValue.replace(`\\`, `\\\\`))
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
