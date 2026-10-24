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
	tempId,
	getTscPath,
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
	const unforced = blocks.map(
		block =>
			`${baselineText}\nconst $attestIsolatedBench = ${block.getFullText()}`
	)
	// the forcing syntax isn't valid JS, and a generic block's result would be
	// inferred from constraints it's never called with
	const canForce = /\.[cm]?tsx?$/.test(file.fileName)
	const [baseline, ...results] = countVariants(file, [
		{ text: baselineText, noErrorTruncation: true },
		...blocks.map((block, i) => ({
			text:
				canForce && !(block as FunctionLikeNode).typeParameters?.length ?
					unforced[i] + forceResult
				:	unforced[i],
			noErrorTruncation: true
		}))
	])
	const counts = results.map(result => result.count - baseline.count)

	// noErrorTruncation also writes out a block's own errors in full, so a block
	// with errors is counted without it, plus what forcing its result adds
	const blockStart = baselineText.split("\n").length + 1
	const withErrors = blocks.flatMap((block, i) => {
		const blockText = block.getFullText()
		const blockEnd = blockStart + blockText.split("\n").length - 1
		const hasErrors =
			// suppressed errors are still written out but not reported
			/@ts-(expect-error|ignore)/.test(blockText) ||
			results[i].errorLines.some(line => line >= blockStart && line <= blockEnd)
		return hasErrors ? [i] : []
	})
	if (!withErrors.length) return counts

	const [truncatedBaseline, ...unforcedResults] = countVariants(file, [
		{ text: baselineText, noErrorTruncation: false },
		...withErrors.flatMap(i => [
			{ text: unforced[i], noErrorTruncation: false },
			{ text: unforced[i], noErrorTruncation: true }
		])
	])
	for (const [j, i] of withErrors.entries()) {
		const truncated = unforcedResults[2 * j].count - truncatedBaseline.count
		const untruncated = unforcedResults[2 * j + 1].count - baseline.count
		counts[i] = truncated + counts[i] - untruncated
	}
	return counts
}

/**
 * TS only evaluates the members of many types, e.g. mapped types, once
 * something reads them. Passing a block's result type where `never` is
 * required makes tsc write it into an error in full (given
 * `noErrorTruncation`), so it's counted as if it were displayed without
 * adding anything for types that were already evaluated.
 *
 * Assigning the result to `never` would also check whether a callable
 * result's return type fits, counting work that displaying it wouldn't do.
 */
const forceResult = `
const $attestIsolatedResult = $attestIsolatedBench()
declare function $attestIsolate<t extends never>(): void
$attestIsolate<typeof $attestIsolatedResult>()`

type FunctionLikeNode = Node & { typeParameters?: readonly Node[] }

type Variant = { text: string; noErrorTruncation: boolean }

type VariantResult = { count: number; errorLines: number[] }

const countVariants = (
	file: SourceFile,
	variants: Variant[]
): VariantResult[] => {
	const { projectConfig } = TsgoServer.instance
	const fileDir = dirname(file.fileName)
	const fileBase = basename(file.fileName)

	const files: Record<string, string> = {}
	const configPaths = variants.map(({ text, noErrorTruncation }, i) => {
		// dot-prefixed so test runner globs don't pick it up
		const sourcePath = join(fileDir, `.attest-${tempId}-${i}-${fileBase}`)
		const configPath = join(
			projectConfig.dir,
			`.attest-${tempId}-${i}.tsconfig.json`
		)
		files[sourcePath] = text
		files[configPath] = JSON.stringify({
			extends: projectConfig.extends,
			compilerOptions: {
				...projectConfig.compilerOptions,
				// reused build info would skip checking unchanged files
				incremental: false,
				composite: false,
				tsBuildInfoFile: null,
				// declaration emit would fully check the exported types of both the
				// baseline and the variant, hiding work a bench shares with them
				declaration: false,
				declarationMap: false,
				declarationDir: null,
				emitDeclarationOnly: false,
				isolatedDeclarations: false,
				// a bench excluded from the project may be outside its rootDir
				rootDir: null,
				// otherwise counts depend on whether declarations are checked
				skipLibCheck: true,
				// see forceResult
				noErrorTruncation
			},
			files: [sourcePath],
			include: []
		})
		return configPath
	})

	return JSON.parse(
		execFileSync(process.execPath, [countInstantiationsScript, getTscPath()], {
			input: JSON.stringify({ files, configPaths }),
			encoding: "utf8",
			maxBuffer: 1e8
		})
	)
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
	// calls are listed outermost first, e.g. it(...) before a bench inside it
	const innermost = benchCounts
		.filter(({ location }) => isPositionWithinRange(position, location))
		.pop()
	return (
		innermost?.count ??
		throwError(
			`No call expressions with an inline function matching the name(s) '${getConfig().testDeclarationAliases.join()}' were found at ${position.file}:${position.line}:${position.char}`
		)
	)
}
