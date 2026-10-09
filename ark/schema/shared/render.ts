import { omit } from "@ark/util"
import type { ResolvedConfig } from "../config.ts"
import type { Locale } from "./locale.ts"

type LocaleSelector = () => Locale | undefined

/** the config of every node kind and error code, once a config has resolved */
export let defaultConfig: ResolvedConfig

/** defaultConfig's locale */
export let defaultLocale: Locale.Complete

/** defaultLocale, unless a read may render in another locale */
export let plainLocale: Locale | undefined

/** the locale of the outermost read in progress, which the reads it makes share */
export let renderLocale: Locale | undefined

// a configured function, which selects the locale of each outermost read
let selector: LocaleSelector | undefined

// the configured locale if it isn't a function
let configured: Locale

const plainLocaleIn = (locale: Locale | undefined): Locale | undefined => {
	locale ??= selector === undefined ? configured : undefined
	return locale === defaultLocale ? locale : undefined
}

/**
 * sets the locale reads render in from the one configure was last passed,
 * returning it if it isn't a function
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
	plainLocale = plainLocaleIn(renderLocale)
	return configured
}

export const selectsLocale = (): boolean =>
	selector !== undefined && renderLocale === undefined

export const selectLocale = (): Locale => {
	try {
		const locale = selector!()
		return locale === undefined || locale === defaultLocale ?
				defaultLocale
			:	normalizeLocale(locale)
	} catch {
		// a throw from a getter would replace the TraversalError assert throws
		return defaultLocale
	}
}

/** the locale of an outermost read */
export const outerLocale = (): Locale =>
	selector === undefined ? configured : selectLocale()

export const readIn = <self, t>(
	locale: Locale,
	self: self,
	read: (self: self) => t
): t => {
	const outer = renderLocale
	renderLocale = locale
	plainLocale = plainLocaleIn(locale)
	try {
		return read(self)
	} finally {
		renderLocale = outer
		plainLocale = plainLocaleIn(outer)
	}
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
