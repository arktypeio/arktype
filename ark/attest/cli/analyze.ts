import { fromCwd, readJson } from "@ark/fs"
import * as fs from "fs"
import * as path from "path"
import ts from "typescript"
import {
	TsServer,
	getDescendants,
	getStringifiableType,
	nearestBoundingCallExpression
} from "../cache/ts.ts"

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

interface FunctionStats {
	typeId: string
	typeName: string
	callSites: Set<string>
	totalTime: number
	selfTime: number
	count: number
	// Track the first location where this type is referenced
	firstLocation?: string
	// Track detailed call site information
	detailedCallSites: Array<{
		path: string
		pos: number
		end: number
		selfTime: number
	}>
}

const analyzeTypeInstantiations = (attestDir: string): void => {
	// Initialize TypeScript server
	const tsServer = TsServer.instance

	// Load data from trace file
	const tracePath = path.join(attestDir, "trace", "trace.json")
	if (!fs.existsSync(tracePath)) {
		console.error(`Trace file not found: ${tracePath}`)
		return
	}

	const traceEntries: TraceEntry[] = readJson(tracePath) as never

	// Focus on entries with duration
	const durationEntries = traceEntries.filter(
		entry =>
			entry.ph === "X" &&
			entry.dur !== undefined &&
			entry.args.path &&
			entry.args.pos &&
			entry.args.end
	)

	console.log(
		`Found ${durationEntries.length} traces with duration information`
	)

	// Convert to call ranges with start and end times
	const callRanges: CallRange[] = []

	// Process each entry and extract call information
	durationEntries.forEach(entry => {
		try {
			// Get the source file
			const sourceFile = tsServer.getSourceFileOrThrow(entry.args.path!)

			// Find the nearest node at this position
			const pos = entry.args.pos!
			const end = entry.args.end!

			// Try to find a call expression first
			const callExpr = nearestBoundingCallExpression(sourceFile, pos)

			if (callExpr) {
				// It's a function call - process normally
				const exprType = getStringifiableType(callExpr.expression)
				const typeId = (exprType as any).id?.toString() || exprType.toString()

				// Extract a more readable type name
				let typeName = exprType.toString()
				// Try to extract a more concise name from the type
				typeName = extractReadableTypeName(typeName)

				// Skip test functions and other non-performant types
				if (typeName.includes("TestFunction") || typeName.includes("AttestFn"))
					return

				// Create call site identifier
				const callSite = `${entry.args.path}:${pos}-${end}`

				// Create call range with explicit start and end times
				callRanges.push({
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
			} else {
				// Try to find any other meaningful node
				// These could be assignments, property accesses, etc.
				const relevantNode = findMostSpecificNodeInRange(sourceFile, pos, end)

				if (relevantNode) {
					// Extract type information from the relevant node
					const nodeType = getStringifiableType(relevantNode)
					const nodeKind = ts.SyntaxKind[relevantNode.kind]
					const typeName = `${nodeKind}: ${nodeType.toString().substring(0, 25)}`

					// Create a synthetic ID based on the node kind and type
					const typeId = `node-${relevantNode.kind}-${(nodeType as any).id || nodeType.toString().substring(0, 20)}`

					// Create call site identifier
					const callSite = `${entry.args.path}:${pos}-${end}`

					// Create range with explicit start and end times
					callRanges.push({
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
			}
		} catch (e) {
			if (!(e instanceof Error)) throw e
			// Skip entries that can't be properly analyzed
			if (e.message?.includes("Unable to find bounding call expression")) {
				// Silent failure - not all ranges are call expressions
				return
			}
			console.warn(
				`Error processing entry at ${entry.args.path}:${entry.args.pos}: ${e.message}`
			)
		}
	})

	// Sort by start time to establish nesting relationships
	callRanges.sort((a, b) => a.startTime - b.startTime)

	// Build the call tree to track nesting
	const rootCalls: CallRange[] = []
	const activeCallStack: CallRange[] = []

	callRanges.forEach(call => {
		// Pop finished calls from the stack
		while (
			activeCallStack.length > 0 &&
			activeCallStack[activeCallStack.length - 1].endTime < call.startTime
		)
			activeCallStack.pop()

		if (activeCallStack.length === 0) {
			// This is a root call
			rootCalls.push(call)
		} else {
			// This call is nested inside the current active call
			const parent = activeCallStack[activeCallStack.length - 1]
			parent.children.push(call)
		}

		// Add current call to active stack
		activeCallStack.push(call)
	})

	// Calculate self-time by subtracting child durations
	const calculateSelfTime = (call: CallRange): number => {
		let childrenTime = 0
		for (const child of call.children) {
			// Ensure children don't overlap in our calculation
			childrenTime += calculateSelfTime(child)
		}
		call.selfTime = call.duration - childrenTime
		return call.duration
	}

	// Calculate self-time for all root calls
	rootCalls.forEach(calculateSelfTime)

	// Collect stats by function type with detailed call site information
	const functionStats: Record<string, FunctionStats> = {}

	const collectStats = (call: CallRange) => {
		// Add stats for this call
		if (!functionStats[call.typeId]) {
			functionStats[call.typeId] = {
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

		const stats = functionStats[call.typeId]

		// Track all call sites with their individual self-time
		const [filePath, positionRange] = call.callSite.split(":")
		const [posStr, endStr] = positionRange.split("-")
		stats.detailedCallSites.push({
			path: filePath,
			pos: parseInt(posStr),
			end: parseInt(endStr),
			selfTime: call.selfTime
		})

		stats.callSites.add(call.callSite)
		stats.totalTime += call.duration
		stats.selfTime += call.selfTime
		stats.count++

		// Process children
		call.children.forEach(collectStats)
	}

	// Collect stats for all calls
	rootCalls.forEach(collectStats)

	// For each type, sort its call sites by self-time contribution
	Object.values(functionStats).forEach(stats => {
		stats.detailedCallSites.sort((a, b) => b.selfTime - a.selfTime)
	})

	// Sort functions by self-time
	const allFunctions = Object.values(functionStats).sort(
		(a, b) => b.selfTime - a.selfTime
	)

	// Print summary of top 20 to console
	const top20Functions = allFunctions.slice(0, 20)

	// Print with wider column for type name
	console.log("\nTop Functions by Self Type-Checking Time:\n")
	console.log(
		"Rank | Type Name                                  | Self Time (ms) | Calls | Unique Sites | Top Usage (ms)"
	)
	console.log(
		"-----|---------------------------------------------|----------------|-------|-------------|--------------"
	)

	top20Functions.forEach((stats, index) => {
		// Format the type name with smart truncation to keep the most identifiable part
		const typeNameFormatted = formatTypeName(stats.typeName, 45)

		const selfTimeMs = (stats.selfTime / 1000).toFixed(2).padStart(14)
		const calls = stats.count.toString().padStart(5)
		const sites = stats.callSites.size.toString().padStart(11)

		// Get the top usage by self-time - stats.detailedCallSites is already sorted
		const topUsage = stats.detailedCallSites[0]

		// Format top location with its self-time
		const topUsageTime = (topUsage.selfTime / 1000).toFixed(2) + "ms"
		const topUsageLocation = formatLocation(
			`${topUsage.path}:${topUsage.pos}-${topUsage.end}`
		)

		console.log(
			`${(index + 1).toString().padStart(4)} | ${typeNameFormatted} | ${selfTimeMs} | ${calls} | ${sites} | ${topUsageLocation} (${topUsageTime})`
		)
	})

	// Write comprehensive data to file
	const outputPath = path.join(attestDir, "trace", "checktime.txt")

	// Create output content with detailed information
	let outputContent = "TypeScript Type-Checking Performance Analysis\n"
	outputContent += "===========================================\n\n"
	outputContent += "Functions sorted by total self type-checking time\n\n"

	allFunctions.forEach((stats, index) => {
		outputContent += `${index + 1}. ${stats.typeName}\n`
		outputContent += `   Self time: ${(stats.selfTime / 1000).toFixed(2)} ms\n`
		outputContent += `   Total time: ${(stats.totalTime / 1000).toFixed(2)} ms\n`
		outputContent += `   Call count: ${stats.count}\n`
		outputContent += `   Unique call sites: ${stats.callSites.size}\n`

		if (stats.detailedCallSites.length > 0) {
			outputContent += `   Top call sites by self time:\n`

			// Show top 10 call sites or all if less than 10
			const topSites = stats.detailedCallSites.slice(
				0,
				Math.min(10, stats.detailedCallSites.length)
			)

			topSites.forEach((site, i) => {
				outputContent += `     ${i + 1}. ${site.path}:${site.pos}-${site.end}\n`
				outputContent += `        Self time: ${(site.selfTime / 1000).toFixed(2)} ms\n`
			})
		}

		outputContent += "\n"
	})

	// Write to file
	fs.writeFileSync(outputPath, outputContent)
	console.log(`\nDetailed analysis written to: ${outputPath}`)

	console.log("\nAnalysis complete.")
}

/**
 * Format a type name for display, ensuring the most identifiable parts are preserved
 */
const formatTypeName = (typeName: string, maxLength: number): string => {
	if (typeName.length <= maxLength) return typeName.padEnd(maxLength)

	// Extract the most meaningful part of the type name

	// For functions, try to get the name part
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
 * Format a file location to be more readable - now with relative path and line:char
 */
const formatLocation = (location: string): string => {
	if (!location || location === "unknown") return "unknown"

	// Extract file path and position range
	const [filePath, positionRange] = location.split(":")

	try {
		// Make path relative to current working directory
		const cwd = fromCwd()
		const relativePath = path.relative(cwd, filePath)

		// Get position value
		const pos = parseInt(positionRange)

		// Get the source file to convert position to line:character
		const sourceFile = TsServer.instance.getSourceFileOrThrow(filePath)
		const startLineAndChar = sourceFile.getLineAndCharacterOfPosition(pos)

		// Format as relative-path:startLine:startChar
		return `${relativePath}:${startLineAndChar.line + 1}:${startLineAndChar.character + 1}`
	} catch {
		// If any part fails, return the basic filename as fallback
		return path.basename(filePath) + (positionRange ? `:${positionRange}` : "")
	}
}

/**
 * Extract a more readable name from a potentially complex type signature
 */
const extractReadableTypeName = (typeName: string): string => {
	// For named types, extract the name
	const namedTypeMatch = typeName.match(/^(\w+)(?:<|$)/)
	if (namedTypeMatch) {
		// If it has a clear name at the start, prioritize that
		return typeName
	}

	// For function types, try to extract a meaningful description
	if (typeName.startsWith("(") && typeName.includes("=>")) {
		// Try to make function signatures more readable
		if (typeName.length > 60) {
			const arrowPos = typeName.indexOf("=>")
			if (arrowPos > -1) {
				const returnPart = typeName.substring(arrowPos + 2).trim()
				return `Function => ${returnPart.length > 20 ? returnPart.substring(0, 20) + "..." : returnPart}`
			}
		}
	}

	// For object types with properties, try to make it clearer
	if (typeName.startsWith("{") && typeName.endsWith("}"))
		return typeName.length > 60 ? `Object{...}` : typeName

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

	// Find most specific nodes (nodes that don't contain other nodes in our filtered list)
	const leafNodes = nodesInRange.filter(
		node =>
			!nodesInRange.some(
				other =>
					other !== node && other.pos >= node.pos && other.end <= node.end
			)
	)

	// Try to find meaningful nodes in this order:
	// 1. Type references
	// 2. Identifiers that are part of declarations
	// 3. Property accesses
	// 4. Assignments
	// 5. Any expression

	// Check for type references
	const typeReference = leafNodes.find(
		node => ts.isTypeReferenceNode(node) || ts.isTypeQueryNode(node)
	)
	if (typeReference) return typeReference

	// Check for declarations
	const declaration = leafNodes.find(
		node =>
			ts.isVariableDeclaration(node) ||
			ts.isFunctionDeclaration(node) ||
			ts.isClassDeclaration(node) ||
			ts.isInterfaceDeclaration(node)
	)
	if (declaration) return declaration

	// Check for property accesses
	const propertyAccess = leafNodes.find(node =>
		ts.isPropertyAccessExpression(node)
	)
	if (propertyAccess) return propertyAccess

	// Check for assignments
	const assignment = leafNodes.find(
		node =>
			ts.isBinaryExpression(node) &&
			node.operatorToken.kind === ts.SyntaxKind.EqualsToken
	)
	if (assignment) return assignment

	// Check for expressions
	const expression = leafNodes.find(
		node => ts.isExpressionStatement(node) || ts.isExpression(node)
	)
	if (expression) return expression

	// Return the first leaf node if none of the above matched
	return leafNodes[0]
}

// Run the analysis with the specified file paths
export const analyze = (args: string[]): void =>
	analyzeTypeInstantiations(args[0] ?? fromCwd(".attest"))
