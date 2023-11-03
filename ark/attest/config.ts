import { existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { ensureDir, fromCwd } from "@arktype/fs"

export type AttestConfig = {
	tsconfig: string | undefined
	preserveCache: boolean
	updateSnapshots: boolean
	skipTypes: boolean
	benchPercentThreshold: number
	benchErrorOnThresholdExceeded: boolean
	cacheDir: string
	assertionCacheFile: string
	snapCacheDir: string
	benchSnapCacheDir: string
	filter: string | undefined
}

export type AttestOptions = Partial<AttestConfig>

const getDefaultConfig = (): AttestConfig => {
	const cacheDir = resolve(".attest")
	const snapCacheDir = join(cacheDir, "snaps")
	const benchSnapCacheDir = join(cacheDir, "benchSnaps")
	const assertionCacheFile = join(cacheDir, "assertions.json")
	return {
		tsconfig: existsSync(fromCwd("tsconfig.json"))
			? fromCwd("tsconfig.json")
			: undefined,
		preserveCache: false,
		updateSnapshots: false,
		skipTypes: false,
		benchPercentThreshold: 20,
		benchErrorOnThresholdExceeded: false,
		cacheDir,
		snapCacheDir,
		benchSnapCacheDir,
		assertionCacheFile,
		filter: undefined
	}
}

const hasFlag = (flag: string) => process.argv.some((arg) => arg.includes(flag))

const getParamValue = (param: string) => {
	const paramIndex = process.argv.findIndex((arg) => arg.includes(param))
	if (paramIndex === -1) {
		return undefined
	}
	const value = process.argv[paramIndex + 1]
	return value === "true"
		? true
		: value === "false"
		? false
		: parseFloat(value) ?? value
}

const addEnvConfig = (config: AttestConfig) => {
	if (process.env.ATTEST_CONFIG) {
		Object.assign(config, JSON.parse(process.env.ATTEST_CONFIG))
	}
	let k: keyof AttestConfig
	for (k in config) {
		if (config[k] === false) {
			config[k] = hasFlag(k) as never
		} else {
			const value = getParamValue(k)
			if (value !== undefined) {
				config[k] = value as never
			}
		}
	}
	return config
}

const cachedConfig: AttestConfig = addEnvConfig(getDefaultConfig())

export const getConfig = (): AttestConfig => cachedConfig

export const ensureCacheDirs = () => {
	ensureDir(cachedConfig.cacheDir)
	ensureDir(cachedConfig.snapCacheDir)
	ensureDir(cachedConfig.benchSnapCacheDir)
}
