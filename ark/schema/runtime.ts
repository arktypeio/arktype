import { hashOf, serializePrimitive, throwParseError } from "@ark/util"
import type { ArkSchemaConfig, ResolvedConfig } from "./config.ts"
import {
	enInfo,
	intersectionWriters,
	writeMessage,
	writeProblem,
	type errorWritersOf
} from "./shared/errorWriters.ts"
import {
	configureAfterTypeMessage,
	type ActualWriter,
	type ArkErrorCode,
	type ExpectedWriter
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
export { isAbsent } from "./shared/utils.ts"
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
let configuredValue: object | undefined
let programConfig: ArkSchemaConfig | undefined
let configureIslands: ((config: ArkSchemaConfig) => unknown) | undefined

export const configure = (
	config: ArkSchemaConfig,
	fingerprint?: string
): ArkSchemaConfig => {
	if (Object.isFrozen(runtimeConfig))
		return throwParseError(configureAfterTypeMessage)
	const received = fingerprintOf(config)
	// a loader or plugin can change a module the configuration reads after the build read it
	if (fingerprint !== undefined && fingerprint !== received)
		return throwParseError(configuredUnlikeBuildMessage)
	// a module the build didn't transform, like a dependency's, can configure arktype too, which merges what the runtime keeps apart
	if (configuredFingerprint !== undefined && configuredFingerprint !== received)
		return throwParseError(reconfiguredMessage)
	configureIslands?.(config)
	if ("onFail" in config)
		(runtimeConfig as { onFail: unknown }).onFail = config.onFail
	;(runtimeConfig as { locale: Locale.Info }).locale = enInfo
	configuredFingerprint = received
	configuredValue = config
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
export const fingerprintOf = (config: object): string =>
	hashOf(staticTextOf(config, []))

const staticTextOf = (value: unknown, seen: object[]): string => {
	if (typeof value === "function") return "function"
	if (typeof value !== "object" || value === null) {
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
	const tag = Object.prototype.toString.call(value)
	const prototype = Object.getPrototypeOf(value)
	let entries = ""
	// arktype merges a configuration's inherited keys too
	for (const k in value)
		entries += `${JSON.stringify(k)}:${staticTextOf((value as Record<string, unknown>)[k], seen)},`
	return `${tag}${builtinPrototypes.includes(prototype) ? "" : "instance"}${
		tag === "[object Date]" ? Number(value)
		: tag === "[object RegExp]" ? `${value}${(value as RegExp).lastIndex}`
		: ""
	}{${entries}}`
}

const builtinPrototypes: unknown[] = [
	null,
	Object.prototype,
	Array.prototype,
	Date.prototype,
	RegExp.prototype
]

export const fixConfig = (
	...configured: [] | [fingerprint: string, path: string]
): void => {
	// the program can write what configure() received before arktype would read it, as a keyword's meta when the keyword is created
	if (
		!Object.isFrozen(runtimeConfig) &&
		configuredValue &&
		fingerprintOf(configuredValue) !== configuredFingerprint
	)
		throwParseError(writtenConfigMessage)
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
	"configure() receives other values than its build precompiled under, as when a loader or plugin changes a module the configuration reads, so the build's Types can't run under it"

export type configuredUnlikeBuildMessage = typeof configuredUnlikeBuildMessage

export const reconfiguredMessage =
	"configure() is called again with other values, which arktype merges with the first call's but a standalone build can't precompile under"

export type reconfiguredMessage = typeof reconfiguredMessage

export const writtenConfigMessage =
	"what configure() received was written before the first validator was created, so the build's Types, precompiled under its earlier values, can't run under it"

export type writtenConfigMessage = typeof writtenConfigMessage

export const configMismatchMessage =
	"an artifact precompiled under another configuration can't run under this one, so it must be rebuilt"

export type configMismatchMessage = typeof configMismatchMessage

export const writeCreatedBeforeConfigureMessage = <path extends string>(
	path: path
): writeCreatedBeforeConfigureMessage<path> =>
	`a Type precompiled in ${path} under the program's configuration is created before configure() runs: import the config module first, and create no Type while it loads`

export type writeCreatedBeforeConfigureMessage<path extends string> =
	`a Type precompiled in ${path} under the program's configuration is created before configure() runs: import the config module first, and create no Type while it loads`
