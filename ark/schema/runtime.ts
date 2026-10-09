import { flatMorph, throwParseError, type mutable } from "@ark/util"
import type { ArkSchemaConfig, ResolvedConfig } from "./config.ts"
import {
	enInfo,
	errorWriters,
	errorWritersByCode
} from "./shared/errorWriters.ts"
import {
	configureAfterTypeMessage,
	type ArkErrorCode,
	type ExpectedWriter
} from "./shared/errors.ts"
import type { Locale } from "./shared/locale.ts"
import { configureLocale, defaultConfig } from "./shared/render.ts"

export { describePredicate } from "./shared/errorWriters.ts"
export * from "./shared/errors.ts"
export * from "./shared/transform.ts"
export * from "./shared/traversal.ts"
export { isAbsent } from "./shared/utils.ts"
export { arrayIndexMatcher } from "./structure/shared.ts"

// node error contexts carry their descriptions, so expected reads them rather than describing a node
const writeExpected: ExpectedWriter = ctx => ctx.description!

// en, as far as the runtime's writers and those a program configures read it
export const runtimeLocale = {
	keywordPhrases: {} as Record<string, Locale.KeywordPhrase>,
	...enInfo,
	...errorWriters
}

// frozen when the first validator is created, as arktype fixes its config when the first Type is
export const runtimeConfig: ResolvedConfig = {
	...flatMorph(errorWritersByCode, (code, writers) => [
		code,
		Object.freeze({ expected: writeExpected, ...errorWriters, ...writers })
	]),
	// errors are copied without generating code, so validation never needs eval
	jitless: true,
	onFail: null,
	locale: runtimeLocale
} as never

// unless arktype has resolved its config, which sets the locale itself
if (defaultConfig === undefined) configureLocale(undefined, runtimeConfig)

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
	const resolved: mutable<ResolvedConfig> = runtimeConfig
	let code: ArkErrorCode
	for (code in errorWritersByCode) {
		if (config[code]) {
			resolved[code] = Object.freeze({
				...resolved[code],
				...config[code]
			}) as never
		}
	}
	if ("onFail" in config) resolved.onFail = config.onFail
	configuredFingerprint = fingerprint
	programConfig = config
	return config
}

export const fixConfig = (
	...configured: [] | [fingerprint: string, path: string]
): void => {
	Object.freeze(runtimeLocale.keywordPhrases)
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
	`a Type precompiled in ${path} under the program's configuration is created before configure() runs, so the config module must be imported first`

export type writeCreatedBeforeConfigureMessage<path extends string> =
	`a Type precompiled in ${path} under the program's configuration is created before configure() runs, so the config module must be imported first`
