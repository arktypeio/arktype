import { printable } from "@ark/util"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import type { PrecompilePluginOptions } from "./driver.ts"
import type { PrecompileOptions } from "./precompile.ts"
import { definedOf, withPreset } from "./presets.ts"
import * as validators from "./settingsValidators.ts"

interface Issue {
	message: string
	data: unknown
}

type Validator = (
	data: unknown,
	piped: undefined,
	onFail: null
) => { issues: readonly Issue[] } | object

// the validators read no configuration, so a program's configure() runs after
const validate = (
	getValidator: () => Validator,
	data: unknown,
	where = ""
): void => {
	const out = getValidator()(data, undefined, null)
	if (!("issues" in out)) return
	throw new Error(
		out.issues
			.map(issue => `${where}${issue.message} (was ${printable(issue.data)})`)
			.join("\n")
	)
}

export const settingsFile = "ark.json"

// beside the nearest package.json, as the build finds its dependencies
export const settingsFileOf = (cwd: string): string | undefined => {
	for (let dir = resolve(cwd); ; dir = dirname(dir)) {
		if (existsSync(join(dir, "package.json"))) {
			const path = join(dir, settingsFile)
			return existsSync(path) ? path : undefined
		}
		if (dirname(dir) === dir) return
	}
}

const readSettingsFile = (path: string): PrecompilePluginOptions => {
	let json: unknown
	try {
		json = JSON.parse(readFileSync(path, "utf8"))
	} catch (e) {
		throw new Error(`${path} isn't JSON: ${(e as Error).message}`)
	}
	validate(validators.ArkJson as never, json, `${path}: `)
	const settings: PrecompilePluginOptions =
		(json as { precompile?: PrecompilePluginOptions }).precompile ?? {}
	const dir = dirname(path)
	return {
		...settings,
		...(typeof settings.config === "string" && {
			config: resolve(dir, settings.config)
		}),
		...(settings.tsconfig && { tsconfig: resolve(dir, settings.tsconfig) })
	}
}

// what the call sets over what ark.json does, before any preset
export const withSettingsFile = <opts extends PrecompilePluginOptions>(
	opts: opts | undefined
): opts => {
	const set = definedOf(opts ?? ({} as opts))
	validate(validators.PrecompileOptions as never, set)
	const path = settingsFileOf(set.cwd ?? process.cwd())
	if (!path) return set
	const file = readSettingsFile(path)
	const members = file.members && { ...file.members, ...set.members }
	return { ...file, ...set, ...(members && { members }) }
}

// the options a build runs with: valid, with its preset applied
export const resolvePrecompileOptions = <opts extends PrecompileOptions>(
	opts: opts = {} as opts
): opts & PrecompileOptions => {
	validate(validators.PrecompileOptions as never, definedOf(opts))
	const resolved = withPreset(opts) as opts
	const { members = {} } = resolved
	if (members["~standard.jsonSchema"] && members["~standard"] === false)
		throw new Error(standardJsonSchemaWithoutStandardMessage)
	if (resolved.runtime === "arktype") {
		const standaloneOption =
			resolved.config === false ?
				"config: false"
			:	standaloneOptions.find(option => resolved[option] !== undefined)
		if (standaloneOption)
			throw new Error(writeArktypeRuntimeOptionMessage(standaloneOption))
	}
	return resolved
}

// options runtime: "arktype" doesn't take
const standaloneOptions = [
	"members",
	"freeze",
	"lazy",
	"jsonInput",
	"shadow",
	"creationChecks",
	"errors",
	"mutatesInput",
	"optimize",
	"optimizeErrors"
] as const satisfies (keyof PrecompileOptions)[]

export const standardJsonSchemaWithoutStandardMessage =
	'members bakes "~standard.jsonSchema" into "~standard", which it sets false'

export type standardJsonSchemaWithoutStandardMessage =
	typeof standardJsonSchemaWithoutStandardMessage

export const writeArktypeRuntimeOptionMessage = <option extends string>(
	option: option
): writeArktypeRuntimeOptionMessage<option> =>
	`${option} chooses what a standalone build writes, which runtime: "arktype" doesn't`

export type writeArktypeRuntimeOptionMessage<option extends string> =
	`${option} chooses what a standalone build writes, which runtime: "arktype" doesn't`
