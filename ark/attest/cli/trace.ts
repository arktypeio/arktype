import { ensureDir, getShellOutput, readJson, writeFile } from "@ark/fs"
import type { ExecException } from "node:child_process"
import { existsSync } from "node:fs"
import { basename, join, relative, resolve } from "node:path"
import ts from "typescript"
import {
	TsServer,
	getDescendants,
	getStringifiableType,
	nearestBoundingCallExpression
} from "../cache/ts.ts"
import { getConfig } from "../config.ts"
import { baseDiagnosticTscCmd } from "./shared.ts"

interface TraceEntry {
	pid: number
	tid: number
	ph: string // Phase (e.g., "X" for Complete Event)
	cat: string // Category
	ts: number // Timestamp (microseconds)
	name: string // Name of the event
	dur?: number // Duration (microseconds)
	args: {
		kind?: number
		pos?: number
		end?: number
		path?: string
		sourceId?: number
		targetId?: number
		[key: string]: any
	}
}

interface CallRange {
	id: string
	typeId: string
	functionName: string
	callSite: string
	startTime: number // microseconds
	endTime: number // microseconds
	duration: number // microseconds
	children: CallRange[]
	selfTime: number // microseconds
}

interface CallSiteDetail {
	path: string
	pos: number
	end: number
	selfTime: number // microseconds
}

interface FunctionStats {
	typeId: string
	functionName: string
	totalTime: number // microseconds
	selfTime: number // microseconds
	count: number
	firstLocation?: string
	detailedCallSites: CallSiteDetail[]
}

interface AnalysisContext {
	traceDir: string
	tsServer: TsServer
	traceEntries: TraceEntry[]
	durationEntries: TraceEntry[] // Filtered entries with duration
	callRanges: CallRange[]
	rootCalls: CallRange[]
	functionStats: Record<string, FunctionStats>
	allFunctions: FunctionStats[]
}

interface UngroupedCallStats {
	typeId: string
	functionName: string
	callSite: string
	duration: number // microseconds
	selfTime: number // microseconds
}

/**
 * Helper to write output to both console and collect for file output
 */
const outputCapture = (() => {
	let buffer: string[] = []

	return {
		write: (text: string) => {
			console.log(text)
			buffer.push(text)
		},
		getBuffer: () => buffer.join("\n"),
		getLines: () => [...buffer],
		clear: () => {
			buffer = []
		}
	}
})()

/**
 * Formats microseconds to a string of milliseconds.
 */
const formatMillis = (ms: number, fractionDigits = 2): string =>
	(ms / 1000).toFixed(fractionDigits)

/**
 * Formats microseconds to a padded string of milliseconds.
 */
const formatPaddedMillis = (
	ms: number,
	pad: number,
	fractionDigits = 2
): string => formatMillis(ms, fractionDigits).padStart(pad)

export const trace = async (args: string[]): Promise<void> => {
	const packageDir = resolve(args[0] ?? process.cwd())
	const config = getConfig()

	if (!config.tsconfig) {
		console.error(
			`attest trace must be run from a directory with a tsconfig.json file`
		)
		process.exit(1)
	}

	const traceDir = resolve(config.cacheDir, "trace")
	ensureDir(traceDir)

	outputCapture.clear()
	const initialMessages: string[] = []

	initialMessages.push(`⏳ Gathering type trace data for ${packageDir}...`)
	outputCapture.write(initialMessages[0])

	const tracingOutput = generateTraceData(traceDir, config.tsconfig, packageDir)

	const traceFile = join(traceDir, "trace.json")

	if (!existsSync(traceFile)) {
		outputCapture.write(
			`❌ No trace data found (expected a file at ${traceFile}). TSC output:\n${tracingOutput}`
		)
		// Write what we have to summary and exit
		const summaryPath = join(traceDir, "summary.txt")
		writeFile(summaryPath, outputCapture.getBuffer())
		return
	}

	outputCapture.write(`⏳ Analyzing type trace data for ${packageDir}...`)
	analyzeTypeInstantiations(traceDir)

	const analysisMessages = outputCapture
		.getLines()
		.slice(initialMessages.length)

	const summaryContent = [
		...initialMessages,
		tracingOutput,
		...analysisMessages
	].join("\n")

	const summaryPath = join(traceDir, "summary.txt")
	writeFile(summaryPath, summaryContent)
}

