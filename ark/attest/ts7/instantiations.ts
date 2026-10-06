import type { SourcePosition } from "@ark/fs"
import { throwError } from "@ark/util"
import { execFileSync } from "node:child_process"
import { basename, dirname, extname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
	isPositionWithinRange,
	type LinePositionRange
} from "../cache/getCachedAssertions.ts"
import { getConfig } from "../config.ts"
import {
	TsgoServer,
	ast,
	getCallExpressionsByName,
	getCallLocation,
	getFirstFunctionDescendant,
	removeTempFile,
	tscPath,
	writeTempFile,
	writeTempTsconfig,
	type Node,
	type SourceFile
} from "./server.ts"

const countInstantiationsScript = fileURLToPath(
	new URL(
		`./countInstantiations${extname(fileURLToPath(import.meta.url))}`,
		import.meta.url
	)
)

/**
 * tsgo's API doesn't expose instantiation counts, so each block is checked by
 * a separate tsc process alongside the rest of its file with test calls
 * removed, and compared against that file on its own.
 *
 * Unlike TS 5's in-process measurement, tsc fully checks every file the
 * program includes, so work a block shares with its dependencies is counted
 * in the baseline rather than attributed to the block.
 */
export const getInstantiationsContributedByNodes = (
	file: SourceFile,
	blocks: Node[]
): number[] => {
	if (!blocks.length) return []

	const baselineText = getBaselineText(file)
	const variants = [
		baselineText,
		...blocks.map(
			block =>
				`${baselineText}\nconst $attestIsolatedBench = ${block.getFullText()}`
		)
	]

	const { configPath: projectConfigPath, project } = TsgoServer.instance
	const configDir = dirname(projectConfigPath)
	const fileDir = dirname(file.fileName)
	const fileBase = basename(file.fileName)

	const tempPaths: string[] = []
	try {
		const configPaths = variants.map((text, i) => {
			// dot-prefixed so test runner globs don't pick it up
			const tempFile = writeTempFile(
				join(fileDir, `.attest-${process.pid}-${i}-${fileBase}`),
				text
			)
			// beside the project config so its relative paths resolve the same way
			const configPath = writeTempTsconfig(
				join(configDir, `.attest-${process.pid}-${i}.tsconfig.json`),
				{
					extends: projectConfigPath,
					compilerOptions: {
						// reused build info would skip checking unchanged files
						incremental: false,
						composite: false,
						tsBuildInfoFile: null,
						// implied by composite and required by options like declarationMap
						...(project.compilerOptions.composite && { declaration: true }),
						// otherwise counts depend on whether declarations are checked
						skipLibCheck: true
					},
					files: [tempFile],
					include: []
				}
			)
			tempPaths.push(tempFile, configPath)
			return configPath
		})

		const [baseline, ...counts]: number[] = JSON.parse(
			execFileSync(
				process.execPath,
				[countInstantiationsScript, tscPath, ...configPaths],
				{ encoding: "utf8", maxBuffer: 1e8 }
			)
		)
		return counts.map(count => count - baseline)
	} finally {
		for (const path of tempPaths) removeTempFile(path)
	}
}

const getBaselineText = (file: SourceFile): string => {
	const text = file.getFullText()
	// remove each complete test expression, e.g. bench(...).types(...)
	const removedRanges = getCallExpressionsByName(
		file,
		getConfig().testDeclarationAliases
	)
		.map(call => {
			let node: Node = call
			while (node.parent && !ast.isExpressionStatement(node)) node = node.parent
			return node
		})
		.sort((l, r) => l.pos - r.pos)

	let baselineText = ""
	let position = 0
	for (const statement of removedRanges) {
		// nested test calls are removed with the statement containing them
		if (statement.pos < position) continue
		baselineText += text.slice(position, statement.pos)
		position = statement.end
	}
	return baselineText + text.slice(position)
}

type BenchCount = {
	location: LinePositionRange
	count: number
}

const benchCountsByFile = new Map<string, BenchCount[]>()

export const getBenchInstantiations = (position: SourcePosition): number => {
	let benchCounts = benchCountsByFile.get(position.file)
	if (!benchCounts) {
		// count every bench in the file at once so tsc can run in parallel
		const file = TsgoServer.instance.getSourceFileOrThrow(position.file)
		const benches = getCallExpressionsByName(
			file,
			getConfig().testDeclarationAliases
		).flatMap(call => {
			const body = getFirstFunctionDescendant(call)
			// e.g. bench("name", fn), which has no inline body to measure
			return body ? [{ call, body }] : []
		})
		const counts = getInstantiationsContributedByNodes(
			file,
			benches.map(bench => bench.body)
		)
		benchCounts = benches.map((bench, i) => ({
			location: getCallLocation(bench.call),
			count: counts[i]
		}))
		benchCountsByFile.set(position.file, benchCounts)
	}
	return (
		benchCounts.find(({ location }) =>
			isPositionWithinRange(position, location)
		)?.count ??
		throwError(
			`No call expressions with an inline function matching the name(s) '${getConfig().testDeclarationAliases.join()}' were found at ${position.file}:${position.line}:${position.char}`
		)
	)
}
