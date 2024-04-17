import { ensureDir, fromCwd } from "@arktype/fs"
import {
	arrayFrom,
	isArray,
	tryParseNumber,
	type autocomplete
} from "@arktype/util"
import { existsSync } from "node:fs"
import { join, resolve } from "node:path"
import {
	findAttestTypeScriptVersions,
	type TsVersionData
} from "./tsVersioning.js"

export type TsVersionAliases = autocomplete<"*"> | string[]

type BaseAttestConfig = {
	tsconfig: string | undefined
	updateSnapshots: boolean
	/** A string or list of strings representing the TypeScript version aliases to run.
	 *
	 * Aliases must be specified as a package.json dependency or devDependency beginning with "typescript".
	 * Alternate aliases can be specified using the "npm:" prefix:
	 * ```json
	 * 		"typescript": "latest",
	 * 		"typescript-next: "npm:typescript@next",
	 * 		"typescript-1": "npm:typescript@5.2"
	 * 		"typescript-2": "npm:typescript@5.1"
	 * ```
	 *
	 * "*" can be pased to run all discovered versions beginning with "typescript".
	 */
	tsVersions: TsVersionAliases | TsVersionData[]
	skipTypes: boolean
	skipInlineInstantiations: boolean
	attestAliases: string[]
	benchPercentThreshold: number
	benchErrorOnThresholdExceeded: boolean
	filter: string | undefined
	expressionsToFind: string[]
	inlineInstantiationMatcher: RegExp
	formatter: string
	shouldFormat: true
}

export type AttestConfig = Partial<BaseAttestConfig>

export const getDefaultAttestConfig = (): BaseAttestConfig => {
	return {
		tsconfig:
			existsSync(fromCwd("tsconfig.json")) ?
				fromCwd("tsconfig.json")
			:	undefined,
		attestAliases: ["attest", "attestInternal"],
		updateSnapshots: false,
		skipTypes: false,
		skipInlineInstantiations: false,
		tsVersions: "typescript",
		benchPercentThreshold: 20,
		benchErrorOnThresholdExceeded: false,
		filter: undefined,
		expressionsToFind: ["bench", "it"],
		inlineInstantiationMatcher: /attest.instantiations\(.*/g,
		formatter: `npm exec --no -- prettier --write`,
		shouldFormat: true
	}
}

const hasFlag = (flag: keyof AttestConfig) =>
	process.argv.some(arg => arg.includes(flag))

const getParamValue = (param: keyof AttestConfig) => {
	const paramIndex = process.argv.findIndex(arg => arg.includes(param))
	if (paramIndex === -1) return undefined

	const raw = process.argv[paramIndex + 1]
	if (raw === "true") return true

	if (raw === "false") return false

	if (param === "benchPercentThreshold")
		return tryParseNumber(raw, { errorOnFail: true })

	if (param === "tsVersions" || param === "attestAliases") return raw.split(",")

	return raw
}

export const attestEnvPrefix = "ATTEST_"

const addEnvConfig = (config: BaseAttestConfig) => {
	Object.entries(process.env as Record<string, string>).forEach(([k, v]) => {
		if (k.startsWith(attestEnvPrefix)) {
			const optionName = k.slice(attestEnvPrefix.length)
			if (optionName === "CONFIG") Object.assign(config, JSON.parse(v))
			else (config as any)[optionName] = JSON.parse(v)
		}
	})
	let k: keyof BaseAttestConfig
	for (k in config) {
		if (config[k] === false) config[k] = hasFlag(k) as never
		else {
			const value = getParamValue(k)
			if (value !== undefined) config[k] = value as never
		}
	}
	return config
}

export interface ParsedAttestConfig extends Readonly<BaseAttestConfig> {
	cacheDir: string
	assertionCacheDir: string
	defaultAssertionCachePath: string
	tsVersions: TsVersionData[]
}

const parseConfig = (): ParsedAttestConfig => {
	const baseConfig = addEnvConfig(getDefaultAttestConfig())
	const cacheDir = resolve(".attest")
	const assertionCacheDir = join(cacheDir, "assertions")
	const defaultAssertionCachePath = join(assertionCacheDir, "typescript.json")

	return Object.assign(baseConfig, {
		cacheDir,
		assertionCacheDir,
		defaultAssertionCachePath,
		tsVersions:
			baseConfig.skipTypes ? []
			: isTsVersionAliases(baseConfig.tsVersions) ?
				parseTsVersions(baseConfig.tsVersions)
			:	baseConfig.tsVersions
	})
}

const isTsVersionAliases = (
	v: AttestConfig["tsVersions"]
): v is TsVersionAliases =>
	typeof v === "string" || (isArray(v) && typeof v[0] === "string")

const parseTsVersions = (aliases: TsVersionAliases): TsVersionData[] => {
	const versions = findAttestTypeScriptVersions()
	if (aliases === "*") return versions

	return arrayFrom(aliases).map(alias => {
		const matching = versions.find(v => v.alias === alias)
		if (!matching) {
			throw new Error(
				`Specified TypeScript version ${alias} does not exist.` +
					` It should probably be specified in package.json like:
"typescript-${alias}": "npm:typescript@latest"`
			)
		}
		return matching
	})
}

const cachedConfig = parseConfig()

export const getConfig = (): ParsedAttestConfig => cachedConfig

export const ensureCacheDirs = (): void => {
	ensureDir(cachedConfig.cacheDir)
	ensureDir(cachedConfig.assertionCacheDir)
}
