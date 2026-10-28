import type { ArkError, Locale, Traversal } from "@ark/schema"
import {
	FileConstructor,
	hasOwn,
	isDigitCode,
	iso8601Matcher,
	printable,
	type Fn,
	type Json
} from "@ark/util"
import type {
	EmptyCollectionLiteral,
	inferDefaultLiteral
} from "../parser/shift/operator/default.ts"
import type { FormDataValue, ParsedFormData } from "./FormData.ts"
import type { KeywordPhraseAlias } from "./phrases.ts"

// takes its noun, since importing phrases.ts would load @ark/schema
const keywordError = <alias extends KeywordPhraseAlias>(
	alias: alias,
	description: string
): { code: "predicate"; description: string; meta: { keyword: alias } } => ({
	code: "predicate",
	description,
	meta: { keyword: alias }
})

const integerParseError = /* @__PURE__ */ keywordError(
	"string.integer.parse",
	"an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER"
)

export const parseInteger = (s: string, ctx: Traversal): number | ArkError => {
	const parsed = Number.parseInt(s)
	return Number.isSafeInteger(parsed) ? parsed : ctx.error(integerParseError)
}

export const parseNumeric = (s: string): number => Number(s)

// Infinity takes at least five characters ("1e309"), so a shorter numeric string is finite
export const parsesFinite = (s: string): boolean =>
	s.length < 5 || Number.isFinite(Number(s))

export const capitalizeString = (s: string): string =>
	s.charAt(0).toUpperCase() + s.slice(1)

export const lowercaseString = (s: string): string => s.toLowerCase()

export const uppercaseString = (s: string): string => s.toUpperCase()

export const trimString = (s: string): string => s.trim()

// https://github.com/validatorjs/validator.js/blob/master/src/lib/isLuhnNumber.js
export const isLuhnValid = (creditCardInput: string): boolean => {
	const sanitized = creditCardInput.replace(/[ -]+/g, "")
	let sum = 0
	let digit: string
	let tmpNum: number
	let shouldDouble = false
	for (let i = sanitized.length - 1; i >= 0; i--) {
		digit = sanitized.substring(i, i + 1)
		tmpNum = Number.parseInt(digit, 10)
		if (shouldDouble) {
			tmpNum *= 2
			sum += tmpNum >= 10 ? (tmpNum % 10) + 1 : tmpNum
		} else sum += tmpNum

		shouldDouble = !shouldDouble
	}
	return !!(sum % 10 === 0 ? sanitized : false)
}

export const isParsableDate = (s: string): boolean => readDate(s) !== undefined

const dateParseError = /* @__PURE__ */ keywordError(
	"string.date.parse",
	"a parsable date"
)

export const parseDate = (s: string, ctx: Traversal): Date | ArkError =>
	readDate(s) ?? ctx.error(dateParseError)

// a date that doesn't exist, like 2025-02-29, isn't an ISO 8601 date either
const isoDateParseError = /* @__PURE__ */ keywordError(
	"string.date.iso",
	"an ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ) date"
)

// a calendar, week or ordinal date, then a time whose last unit can have a fraction, then an offset
const isoDateParts =
	/^([+-]?\d{4})(?:-?(?:(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?([1-7]))?|(\d{3})))?(?:T(\d{2})(?::?(\d{2})(?::?(\d{2}))?)?(?:[,.](\d+))?(?:[Zz]|([+-])(\d{2}):?(\d{2})?)?)?$/

// read in UTC unless it has an offset, so it's one instant on every machine
const isoDateOf = (parts: RegExpExecArray): Date | undefined => {
	const [
		,
		yearPart,
		month,
		day,
		week,
		weekday,
		ordinal,
		hour,
		minute,
		second,
		fraction,
		offsetSign,
		offsetHours,
		offsetMinutes
	] = parts
	const year = +yearPart
	const date = new Date(0)
	// a week is in the year of its Thursday, and January 4th is in week 1
	date.setUTCFullYear(
		year,
		+(month ?? 1) - 1,
		week ? 4 : +(ordinal ?? day ?? 1)
	)
	if (week) date.setUTCDate(7 * +week - ((date.getUTCDay() + 6) % 7))
	if (
		week || ordinal ?
			date.getUTCFullYear() !== year
		:	date.getUTCDate() !== +(day ?? 1)
	)
		return
	if (week) date.setUTCDate(date.getUTCDate() + +(weekday ?? 1) - 4)
	// a fraction is of the last unit given, read to the millisecond
	const unit =
		second ? 1000
		: minute ? 60_000
		: 3_600_000
	const ms =
		fraction ?
			Math.floor((+fraction.slice(0, 9).padEnd(9, "0") * unit) / 1e9)
		:	0
	if (hour === "24" && (+(minute ?? 0) || +(second ?? 0) || ms)) return
	// a time with an offset ahead of UTC is that much earlier in UTC
	const offset =
		offsetSign ?
			(+offsetHours * 60 + +(offsetMinutes ?? 0)) *
			(offsetSign === "+" ? -1 : 1)
		:	0
	date.setUTCHours(+(hour ?? 0), +(minute ?? 0) + offset, +(second ?? 0), ms)
	return date
}