const generateTraceData = (
	traceDir: string,
	tsconfigPath: string,
	packageDir: string
): string => {
	try {
		const output = getShellOutput(
			`${baseDiagnosticTscCmd} --project ${tsconfigPath} --generateTrace ${traceDir}`,
			{ cwd: packageDir }
		)
		process.stdout.write(output)
		return output
	} catch (error: any) {
		// even if tsc returns a non-zero exit code,
		// we can still proceed as long as the trace.json
		// file was generated. The existence of trace.json is checked later.
		const e: ExecException = error
		const output = e.stdout ?? ""
		const errorOutput = e.stderr ?? ""

		process.stdout.write(output)
		process.stderr.write(errorOutput)

		return `${output}\n${errorOutput}`
	}
}

const initializeAnalysisContext = (traceDir: string): AnalysisContext => {
	const tsServer = TsServer.instance
	const tracePath = join(traceDir, "trace.json")

	if (!existsSync(tracePath)) {
		// This case should be caught by the `trace` function earlier,
		// but as a safeguard:
		throw new Error(
			`Critical: Expected a trace file at ${tracePath}, but it was not found during context initialization.`
		)
	}

	const traceEntries: TraceEntry[] = readJson(tracePath) as never // Assuming readJson returns TraceEntry[]

	return {
		traceDir,
		tsServer,
		traceEntries,
		durationEntries: [],
		callRanges: [],
		rootCalls: [],
		functionStats: {},
		allFunctions: []
	}
}

const filterDurationEntries = (ctx: AnalysisContext): void => {
	ctx.durationEntries = ctx.traceEntries.filter(entry => {
		const { args, dur, ph } = entry
		return (
			ph === "X" && // "X" denotes a complete event
			typeof dur === "number" && // Duration must exist and be a number
			args &&
			typeof args.path === "string" &&
			typeof args.pos === "number" &&
			typeof args.end === "number"
		)
	})

	outputCapture.write(
		`Found ${ctx.durationEntries.length} complete event traces with duration, path, and position.`
	)
}

const processDurationEntry = (
	entry: TraceEntry,
	ctx: AnalysisContext
): void => {
	// These properties are guaranteed by filterDurationEntries
	const entryPath = entry.args.path as string
	const entryPos = entry.args.pos as number
	const entryEnd = entry.args.end as number
	const entryDur = entry.dur as number // Duration in microseconds

	const sourceFile = ctx.tsServer.getSourceFileOrThrow(entryPath)

	let callRangeData: { typeId: string; functionName: string } | undefined

	const callExpr = findCallExpressionInRange(sourceFile, entryPos, entryEnd)
	if (callExpr) {
		const functionName = extractFunctionName(callExpr)
		callRangeData = {
			typeId: `function-${functionName}`,
			functionName
		}
	} else {
		const relevantNode = findMostSpecificNodeInRange(
			sourceFile,
			entryPos,
			entryEnd
		)
		if (relevantNode) {
			const nodeType = getStringifiableType(relevantNode)
			const nodeKind = ts.SyntaxKind[relevantNode.kind]
			const typeName = `${nodeKind}: ${nodeType.toString().substring(0, 25)}`
			// Ensure typeId is unique and meaningful
			const typeNodeIdPart =
				(nodeType as any).id ?? nodeType.toString().substring(0, 20)
			callRangeData = {
				typeId: `node-${relevantNode.kind}-${typeNodeIdPart}`,
				functionName: typeName
			}
		}
	}

	if (callRangeData) {
		ctx.callRanges.push({
			id: `${entry.ts}-${entryPos}-${entryEnd}`,
			typeId: callRangeData.typeId,
			functionName: callRangeData.functionName,
			callSite: `${entryPath}:${entryPos}-${entryEnd}`,
			startTime: entry.ts,
			endTime: entry.ts + entryDur,
			duration: entryDur,
			children: [],
			selfTime: entryDur // Initial selfTime is full duration
		})
	} else {
		// If no call expression and no other relevant node is found for a duration entry,
		// this indicates an issue with the trace data or our processing logic.
		throw new Error(
			`Failed to identify a processable AST node for duration entry (name: ${entry.name}, path: ${entryPath}, pos: ${entryPos}-${entryEnd}). This entry will be skipped.`
		)
	}
}

