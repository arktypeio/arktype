import { ensureDir, readJson, writeFile } from "@ark/fs"
import { execSync } from "child_process"
import { existsSync } from "node:fs"
import { basename, join, relative } from "node:path"
import { resolve } from "path"
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
	ph: string
	cat: string
	ts: number
	name: string
	dur?: number
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
	typeName: string
	callSite: string
	startTime: number
	endTime: number
	duration: number
	children: CallRange[]
	selfTime: number
}

interface CallSiteDetail {
	path: string
	pos: number
	end: number
	selfTime: number
}

interface FunctionStats {
	typeId: string
	typeName: string
	callSites: Set<string>
	totalTime: number
	selfTime: number
	count: number
	firstLocation?: string
	detailedCallSites: CallSiteDetail[]
}

interface AnalysisContext {
	traceDir: string
	tsServer: TsServer
	traceEntries: TraceEntry[]
	durationEntries: TraceEntry[]
	callRanges: CallRange[]
	rootCalls: CallRange[]
	functionStats: Record<string, FunctionStats>
	allFunctions: FunctionStats[]
}

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

	try {
		console.log(`⏳ Gathering type trace data for ${packageDir}...`)
		generateTraceData(traceDir, config.tsconfig, packageDir)
	} catch (e) {
		console.error(String(e))
	} finally {
		console.log(`⏳ Analyzing type trace data for ${packageDir}...`)
		analyzeTypeInstantiations(traceDir)
	}
}

const generateTraceData = (
	traceDir: string,
	tsconfigPath: string,
	packageDir: string
): void => {
	execSync(
		`${baseDiagnosticTscCmd} --project ${tsconfigPath} --generateTrace ${traceDir}`,
		{
			cwd: packageDir,
			stdio: "inherit"
		}
	)
}

const initializeAnalysisContext = (traceDir: string): AnalysisContext => {
	const tsServer = TsServer.instance

	// Load trace data
	const tracePath = join(traceDir, "trace.json")
	if (!existsSync(tracePath))
		throw new Error(`Expected a trace file at ${tracePath}`)

	const traceEntries: TraceEntry[] = readJson(tracePath) as never

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
	ctx.durationEntries = ctx.traceEntries.filter(
		entry =>
			entry.ph === "X" &&
			entry.dur !== undefined &&
			entry.args.path &&
			entry.args.pos &&
			entry.args.end
	)

	console.log(
		`Found ${ctx.durationEntries.length} traces with duration information`
	)
}

const processDurationEntry = (
	entry: TraceEntry,
	ctx: AnalysisContext
): void => {
	try {
		const sourceFile = ctx.tsServer.getSourceFileOrThrow(entry.args.path!)
		const pos = entry.args.pos!
		const end = entry.args.end!

		// First try to process as a call expression
		const callExpr = nearestBoundingCallExpression(sourceFile, pos)
		if (callExpr) processCallExpression(callExpr, entry, pos, end, ctx)
		else {
			// Try to process as another type of node
			processNonCallNode(sourceFile, entry, pos, end, ctx)
		}
	} catch (e) {
		handleProcessingError(e, entry)
	}
}

const processCallExpression = (
	callExpr: ts.CallExpression,
	entry: TraceEntry,
	pos: number,
	end: number,
	ctx: AnalysisContext
): void => {
	const exprType = getStringifiableType(callExpr.expression)
	const typeId = (exprType as any).id?.toString() || exprType.toString()
	const typeName = extractReadableTypeName(exprType.toString())

	// Skip test-related functions
	if (typeName.includes("TestFunction") || typeName.includes("AttestFn")) return

	const callSite = `${entry.args.path}:${pos}-${end}`

	ctx.callRanges.push({
		id: `${entry.ts}-${pos}-${end}`,
		typeId,
		typeName,
		callSite,
		startTime: entry.ts,
		endTime: entry.ts + (entry.dur || 0),
		duration: entry.dur || 0,
		children: [],
		selfTime: entry.dur || 0
	})
}

