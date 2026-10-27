import { throwParseError, type Fn } from "@ark/util"
import type { ArkSchemaConfig, ResolvedConfig } from "./config.ts"

export type {
	ArkError,
	ArkErrorCode,
	ArkErrorInput,
	ErrorContextsByCode
} from "./shared/errors.ts"
export * from "./shared/enWriters.ts"
export * from "./shared/issues.ts"
export {
	supportedJsonSchemaTargets,
	validateStandardJsonSchemaTarget
} from "./shared/jsonSchema.ts"
export * from "./shared/transform.ts"
export * from "./shared/traversal.ts"
export { arrayIndexMatcher } from "./structure/shared.ts"

// frozen when the first validator is created
export const runtimeConfig: ResolvedConfig = {
	// validation never generates code, so it never needs eval
	jitless: true,
	onFail: null
} as never

// the $ a node shape reads its config from
export const runtimeScope: { cfg: ResolvedConfig } =
	/* @__PURE__ */ Object.freeze({
		cfg: runtimeConfig
	})

// set by configure()
let checkConfigured: ((built?: string) => void) | undefined
let programConfig: ArkSchemaConfig | undefined
let configureIslands: ((config: ArkSchemaConfig) => unknown) | undefined

export const configure = (
	config: ArkSchemaConfig,
	fingerprint?: string
): ArkSchemaConfig => {
	// arktype's config is fixed at its first Type
	if (Object.isFrozen(runtimeConfig) || checkConfigured)
		return throwParseError(reconfiguredMessage)
	const received = fingerprintOf(config)
	// a loader can rewrite the config module after the build read it
	if (fingerprint !== undefined && fingerprint !== received)
		return throwParseError(configuredUnlikeBuildMessage)
	configureIslands?.(config)
	if ("onFail" in config)
		(runtimeConfig as { onFail: unknown }).onFail = config.onFail
	let isRechecked = false
	checkConfigured = built => {
		// configure()'s argument may be written after the call
		if (!isRechecked && fingerprintOf(config) !== received)
			throwParseError(writtenConfigMessage)
		// only once it passes, so a validator after a caught throw checks again
		isRechecked = true
		// an untransformed call, e.g. a dependency's, has no fingerprint
		if (fingerprint === undefined || built !== fingerprint)
			throwParseError(configMismatchMessage)
	}
	// copied, as arktype copies configure()'s argument
	const held: Record<string, unknown> = {}
	for (const k in config) {
		const v = (config as Record<string, unknown>)[k]
		held[k] = v && typeof v === "object" ? { ...v } : v
	}
	programConfig = held
	return config
}

// a writer the program configured for a code, read once configure() runs
export const configuredWriterOf =
	(code: string, k: string) =>
	(...args: unknown[]): unknown =>
		(programConfig as Record<string, Record<string, Fn>>)[code][k](...args)

// hashes the config's static values; functions can't be compared
export const fingerprintOf = (config: object): string => {
	const text = staticTextOf(config, [])
	let a = 1
	let b = 2
	for (let i = 0; i < text.length; i++) {
		a = Math.imul(a ^ text.charCodeAt(i), 2654435761)
		b = Math.imul(b ^ text.charCodeAt(i), 1597334677)
	}
	return `${(a >>> 0).toString(36)}_${(b >>> 0).toString(36)}`
}

const staticTextOf = (value: unknown, seen: unknown[]): string => {
	if (
		value === null ||
		(typeof value !== "object" && typeof value !== "function")
	) {
		return (
			typeof value === "string" ? JSON.stringify(value)
			: typeof value === "bigint" ? `${value}n`
			: Object.is(value, -0) ? "-0"
			: String(value)
		)
	}
	// a repeated object is named by its first visit
	const index = seen.indexOf(value)
	if (index !== -1) return `#${index}`
	seen.push(value)
	if (typeof value === "function") return "function"
	const tag = Object.prototype.toString.call(value)
	const builtins = [
		null,
		Object.prototype,
		Array.prototype,
		Date.prototype,
		RegExp.prototype
	]
	// inherited enumerable keys count too
	const enumerable: PropertyKey[] = []
	for (const k in value) enumerable.push(k)
	let entries = ""
	for (const k of new Set([...enumerable, ...Reflect.ownKeys(value)])) {
		entries += `${enumerable.includes(k) ? "" : "~"}${JSON.stringify(
			// a symbol key prints as its registered name
			typeof k === "symbol" ? [Symbol.keyFor(k)] : k
		)}:${staticTextOf((value as Record<PropertyKey, unknown>)[k], seen)},`
	}
	// the prototype, since Symbol.toStringTag can fake the tag
	return `${tag}${builtins.indexOf(Object.getPrototypeOf(value))}${
		tag === "[object Date]" ? Number(value)
		: tag === "[object RegExp]" ? `${value}`
		: ""
	}{${entries}}`
}

// satisfies keeps the parens prettier would drop
export const fixConfig = ((): void => {
	Object.freeze(runtimeConfig)
	checkConfigured?.()
}) satisfies Fn

export const fixConfigured = (
	fingerprint: string,
	path: string,
	config: string
): void => {
	Object.freeze(runtimeConfig)
	if (!checkConfigured)
		return throwParseError(writeCreatedBeforeConfigureMessage(path, config))
	checkConfigured(fingerprint)
}

// an island takes the config whichever loads first
export const shareConfig = (
	configureArktype: (config: ArkSchemaConfig) => unknown
): void => {
	configureIslands = configureArktype
	if (programConfig) configureArktype(programConfig)
}

export const configuredUnlikeBuildMessage =
	"configure() received values other than its build's"

export const reconfiguredMessage =
	"configure() must be called once, before any Type is created"

export const writtenConfigMessage =
	"configure()'s argument was modified after it was called"

export const configMismatchMessage =
	"an artifact must run under the configuration it was built with"

// config is the config module's specifier from path
export const writeCreatedBeforeConfigureMessage = <
	path extends string,
	config extends string
>(
	path: path,
	config: config
): writeCreatedBeforeConfigureMessage<path, config> =>
	`${path} creates a Type before configure() runs
  Import the config module before any module that creates a Type: first in the entry or test setup file that loads ${path}, or at the top of ${path}:
  import "${config}"`

export type writeCreatedBeforeConfigureMessage<
	path extends string,
	config extends string
> = `${path} creates a Type before configure() runs
  Import the config module before any module that creates a Type: first in the entry or test setup file that loads ${path}, or at the top of ${path}:
  import "${config}"`
