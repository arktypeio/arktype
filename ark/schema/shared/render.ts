import { omit, stringifyPath, throwError } from "@ark/util"
import type { ResolvedConfig } from "../config.ts"
import {
	defaultConfig,
	registerLocaleRenderer,
	suppliedText,
	unrenderedLocaleMessage,
	unwrittenError,
	writeText,
	type ArkError
} from "./errors.ts"
import { keywordWriterOf, writeKeywordExpected, type Locale } from "./locale.ts"
import { $ark } from "./registry.ts"

type LocaleSelector = () => Locale | undefined

type ErrorSlot = "expected" | "actual" | "problem" | "message"

type SlotConfig = string | ((...args: never[]) => string)

/** defaultConfig's locale */
let defaultLocale: Locale.Complete

let selector: LocaleSelector | undefined

let configured: Locale

/**
 * sets the locale errors are written in from the one configure was last
 * passed, returning it if it isn't a function
 */
const configureLocale = (
	locale: Locale | LocaleSelector | undefined,
	base: ResolvedConfig
): Locale => {
	defaultLocale = base.locale as Locale.Complete
	if (typeof locale === "function") {
		selector = locale
		configured = defaultLocale
	} else {
		selector = undefined
		configured = locale === undefined ? defaultLocale : normalizeLocale(locale)
	}
	return configured
}

// a standalone runtime's locale is en's info alone, so it writes en even beside arktype
const isStandalone = (config: ResolvedConfig): boolean =>
	!("cite" in config.locale)

const select = (config: ResolvedConfig): Locale => {
	if (isStandalone(config)) return config.locale
	if (selector === undefined) return configured
	try {
		const locale = selector()
		return locale === undefined ? defaultLocale : normalizeLocale(locale)
	} catch {
		// a throw from a read would replace the TraversalError assert throws
		return defaultLocale
	}
}

const write = (error: ArkError, config: ResolvedConfig, locale: Locale) => {
	if (isStandalone(config)) {
		if (locale !== config.locale) throwError(unrenderedLocaleMessage)
		return writeText(error, config, locale)
	}
	locale = normalizeLocale(locale)
	if (locale === defaultLocale) return writeText(error, config, locale)
	const supplied = suppliedText(error, "expected")
	const expected = supplied ?? configOf(error, "expected", config)
	const cited = citesDescription(error) ? error.description : undefined
	// supplied text is cited like any other, unless it's no longer what was supplied
	if (error.expected === supplied) {
		error.expected =
			expected === defaultConfig[error.code].expected ?
				localeExpected(error, cited, config, locale)
			:	writeSlot(error, "expected", expected, locale)
	}
	error.actual ??= render(error, "actual", expected, cited, config, locale)
	error.problem ??= render(error, "problem", expected, cited, config, locale)
	error.message ??= render(error, "message", expected, cited, config, locale)
}

const render = (
	error: ArkError,
	slot: Exclude<ErrorSlot, "expected">,
	expected: SlotConfig,
	cited: string | undefined,
	config: ResolvedConfig,
	locale: Locale
): string => {
	const slotConfig = configOf(error, slot, config)
	return writeSlot(
		error,
		slot,
		slotConfig === defaultConfig[error.code][slot] ?
			localeWriter(error, slot, expected, cited, locale)
		:	slotConfig,
		locale
	)
}

const configOf = (
	error: ArkError,
	slot: ErrorSlot,
	config: ResolvedConfig
): SlotConfig =>
	error.meta?.[slot] ??
	config[error.code][slot] ??
	defaultConfig[error.code][slot]

// a discriminant's description lists cases unless its union's own value was described
const citesDescription = (error: ArkError): boolean =>
	(error.code !== "discriminant" ||
		(!error.onKey &&
			error.meta?.description !== undefined &&
			error.meta.keyword === undefined)) &&
	error.description !== undefined &&
	!isDefaultDescription(error, error.description)

const writeSlot = (
	error: ArkError,
	slot: ErrorSlot,
	config: SlotConfig,
	locale: Locale
): string =>
	typeof config === "string" ?
		slot === "expected" ?
			locale.cite(config)
		:	config
	: slot === "actual" ?
		config(error.data as never, error as never, locale as never)
	:	config(error as never, locale as never)

