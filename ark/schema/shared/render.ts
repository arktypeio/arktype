import { omit } from "@ark/util"
import type { ResolvedConfig } from "../config.ts"
import {
	registerLocaleRenderer,
	suppliedText,
	unwrittenError,
	writeError,
	writeText,
	type ArkError
} from "./errors.ts"
import { keywordWriterOf, writeKeywordExpected, type Locale } from "./locale.ts"

type LocaleSelector = () => Locale | undefined

type ErrorSlot = "expected" | "actual" | "problem" | "message"

type SlotConfig = string | ((...args: never[]) => string)

/** the config of every node kind and error code, once a config has resolved */
export let defaultConfig: ResolvedConfig

/** defaultConfig's locale */
export let defaultLocale: Locale.Complete

// a configured function, which selects the locale errors are written in
let selector: LocaleSelector | undefined

// the configured locale if it isn't a function
let configured: Locale

/**
 * sets the locale errors are written in from the one configure was last
 * passed, returning it if it isn't a function
 */
export const configureLocale = (
	locale: Locale | LocaleSelector | undefined,
	base: ResolvedConfig
): Locale => {
	defaultConfig = base
	defaultLocale = base.locale as Locale.Complete
	if (typeof locale === "function") {
		selector = locale
		configured = defaultLocale
	} else {
		selector = undefined
		configured = locale === undefined ? defaultLocale : normalizeLocale(locale)
	}
	registerLocaleRenderer({ en: defaultLocale, select, write })
	return configured
}

const select = (): Locale => {
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
	locale = normalizeLocale(locale)
	if (locale === defaultLocale) return writeText(error, config, locale)
	const supplied = suppliedText(error, "expected")
	const expected = supplied ?? configOf(error, "expected", config)
	const cited = citesDescription(error) ? error.description : undefined
	// text supplied for expected is cited like any other, so it's written
	// unless it's no longer what was supplied
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

// a slot's text in a locale other than en
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

// a discriminant's description lists its cases, while its meta is its union's
const citesDescription = (error: ArkError): boolean =>
	error.code !== "discriminant" &&
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

// a locale's writer for a slot other than expected
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
	// a code's own problem frames the text of its locale's expected writer,
	// not a keyword's phrase or authored text, while union and intersection
	// frame their children's
	if (
		slot !== "problem" ||
		error.code === "union" ||
		error.code === "intersection"
	)
		return writer
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
	writeError(inEn, config, defaultLocale)
	return inEn.expected
}

const writeExpected = (
	error: ArkError,
	expected: string | ((error: never, locale: Locale) => string),
	locale: Locale
): string =>
	typeof expected === "string" ? expected : expected(error as never, locale)

// whether a description is what arktype writes for a node without authored
// text or a keyword. Any scope's writer may have written it, so its text decides
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

/** a locale completed from en, since an untyped or older one may lack entries */
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
		const entry = locale[k] as any
		if (entry === undefined) {
			const fallback = en[k]
			// a keyword without a phrase renders its English description, and a
			// code without writers reads its expected text whole in en
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
