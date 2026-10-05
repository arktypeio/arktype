import { ensureDir, writeFile, writeJson, type SourcePosition } from "@ark/fs"
import { throwError, throwInternalError } from "@ark/util"
import { rmSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { basename, dirname, extname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { isPositionWithinRange } from "../cache/getCachedAssertions.ts"
import type { LinePositionRange } from "../cache/writeAssertionCache.ts"
import { getConfig } from "../config.ts"
import {
	TsgoServer,
	ast,
	getCallExpressionsByName,
	getCallLocation,
	getFirstFunctionDescendant,
	tscPath,
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
 * removed, and compared against that file on its own
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

	const attestTsconfigPath = TsgoServer.instance.configPath
	const configDir = ensureDir(join(getConfig().cacheDir, "instantiations"))
	const fileDir = dirname(file.fileName)
	const fileBase = basename(file.fileName)

	const tempFiles: string[] = []
	try {
		const configPaths = variants.map((text, i) => {
			// dot-prefixed so test runner globs don't pick it up
			const tempFile = join(fileDir, `.attest-${process.pid}-${i}-${fileBase}`)
			writeFile(tempFile, text)
			tempFiles.push(tempFile)
			const configPath = join(configDir, `${process.pid}-${i}.json`)
			writeJson(configPath, {
				extends: attestTsconfigPath,
				files: [tempFile],
				include: []
			})
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
		for (const path of tempFiles) rmSync(path, { force: true })
	}
}

const getBaselineText = (file: SourceFile): string => {
	let text = file.getFullText()
	// remove each complete test expression, e.g. bench(...).types(...)
	for (const call of getCallExpressionsByName(
		file,
		getConfig().testDeclarationAliases
	)) {
		let node: Node = call
		while (node.parent && !ast.isExpressionStatement(node)) node = node.parent
		text = text.replace(node.getFullText(), "")
	}
	return text
}

const benchCountsByFile = new Map<string, BenchCount[]>()

type BenchCount = {
	location: LinePositionRange
	count: number
}

export const getBenchInstantiations = (position: SourcePosition): number => {
	let benchCounts = benchCountsByFile.get(position.file)
	if (!benchCounts) {
		// count every bench in the file at once so tsc can run in parallel
		const file = TsgoServer.instance.getSourceFileOrThrow(position.file)
		const calls = getCallExpressionsByName(
			file,
			getConfig().testDeclarationAliases
		)
		const counts = getInstantiationsContributedByNodes(
			file,
			calls.map(
				call =>
					getFirstFunctionDescendant(call) ??
					throwInternalError(`Unable to retrieve contents of ${call.getText()}`)
			)
		)
		benchCounts = calls.map((call, i) => ({
			location: getCallLocation(call),
			count: counts[i]
		}))
		benchCountsByFile.set(position.file, benchCounts)
	}
	return (
		benchCounts.find(({ location }) =>
			isPositionWithinRange(position, location)
		)?.count ??
		throwError(
			`No call expressions matching the name(s) '${getConfig().testDeclarationAliases.join()}' were found at ${position.file}:${position.line}:${position.char}`
		)
	)
}
