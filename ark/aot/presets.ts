import type { PrecompileOptions } from "./precompile.ts"

export type Preset = "smallest" | "introspectable"

export const presets: Record<Preset, PrecompileOptions> = {
	smallest: { optimize: "size", lazy: false },
	introspectable: {
		members: {
			expression: true,
			description: true,
			json: true,
			toJSON: true,
			toJsonSchema: true,
			"~standard.jsonSchema": true
		}
	}
}

// runtime checks of what the build verified, which arktype's own Types lack
export const productionDefaults = {
	freeze: false,
	creationChecks: "none",
	config: false
} as const satisfies PrecompileOptions

export interface Environment {
	production: boolean
	// a test runner, whose mocks a factory checks its helpers against
	testing: boolean
}

// a production build leaves out runtime checks, and a test checks helpers too
export const withEnvironment = <opts extends PrecompileOptions>(
	opts: opts,
	{ production, testing }: Environment
): opts =>
	opts.runtime === "arktype" ?
		opts
	:	{
			...(production && productionDefaults),
			...(testing && { creationChecks: "helpers" }),
			...opts
		}

export const isProductionEnv = (): boolean =>
	process.env.NODE_ENV === "production"

// a preset sets what nothing else does; runtime: "arktype" takes none of it
export const withPreset = (opts: PrecompileOptions): PrecompileOptions => {
	const { preset, ...set } = definedOf(opts)
	if (set.runtime === "arktype") return set
	const defaults = preset ? presets[preset] : {}
	const members = { ...defaults.members, ...set.members }
	const optimize = set.optimize ?? defaults.optimize
	return {
		...defaults,
		...set,
		...(Object.keys(members).length && { members }),
		// errors are written as validators are unless set apart
		...((set.optimizeErrors ?? optimize) && {
			optimizeErrors: set.optimizeErrors ?? optimize
		})
	}
}

// an option set undefined is unset, so it overrides nothing
export const definedOf = <o extends PrecompileOptions>(o: o): o => {
	const result: Record<string, unknown> = {}
	for (const [k, v] of Object.entries(o)) {
		if (v === undefined) continue
		result[k] =
			k === "members" && v && typeof v === "object" ? definedOf(v as never) : v
	}
	return result as o
}