// an ISO date is read as string.date.iso.parse reads it, other forms by the host's Date
const readDate = (s: string): Date | undefined => {
	if (iso8601Matcher.test(s)) {
		const parts = isoDateParts.exec(s)
		return parts ? isoDateOf(parts) : undefined
	}
	const date = new Date(s)
	return Number.isNaN(date.valueOf()) ? undefined : date
}

export const parseIsoDate = (s: string, ctx: Traversal): Date | ArkError => {
	const parts = isoDateParts.exec(s)
	return (parts && isoDateOf(parts)) ?? ctx.error(isoDateParseError)
}

// parsed as a number so the string is treated as milliseconds
export const parseEpoch = (s: string): Date => new Date(Number.parseInt(s))

/**
 * As per the ECMA-262 specification:
 * A time value supports a slightly smaller range of -8,640,000,000,000,000 to 8,640,000,000,000,000 milliseconds.
 *
 * @see https://262.ecma-international.org/15.0/index.html#sec-time-values-and-time-range
 */
export const maxEpoch = 8640000000000000

export const epochDescriptions = {
	domain: "a number representing a Unix timestamp",
	min: "a Unix timestamp after -8640000000000000",
	max: "a Unix timestamp before 8640000000000000"
}

// number.epoch's phrase describes its errors
const epochMeta = { keyword: "number.epoch" } as const

export const isEpochString = (s: string, ctx: Traversal): boolean => {
	const n = Number.parseInt(s)
	return (
		!Number.isFinite(n) ?
			ctx.reject({
				code: "domain",
				data: n,
				description: epochDescriptions.domain,
				meta: epochMeta,
				domain: "number"
			})
		: n < -maxEpoch ?
			ctx.reject({
				code: "min",
				data: n,
				description: epochDescriptions.min,
				meta: epochMeta,
				rule: -maxEpoch
			})
		: n > maxEpoch ?
			ctx.reject({
				code: "max",
				data: n,
				description: epochDescriptions.max,
				meta: epochMeta,
				rule: maxEpoch
			})
		:	true
	)
}

const jsonString = "a JSON string"

// what String writes for the SyntaxError JSON.parse or RegExp throws
const describeSyntaxError = ({ name, message }: SyntaxError): string =>
	`${name}: ${message}`

export const writeJsonSyntaxErrorProblem = (error: unknown): string =>
	`must be ${jsonString} (${describeSyntaxError(error as SyntaxError)})`

// a JSON keyword's error carries the SyntaxError JSON.parse threw as its cause
const jsonProblem: Locale.ProblemWriter = (e, locale) =>
	e.code === "predicate" && e.cause !== undefined ?
		writeJsonSyntaxErrorProblem(e.cause)
	:	locale.problem(e, locale)

const jsonError = /* @__PURE__ */ keywordError("string.json", jsonString)

export const isJsonString = (s: string, ctx: Traversal): boolean => {
	try {
		JSON.parse(s)
		return true
	} catch (e) {
		if (!(e instanceof SyntaxError)) throw e
		return ctx.reject({ ...jsonError, cause: e })
	}
}

const jsonParseError = /* @__PURE__ */ keywordError(
	"string.json.parse",
	jsonString
)

// Infinity has a positive exponent or 309 digits in a row, so only every 309th index is read
const mayOverflow = (s: string): boolean => {
	if (positiveExponent.test(s)) return true
	for (let i = 308; i < s.length; i += 309) {
		if (!isDigitCode(s.charCodeAt(i))) continue
		let start = i
		while (isDigitCode(s.charCodeAt(start - 1))) start--
		let end = i
		while (isDigitCode(s.charCodeAt(end + 1))) end++
		if (end - start >= 308) return true
	}
	return false
}

const positiveExponent = /\d[Ee]\+?\d/

