import { fromCwd } from "@ark/fs"
import * as fs from "fs"
import { join } from "path"

interface TypeInfo {
	id: number
	symbolName: string
	recursionId?: number
	firstDeclaration: {
		path: string
		start: { line: number; character: number }
		end: { line: number; character: number }
	}
	flags: string[]
	display?: string
}

interface TypeRelation {
	source: number
	target: number
	duration: number
}

const formatTime = (timeInMicroseconds: number): string =>
	`${(timeInMicroseconds / 1000).toFixed(2)}ms`

const getRelativePath = (fullPath: string): string => {
	const parts = fullPath.split("/")
	return parts.slice(Math.max(parts.length - 3, 0)).join("/")
}

const analyzeTypeInstantiations = (attestDir: string): void => {
	console.log("Loading and parsing files...")

	// Load data from files
	const traceEntries = JSON.parse(
		fs.readFileSync(join(attestDir, "trace", "trace.json"), "utf8")
	)
	const typeInfos = JSON.parse(
		fs.readFileSync(join(attestDir, "trace", "types.json"), "utf8")
	)

	console.log(
		`Loaded ${traceEntries.length} trace entries and ${typeInfos.length} type definitions`
	)

	// Create a map of type IDs to type info for quick lookup
	const typeMap = new Map<number, TypeInfo>()
	for (const typeInfo of typeInfos) typeMap.set(typeInfo.id, typeInfo)

	// Track cumulative time per type ID
	const typeTimings = new Map<number, { totalTime: number; count: number }>()

	// Track relationships between types for self-time calculations
	const typeRelations: TypeRelation[] = []
	const outgoingRelations = new Map<number, TypeRelation[]>()

	// Process trace entries to find type instantiation times
	console.log("Analyzing type instantiations...")
	let processedCount = 0

	for (const entry of traceEntries) {
		if (entry.name === "structuredTypeRelatedTo" && entry.dur !== undefined) {
			// Store the relationship for self-time calculation
			if (
				entry.args.sourceId !== undefined &&
				entry.args.targetId !== undefined
			) {
				const relation = {
					source: entry.args.sourceId,
					target: entry.args.targetId,
					duration: entry.dur
				}
				typeRelations.push(relation)

				// Track outgoing relationships
				if (!outgoingRelations.has(relation.source))
					outgoingRelations.set(relation.source, [])

				outgoingRelations.get(relation.source)!.push(relation)
			}

			// Source type (original code)
			if (entry.args.sourceId !== undefined) {
				const sourceId = entry.args.sourceId
				const current = typeTimings.get(sourceId) || { totalTime: 0, count: 0 }
				typeTimings.set(sourceId, {
					totalTime: current.totalTime + entry.dur,
					count: current.count + 1
				})
			}

			// Target type (original code)
			if (entry.args.targetId !== undefined) {
				const targetId = entry.args.targetId
				const current = typeTimings.get(targetId) || { totalTime: 0, count: 0 }
				typeTimings.set(targetId, {
					totalTime: current.totalTime + entry.dur,
					count: current.count + 1
				})
			}

			processedCount++
		}
	}

	console.log(`Processed ${processedCount} type relation operations`)

	// Calculate self-time (time spent on the type itself, not its descendants)
	const typeMetrics = new Map<
		number,
		{
			totalTime: number
			timeOnDescendants: number
			selfTime: number
			isLeaf: boolean
			childCount: number
			count: number
		}
	>()

	for (const [typeId, { totalTime, count }] of typeTimings.entries()) {
		const outgoing = outgoingRelations.get(typeId) || []
		const timeOnDescendants = outgoing.reduce(
			(sum, rel) => sum + rel.duration,
			0
		)
		const selfTime = totalTime - timeOnDescendants

		typeMetrics.set(typeId, {
			totalTime,
			timeOnDescendants,
			selfTime,
			isLeaf: outgoing.length === 0,
			childCount: outgoing.length,
			count
		})
	}

	// Convert to array, sort by time (descending), and take top 10
	const topTypes = [...typeTimings.entries()]
		.flatMap(([id, { totalTime, count }]) => {
			const info = typeMap.get(id)
			if (!info?.symbolName) return []
			const metrics = typeMetrics.get(id) || {
				totalTime,
				timeOnDescendants: 0,
				selfTime: totalTime,
				isLeaf: true,
				childCount: 0,
				count
			}

			return {
				id,
				totalTime,
				count,
				avgTime: totalTime / count,
				selfTime: metrics.selfTime,
				selfTimeRatio: metrics.selfTime / totalTime,
				timeOnDescendants: metrics.timeOnDescendants,
				isLeaf: metrics.isLeaf,
				childCount: metrics.childCount,
				symbolName: info.symbolName,
				location:
					info?.firstDeclaration ?
						`${getRelativePath(info.firstDeclaration.path)}:${info.firstDeclaration.start.line}:${
							info.firstDeclaration.start.character
						}`
					:	"?",
				display: info?.display || "?"
			}
		})
		.sort((a, b) => b.totalTime - a.totalTime)
		.slice(0, 10)

	// Also get types sorted by self-time
	const topSelfTimeTypes = [...typeMetrics.entries()]
		.flatMap(([id, metrics]) => {
			const info = typeMap.get(id)
			if (!info?.symbolName) return []

			return {
				id,
				totalTime: metrics.totalTime,
				count: metrics.count,
				avgTime: metrics.totalTime / metrics.count,
				selfTime: metrics.selfTime,
				selfTimeRatio: metrics.selfTime / metrics.totalTime,
				timeOnDescendants: metrics.timeOnDescendants,
				isLeaf: metrics.isLeaf,
				childCount: metrics.childCount,
				symbolName: info.symbolName,
				location:
					info?.firstDeclaration ?
						`${getRelativePath(info.firstDeclaration.path)}:${info.firstDeclaration.start.line}:${
							info.firstDeclaration.start.character
						}`
					:	"?",
				display: info?.display || "?"
			}
		})
		.sort((a, b) => b.selfTime - a.selfTime)
		.slice(0, 10)

	// Output results
	console.log(
		"\nTop 10 types with associated symbols by cumulative instantiation time:"
	)
	console.log(
		"================================================================="
	)

	topTypes.forEach((type, index) => {
		console.log(`${index + 1}. Type ID: ${type.id}`)
		console.log(`   Symbol: ${type.symbolName}`)
		console.log(`   Location: ${type.location}`)
		if (type.display) console.log(`   Display: ${type.display}`)
		console.log(`   Instantiations: ${type.count}`)
		console.log(`   Total time: ${formatTime(type.totalTime)}`)
		console.log(`   Average time: ${formatTime(type.avgTime)}`)
		console.log(
			`   Self time: ${formatTime(type.selfTime)} (${(type.selfTimeRatio * 100).toFixed(1)}%)`
		)
		console.log(`   Time on descendants: ${formatTime(type.timeOnDescendants)}`)
		console.log(
			`   Leaf node: ${type.isLeaf ? "Yes" : "No"} (${type.childCount} children)`
		)
		console.log("----------------------------------------------")
	})

	// Output self-time results
	console.log(
		"\nTop 10 types with associated symbols by self time (time spent checking the type itself):"
	)
	console.log(
		"================================================================="
	)

	topSelfTimeTypes.forEach((type, index) => {
		console.log(`${index + 1}. Type ID: ${type.id}`)
		console.log(`   Symbol: ${type.symbolName}`)
		console.log(`   Location: ${type.location}`)
		if (type.display) console.log(`   Display: ${type.display}`)
		console.log(
			`   Self time: ${formatTime(type.selfTime)} (${(type.selfTimeRatio * 100).toFixed(1)}% of total)`
		)
		console.log(`   Total time: ${formatTime(type.totalTime)}`)
		console.log(`   Instantiations: ${type.count}`)
		console.log(
			`   Leaf node: ${type.isLeaf ? "Yes" : "No"} (${type.childCount} children)`
		)
		console.log("----------------------------------------------")
	})

	// Output leaf nodes with significant self-time
	const leafNodes = [...typeMetrics.entries()]
		.flatMap(([id, metrics]) => {
			if (!metrics.isLeaf) return []
			const info = typeMap.get(id)
			if (!info?.symbolName) return []

			return {
				id,
				totalTime: metrics.totalTime,
				selfTime: metrics.selfTime,
				count: metrics.count,
				symbolName: info.symbolName,
				location:
					info?.firstDeclaration ?
						`${getRelativePath(info.firstDeclaration.path)}:${info.firstDeclaration.start.line}:${
							info.firstDeclaration.start.character
						}`
					:	"?",
				display: info?.display || "?"
			}
		})
		.sort((a, b) => b.selfTime - a.selfTime)
		.slice(0, 10)

	console.log("\nTop 10 leaf types (types that don't check other types):")
	console.log(
		"================================================================="
	)

	leafNodes.forEach((type, index) => {
		console.log(`${index + 1}. Type ID: ${type.id}`)
		console.log(`   Symbol: ${type.symbolName}`)
		console.log(`   Location: ${type.location}`)
		if (type.display) console.log(`   Display: ${type.display}`)
		console.log(
			`   Self time: ${formatTime(type.selfTime)} (same as total time for leaf nodes)`
		)
		console.log(`   Instantiations: ${type.count}`)
		console.log("----------------------------------------------")
	})
}

// Run the analysis with the specified file paths
export const analyze = (args: string[]): void =>
	analyzeTypeInstantiations(args[0] ?? fromCwd(".attest"))
