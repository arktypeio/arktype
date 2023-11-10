import { existsSync, readdirSync, rmSync } from "node:fs"
import { basename, join } from "node:path"
import {
	filePath,
	readFile,
	readJson,
	shell,
	writeFile,
	writeJson
} from "@arktype/fs"
import type ts from "typescript"
import { getConfig } from "../config.ts"
import { getFileKey } from "../utils.ts"
import type { QueuedUpdate, SnapshotArgs } from "./snapshot.ts"
import { findCallExpressionAncestor, resolveSnapshotPath } from "./snapshot.ts"

export type ExternalSnapshotArgs = SnapshotArgs & {
	name: string
	customPath: string | undefined
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

export const writeCachedInlineSnapshotUpdates = () => {
	const config = getConfig()
	if (!existsSync(config.snapCacheDir)) {
		throw new Error(
			`Unable to update snapshots as expected cache directory ${config.snapCacheDir} does not exist.`
		)
	}
	const attestSnapUpdates = getQueuedUpdates(config.snapCacheDir)
	const benchSnapUpdates = getQueuedUpdates(config.benchSnapCacheDir)
	writeUpdates([...attestSnapUpdates, ...benchSnapUpdates])
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
		typeof serializedValue === "string" && serializedValue.includes("\n")
			? "`" + serializedValue.replaceAll("`", "\\`") + "`"
			: JSON.stringify(serializedValue)
	return {
		position,
		snapCall,
		snapFunctionName,
		newArgText,
		baselinePath
	}
}

// Waiting until process exit to write snapshots avoids invalidating existing source positions
export const writeUpdates = (queuedUpdates: QueuedUpdate[]) => {
	if (!queuedUpdates.length) {
		return
	}
	const updatesByFile: Record<string, QueuedUpdate[]> = {}
	for (const update of queuedUpdates) {
		updatesByFile[update.position.file] ??= []
		updatesByFile[update.position.file].push(update)
	}
	for (const k in updatesByFile) {
		writeFileUpdates(
			k,
			updatesByFile[k].sort((l, r) =>
				l.position.line > r.position.line
					? 1
					: r.position.line > l.position.line
					? -1
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
	updateSummary += update.baselinePath
		? `baseline '${update.baselinePath.join("/")}' `
		: `snap at ${getFileKey(update.position.file)}:${update.position.line} `
	const previousValue = update.snapCall.arguments[0]?.getText()
	updateSummary += previousValue
		? `from ${previousValue} to `
		: `${update.baselinePath ? "at" : "as"} `

	updateSummary += update.newArgText
	console.log(updateSummary)
}
