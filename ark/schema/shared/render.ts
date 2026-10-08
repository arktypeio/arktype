import { normalizeLocale, type Locale } from "./locale.ts"

type LocaleSelector = () => Locale | undefined

/** the locale writers are written in, once a config has resolved */
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
	base: Locale.Complete
): Locale => {
	defaultLocale = base
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
