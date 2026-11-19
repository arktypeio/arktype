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
	// how a validator can be written, by the name schemas chooses it by
	"strategies?": {
		"[string]": type({ "optimize?": optimization, "+": "reject" })
	},
	// the strategy's name by a module's path or glob, or path#declaration
	"schemas?": { "[string]": "string > 0" },
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
	// what reads the program for declarations: TypeScript 5.5 to 6's JS API, or
	// TypeScript 7's native API as tsgo or tsrs serves it
	"checker?": "'tsjs' | 'tsgo' | 'tsrs'",
	// a package that doesn't opt in, precompiled or run on arktype
	"dependencies?": { "[string]": "'aot' | 'arktype'" }
} as const

// what an API, plugin, driver or CLI call takes
export const PrecompileOptions = type({
	...settings,
	"cwd?": type("string > 0").describe("a path"),
	"inline?": flag,
	"declare?": flag,
	// what a host sets, or a test past the size deciding it
	"defers?": "boolean | 'large'",
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