const findCallExpressionInRange = (
	file: ts.SourceFile,
	start: number,
	end: number
): ts.CallExpression | undefined => {
	const boundingCall = nearestBoundingCallExpression(file, start)
	if (boundingCall && boundingCall.pos >= start && boundingCall.end <= end)
		return boundingCall

	const allNodes = getDescendants(file)
	const nodesInRange = allNodes.filter(
		node => node.pos >= start && node.end <= end
	)

	const callExpressions = nodesInRange.filter(node =>
		ts.isCallExpression(node)
	) as ts.CallExpression[]

	if (callExpressions.length === 0) return undefined

	const methodCalls = callExpressions.filter(call =>
		ts.isPropertyAccessExpression(call.expression)
	)
	return methodCalls.length > 0 ? methodCalls[0] : callExpressions[0]
}

const extractFunctionName = (callExpr: ts.CallExpression): string => {
	if (ts.isPropertyAccessExpression(callExpr.expression))
		return callExpr.expression.name.getText()

	if (ts.isIdentifier(callExpr.expression)) return callExpr.expression.getText()

	return "anonymousFunction" // More specific than just "anonymous"
}

const buildCallTree = (ctx: AnalysisContext): void => {
	ctx.callRanges.sort((a, b) => a.startTime - b.startTime)
	const activeCallStack: CallRange[] = []

	for (const call of ctx.callRanges) {
		while (
			activeCallStack.length > 0 &&
			activeCallStack[activeCallStack.length - 1].endTime < call.startTime
		)
			activeCallStack.pop()

		if (activeCallStack.length === 0) ctx.rootCalls.push(call)
		else {
			const parent = activeCallStack[activeCallStack.length - 1]
			parent.children.push(call)
		}
		activeCallStack.push(call)
	}
}

const calculateSelfTimes = (call: CallRange): number => {
	let childrenTime = 0
	for (const child of call.children) childrenTime += calculateSelfTimes(child)

	call.selfTime = call.duration - childrenTime
	if (call.selfTime < 0) {
		// This can happen due to precision issues or overlapping trace entries.
		// Log a warning, but clamp to 0 to avoid negative self-times.
		// console.warn(`Warning: Negative self-time calculated for ${call.functionName} at ${call.callSite}. Clamping to 0.`);
		call.selfTime = 0
	}
	return call.duration
}

const collectFunctionStats = (call: CallRange, ctx: AnalysisContext): void => {
	if (!ctx.functionStats[call.typeId]) {
		ctx.functionStats[call.typeId] = {
			typeId: call.typeId,
			functionName: call.functionName,
			totalTime: 0,
			selfTime: 0,
			count: 0,
			firstLocation: call.callSite, // Should always be present
			detailedCallSites: []
		}
	}

	const stats = ctx.functionStats[call.typeId]
	const [filePath, positionRange] = call.callSite.split(":")
	if (!filePath || !positionRange)
		throw new Error(`Invalid callSite format: ${call.callSite}`)

	const [posStr, endStr] = positionRange.split("-")
	const pos = parseInt(posStr, 10)
	const end = parseInt(endStr, 10)

	if (isNaN(pos) || isNaN(end)) {
		throw new Error(
			`Invalid position in callSite: ${call.callSite}. Pos: ${posStr}, End: ${endStr}`
		)
	}

	stats.detailedCallSites.push({
		path: filePath,
		pos,
		end,
		selfTime: call.selfTime
	})

	stats.totalTime += call.duration
	stats.selfTime += call.selfTime
	stats.count++

	for (const child of call.children) collectFunctionStats(child, ctx)
}

const sortAndRankFunctions = (ctx: AnalysisContext): void => {
	for (const stats of Object.values(ctx.functionStats))
		stats.detailedCallSites.sort((a, b) => b.selfTime - a.selfTime)

	ctx.allFunctions = Object.values(ctx.functionStats).sort(
		(a, b) => b.selfTime - a.selfTime
	)
}

