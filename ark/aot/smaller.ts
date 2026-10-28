import type { StandaloneOptions } from "arktype/internal/standalone.ts"

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
