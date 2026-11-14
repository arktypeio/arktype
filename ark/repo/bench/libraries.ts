import { Ajv, type Options } from "ajv"
import addFormats from "ajv-formats"
import ajvKeywords from "ajv-keywords"

export const libraries = [
	"valibot",
	"zod",
	"zodCompiled",
	"zodMini",
	"typia",
	"ajv",
	"typebox",
	"arktype",
	"standalone",
	"standaloneFirst"
] as const

export type Library = (typeof libraries)[number]

// e.g. BENCH_LIBRARIES=zod,standalone
export const benchedLibraries: readonly string[] =
	process.env.BENCH_LIBRARIES?.split(",") ?? libraries

// e.g. BENCH_CASES="parse moltar", or "issues ,errors " for cases starting with either
const casePrefixes = (process.env.BENCH_CASES ?? "").split(",")

export const isBenchedCase = (name: string): boolean =>
	casePrefixes.some(prefix => name.startsWith(prefix))

export const ajvOf = (opts?: Options): Ajv => {
	const ajv = new Ajv({
		discriminator: true,
		// count string length in UTF-16 code units, as arktype does
		unicode: false,
		useDefaults: true,
		messages: true,
		...opts
	})
	addFormats.default(ajv)
	ajvKeywords.default(ajv, "instanceof")
	return ajv
}
