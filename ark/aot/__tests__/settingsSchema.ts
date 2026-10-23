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
	"freeze?": flag,
	"lazy?": flag,
	"creationChecks?": "'types' | 'helpers' | 'none'",
	"shadow?": flag,
	"allowUnsafe?": flag,
	"conditions?": "string[]",
	"tsconfig?": type("string > 0").describe("a path")
} as const

// what an API, plugin, driver or CLI call takes
export const PrecompileOptions = type({
	...settings,
	"cwd?": type("string > 0").describe("a path"),
	"inline?": flag,
	"declare?": flag,
	"+": "reject"
})

// ark.json, whose settings resolve against its directory
export const ArkJson = type({
	"$schema?": "string",
	"precompile?": type({ ...settings, "+": "reject" }),
	"+": "reject"
})
