import { serializePrimitive, throwParseError } from "@ark/util"
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
export * from "./shared/transform.ts"
export * from "./shared/traversal.ts"
export { isAbsent } from "./shared/utils.ts"
export { arrayIndexMatcher } from "./structure/shared.ts"

export type ErrorWritersByCode = {
	[code in ArkErrorCode]?: errorWritersOf<code>
}

// node error contexts carry their descriptions, so expected reads them rather than describing a node
const writeExpected: ExpectedWriter = ctx => ctx.description!

// data no writer of its code describes is a string or a number, unless a callback raised its error
let printActual: (data: unknown) => string = data =>
	serializePrimitive(data as never)

const writeActual: ActualWriter = data => printActual(data)

// what writers configure() is passed receive of en, which en's own don't read
export const runtimeLocale: Locale.Info = {} as never

// en's writers of each code a validator can raise, added as validators are created, which every config reads as its prototype's
const registered: Partial<ResolvedConfig> = {}

// frozen when the first validator is created, as arktype fixes its config when the first Type is
export const runtimeConfig: ResolvedConfig = Object.assign(
	Object.create(registered),
	{
		// errors are built without generating code, so validation never needs eval
		jitless: true,
		onFail: null,
		locale: runtimeLocale
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

/**
 * registers en's writers of each code a validator can raise, and the printer
 * of data they don't describe if it may be other than a string or number,
 * returning the validator's config
 */
export const raising = (
	config: ResolvedConfig,
	writersByCode: ErrorWritersByCode,
	printer?: (data: unknown) => string
): ResolvedConfig => {
	if (printer) printActual = printer
	// errors at one path are grouped into an intersection
	register("intersection", intersectionWriters)
	let code: ArkErrorCode
	for (code in writersByCode) register(code, writersByCode[code]!)
	return config
}

/** a scope's config, whose writers for each code replace en's and the program's */
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
let programConfig: ArkSchemaConfig | undefined
let configureIslands: ((config: ArkSchemaConfig) => unknown) | undefined

export const configure = (
	config: ArkSchemaConfig,
	fingerprint?: string
): ArkSchemaConfig => {
	if (Object.isFrozen(runtimeConfig))
		return throwParseError(configureAfterTypeMessage)
	if (fingerprint === undefined)
		return throwParseError(untransformedConfigureMessage)
	configureIslands?.(config)
	if ("onFail" in config)
		(runtimeConfig as { onFail: unknown }).onFail = config.onFail
	Object.assign(runtimeLocale, enInfo)
	configuredFingerprint = fingerprint
	programConfig = config
	return config
}

export const fixConfig = (
	...configured: [] | [fingerprint: string, path: string]
): void => {
	Object.freeze(runtimeLocale)
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

export const untransformedConfigureMessage =
	"configure must be called from the module a standalone build's config option names, since it precompiles every Type under that configuration"

export type untransformedConfigureMessage = typeof untransformedConfigureMessage

export const configMismatchMessage =
	"an artifact precompiled under another configuration can't run under this one, so it must be rebuilt"

export type configMismatchMessage = typeof configMismatchMessage

export const writeCreatedBeforeConfigureMessage = <path extends string>(
	path: path
): writeCreatedBeforeConfigureMessage<path> =>
	`a Type precompiled in ${path} under the program's configuration is created before configure() runs: import the config module first, and create no Type while it loads`

export type writeCreatedBeforeConfigureMessage<path extends string> =
	`a Type precompiled in ${path} under the program's configuration is created before configure() runs: import the config module first, and create no Type while it loads`
