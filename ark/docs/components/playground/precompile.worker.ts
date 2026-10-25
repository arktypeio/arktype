/**
 * Measures the playground's precompiled validator off the main thread:
 * terser is large and slow enough to drop frames while typing, so nothing
 * loads it until the Precompiled tab opens.
 */
import {
	minifiedLengthOf,
	runtimeReadsOf,
	smallerOf
} from "@ark/aot/internal/smaller.ts"
import { minify } from "terser"
import type {
	PrecompileRequest,
	PrecompileResponse,
	PrecompileRuntime,
	PrecompiledSize
} from "./precompiledState.ts"

declare const precompileRuntime: PrecompileRuntime

const scope = self as unknown as {
	onmessage: (e: MessageEvent<PrecompileRequest>) => void
	postMessage: (response: PrecompileResponse) => void
}

const { code: runtime, localsByExport, lengths, reached } = precompileRuntime

// as minifiedSizeOf counts it, from the lengths it computed when the docs built
const sizeOf = (code: string) => {
	const counted = new Set(
		runtimeReadsOf(code).flatMap(name => reached[name] ?? [])
	)
	let length = minifiedLengthOf(code)
	for (const i of counted) length += lengths[i]
	return length
}

// the validator's runtime reads as reads of the runtime's own declarations
const link = (code: string) =>
	code
		.replace(/^import \* as runtime from "arktype\/runtime"$/m, "")
		.replace(
			/^import { ([^}]+) } from "arktype\/runtime"$/gm,
			(_, names: string) =>
				names
					.split(",")
					.map(name => {
						const [imported, local = imported] = name.trim().split(/\s+as\s+/)
						const declared = localsByExport[imported]
						return declared === local ? "" : `const ${local} = ${declared};`
					})
					.join("\n")
		)
		.replace(
			/\bruntime\.([\w$]+)/g,
			(read, name: string) => localsByExport[name] ?? read
		)

const minified = async (code: string) =>
	(await minify(code, { module: true, compress: { passes: 2 } })).code ?? ""

const gzippedLengthOf = async (text: string) =>
	(
		await new Response(
			new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"))
		).arrayBuffer()
	).byteLength

const measure = async (code: string): Promise<PrecompiledSize> => {
	const [shipped, own] = await Promise.all([
		minified(`${runtime}\n${link(code)}`),
		minified(code)
	])
	return {
		min: shipped.length,
		gz: await gzippedLengthOf(shipped),
		ownMin: own.length
	}
}

scope.onmessage = async ({ data: { id, written } }) => {
	try {
		const [checkers, compiled] = written
		const chosen =
			compiled === undefined ? checkers : (
				smallerOf(checkers, () => compiled, sizeOf)
			)
		scope.postMessage({
			id,
			chosen: written.indexOf(chosen),
			size: await measure(chosen)
		})
	} catch (e) {
		scope.postMessage({ id, error: String(e) })
	}
}
