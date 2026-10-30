import type { StandaloneOptions } from "arktype/internal/standalone.ts"
import type { PrecompiledModule } from "./precompile.ts"

// reads no files, so the docs playground chooses as a build does

// about what a minifier leaves: no comments, spaces or names longer than two characters
export const minifiedLengthOf = (code: string): number =>
	code
		.replace(/\/\*[\S\s]*?\*\/|\/\/[^\n]*/g, "")
		.replace(/\s+/g, "")
		.replace(/[$A-Z_a-z][\w$]{2,}/g, "ab").length

export const runtimeReadsOf = (code: string): string[] =>
	code.match(/(?<=\bruntime\.)[\w$]+/g) ?? []

// a size build with detailed errors writes checkers
export const combinesChecks = (opts: StandaloneOptions): boolean =>
	opts.optimize === "size" &&
	opts.errors !== "none" &&
	opts.errors !== "first" &&
	opts.combines !== false

// checkers, unless an artifact too small to amortize their runtime is smaller compiled
export const smallerOf = <written>(
	checkers: written,
	writeCompiled: () => written,
	sizeOf: (written: written) => number
): written => {
	let compiled: written
	try {
		compiled = writeCompiled()
	} catch {
		return checkers
	}
	return sizeOf(compiled) < sizeOf(checkers) ? compiled : checkers
}

// each shape's runtime and what each call of it saves, gzipped bytes measured
// on bundles of 10 to 1000 schemas
const shapeCosts = {
	stringRange: [48, 0.37],
	integerRange: [64, 0.76],
	arrayOf: [56, 0.47],
	nullable: [25, 1.76]
}

export const shapesPayIn = (
	written: Record<string, Pick<PrecompiledModule, "modules">>
): boolean => {
	const modules: Record<string, string> = {}
	for (const id in written) Object.assign(modules, written[id].modules)
	const text = Object.values(modules).join("\n")
	let saved = 0
	for (const [shape, [runtime, call]] of Object.entries(shapeCosts)) {
		const calls = text.split(`runtime.${shape}(`).length - 1
		if (calls) saved += calls * call - runtime
	}
	return saved > 0
}

// declaring about this many units as validators repays a validator exposing allows, gzipped
export const unitsExposingAllowsPays = 6
