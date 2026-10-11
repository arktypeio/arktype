import { serializePrimitive, throwParseError } from "@ark/util"
import type { ArkSchemaConfig, ResolvedConfig } from "./config.ts"
import {
	enInfo,
	intersectionWriters,
	writeMessage,
	writeProblem,
	type errorWritersOf
} from "./shared/errorWriters.ts"
import type {
	ActualWriter,
	ArkErrorCode,
	ExpectedWriter
} from "./shared/errors.ts"
import type { Locale } from "./shared/locale.ts"

export {
	afterWriters,
	beforeWriters,
	describePredicate,
	discriminantWriters,
	divisorWriters,
	domainWriters,
	exactLengthWriters,
	intersectionWriters,
	maxLengthWriters,
	maxWriters,
	minLengthWriters,
	minWriters,
	patternWriters,
	predicateWriters,
	protoWriters,
	requiredWriters,
	undeclaredWriters,
	unionWriters,
	unitWriters,
	writePredicateActual,
	writePredicateExpected,
	writePredicateProblem,
	writeProblem
} from "./shared/errorWriters.ts"
export * from "./shared/errors.ts"
export {
	supportedJsonSchemaTargets,
	validateStandardJsonSchemaTarget
} from "./shared/jsonSchema.ts"
export * from "./shared/transform.ts"
export * from "./shared/traversal.ts"
export { describeBranches, expressBranches, isAbsent } from "./shared/utils.ts"
export { arrayIndexMatcher } from "./structure/shared.ts"

export type ErrorWritersByCode = {
	[code in ArkErrorCode]?: errorWritersOf<code>
}

// node error contexts carry their descriptions, so expected reads them rather than describing a node
const writeExpected: ExpectedWriter = ctx => ctx.description!

// data no writer of its code describes is a string or a number, unless printing configured its validator
const writeActual: ActualWriter = data => serializePrimitive(data as never)

const registered: { [code in ArkErrorCode]?: ResolvedConfig[code] } = {}

// frozen when the first validator is created, as arktype fixes its config when the first Type is
export const runtimeConfig: ResolvedConfig = Object.assign(
	Object.create(registered),
	{
		// errors are built without generating code, so validation never needs eval
		jitless: true,
		onFail: null,
		// en's writers don't read it, and inEn and configure() give en to writers that may
		locale: Object.freeze({})
	}
)

const resolveWriters = (
	code: ArkErrorCode,
	writers: object,
	configured?: object
): object =>
	Object.freeze({
		expected: writeExpected,
		actual: writeActual,
		problem: writeProblem,
		message: writeMessage,
		...writers,
		...programConfig?.[code],
		...configured
	})

const register = (code: ArkErrorCode, writers: object): void => {
	if (!registered[code]) {
		Object.defineProperty(registered, code, {
			value: resolveWriters(code, writers),
			enumerable: true
		})
	}
}

export const raising = (
	config: ResolvedConfig,
	writersByCode: ErrorWritersByCode
): ResolvedConfig => {
	// errors at one path are grouped into an intersection
	register("intersection", intersectionWriters)
	let code: ArkErrorCode
	for (code in writersByCode) register(code, writersByCode[code]!)
	return config
}

export const printing = (
	config: ResolvedConfig,
	printer: (data: unknown) => string
): ResolvedConfig => {
	const descriptors: PropertyDescriptorMap = {}
	let code: ArkErrorCode
	for (code in registered) {
		const writers = config[code]
		if (writers.actual === writeActual) {
			descriptors[code] = {
				value: Object.freeze({ ...writers, actual: printer }),
				enumerable: true
			}
		}
	}
	return Object.freeze(Object.create(config, descriptors))
}

export const inEn = (config: ResolvedConfig): ResolvedConfig =>
	Object.freeze(Object.create(config, { locale: { value: enInfo } }))

export const scopeConfig = (overridesByCode: {
	[code in ArkErrorCode]?: [writers: object, overrides: object]
}): ResolvedConfig => {
	const descriptors: PropertyDescriptorMap = {}
	let code: ArkErrorCode
	for (code in overridesByCode) {
		const [writers, overrides] = overridesByCode[code]!
		// defined, since assigning would fail on the code's writers it inherits
		descriptors[code] = {
			value: resolveWriters(code, writers, overrides),
			enumerable: true
		}
	}
	return Object.freeze(Object.create(runtimeConfig, descriptors))
}

// a node shape's $, which traversal reads only for its config
export const runtimeScope: { resolvedConfig: ResolvedConfig } = Object.freeze({
	resolvedConfig: runtimeConfig
})

let configuredFingerprint: string | undefined
let recheck: (() => unknown) | undefined
let programConfig: ArkSchemaConfig | undefined
let configureIslands: ((config: ArkSchemaConfig) => unknown) | undefined

export const configure = (
	config: ArkSchemaConfig,
	fingerprint?: string
): ArkSchemaConfig => {
	// arktype fixes its configuration at its first Type, and a module the build didn't transform, like a dependency's, can configure it too, which merges what the runtime keeps apart
	if (Object.isFrozen(runtimeConfig) || configuredFingerprint !== undefined)
		return throwParseError(reconfiguredMessage)
	const received = fingerprintOf(config)
	// a loader or plugin can change a module the configuration reads after the build read it
	if (fingerprint !== undefined && fingerprint !== received)
		return throwParseError(configuredUnlikeBuildMessage)
	configureIslands?.(config)
	if ("onFail" in config)
		(runtimeConfig as { onFail: unknown }).onFail = config.onFail
	;(runtimeConfig as { locale: Locale.Info }).locale = enInfo
	// a call the build didn't transform, like a dependency's, can hold other functions under the same values
	configuredFingerprint = fingerprint ?? ""
	// the program can write what configure() received before arktype would read it, as a keyword's meta when the keyword is created
	recheck = () =>
		fingerprintOf(config) === received ?
			// only once it passes, so a validator after a caught throw checks again
			(recheck = undefined)
		:	throwParseError(writtenConfigMessage)
	// arktype copies a code's writers when configure() is called, so a later write reaches neither
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

export const fixConfig = (
	...configured: [] | [fingerprint: string, path: string]
): void => {
	recheck?.()
	Object.freeze(runtimeConfig)
	const [fingerprint, path] = configured
	if (fingerprint === configuredFingerprint) return
	throwParseError(
		path === undefined || configuredFingerprint !== undefined ?
			configMismatchMessage
		:	writeCreatedBeforeConfigureMessage(path)
	)
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