const processNonCallNode = (
	sourceFile: ts.SourceFile,
	entry: TraceEntry,
	pos: number,
	end: number,
	ctx: AnalysisContext
): void => {
	const relevantNode = findMostSpecificNodeInRange(sourceFile, pos, end)
	if (!relevantNode) return

	const nodeType = getStringifiableType(relevantNode)
	const nodeKind = ts.SyntaxKind[relevantNode.kind]
	const typeName = `${nodeKind}: ${nodeType.toString().substring(0, 25)}`
	const typeId = `node-${relevantNode.kind}-${(nodeType as any).id || nodeType.toString().substring(0, 20)}`
	const callSite = `${entry.args.path}:${pos}-${end}`

	ctx.callRanges.push({
		id: `${entry.ts}-${pos}-${end}`,
		typeId,
		typeName,
		callSite,
		startTime: entry.ts,
		endTime: entry.ts + (entry.dur || 0),
		duration: entry.dur || 0,
		children: [],
		selfTime: entry.dur || 0
	})
}

const handleProcessingError = (e: unknown, entry: TraceEntry): void => {
	if (!(e instanceof Error)) throw e

	// Silent failure for common case of not finding a call expression
	if (e.message?.includes("Unable to find bounding call expression")) return

	console.warn(
		`Error processing entry at ${entry.args.path}:${entry.args.pos}: ${e.message}`
	)
}

const buildCallTree = (ctx: AnalysisContext): void => {
	// Sort by start time for nesting analysis
	ctx.callRanges.sort((a, b) => a.startTime - b.startTime)

	const activeCallStack: CallRange[] = []

	ctx.callRanges.forEach(call => {
		popFinishedCalls(call, activeCallStack)
		assignToParentOrRoot(call, activeCallStack, ctx)
		activeCallStack.push(call)
	})
}

const popFinishedCalls = (
	call: CallRange,
	activeCallStack: CallRange[]
): void => {
	while (
		activeCallStack.length > 0 &&
		activeCallStack[activeCallStack.length - 1].endTime < call.startTime
	)
		activeCallStack.pop()
}

const assignToParentOrRoot = (
	call: CallRange,
	activeCallStack: CallRange[],
	ctx: AnalysisContext
): void => {
	if (activeCallStack.length === 0) {
		// This is a root call
		ctx.rootCalls.push(call)
	} else {
		// This call is nested inside the current active call
		const parent = activeCallStack[activeCallStack.length - 1]
		parent.children.push(call)
	}
}

const calculateSelfTimes = (call: CallRange): number => {
	let childrenTime = 0
	for (const child of call.children) childrenTime += calculateSelfTimes(child)

	call.selfTime = call.duration - childrenTime
	return call.duration
}

const collectFunctionStats = (call: CallRange, ctx: AnalysisContext): void => {
	// Initialize stats object if needed
	if (!ctx.functionStats[call.typeId]) {
		ctx.functionStats[call.typeId] = {
			typeId: call.typeId,
			typeName: call.typeName,
			callSites: new Set(),
			totalTime: 0,
			selfTime: 0,
			count: 0,
			firstLocation: call.callSite,
			detailedCallSites: []
		}
	}

	const stats = ctx.functionStats[call.typeId]

	// Track detailed call site information
	addCallSiteToStats(call, stats)

	// Update aggregate metrics
	stats.callSites.add(call.callSite)
	stats.totalTime += call.duration
	stats.selfTime += call.selfTime
	stats.count++

	// Process children
	call.children.forEach(child => collectFunctionStats(child, ctx))
}

const addCallSiteToStats = (call: CallRange, stats: FunctionStats): void => {
	const [filePath, positionRange] = call.callSite.split(":")
	const [posStr, endStr] = positionRange.split("-")

	stats.detailedCallSites.push({
		path: filePath,
		pos: parseInt(posStr),
		end: parseInt(endStr),
		selfTime: call.selfTime
	})
}

const sortAndRankFunctions = (ctx: AnalysisContext): void => {
	// Sort each function's call sites by self-time
	Object.values(ctx.functionStats).forEach(stats => {
		stats.detailedCallSites.sort((a, b) => b.selfTime - a.selfTime)
	})

	// Sort functions by self-time
	ctx.allFunctions = Object.values(ctx.functionStats).sort(
		(a, b) => b.selfTime - a.selfTime
	)
}

