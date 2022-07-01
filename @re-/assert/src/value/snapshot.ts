import { randomUUID } from "node:crypto"
import { existsSync, readdirSync } from "node:fs"
import { basename, dirname, isAbsolute, join } from "node:path"
import { readJson, writeJson } from "@re-/node"
import { toString } from "@re-/tools"
import { CallExpression, SourceFile, SyntaxKind, ts } from "ts-morph"
import {
    getFileKey,
    getReAssertConfig,
    positionToString,
    SourcePosition
} from "../common.js"
import { getTsProject, tsNodeAtPosition } from "../type/analysis.js"

export interface SnapshotArgs {
    position: SourcePosition
    serializedValue: unknown
    snapFunctionName?: string
    baselineName?: string
}

export interface ExternalSnapshotArgs extends SnapshotArgs {
    name: string
    customPath: string | undefined
}

/** Writes the update and position to cacheDir, which will eventually be read and copied to the source
 * file by a cleanup process after all tests have completed.
 */
export const writeInlineSnapshotUpdateToCacheDir = ({
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

export const findCallExpressionAncestor = (
    position: SourcePosition,
    functionName: string
): CallExpression<ts.CallExpression> => {
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

type QueuedUpdate = {
    file: SourceFile
    snapCall: CallExpression
    serializedValue: unknown
    baselineName: string | undefined
}

const queuedUpdates: QueuedUpdate[] = []

// Waiting until process exit to write snapshots avoids invalidating existing source positions
process.on("exit", () => {
    for (const {
        file,
        snapCall,
        serializedValue,
        baselineName
    } of queuedUpdates) {
        const originalArgs = snapCall.getArguments()
        const previousValue = originalArgs.length
            ? originalArgs[0].getText()
            : undefined
        for (const originalArg of originalArgs) {
            snapCall.removeArgument(originalArg)
        }
        const updatedSnapArgText = toString(serializedValue, {
            quote: "backtick",
            nonAlphaNumKeyQuote: "double"
        }).replace(`\\`, `\\\\`)
        snapCall.addArgument(updatedSnapArgText)
        file.saveSync()
        let updateSummary = `${
            originalArgs.length ? "🆙  Updated" : "📸  Established"
        } `
        updateSummary += baselineName
            ? `baseline '${baselineName}' `
            : `snap on line ${snapCall.getStartLineNumber()} of ${getFileKey(
                  file.getFilePath()
              )} `
        updateSummary += previousValue
            ? `from ${previousValue} to `
            : `${baselineName ? "at" : "as"} `

        updateSummary += `${serializedValue}.`
        console.log(updateSummary)
    }
})

export const queueInlineSnapshotWriteOnProcessExit = ({
    position,
    serializedValue,
    snapFunctionName = "snap",
    baselineName
}: SnapshotArgs) => {
    const project = getTsProject()
    const file = project.getSourceFileOrThrow(position.file)
    const snapCall = findCallExpressionAncestor(position, snapFunctionName)
    queuedUpdates.push({
        file,
        snapCall,
        serializedValue,
        baselineName
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