const analyzeTypeInstantiations = (traceDir: string): void => {
	const ctx = initializeAnalysisContext(traceDir)
	filterDurationEntries(ctx)

	for (const entry of ctx.durationEntries) {
		// Errors in processDurationEntry will propagate and stop analysis for that entry
		// or potentially the whole script if not caught at a higher level (which is intended now).
		processDurationEntry(entry, ctx)
	}

	buildCallTree(ctx)
	for (const root of ctx.rootCalls) calculateSelfTimes(root)

	const ungroupedStats = collectUngroupedStats(ctx)
	for (const root of ctx.rootCalls) collectFunctionStats(root, ctx)

	sortAndRankFunctions(ctx)

	outputCapture.write("\n📊 Performance Analysis - Top Individual Calls:\n")
	displayIndividualSummary(ungroupedStats)

	outputCapture.write("\n📊 Performance Analysis - Functions by Self Time:\n")
	displayGroupedSummary(ctx.allFunctions)

	const rangesCsvPath = join(traceDir, "ranges.csv")
	const namesCsvPath = join(traceDir, "names.csv")
	const summaryFilePath = join(traceDir, "summary.txt") // Renamed to avoid conflict

	writeToCsv(
		rangesCsvPath,
		["Function Name", "Self (ms)", "Duration (ms)", "Location"],
		ungroupedStats.map(stat => [
			stat.functionName,
			formatMillis(stat.selfTime, 3),
			formatMillis(stat.duration, 3),
			formatLocation(stat.callSite)
		])
	)

	writeToCsv(
		namesCsvPath,
		[
			"Function Name",
			"Total Self (ms)",
			"Avg Self (ms)",
			"Call Count",
			"Top Location",
			"Top Self (ms)"
		],
		ctx.allFunctions.map(stats => {
			const topUsage = stats.detailedCallSites[0] ?? {
				path: "unknown",
				pos: 0,
				end: 0,
				selfTime: 0
			}
			return [
				stats.functionName,
				formatMillis(stats.selfTime, 3),
				formatMillis(stats.selfTime / Math.max(1, stats.count), 3), // Avoid division by zero
				stats.count.toString(),
				formatLocation(`${topUsage.path}:${topUsage.pos}-${topUsage.end}`),
				formatMillis(topUsage.selfTime, 3)
			]
		})
	)

	outputCapture.write(
		`\n✅ Analysis complete! Results exported to:\n` +
			`   - ${rangesCsvPath} (individual calls)\n` +
			`   - ${namesCsvPath} (grouped by function name)\n` +
			`   - ${summaryFilePath} (complete analysis report)`
	)
}

const collectUngroupedStats = (ctx: AnalysisContext): UngroupedCallStats[] => {
	const ungroupedStats: UngroupedCallStats[] = []
	const flattenCallTree = (call: CallRange): void => {
		ungroupedStats.push({
			typeId: call.typeId,
			functionName: call.functionName,
			callSite: call.callSite,
			duration: call.duration,
			selfTime: call.selfTime
		})
		for (const child of call.children) flattenCallTree(child)
	}
	for (const root of ctx.rootCalls) flattenCallTree(root)
	return ungroupedStats.sort((a, b) => b.selfTime - a.selfTime)
}

const displayIndividualSummary = (stats: UngroupedCallStats[]): void => {
	displayTableHeader(["Rank", "Function Name", "Self (ms)", "Location"])
	const topN = Math.min(stats.length, 20)
	for (let i = 0; i < topN; i++) {
		const stat = stats[i]
		const typeNameFormatted = formatTypeName(stat.functionName, 20)
		const selfTimeMs = formatPaddedMillis(stat.selfTime, 15, 2)
		const location = formatLocation(stat.callSite)
		outputCapture.write(
			`${(i + 1).toString().padStart(4)} | ${typeNameFormatted} | ${selfTimeMs} | ${location}`
		)
	}
}

const displayTableHeader = (columns: string[]): void => {
	const headerRow = [
		columns[0].padEnd(4),
		columns[1].padEnd(20),
		columns[2].padEnd(15),
		...columns.slice(3)
	].join(" | ")
	const separatorRow = [
		"-".repeat(4),
		"-".repeat(20),
		"-".repeat(15),
		...columns.slice(3).map(col => "-".repeat(col.length))
	].join("-|-")
	outputCapture.write(headerRow)
	outputCapture.write(separatorRow)
}

const displayGroupedSummary = (functions: FunctionStats[]): void => {
	displayTableHeader([
		"Rank",
		"Function Name",
		"Total Self (ms)",
		"Avg Self (ms)",
		"Calls",
		"Top Usage"
	])
	const topN = Math.min(functions.length, 20)
	for (let i = 0; i < topN; i++) {
		const stats = functions[i]
		const typeNameFormatted = formatTypeName(stats.functionName, 20)
		const totalTimeMs = formatPaddedMillis(stats.selfTime, 15, 2)
		const avgTimeMs = formatPaddedMillis(
			stats.selfTime / Math.max(1, stats.count), // Avoid division by zero
			13,
			2
		)
		const calls = stats.count.toString().padStart(5)
		const topUsage = stats.detailedCallSites[0] ?? {
			path: "unknown",
			pos: 0,
			end: 0,
			selfTime: 0
		}
		const topUsageTime = formatMillis(topUsage.selfTime, 2) + "ms"
		const topUsageLocation = formatLocation(
			`${topUsage.path}:${topUsage.pos}-${topUsage.end}`
		)
		outputCapture.write(
			`${(i + 1).toString().padStart(4)} | ${typeNameFormatted} | ${totalTimeMs} | ${avgTimeMs} | ${calls} | ${topUsageLocation} (${topUsageTime})`
		)
	}
}

