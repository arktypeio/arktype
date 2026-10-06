import { ensureDir, fromCwd } from "@ark/fs"
import { tryParseNumber, type JsonObject } from "@ark/util"
import { existsSync } from "node:fs"
import { join, resolve } from "node:path"
import type * as prettier from "prettier"

export type BenchErrorConfig = "runtime" | "types" | boolean

type BaseAttestConfig = {
	tsconfig: string | null | undefined
	/** compilerOptions as they would be written in tsconfig.json */
	compilerOptions: JsonObject
	updateSnapshots: boolean
	failOnMissingSnapshots: boolean
	skipTypes: boolean
	skipInlineInstantiations: boolean
	attestAliases: string[]
	benchPercentThreshold: number
	benchErrorOnThresholdExceeded: BenchErrorConfig
	filter: string | undefined
	testDeclarationAliases: string[]
	formatCmd: string
	shouldFormat: boolean
	/**
	 *  Provided options will override the following defaults.
	 *  Any options not listed will fallback to Prettier's default value.
	 *
	 * {
	 *	 semi: false,
	 *	 printWidth: 60,
	 *	 trailingComma: "none",
	 * }
	 */
	typeToStringFormat: prettier.Options
}

export type AttestConfig = Partial<BaseAttestConfig>

export const getDefaultAttestConfig = (): BaseAttestConfig => ({
	tsconfig:
		existsSync(fromCwd("tsconfig.json")) ? fromCwd("tsconfig.json") : undefined,
	compilerOptions: {},
	attestAliases: ["attest", "attestInternal"],
	failOnMissingSnapshots: "CI" in process.env,
	updateSnapshots: false,
	skipTypes: false,
	skipInlineInstantiations: false,
	benchPercentThreshold: 20,
	benchErrorOnThresholdExceeded: true,
	filter: undefined,
	testDeclarationAliases: ["bench", "it", "test"],
	formatCmd: `npm exec --no -- prettier --write`,
	shouldFormat: true,
	typeToStringFormat: {}
})

const flagAliases: { [k in keyof AttestConfig]?: string[] } = {
	updateSnapshots: ["u", "update"]
}

const findParamIndex = (flagOrAlias: string) =>
	process.argv.findIndex(
		arg => arg === `-${flagOrAlias}` || arg === `--${flagOrAlias}`
	)

const hasFlag = (flag: keyof AttestConfig) =>
	findParamIndex(flag) !== -1 ||
	flagAliases[flag]?.some(alias => findParamIndex(alias) !== -1)

const getParamValue = (param: keyof AttestConfig) => {
	let paramIndex = findParamIndex(param)
	if (paramIndex === -1) {
		if (!flagAliases[param]) return

		for (let i = 0; i < flagAliases[param].length && paramIndex === -1; i++)
			paramIndex = findParamIndex(flagAliases[param][i])

		if (paramIndex === -1) return
	}

	const raw = process.argv[paramIndex + 1]
	if (raw === "true") return true

	if (raw === "false") return false

	if (raw === "null") return null

	if (param === "benchPercentThreshold")
		return tryParseNumber(raw, { errorOnFail: true })

	if (param === "attestAliases") return raw.split(",")

	if (param === "typeToStringFormat" || param === "compilerOptions")
		return JSON.parse(raw)

	return raw
}

export const attestEnvPrefix = "ATTEST_"

const addEnvConfig = (config: BaseAttestConfig) => {
	for (const [k, v] of Object.entries(process.env as Record<string, string>)) {
		if (k.startsWith(attestEnvPrefix)) {
			const optionName = k.slice(attestEnvPrefix.length)
			if (optionName === "CONFIG") Object.assign(config, JSON.parse(v))
			else (config as any)[optionName] = JSON.parse(v)
		}
	}
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
	assertionCachePath: string
}

const parseConfig = (): ParsedAttestConfig => {
	const cacheDir = resolve(".attest")
	return Object.assign(addEnvConfig(getDefaultAttestConfig()), {
		cacheDir,
		assertionCachePath: join(cacheDir, "assertions.json")
	})
}

let cachedConfig: ParsedAttestConfig | undefined

export const getConfig = (): ParsedAttestConfig => parseConfig()

// workaround for a bug in Node 25 that creates localStorage as an empty proxy,
// leading to @typescript/vfs eventually throwing when it sees that it is not
// undefined and tries to call `getItem`:

// https://github.com/nodejs/node/issues/60303

// this can be removed once the bug is addressed in Node
if (!globalThis.localStorage?.getItem)
	globalThis.localStorage = undefined as never

export const ensureCacheDirs = (): void => {
	cachedConfig ??= getConfig()
	ensureDir(cachedConfig.cacheDir)
}
