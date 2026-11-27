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
		"withContext?": flag,
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
	"droppedNarrow?": flag,
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

// documented ark.json schema for ark.schema.json and ESLint rule schema
// (kept separate from the runtime validators so validation errors stay concise)
export const ArkJsonSchema = type({
	"$schema?": type("string").describe(
		"JSON Schema path or URL for editor validation and hover docs"
	),
	"precompile?": type({
		"preset?": type(settings["preset?"]).describe(
			"Named preset of defaults: 'smallest' minimizes bundle size, 'introspectable' keeps all introspection members"
		),
		"runtime?": type(settings["runtime?"]).describe(
			"Set to 'arktype' to ship arktype's runtime parser alongside precompiled validators"
		),
		"config?": type("string > 0 | false").describe(
			"Path to the module that calls configure(), or false to forbid configure() calls"
		),
		"members?": type({
			"assert?": type(flag).describe(
				"Keep .assert() on standalone validators (default true)"
			),
			"meta?": type(flag).describe(
				"Keep .meta on standalone validators (default true)"
			),
			"~standard?": type(flag).describe(
				"Keep the Standard Schema '~standard' property on standalone validators (default true)"
			),
			"methods?": type(flag).describe(
				"Keep .traverse(), .from(), and .toString() on standalone validators (default true)"
			),
			"withContext?": type(flag).describe(
				"Keep .withContext() on standalone validators (default true)"
			),
			"expression?": type(flag).describe(
				"Bake .expression onto standalone validators (auto-detected when unset)"
			),
			"description?": type(flag).describe(
				"Bake .description onto standalone validators (auto-detected when unset)"
			),
			"json?": type(flag).describe(
				"Bake .json onto standalone validators (auto-detected when unset)"
			),
			"toJSON?": type(flag).describe(
				"Bake .toJSON() onto standalone validators (auto-detected when unset)"
			),
			"toJsonSchema?": type(flag).describe(
				"Bake .toJsonSchema() onto standalone validators (auto-detected when unset)"
			),
			"~standard.jsonSchema?": type(flag).describe(
				"Bake Standard JSON Schema support onto '~standard.jsonSchema' (auto-detected when unset)"
			),
			"+": "reject"
		}).describe(
			"Control which properties and introspection helpers are kept on standalone validators"
		),
		"errors?": type(settings["errors?"]).describe(
			"Error reporting mode for standalone validators: 'all' (default), 'first', or 'none'"
		),
		"mutatesInput?": type(settings["mutatesInput?"]).describe(
			"Allow morphs and defaults to mutate input in place: false (default), true, or 'always'"
		),
		"optimize?": type(settings["optimize?"]).describe(
			"Optimize generated validators for 'speed' (default, compiled per Type) or 'size' (shared runtime checkers)"
		),
		"optimizeErrors?": type(settings["optimizeErrors?"]).describe(
			"Optimize generated error paths for 'speed' or 'size' (defaults to optimize)"
		),
		"strategies?": type({
			"[string]": type({
				"optimize?": type(optimization).describe(
					"Optimize validators using this strategy for 'speed' or 'size'"
				),
				"+": "reject"
			}).describe("Named optimization strategy options")
		}).describe(
			"Define named optimization strategies referenced by 'schemas' or '// @ark-strategy' comments"
		),
		"schemas?": type({ "[string]": "string > 0" }).describe(
			"Map module paths, globs, or 'path#Declaration' keys to a strategy name ('fastest', 'smallest', or custom)"
		),
		"jsonInput?": type(settings["jsonInput?"]).describe(
			"Trust objects validated with rejected undeclared keys to be plain JSON-like objects so key counts can be used"
		),
		"bakedLimit?": type("number.integer > 0").describe(
			"Maximum total characters of baked introspection metadata allowed per precompiled site (default 1 MB)"
		),
		"freeze?": type(settings["freeze?"]).describe(
			"Freeze precompiled validators and their members (default true in development, false in production)"
		),
		"lazy?": type(settings["lazy?"]).describe(
			"Create validators lazily on first read instead of eagerly at module load (default true, false under 'smallest')"
		),
		"creationChecks?": type(settings["creationChecks?"]).describe(
			"Runtime checks emitted when validators are created: 'types' (default), 'helpers' (tests), or 'none' (production)"
		),
		"shadow?": type(settings["shadow?"]).describe(
			"Run both precompiled validators and dynamic arktype in tests and fail wherever they disagree"
		),
		"prune?": type(settings["prune?"]).describe(
			"Prune unused validator members in production bundles (default true where supported)"
		),
		"allowUnsafe?": type(settings["allowUnsafe?"]).describe(
			"Report unsafe build patterns (like ParseErrors or late configure() imports) as warnings instead of failing the build"
		),
		"droppedNarrow?": type(settings["droppedNarrow?"]).describe(
			"Warn when structural operations ('...', .merge(), .pick(), .omit(), .partial(), .required(), .map()) drop a root .narrow() predicate (default true)"
		),
		"conditions?": type(settings["conditions?"]).describe(
			"Package export conditions used when resolving imports during precompilation"
		),
		"tsconfig?": type("string > 0").describe(
			"Path to the tsconfig.json whose paths and program settings the build uses"
		),
		"checker?": type(settings["checker?"]).describe(
			"TypeScript checker used by `ark declare`: 'tsjs' (TS 5.5-6), 'tsgo' (TS 7 native), or 'tsrs'"
		),
		"dependencies?": type({ "[string]": "'aot' | 'arktype'" }).describe(
			"How to handle dependencies that import arktype without opting in: 'aot' to precompile or 'arktype' to run on arktype"
		),
		"+": "reject"
	}).describe("@ark/aot precompiler options"),
	"+": "reject"
}).describe("ArkType project configuration (ark.json)")

// package.json's "ark" key: the same settings, and whether a library's
// consumers precompile its source
export const PackageArk = type({
	"precompile?": precompile,
	"aot?": "true",
	"+": "reject"
})