const formatTypeName = (typeName: string, maxLength: number): string => {
	typeName = typeName.replace(/\(\)$/, "")
	if (typeName.length <= maxLength) return typeName.padEnd(maxLength)

	const charsToKeep = maxLength - 3 // "..."
	const firstPart = Math.ceil(charsToKeep * 0.7)
	const lastPart = charsToKeep - firstPart
	return (
		typeName.substring(0, firstPart) +
		"..." +
		(lastPart > 0 ? typeName.substring(typeName.length - lastPart) : "")
	).padEnd(maxLength)
}

const formatLocation = (location: string): string => {
	if (!location || location === "unknown" || !location.includes(":"))
		return location || "unknown"

	const parts = location.split(":")
	if (parts.length < 2) return basename(location) // Fallback for unexpected format

	const filePath = parts.slice(0, -1).join(":") // Handle paths with colons
	const positionRange = parts[parts.length - 1]

	// This function now expects TsServer.instance.getSourceFileOrThrow to handle file existence
	// and getLineAndCharacterOfPosition to handle valid positions.
	// Errors from these will propagate up.
	const relativePath = relative(process.cwd(), filePath)
	const [posStr] = positionRange.split("-")
	const pos = parseInt(posStr, 10)

	if (isNaN(pos)) {
		// If pos is not a number, fallback to simpler formatting
		return `${relativePath}:${positionRange}`
	}

	const sourceFile = TsServer.instance.getSourceFileOrThrow(filePath)
	const lineAndChar = sourceFile.getLineAndCharacterOfPosition(pos)
	return `${relativePath}:${lineAndChar.line + 1}:${lineAndChar.character + 1}`
}

const findMostSpecificNodeInRange = (
	file: ts.SourceFile,
	start: number,
	end: number
): ts.Node | undefined => {
	const allNodes = getDescendants(file)
	const nodesInRange = allNodes.filter(
		node => node.pos >= start && node.end <= end
	)
	if (nodesInRange.length === 0) return undefined

	const leafNodes = nodesInRange.filter(
		node =>
			!nodesInRange.some(
				other =>
					other !== node && other.pos >= node.pos && other.end <= node.end
			)
	)
	return findNodeByPreference(leafNodes.length > 0 ? leafNodes : nodesInRange) // Fallback to nodesInRange if no clear leaf
}

const findNodeByPreference = (nodes: ts.Node[]): ts.Node | undefined => {
	if (nodes.length === 0) return undefined

	const typeReference = nodes.find(
		node => ts.isTypeReferenceNode(node) || ts.isTypeQueryNode(node)
	)
	if (typeReference) return typeReference

	const declaration = nodes.find(
		node =>
			ts.isVariableDeclaration(node) ||
			ts.isFunctionDeclaration(node) ||
			ts.isClassDeclaration(node) ||
			ts.isInterfaceDeclaration(node)
	)
	if (declaration) return declaration

	const propertyAccess = nodes.find(node => ts.isPropertyAccessExpression(node))
	if (propertyAccess) return propertyAccess

	const assignment = nodes.find(
		node =>
			ts.isBinaryExpression(node) &&
			node.operatorToken.kind === ts.SyntaxKind.EqualsToken
	)
	if (assignment) return assignment

	const expression = nodes.find(
		node => ts.isExpressionStatement(node) || ts.isExpression(node)
	)
	if (expression) return expression

	return nodes.sort((a, b) => a.end - a.pos - (b.end - b.pos))[0] // Smallest node as a fallback
}

const writeToCsv = (
	filePath: string,
	headers: string[],
	rows: string[][]
): void => {
	const content = [
		headers.join(","),
		...rows.map(row => row.map(escapeForCsv).join(","))
	].join("\n")
	writeFile(filePath, content)
}

const escapeForCsv = (value: string): string => {
	if (value.includes(",") || value.includes('"') || value.includes("\n"))
		return `"${value.replaceAll('"', '""')}"`

	return value
}
