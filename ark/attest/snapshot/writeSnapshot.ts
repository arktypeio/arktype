import {
	existsSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { basename, join } from "node:path"
import { filePath, readJson, shell, writeJson } from "@arktype/fs"
import type ts from "typescript"
import { getConfig } from "../config.js"
import {
	getAbsolutePosition,
	getNodeFromPosition,
	TsServer
} from "../tsserver/tsserver.js"
import { getFileKey } from "../utils.js"
import type { QueuedUpdate, SnapshotArgs } from "./snapshot.js"
import { findCallExpressionAncestor, resolveSnapshotPath } from "./snapshot.js"

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
	for (const update of queuedUpdates) {
		const originalArgs = update.snapCall.arguments
		const previousValue = originalArgs.length
			? originalArgs[0].getText()
			: undefined
		writeUpdateToFile(originalArgs, update)
		summarizeSnapUpdate(originalArgs, update, previousValue)
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

const summarizeSnapUpdate = (
	originalArgs: ts.NodeArray<ts.Expression>,
	update: QueuedUpdate,
	previousValue: string | undefined
) => {
	let updateSummary = `${
		originalArgs.length ? "🆙  Updated" : "📸  Established"
	} `
	updateSummary += update.baselinePath
		? `baseline '${update.baselinePath.join("/")}' `
		: `snap at ${getFileKey(update.position.file)}:${update.position.line} `
	updateSummary += previousValue
		? `from ${previousValue} to `
		: `${update.baselinePath ? "at" : "as"} `

	updateSummary += update.newArgText
	console.log(updateSummary)
}

const writeUpdateToFile = (
	originalArgs: ts.NodeArray<ts.Expression>,
	update: QueuedUpdate
) => {
	const file = update.snapCall.getSourceFile()
	for (const originalArg of originalArgs) {
		const node = getNodeFromPosition(
			update.snapCall.getSourceFile(),
			getAbsolutePosition(file, update.position)
		)
	}
	const updated = insertArgInSnapCall(update)
	writeFileSync(update.position.file, updated)
	update.snapCall.getSourceFile()
}
const insertArgInSnapCall = (update: QueuedUpdate) => {
	const fileText = readFileSync(update.position.file, "utf-8")
	const lines = fileText.split("\n")
	const line = lines[update.position.line - 1]
	let updatedLine = ""
	for (let i = update.position.char; i < line.length; i++) {
		if (line[i] === "(") {
			updatedLine = `${line.substring(0, i + 1)}${
				update.newArgText
			}${line.slice(i + 1)}`
			break
		}
	}
	lines[update.position.line - 1] = updatedLine
	return lines.join("\n")
}
