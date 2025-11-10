import {
	filePath,
	positionToString,
	readFile,
	readJson,
	shell,
	writeFile,
	writeJson,
	type SourcePosition
} from "@ark/fs"
import { throwInternalError } from "@ark/util"
import { existsSync } from "node:fs"
import { basename, dirname, isAbsolute, join } from "node:path"
import type ts from "typescript"
import { getConfig } from "../config.ts"
import { getFileKey } from "../utils.ts"
import {
	TsServer,
	getAbsolutePosition,
	nearestCallExpressionChild
} from "./ts.ts"
import { getCallExpressionsByName } from "./utils.ts"

export type SnapshotArgs = {
	position: SourcePosition
	serializedValue: unknown
	snapFunctionName?: string
	baselinePath?: string[]
}

export const resolveSnapshotPath = (
	testFile: string,
	customPath: string | undefined
): string => {
	if (customPath && isAbsolute(customPath)) return customPath

	return join(dirname(testFile), customPath ?? "assert.snapshots.json")
}

export const getSnapshotByName = (
	file: string,
	name: string,
	customPath: string | undefined
): object => {
	const snapshotPath = resolveSnapshotPath(file, customPath)
	return (readJson(snapshotPath)?.[basename(file)] as any)?.[name]
}

/**
 * Writes the update and position to cacheDir, which will eventually be read and copied to the source
 * file by a cleanup process after all tests have completed.
 */
export const queueSnapshotUpdate = (args: SnapshotArgs): void => {
	const config = getConfig()
	const path = config.defaultAssertionCachePath
	if (existsSync(path)) {
		const existing = readJson(path)
		writeJson(path, {
			...existing,
			updates:
				Array.isArray(existing.updates) ? [...existing.updates, args] : [args]
		})
	} else writeJson(path, { updates: [args] })
}

export type QueuedUpdate = {
	position: SourcePosition
	snapCall: ts.CallExpression
	snapFunctionName: string
	newArgText: string
	baselinePath: string[] | undefined
}

export type ExternalSnapshotArgs = SnapshotArgs & {
	name: string
	customPath: string | undefined
}

const findCallExpressionAncestor = (
	position: SourcePosition,
	functionName: string
): ts.CallExpression => {
	const server = TsServer.instance
	const file = server.getSourceFileOrThrow(position.file)
	const absolutePosition = getAbsolutePosition(file, position)
	const startNode = nearestCallExpressionChild(file, absolutePosition)
	const calls = getCallExpressionsByName(startNode, [functionName], true)
	if (calls.length) return startNode

	throwInternalError(
		`Unable to locate expected inline ${functionName} call from assertion at ${positionToString(
			position
		)}.`
	)
}

export const updateExternalSnapshot = ({
	serializedValue: value,
	position,
	name,
	customPath
}: ExternalSnapshotArgs): void => {
	const snapshotPath = resolveSnapshotPath(position.file, customPath)
	const snapshotData = readJson(snapshotPath) ?? {}
	const fileKey = basename(position.file)
	snapshotData[fileKey] = {
		...(snapshotData[fileKey] as object),
		[name]: value
	}
	writeJson(snapshotPath, snapshotData)
}

let snapshotsWillBeWritten = false
export const writeSnapshotUpdatesOnExit = (): void => {
	if (snapshotsWillBeWritten) return

	process.on("exit", writeCachedInlineSnapshotUpdates)
	snapshotsWillBeWritten = true
}

const writeCachedInlineSnapshotUpdates = () => {
	const config = getConfig()

	let snapshotData: SnapshotArgs[] | undefined

	if (!existsSync(config.defaultAssertionCachePath)) return

	try {
		snapshotData = readJson(config.defaultAssertionCachePath).updates as never
	} catch {
		// If we can't read the snapshot, log an error and move onto the next update
		console.error(
			`Unable to read snapshot data from expected location ${config.defaultAssertionCachePath}.`
		)
	}
	if (snapshotData) {
		try {
			writeUpdates(
				snapshotData.map(snapshot => snapshotArgsToQueuedUpdate(snapshot))
			)
		} catch (error) {
			// If writeInlineSnapshotToFile throws an error, log it and move on to the next update
			console.error(String(error))
		}
	}
}

const snapshotArgsToQueuedUpdate = ({
	position,
	serializedValue,
	snapFunctionName = "snap",
	baselinePath
}: SnapshotArgs): QueuedUpdate => {
	const snapCall = findCallExpressionAncestor(position, snapFunctionName)
	let newArgText =
		typeof serializedValue === "string" && serializedValue.includes("\n") ?
			"`" + serializedValue.replace(/`/g, "\\`").replace(/\$\{/g, "\\${") + "`"
		:	JSON.stringify(serializedValue)

	newArgText = newArgText
		.replace(/"\$ark.bigint-(-?\d+)"/g, "$1n")
		.replace(/"\$ark.undefined"/g, "undefined")

	return {
		position,
		snapCall,
		snapFunctionName,
		newArgText,
		baselinePath
	}
}

// Waiting until process exit to write snapshots avoids invalidating existing source positions
export const writeUpdates = (queuedUpdates: QueuedUpdate[]): void => {
	if (!queuedUpdates.length) return

	const updatesByFile: Record<string, QueuedUpdate[]> = {}
	for (const update of queuedUpdates) {
		updatesByFile[update.position.file] ??= []
		updatesByFile[update.position.file].push(update)
	}
	for (const k in updatesByFile) {
		writeFileUpdates(
			k,
			updatesByFile[k].sort((l, r) =>
				l.position.line > r.position.line ? 1
				: r.position.line > l.position.line ? -1
				: l.position.char - r.position.char
			)
		)
	}
	runFormatterIfAvailable(queuedUpdates)
}

const runFormatterIfAvailable = (queuedUpdates: QueuedUpdate[]) => {
	const { formatCmd: formatter, shouldFormat } = getConfig()
	if (!shouldFormat) return

	try {
		const updatedPaths = [
			...new Set(
				queuedUpdates.map(update =>
					filePath(update.snapCall.getSourceFile().fileName)
				)
			)
		]
		shell(`${formatter} ${updatedPaths.join(" ")}`)
	} catch {
		// If formatter is unavailable or skipped, do nothing.
	}
}

const writeFileUpdates = (path: string, updates: QueuedUpdate[]) => {
	let fileText = readFile(path)
	let offSet = 0
	for (const update of updates) {
		const previousArgTextLength =
			update.snapCall.arguments.end - update.snapCall.arguments.pos
		fileText =
			fileText.slice(0, update.snapCall.arguments.pos + offSet) +
			update.newArgText +
			fileText.slice(update.snapCall.arguments.end + offSet)
		offSet += update.newArgText.length - previousArgTextLength
		summarizeSnapUpdate(update.snapCall.arguments, update)
	}
	writeFile(path, fileText)
}

const summarizeSnapUpdate = (
	originalArgs: ts.NodeArray<ts.Expression>,
	update: QueuedUpdate
) => {
	let updateSummary = `${
		originalArgs.length ? "🆙  Updated" : "📸  Established"
	} `
	updateSummary +=
		update.baselinePath ?
			`baseline '${update.baselinePath.join("/")}' `
		:	`snap at ${getFileKey(update.position.file)}:${update.position.line} `
	const previousValue = update.snapCall.arguments[0]?.getText()
	updateSummary +=
		previousValue ?
			`from ${previousValue} to `
		:	`${update.baselinePath ? "at" : "as"} `

	updateSummary += update.newArgText
	console.log(updateSummary)
}
