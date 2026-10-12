import { precompile } from "@ark/precompile/unplugin"
import standaloneCode from "ajv/dist/standalone/index.js"
import { _ } from "ajv/dist/compile/codegen/index.js"
import { build, type Metafile } from "esbuild"
import { join } from "node:path"
import { ajvOf, type Library } from "./libraries.ts"

export const scenarios = ["login", "moltar", "shop"] as const

export type Scenario = (typeof scenarios)[number]

const apps = join(import.meta.dirname, "apps")

// ajv's standalone code, which needs no compiler at runtime
const ajvModule = async (scenario: Scenario) => {
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

const entry = async (scenario: Scenario, library: Library) =>
	library === "standalone" ? `export * from "./${scenario}/arktype.ts"`
	: library === "valibot" ?
		`export * from "./${scenario}/valibot.ts"\nexport { safeParse } from "valibot"`
	: library === "zodMini" ?
		`export * from "./${scenario}/zodMini.ts"\nexport { safeParse } from "zod/mini"`
	: library === "typia" ?
		`export * from "../out/typia/apps/${scenario}/typia.js"`
	: library === "ajv" ? await ajvModule(scenario)
	: `export * from "./${scenario}/${library}.ts"`

export interface Bundle {
	js: string
	metafile: Metafile
}

// a scenario's exports, plus safeParse for libraries whose schemas have no methods
export const bundle = async (
	scenario: Scenario,
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
		plugins: library === "standalone" ? [precompile.esbuild({ cwd: apps })] : []
	})
	return { js: outputFiles[0].text, metafile }
}