const rejectInfinity = (k: string, v: unknown) => {
	if (v === Infinity || v === -Infinity)
		throw new SyntaxError("Number is out of range")
	return v
}

export const parseJson = (s: string, ctx: Traversal): Json | ArkError => {
	if (s.length === 0) return ctx.error(jsonParseError)
	try {
		return JSON.parse(
			s,
			!ctx.config.numberAllowsInfinity && mayOverflow(s) ?
				rejectInfinity
			:	undefined
		)
	} catch (e) {
		if (!(e instanceof SyntaxError)) throw e
		return ctx.error({ ...jsonParseError, cause: e })
	}
}

export const stringifyJson = (data: Json): string => JSON.stringify(data)

// inverses of parse keywords, which arktype/codecs encodes with
export const writeIsoDate = (date: Date): string => date.toISOString()

export const writeEpoch = (date: Date): string => `${date.getTime()}`

export const writeUrl = (url: URL): string => url.href

// a string already in a format keyword's output format is its own encoding
export const keepFormatted = (s: string): string => s

// keyed by form, since a predicate's name is printed in its description
export const normalizationsByForm = {
	NFC: {
		predicate: (s: string): boolean => s.normalize("NFC") === s,
		morphs: (s: string): string => s.normalize("NFC")
	},
	NFD: {
		predicate: (s: string): boolean => s.normalize("NFD") === s,
		morphs: (s: string): string => s.normalize("NFD")
	},
	NFKC: {
		predicate: (s: string): boolean => s.normalize("NFKC") === s,
		morphs: (s: string): string => s.normalize("NFKC")
	},
	NFKD: {
		predicate: (s: string): boolean => s.normalize("NFKD") === s,
		morphs: (s: string): string => s.normalize("NFKD")
	}
}

// a thunk so each traversal's is its own
export const emptyCollectionDefaults = {
	"[]": () => [],
	"{}": () => ({})
} as const satisfies {
	[literal in EmptyCollectionLiteral]: () => inferDefaultLiteral<literal>
}

const regexPattern = "a regex pattern"

const regexError = /* @__PURE__ */ keywordError("string.regex", regexPattern)

export const isRegexPattern = (s: string, ctx: Traversal): boolean => {
	try {
		new RegExp(s)
		return true
	} catch (e) {
		return ctx.reject({ ...regexError, cause: e })
	}
}

/** en's phrases of the keywords that write the errors they raise through ctx */
export const raisedErrorPhrases = {
	"string.json": { noun: jsonString, problem: jsonProblem },
	"string.json.parse": {
		noun: jsonString,
		actual: data => (data === "" ? "empty" : printable(data)),
		problem: jsonProblem
	},
	"string.regex": {
		noun: regexPattern,
		problem: (e, locale) =>
			e.code === "predicate" && e.cause !== undefined ?
				`must be ${regexPattern} (${describeSyntaxError(e.cause as SyntaxError)})`
			:	locale.problem(e, locale)
	}
} as const satisfies Record<string, Locale.KeywordWriters>

// http(s) with simple host labels always parses; cased without the i flag
const plainUrl =
	/^[Hh][Tt]{2}[Pp][Ss]?:\/\/(?:[\dA-Za-z]+(?:-[\dA-Za-z]+)*\.)*[A-Za-z]+(?::\d{1,4})?(?:[#/?]|$)/

// a string without a colon has no scheme, so fails
export const isParsableUrl = ((s: string): boolean =>
	plainUrl.test(s) || (s.includes(":") && URL.canParse(s))) satisfies Fn

const urlParseError = /* @__PURE__ */ keywordError(
	"string.url.parse",
	"a URL string"
)

export const parseUrl = (s: string, ctx: Traversal): URL | ArkError => {
	try {
		return new URL(s)
	} catch {
		return ctx.error(urlParseError)
	}
}

export const parseFormData = (data: FormData): ParsedFormData => {
	const result: ParsedFormData = {}

	// no cast is actually required here, but with
	// typescript.tsserver.experimental.enableProjectDiagnostics: true
	// this file periodically displays as having an error, likely due to the
	// lack of a `File` type.
	type FormDataEntries = [string, FormDataValue][]
	for (const [k, v] of data as {} as FormDataEntries) {
		if (hasOwn(result, k)) {
			const existing = result[k]
			if (typeof existing === "string" || existing instanceof FileConstructor)
				result[k] = [existing, v]
			else existing.push(v)
		} else result[k] = v
	}
	return result
}
