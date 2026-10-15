import { throwParseError, type Fn } from "@ark/util"
import type { ArkSchemaConfig, ResolvedConfig } from "./config.ts"

export type {
	ArkError,
	ArkErrorCode,
	ArkErrorInput,
	ErrorContextsByCode
} from "./shared/errors.ts"
export { describePredicate } from "./shared/errorWriters.ts"
export * from "./shared/issues.ts"
export {
	supportedJsonSchemaTargets,
	validateStandardJsonSchemaTarget
} from "./shared/jsonSchema.ts"
export * from "./shared/transform.ts"
export * from "./shared/traversal.ts"
export { isAbsent } from "./shared/utils.ts"
export { arrayIndexMatcher } from "./structure/shared.ts"

// frozen when the first validator is created, as arktype fixes its config when the first Type is
export const runtimeConfig: ResolvedConfig = {
	// validation never generates code, so it never needs eval
	jitless: true,
	onFail: null
} as never

// a node shape's $, which traversal reads only for its config
export const runtimeScope: { resolvedConfig: ResolvedConfig } =
	/* @__PURE__ */ Object.freeze({
		resolvedConfig: runtimeConfig
	})

// installed by configure(), so a program that never calls it ships no comparison
let checkConfigured: ((built?: string) => void) | undefined
let programConfig: ArkSchemaConfig | undefined
let configureIslands: ((config: ArkSchemaConfig) => unknown) | undefined

export const configure = (
	config: ArkSchemaConfig,
	fingerprint?: string
): ArkSchemaConfig => {
	// arktype fixes its configuration at its first Type, and a module the build didn't transform, like a dependency's, can configure it too, which merges what the runtime keeps apart
	if (Object.isFrozen(runtimeConfig) || checkConfigured)
		return throwParseError(reconfiguredMessage)
	const received = fingerprintOf(config)
	// a loader or plugin can change a module the configuration reads after the build read it
	if (fingerprint !== undefined && fingerprint !== received)
		return throwParseError(configuredUnlikeBuildMessage)
	configureIslands?.(config)
	if ("onFail" in config)
		(runtimeConfig as { onFail: unknown }).onFail = config.onFail
	let isRechecked = false
	checkConfigured = built => {
		// the program can write what configure() received before arktype would read it, as a keyword's meta when the keyword is created
		if (!isRechecked && fingerprintOf(config) !== received)
			throwParseError(writtenConfigMessage)
		// only once it passes, so a validator after a caught throw checks again
		isRechecked = true
		// a call the build didn't transform, like a dependency's, can hold other functions under the same values
		if (fingerprint === undefined || built !== fingerprint)
			throwParseError(configMismatchMessage)
	}
	// arktype copies what configure() receives when it's called, so an island's arktype configured later receives that copy
	const held: Record<string, unknown> = {}
	for (const k in config) {
		const v = (config as Record<string, unknown>)[k]
		held[k] = v && typeof v === "object" ? { ...v } : v
	}
	programConfig = held
	return config
}

// the configuration's values apart from its functions, which the runtime can't compare with the build's
export const fingerprintOf = (config: object): string => {
	const text = staticTextOf(config, [])
	// two 32-bit lanes, since a check for equality needs texts apart in the state but not its bits spread
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
	// an object reached again is named by its first visit, so shared and copied objects hash apart
	const index = seen.indexOf(value)
	if (index !== -1) return `#${index}`
	seen.push(value)
	if (typeof value === "function") return "function"
	const tag = Object.prototype.toString.call(value)
	// listed here, since a bundler keeps a module-level read of a prototype even where nothing configures
	const builtins = [
		null,
		Object.prototype,
		Array.prototype,
		Date.prototype,
		RegExp.prototype
	]
	// arktype keeps what a keyword's meta holds by reference, so the program can read any key of it, inherited or not
	const enumerable: PropertyKey[] = []
	for (const k in value) enumerable.push(k)
	let entries = ""
	for (const k of new Set([...enumerable, ...Reflect.ownKeys(value)])) {
		entries += `${enumerable.includes(k) ? "" : "~"}${JSON.stringify(
			// a symbol prints as its registered name in an array, or `[null]`, which the build refuses to stamp
			typeof k === "symbol" ? [Symbol.keyFor(k)] : k
		)}:${staticTextOf((value as Record<PropertyKey, unknown>)[k], seen)},`
	}
	// the prototype, since an own Symbol.toStringTag can give any object a builtin's tag
	return `${tag}${builtins.indexOf(Object.getPrototypeOf(value))}${
		tag === "[object Date]" ? Number(value)
		: tag === "[object RegExp]" ? `${value}`
		: ""
	}{${entries}}`
}

// V8 compiles a parenthesized function as the module loads, and `satisfies` keeps the parens through prettier
export const fixConfig = ((): void => {
	Object.freeze(runtimeConfig)
	checkConfigured?.()
}) satisfies Fn

export const fixConfigured = (fingerprint: string, path: string): void => {
	Object.freeze(runtimeConfig)
	if (!checkConfigured)
		return throwParseError(writeCreatedBeforeConfigureMessage(path))
	checkConfigured(fingerprint)
}

// a runtime island's arktype takes the configuration whether its config module runs before or after the island loads
export const shareConfig = (
	configureArktype: (config: ArkSchemaConfig) => unknown
): void => {
	configureIslands = configureArktype
	if (programConfig) configureArktype(programConfig)
}

export const configuredUnlikeBuildMessage =
	"configure() receives other values than its build precompiled under, as when a loader or plugin changes a module the configuration reads: precompile after it"

export type configuredUnlikeBuildMessage = typeof configuredUnlikeBuildMessage

export const reconfiguredMessage =
	"a standalone program calls configure() once, in its config module, before any Type is created"

export type reconfiguredMessage = typeof reconfiguredMessage

export const writtenConfigMessage =
	"what configure() received was written after the call, so the build precompiled other values: finish writing it before calling configure()"

export type writtenConfigMessage = typeof writtenConfigMessage

export const configMismatchMessage =
	"an artifact runs only under its build's configuration, from the configure() call the build transformed"

export type configMismatchMessage = typeof configMismatchMessage

export const writeCreatedBeforeConfigureMessage = <path extends string>(
	path: path
): writeCreatedBeforeConfigureMessage<path> =>
	`a Type precompiled in ${path} under the program's configuration is created before configure() runs: import the config module first, and create no Type while it loads`

export type writeCreatedBeforeConfigureMessage<path extends string> =
	`a Type precompiled in ${path} under the program's configuration is created before configure() runs: import the config module first, and create no Type while it loads`