const displaySummary = (ctx: AnalysisContext): void => {
	const top20Functions = ctx.allFunctions.slice(0, 20)

	console.log("\nTop Functions by Self Type-Checking Time:\n")
	console.log(
		"Rank | Type Name                                     | Self Time (ms) | Calls | Unique Sites | Top Usage (ms)"
	)
	console.log(
		"-----|-----------------------------------------------|----------------|-------|--------------|-------------------------------------------"
	)

	top20Functions.forEach((stats, index) => printFunctionSummary(stats, index))
}

const printFunctionSummary = (stats: FunctionStats, index: number): void => {
	const typeNameFormatted = formatTypeName(stats.typeName, 45)
	const selfTimeMs = (stats.selfTime / 1000).toFixed(2).padStart(14)
	const calls = stats.count.toString().padStart(5)
	const sites = stats.callSites.size.toString().padStart(12)

	// Get details about top usage site
	const topUsage = stats.detailedCallSites[0] || {
		path: "unknown",
		pos: 0,
		end: 0,
		selfTime: 0
	}
	const topUsageTime = (topUsage.selfTime / 1000).toFixed(2) + "ms"
	const topUsageLocation = formatLocation(
		`${topUsage.path}:${topUsage.pos}-${topUsage.end}`
	)

	console.log(
		`${(index + 1).toString().padStart(4)} | ${typeNameFormatted} | ${selfTimeMs} | ${calls} | ${sites} | ${topUsageLocation} (${topUsageTime})`
	)
}

const writeDetailedReport = (ctx: AnalysisContext): void => {
	const outputPath = join(ctx.traceDir, "analysis.txt")
	let outputContent = createReportHeader()

	// Add detailed information for each function
	ctx.allFunctions.forEach((stats, index) => {
		outputContent += createFunctionReport(stats, index)
	})

	// Write to file
	writeFile(outputPath, outputContent)
	console.log(
		`\n✅ Analysis complete! A more detailed breakdown is available at ${outputPath}`
	)
}

const createReportHeader = (): string =>
	"TypeScript Type-Checking Performance Analysis\n" +
	"===========================================\n\n" +
	"Functions sorted by total self type-checking time\n\n"

const createFunctionReport = (stats: FunctionStats, index: number): string => {
	let report = `${index + 1}. ${stats.typeName}\n`
	report += `   Self time: ${(stats.selfTime / 1000).toFixed(2)} ms\n`
	report += `   Total time: ${(stats.totalTime / 1000).toFixed(2)} ms\n`
	report += `   Call count: ${stats.count}\n`
	report += `   Unique call sites: ${stats.callSites.size}\n`

	if (stats.detailedCallSites.length > 0) {
		report += `   Top call sites by self time:\n`
		stats.detailedCallSites.forEach((site, i) => {
			report += `     ${i + 1}. ${site.path}:${site.pos}-${site.end}\n`
			report += `        Self time: ${(site.selfTime / 1000).toFixed(2)} ms\n`
		})
	}

	report += "\n"
	return report
}

/**
 * Format a type name for display, ensuring the most identifiable parts are preserved
 */
