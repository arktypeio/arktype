import { randomUUID } from "node:crypto"
import { basename, dirname, isAbsolute, join } from "node:path"
import type { CallExpression, Project, ts } from "ts-morph"
import { SyntaxKind } from "ts-morph"
import { getConfig } from "./config.js"
import { readJson, writeJson } from "./fs.js"
import { getTsNodeAtPosition } from "./type/getTsNodeAtPos.js"
import type { SourcePosition } from "./utils.js"
import { positionToString } from "./utils.js"
import { writeCachedInlineSnapshotUpdates } from "./writeSnapshot.js"

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
				// If the call is made from a prop, e.g. snap in attest(...).snap(), check the name of the prop accessed
				expression.asKind(SyntaxKind.PropertyAccessExpression)?.getName()
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

let writeCachedUpdatesOnExit = false
process.addListener("exit", () => {
	if (writeCachedUpdatesOnExit) {
		writeCachedInlineSnapshotUpdates()
	}
})

/**
 * Writes the update and position to cacheDir, which will eventually be read and copied to the source
 * file by a cleanup process after all tests have completed.
 */
export const queueSnapshotUpdate = (args: SnapshotArgs) => {
	const config = getConfig()
	writeJson(join(config.snapCacheDir, `snap-${randomUUID()}.json`), args)
	if (args.baselinePath || config.skipTypes) {
		writeCachedUpdatesOnExit = true
	}
}

export type QueuedUpdate = {
	position: SourcePosition
	snapCall: CallExpression
	snapFunctionName: string
	newArgText: string
	baselinePath: string[] | undefined
}
