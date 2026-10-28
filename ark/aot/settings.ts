import { printable, throwError } from "@ark/util"
import { existsSync, readFileSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import type { PrecompilePluginOptions } from "./driver.ts"
import {
	packageRootOf,
	projectOf,
	resolvedVariantOf,
	type DependencyModes,
	type RuntimeVariant
} from "./host.ts"
import { writeVariantOption, writeWithoutVariant } from "./messages.ts"
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

const readJson = (path: string): unknown => {
	try {
		return JSON.parse(readFileSync(path, "utf8"))
	} catch (e) {
		throw new Error(`${path} isn't JSON: ${(e as Error).message}`)
	}
}

// ark.json, or the package.json whose "ark" key holds the same settings
export const settingsFileOf = (cwd: string): string | undefined => {
	for (let dir = resolve(cwd); ; dir = dirname(dir)) {
		const manifest = join(dir, "package.json")
		if (existsSync(manifest)) {
			const path = join(dir, settingsFile)
			const setsArk =
				(readJson(manifest) as { ark?: unknown }).ark !== undefined
			if (!existsSync(path)) return setsArk ? manifest : undefined
			if (setsArk) throw new Error(writeSettingsConflictMessage(manifest, path))
			return path
		}
		if (dirname(dir) === dir) return
	}
}

const readSettingsFile = (path: string): PrecompilePluginOptions => {
	const json = readJson(path)
	const isManifest = basename(path) === "package.json"
	const settings: PrecompilePluginOptions =
		isManifest ?
			validated(
				validators.PackageArk,
				(json as { ark: unknown }).ark,
				`${path}: ark.`
			)
		:	validated(validators.ArkJson, json, `${path}: `)
	const dir = dirname(path)
	return {
		...settings,
		...(typeof settings.config === "string" && {
			config: resolve(dir, settings.config)
		}),
		...(settings.tsconfig && { tsconfig: resolve(dir, settings.tsconfig) })
	}
}

const validated = (
	getValidator: unknown,
	data: unknown,
	where: string
): PrecompilePluginOptions => {
	// e.g. { "members": {...} }, an option written beside "precompile"
	for (const key in data as object) {
		const option = { [key]: (data as Record<string, unknown>)[key] }
		if (
			!("issues" in validators.PrecompileOptions()(option, undefined, null))
		) {
			throw new Error(
				`${where}${key} must be set in precompile, as in ${JSON.stringify({ precompile: option })}`
			)
		}
	}
	validate(getValidator as never, data, where)
	return (data as { precompile?: PrecompilePluginOptions }).precompile ?? {}
}

// what the call sets over what ark.json does, before any preset
export const withSettingsFile = <opts extends PrecompilePluginOptions>(
	opts: opts | undefined
): opts => {
	const set = definedOf(opts ?? ({} as opts))
	validate(validators.PrecompileOptions as never, set)
	const cwd = set.cwd ?? process.cwd()
	const path = settingsFileOf(cwd)
	const file = path ? readSettingsFile(path) : {}
	const members = file.members && { ...file.members, ...set.members }
	const dependencies = file.dependencies && {
		...file.dependencies,
		...set.dependencies
	}
	const result = {
		...file,
		...set,
		...(members && { members }),
		...(dependencies && { dependencies })
	}
	checkDependencies(result.dependencies, cwd)
	return result
}

// a package the program can't import would never be read
const checkDependencies = (
	dependencies: DependencyModes | undefined,
	cwd: string
): void => {
	if (!dependencies) return
	const project = projectOf(resolve(cwd))
	for (const name in dependencies) {
		if (!packageRootOf(name, project))
			throw new Error(writeUnresolvedDependencyMessage(name, project))
	}
}

export const resolvePrecompileOptions = <opts extends PrecompileOptions>(
	opts: opts = {} as opts
): opts & PrecompileOptions => {
	validate(validators.PrecompileOptions as never, definedOf(opts))
	const resolved = withPreset(opts) as opts
	const { members = {} } = resolved
	if (members["~standard.jsonSchema"] && members["~standard"] === false)
		throw new Error(standardJsonSchemaWithoutStandardMessage)
	const variant = resolvedVariantOf(resolved)
	const onArktype = variant && onArktypeOf(resolved.dependencies)
	if (onArktype)
		throw new Error(writeVariantDependencyMessage(onArktype, variant))
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

// a dependency the build leaves running on arktype
const onArktypeOf = (
	dependencies: DependencyModes | undefined
): string | undefined =>
	Object.keys(dependencies ?? {}).find(
		name => dependencies![name] === "arktype"
	)

// options runtime: "arktype" doesn't take
const standaloneOptions = [
	"members",
	"freeze",
	"lazy",
	"jsonInput",
	"bakedLimit",
	"shadow",
	"creationChecks",
	"errors",
	"mutatesInput",
	"optimize",
	"optimizeErrors",
	"prune",
	"dependencies"
] as const satisfies (keyof PrecompileOptions)[]

export const standardJsonSchemaWithoutStandardMessage =
	'members bakes "~standard.jsonSchema" into "~standard", which it sets false. Leave "~standard" unset, or remove "~standard.jsonSchema".'

export type standardJsonSchemaWithoutStandardMessage =
	typeof standardJsonSchemaWithoutStandardMessage

export const writeArktypeRuntimeOptionMessage = <option extends string>(
	option: option
): writeArktypeRuntimeOptionMessage<option> =>
	`${option} chooses what a standalone build writes, which runtime: "arktype" doesn't. Remove runtime: "arktype" to precompile, or remove ${option}.`

export type writeArktypeRuntimeOptionMessage<option extends string> =
	`${option} chooses what a standalone build writes, which runtime: "arktype" doesn't. Remove runtime: "arktype" to precompile, or remove ${option}.`

// a host replacing arktype for every importer, which can't leave one on it
export const refuseArktypeDependencies = (
	opts: Pick<PrecompileOptions, "dependencies"> | undefined,
	host: string
): void => {
	const name = onArktypeOf(opts?.dependencies)
	if (name) throwError(writeArktypeDependencyHostMessage(name, host))
}

export const writeArktypeDependencyHostMessage = (
	name: string,
	host: string
): string =>
	`precompile.dependencies runs ${name} on arktype, which ${host} can't, as it replaces arktype for every importer. Set it to "aot" if its Types are static, or build with ${host === "Turbopack" ? "webpack (next build --webpack)" : "Bun.build and precompile.bun()"}, or with runtime: "arktype".`

// a host that transforms a module before it can read the whole bundle
export const refusePrune = (
	opts: Pick<PrecompileOptions, "prune"> | undefined,
	host: string
): void => {
	if (opts?.prune === true) throwError(writePruneHostMessage(host))
}

export const pruneBeforePluginMessage =
	"prune: true needs arktype's plugin last among esbuild's plugins, so no plugin loads a module after it reads the bundle, so move it last or remove prune: true"

export const writePruneHostMessage = (host: string): string =>
	`prune: true needs a bundler that reads the whole bundle before it transforms a module, as Vite, Rollup, Rolldown and esbuild do, which ${host} doesn't, so remove it`

export const writeSettingsConflictMessage = (
	manifest: string,
	arkJson: string
): string =>
	`${manifest} sets "ark" and ${arkJson} is beside it, so the build can't tell which sets its options. Move ark.json's contents under package.json's "ark" key, or delete that key.`

export const writeUnresolvedDependencyMessage = (
	name: string,
	project: string
): string =>
	`precompile.dependencies names ${name}, which can't be resolved from ${project}. Name a package the program depends on.`

export const writeVariantDependencyMessage = (
	name: string,
	variant: RuntimeVariant
): string =>
	`${name} runs on arktype, whose errors aren't instances of type.errors under ${writeVariantOption(variant)}. Precompile it with "aot" if its Types are static, or build ${writeWithoutVariant(variant)}.`
