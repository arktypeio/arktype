import { type } from "arktype"

const flag = "boolean"

const optimization = "'speed' | 'size'"

const settings = {
	"preset?": "'smallest' | 'introspectable'",
	"runtime?": "'arktype'",
	"config?": type("string > 0 | false").describe("a module path or false"),
	"members?": type({
		"assert?": flag,
		"meta?": flag,
		"~standard?": flag,
		"methods?": flag,
		"expression?": flag,
		"description?": flag,
		"json?": flag,
		"toJSON?": flag,
		"toJsonSchema?": flag,
		"~standard.jsonSchema?": flag,
		"+": "reject"
	}),
	"errors?": "'all' | 'first' | 'none'",
	"mutatesInput?": "boolean | 'always'",
	"optimize?": optimization,
	"optimizeErrors?": optimization,
	"jsonInput?": flag,
	"bakedLimit?": type("number.integer > 0").describe(
		"the characters a site's baked introspection may total"
	),
	"freeze?": flag,
	"lazy?": flag,
	"creationChecks?": "'types' | 'helpers' | 'none'",
	"shadow?": flag,
	"prune?": flag,
	"allowUnsafe?": flag,
	"conditions?": "string[]",
	"tsconfig?": type("string > 0").describe("a path"),
	// a package that doesn't opt in, precompiled or run on arktype
	"dependencies?": { "[string]": "'aot' | 'arktype'" }
} as const

// what an API, plugin, driver or CLI call takes
export const PrecompileOptions = type({
	...settings,
	"cwd?": type("string > 0").describe("a path"),
	"inline?": flag,
	"declare?": flag,
	"+": "reject"
})

const precompile = type({ ...settings, "+": "reject" })

// ark.json, whose settings resolve against its directory
export const ArkJson = type({
	"$schema?": "string",
	"precompile?": precompile,
	"+": "reject"
})

// package.json's "ark" key: the same settings, and whether a library's
// consumers precompile its source
export const PackageArk = type({
	"precompile?": precompile,
	"aot?": "true",
	"+": "reject"
})
