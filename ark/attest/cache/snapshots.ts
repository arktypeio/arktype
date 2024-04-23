import {
	filePath,
	positionToString,
	readFile,
	readJson,
	shell,
	writeFile,
	writeJson,
	type SourcePosition
} from "@arktype/fs"
import { randomUUID } from "node:crypto"
import { existsSync, readdirSync, rmSync } from "node:fs"
import { basename, dirname, isAbsolute, join } from "node:path"
import type ts from "typescript"
import { getConfig } from "../config.js"
import { getFileKey } from "../utils.js"
import {
	TsServer,
	getAbsolutePosition,
	nearestCallExpressionChild
} from "./ts.js"
import { getExpressionsByName } from "./writeAssertionCache.js"

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
	if (customPath && isAbsolute(customPath)) 
		return customPath
	
	return join(dirname(testFile), customPath ?? "assert.snapshots.json")
}

export const getSnapshotByName = (
	file: string,
	name: string,
	customPath: string | undefined
): object => {
	const snapshotPath = resolveSnapshotPath(file, customPath)
	return readJson(snapshotPath)?.[basename(file)]?.[name]
}

/**
 * Writes the update and position to cacheDir, which will eventually be read and copied to the source
 * file by a cleanup process after all tests have completed.
 */
export const queueSnapshotUpdate = (args: SnapshotArgs): void => {
	const isBench = args.baselinePath
	const config = getConfig()
	writeJson(
		join(
			isBench ? config.benchSnapCacheDir : config.snapCacheDir,
			`snap-${randomUUID()}.json`
		),
		args
	)
	if (isBench) 
		writeSnapshotUpdatesOnExit()
	
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
	const calls = getExpressionsByName(startNode, [functionName], true)
	if (calls.length) 
		return startNode
	
	throw new Error(
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
		...snapshotData[fileKey],
		[name]: value
	}
	writeJson(snapshotPath, snapshotData)
}

let snapshotsWillBeWritten = false
export const writeSnapshotUpdatesOnExit = (): void => {
	if (snapshotsWillBeWritten) 
		return
	
	process.on("exit", writeCachedInlineSnapshotUpdates)
	snapshotsWillBeWritten = true
}

/**
 * This will fail if you have a sub process that writes cached snapshots and then deletes the snapshot cache that the root
 * process is using
 */
const writeCachedInlineSnapshotUpdates = () => {
	const config = getConfig()
	const updates: QueuedUpdate[] = []
	if (existsSync(config.snapCacheDir)) 
		updates.push(...getQueuedUpdates(config.snapCacheDir))
	
	if (existsSync(config.benchSnapCacheDir)) 
		updates.push(...getQueuedUpdates(config.benchSnapCacheDir))
	
	writeUpdates(updates)
	rmSync(config.snapCacheDir, { recursive: true, force: true })
	rmSync(config.benchSnapCacheDir, { recursive: true, force: true })
}

const getQueuedUpdates = (dir: string) => {
	const queuedUpdates: QueuedUpdate[] = []
	for (const updateFile of readdirSync(dir)) {
		if (/snap.*\.json$/.test(updateFile)) {
			let snapshotData: SnapshotArgs | undefined
			try {
				snapshotData = readJson(join(dir, updateFile))
			} catch {
				// If we can't read the snapshot, log an error and move onto the next update
				console.error(
					`Unable to read snapshot data from expected location ${updateFile}.`
				)
			}
			if (snapshotData) {
				try {
					queuedUpdates.push(snapshotArgsToQueuedUpdate(snapshotData))
				} catch (error) {
					// If writeInlineSnapshotToFile throws an error, log it and move on to the next update
					console.error(String(error))
				}
			}
		}
	}
	return queuedUpdates
}

const snapshotArgsToQueuedUpdate = ({
	position,
	serializedValue,
	snapFunctionName = "snap",
	baselinePath
}: SnapshotArgs): QueuedUpdate => {
	const snapCall = findCallExpressionAncestor(position, snapFunctionName)
	const newArgText =
		typeof serializedValue === "string" && serializedValue.includes("\n") ?
			"`" + serializedValue.replaceAll("`", "\\`") + "`"
		:	JSON.stringify(serializedValue)
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
	if (!queuedUpdates.length) 
		return
	
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
	runPrettierIfAvailable(queuedUpdates)
}

const runPrettierIfAvailable = (queuedUpdates: QueuedUpdate[]) => {
	try {
		const updatedPaths = [
			...new Set(
				queuedUpdates.map((update) =>
					filePath(update.snapCall.getSourceFile().fileName)
				)
			)
		]
		shell(`npm exec --no -- prettier --write ${updatedPaths.join(" ")}`)
	} catch {
		// If prettier is unavailable, do nothing.
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
