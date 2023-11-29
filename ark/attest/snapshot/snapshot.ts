import type { SourcePosition } from "@arktype/fs"
import { positionToString, readJson, writeJson } from "@arktype/fs"
import { randomUUID } from "node:crypto"
import { basename, dirname, isAbsolute, join } from "node:path"
import type ts from "typescript"
import { getConfig } from "../config.js"
import { getExpressionsByName } from "../tsserver/getAssertionsInFile.js"
import {
	TsServer,
	getAbsolutePosition,
	nearestCallExpressionChild
} from "../tsserver/tsserver.js"
import { writeCachedInlineSnapshotUpdates } from "./writeSnapshot.js"

export type SnapshotArgs = {
	position: SourcePosition
	serializedValue: unknown
	snapFunctionName?: string
	baselinePath?: string[]
}

export const findCallExpressionAncestor = (
	position: SourcePosition,
	functionName: string
): ts.CallExpression => {
	const server = TsServer.instance
	const file = server.getSourceFileOrThrow(position.file)
	const absolutePosition = getAbsolutePosition(file, position)
	const startNode = nearestCallExpressionChild(file, absolutePosition)
	const calls = getExpressionsByName(startNode, [functionName], true)
	if (calls.length) {
		return startNode
	}
	throw new Error(
		`Unable to locate expected inline ${functionName} call from assertion at ${positionToString(
			position
		)}.`
	)
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

/**
 * Writes the update and position to cacheDir, which will eventually be read and copied to the source
 * file by a cleanup process after all tests have completed.
 */
export const queueSnapshotUpdate = (args: SnapshotArgs) => {
	const isBench = args.baselinePath
	const config = getConfig()
	writeJson(
		join(
			isBench ? config.benchSnapCacheDir : config.snapCacheDir,
			`snap-${randomUUID()}.json`
		),
		args
	)
}

export type QueuedUpdate = {
	position: SourcePosition
	snapCall: ts.CallExpression
	snapFunctionName: string
	newArgText: string
	baselinePath: string[] | undefined
}