const formatTypeName = (typeName: string, maxLength: number): string => {
	if (typeName.length <= maxLength) return typeName.padEnd(maxLength)

	// Extract the most meaningful part of the type name
	if (typeName.includes("function")) {
		const match = typeName.match(/(\w+)(?=\s*\()/)
		if (match)
			return `${match[0]}(...) ${typeName.slice(-15)}`.padEnd(maxLength)
	}

	// For generic types, preserve the base name and first generic param
	const genericMatch = typeName.match(/(\w+)<(.+?)(?:,|>)/)
	if (genericMatch) {
		const baseName = genericMatch[1]
		const firstParam =
			genericMatch[2].length > 10 ?
				genericMatch[2].substring(0, 10) + "..."
			:	genericMatch[2]

		return `${baseName}<${firstParam}...>`.padEnd(maxLength)
	}

	// Default smart truncation: keep start and end
	const charsToKeep = maxLength - 5 // Account for "..." and some balance
	const firstPart = Math.ceil(charsToKeep * 0.7) // Keep more of the start
	const lastPart = charsToKeep - firstPart

	return (
		typeName.substring(0, firstPart) +
		"..." +
		typeName.substring(typeName.length - lastPart)
	).padEnd(maxLength)
}

/**
 * Format a file location to be more readable with relative path and line:char
 */
const formatLocation = (location: string): string => {
	if (!location || location === "unknown") return "unknown"

	// Extract file path and position range
	const [filePath, positionRange] = location.split(":")

	try {
		const relativePath = relative(process.cwd(), filePath)

		// Get position values
		const [posStr] = positionRange.split("-")
		const pos = parseInt(posStr)

		// Get the source file to convert position to line:character
		const sourceFile = TsServer.instance.getSourceFileOrThrow(filePath)
		const lineAndChar = sourceFile.getLineAndCharacterOfPosition(pos)

		// Format as relative-path:line:char
		return `${relativePath}:${lineAndChar.line + 1}:${lineAndChar.character + 1}`
	} catch {
		// If any part fails, return the basic filename as fallback
		return basename(filePath) + (positionRange ? `:${positionRange}` : "")
	}
}

/**
 * Extract a more readable name from a potentially complex type signature
 */
const extractReadableTypeName = (typeName: string): string => {
	// For named types, extract the name
	const namedTypeMatch = typeName.match(/^(\w+)(?:<|$)/)
	if (namedTypeMatch) return typeName

	// For function types, try to extract a meaningful description
	if (typeName.startsWith("(") && typeName.includes("=>")) {
		if (typeName.length > 60) {
			const arrowPos = typeName.indexOf("=>")
			if (arrowPos > -1) {
				const returnPart = typeName.substring(arrowPos + 2).trim()
				return `Function => ${returnPart.length > 20 ? returnPart.substring(0, 20) + "..." : returnPart}`
			}
		}
	}

	// For object types with properties
	if (typeName.startsWith("{") && typeName.endsWith("}"))
		return typeName.slice(0, 60)

	return typeName
}

/**
 * Finds the most specific non-trivial node within the given range
 */
const findMostSpecificNodeInRange = (
	file: ts.SourceFile,
	start: number,
	end: number
): ts.Node | undefined => {
	// Get all descendants in the file
	const allNodes = getDescendants(file)

	// Filter nodes that are completely contained within our range
	const nodesInRange = allNodes.filter(
		node => node.pos >= start && node.end <= end
	)

	// Find most specific nodes (leaf nodes)
	const leafNodes = nodesInRange.filter(
		node =>
			!nodesInRange.some(
				other =>
					other !== node && other.pos >= node.pos && other.end <= node.end
			)
	)

	// Find nodes in order of preference
	return findNodeByPreference(leafNodes)
}

const findNodeByPreference = (nodes: ts.Node[]): ts.Node | undefined => {
	// 1. Type references
	const typeReference = nodes.find(
		node => ts.isTypeReferenceNode(node) || ts.isTypeQueryNode(node)
	)
	if (typeReference) return typeReference

	// 2. Declarations
	const declaration = nodes.find(
		node =>
			ts.isVariableDeclaration(node) ||
			ts.isFunctionDeclaration(node) ||
			ts.isClassDeclaration(node) ||
			ts.isInterfaceDeclaration(node)
	)
	if (declaration) return declaration

	// 3. Property accesses
	const propertyAccess = nodes.find(node => ts.isPropertyAccessExpression(node))
	if (propertyAccess) return propertyAccess

	// 4. Assignments
	const assignment = nodes.find(
		node =>
			ts.isBinaryExpression(node) &&
			node.operatorToken.kind === ts.SyntaxKind.EqualsToken
	)
	if (assignment) return assignment

	// 5. Expressions
	const expression = nodes.find(
		node => ts.isExpressionStatement(node) || ts.isExpression(node)
	)
	if (expression) return expression

	// Default: first node
	return nodes[0]
}

const analyzeTypeInstantiations = (traceDir: string): void => {
	// Initialize the analysis context
	const ctx = initializeAnalysisContext(traceDir)

	// Filter entries with duration information
	filterDurationEntries(ctx)

	// Process each duration entry to extract call ranges
	ctx.durationEntries.forEach(entry => processDurationEntry(entry, ctx))

	// Build call tree from ranges
	buildCallTree(ctx)

	// Calculate self-time for each call
	ctx.rootCalls.forEach(calculateSelfTimes)

	// Collect statistics about function types
	ctx.rootCalls.forEach(call => collectFunctionStats(call, ctx))

	// Sort and rank functions by self-time
	sortAndRankFunctions(ctx)

	// Display summary to console
	displaySummary(ctx)

	// Write detailed report to file
	writeDetailedReport(ctx)
}