const localeWriter = (
	error: ArkError,
	slot: Exclude<ErrorSlot, "expected">,
	expected: SlotConfig,
	cited: string | undefined,
	locale: Locale
): SlotConfig => {
	if (cited !== undefined) {
		const keywordWriter = keywordWriterOf(error, locale, slot)
		if (keywordWriter !== undefined) return keywordWriter
	}
	const writer = locale[error.code][slot]
	if (writer === undefined) return locale[slot]
	// union and intersection frame their children's text, unless they cite their own description
	if (error.code === "union" || error.code === "intersection")
		return cited === undefined || slot === "actual" ? writer : locale[slot]
	// a code's own problem frames its locale's expected, not a keyword's phrase or authored text
	if (slot !== "problem") return writer
	return (
			cited !== undefined || expected !== defaultConfig[error.code].expected
		) ?
			locale.problem
		:	writer
}

const localeExpected = (
	error: ArkError,
	cited: string | undefined,
	config: ResolvedConfig,
	locale: Locale
): string => {
	if (cited !== undefined)
		return writeKeywordExpected(error as never, locale) ?? locale.cite(cited)
	const expected = locale[error.code].expected
	if (expected !== undefined) return writeExpected(error, expected, locale)
	// written whole in en, never as en's frame around the locale's text
	const inEn = unwrittenError(error)
	writeInEn(inEn, config, "expected")
	return inEn.expected
}

// only the slots its expected reads, so no writer is called twice
const writeInEn = (
	error: ArkError,
	config: ResolvedConfig,
	last: "expected" | "actual"
): void => {
	// a union's expected reads its children's actual
	if (error.code === "union" || error.code === "intersection") {
		for (const e of error.errors)
			writeInEn(e, config, error.code === "union" ? "actual" : "expected")
	}
	error.propString ??= stringifyPath(error.path)
	const expected = configOf(error, "expected", config)
	error.expected ??= writeExpected(error, expected as never, defaultLocale)
	if (last === "expected") return
	const actual = configOf(error, "actual", config)
	error.actual ??=
		typeof actual === "string" ? actual : (
			actual(error.data as never, error as never, defaultLocale as never)
		)
}

const writeExpected = (
	error: ArkError,
	expected: string | ((error: never, locale: Locale) => string),
	locale: Locale
): string =>
	typeof expected === "string" ? expected : expected(error as never, locale)

// whether description is arktype's default for the node
const isDefaultDescription = (
	error: ArkError,
	description: string
): boolean => {
	const meta = error.meta
	return (
		meta !== undefined &&
		meta.description === undefined &&
		meta.keyword === undefined &&
		description ===
			writeExpected(error, defaultLocale[error.code].expected, defaultLocale)
	)
}

const normalizedLocales = new WeakMap<object, Locale>()

/** a locale completed from en, which an older one may lack entries of */
export const normalizeLocale = (locale: Locale): Locale => {
	const en = defaultLocale
	if (locale === en) return en
	let normalized = normalizedLocales.get(locale)
	if (normalized === undefined) {
		normalized = completeFrom(en, locale)
		normalizedLocales.set(locale, normalized)
	}
	return normalized
}

const completeFrom = (en: Locale, locale: Locale): Locale => {
	let completed: Record<string, unknown> | undefined
	const fill = (k: string, entry: unknown) => {
		completed ??= { ...locale }
		completed[k] = entry
	}
	let k: keyof Locale
	for (k in en) {
		const entry = locale[k] as Record<string, unknown> | undefined
		if (entry === undefined) {
			const fallback = en[k]
			// a keyword without a phrase renders its English description
			fill(
				k,
				k === "keywordPhrases" ? {}
				: typeof fallback === "object" ?
					omit(fallback as Locale.CodeWriters, { expected: 1 })
				:	fallback
			)
		} else if (
			k === "nouns" &&
			Object.keys(en.nouns).some(id => entry[id] === undefined)
		)
			fill(k, { ...en.nouns, ...entry })
	}
	return (completed as Locale | undefined) ?? locale
}

registerLocaleRenderer({
	get en() {
		return defaultLocale
	},
	configure: configureLocale,
	select,
	write
})

// arktype may resolve its config before this module loads
if ($ark.cfg) configureLocale($ark.config.locale, $ark.defaultConfig)
