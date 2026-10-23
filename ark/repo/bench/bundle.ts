import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import standaloneCode from "ajv/dist/standalone/index.js"
import { _ } from "ajv/dist/compile/codegen/index.js"
import { build, type Metafile } from "esbuild"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { ajvOf, type Library } from "./libraries.ts"

export const scenarios = ["login", "moltar", "shop"] as const

export type Scenario = (typeof scenarios)[number]

// sized only, for the libraries an app is written for
export const sizedScenarios = [...scenarios, "saas"] as const

export type SizedScenario = (typeof sizedScenarios)[number]

const apps = join(import.meta.dirname, "apps")

// e.g. BENCH_STANDALONE_OPTIONS='{"errors":"none"}' configures standalone bundles
const standaloneOptions: PrecompileUnpluginOptions = JSON.parse(
	process.env.BENCH_STANDALONE_OPTIONS ?? "{}"
)

// ajv's standalone code, which needs no compiler at runtime
const ajvModule = async (scenario: SizedScenario) => {
	const schemas: Record<string, object> = await import(
		join(apps, scenario, "ajv.ts")
	)
	const ajv = ajvOf({
		schemas: Object.values(schemas),
		code: {
			source: true,
			esm: true,
			formats: _`require("ajv-formats/dist/formats").fullFormats`
		}
	})
	return standaloneCode.default(
		ajv,
		Object.fromEntries(Object.keys(schemas).map(name => [name, name]))
	)
}

const entry = async (scenario: SizedScenario, library: Library) =>
	library === "standalone" || library === "standaloneFirst" ?
		`export * from "./${scenario}/arktype.ts"`
	: library === "valibot" ?
		`export * from "./${scenario}/valibot.ts"\nexport { safeParse } from "valibot"`
	: library === "zodMini" ?
		`export * from "./${scenario}/zodMini.ts"\nexport { safeParse } from "zod/mini"`
	: library === "typia" ?
		`export * from "../out/typia/apps/${scenario}/typia.js"`
	: library === "ajv" ? await ajvModule(scenario)
	: library === "zodCompiled" ?
		// zod's global mode compiles each schema at its first parse
		`import "zod/compile"\nexport * from "./${scenario}/zod.ts"`
	:	`export * from "./${scenario}/${library}.ts"`

// whether a library has the app a scenario's entry reads
export const hasApp = (scenario: SizedScenario, library: Library): boolean =>
	existsSync(
		library === "typia" ?
			join(import.meta.dirname, "out", "typia", "apps", scenario, "typia.js")
		:	join(
				apps,
				scenario,
				`${
					library === "standalone" || library === "standaloneFirst" ? "arktype"
					: library === "zodCompiled" ? "zod"
					: library
				}.ts`
			)
	)

export interface Bundle {
	js: string
	metafile: Metafile
}

// a scenario's exports, plus safeParse for libraries whose schemas have no methods
export const bundle = async (
	scenario: SizedScenario,
	library: Library
): Promise<Bundle> => {
	const { outputFiles, metafile } = await build({
		stdin: {
			contents: await entry(scenario, library),
			resolveDir: apps,
			loader: "ts"
		},
		bundle: true,
		minify: true,
		format: "esm",
		platform: "neutral",
		write: false,
		metafile: true,
		logLevel: "error",
		plugins:
			library === "standalone" ?
				[precompile.esbuild({ cwd: apps, ...standaloneOptions })]
			: library === "standaloneFirst" ?
				[precompile.esbuild({ cwd: apps, errors: "first" })]
			:	[]
	})
	return { js: outputFiles[0].text, metafile }
}
