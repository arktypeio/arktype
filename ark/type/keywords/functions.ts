import type { ArkError, Locale, Traversal } from "@ark/schema"
import { FileConstructor, printable, type Json } from "@ark/util"
import type { FormDataValue, ParsedFormData } from "./FormData.ts"
import type { KeywordPhraseAlias } from "./phrases.ts"

// the context of an error a keyword raises through ctx, as phrases.ts's
// keywordError writes it, which can't be imported here since it loads @ark/schema
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

export const parseNumeric = (s: string): number => Number.parseFloat(s)

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

export const isParsableDate = (s: string): boolean =>
	!Number.isNaN(new Date(s).valueOf())

const dateParseError = /* @__PURE__ */ keywordError(
	"string.date.parse",
	"a parsable date"
)

export const parseDate = (s: string, ctx: Traversal): Date | ArkError => {
	const date = new Date(s)
	if (Number.isNaN(date.valueOf())) return ctx.error(dateParseError)
	return date
}

export const parseIsoDate = (s: string): Date => new Date(s)

// parsed as a number so the string is treated as milliseconds rather than passed to the Date string parser
export const parseEpoch = (s: string): Date => new Date(Number.parseInt(s))

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

export const parseJson = (s: string, ctx: Traversal): Json | ArkError => {
	if (s.length === 0) return ctx.error(jsonParseError)
	try {
		return JSON.parse(s)
	} catch (e) {
		if (!(e instanceof SyntaxError)) throw e
		return ctx.error({ ...jsonParseError, cause: e })
	}
}

export const stringifyJson = (data: Json): string => JSON.stringify(data)

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

const regexError = /* @__PURE__ */ keywordError(
	"string.regex",
	"a regex pattern"
)

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
		noun: "a regex pattern",
		problem: (e, locale) =>
			e.code === "predicate" && e.cause !== undefined ?
				describeSyntaxError(e.cause as SyntaxError)
			:	locale.problem(e, locale)
	}
} as const satisfies Record<string, Locale.KeywordWriters>

export const isParsableUrl = (s: string): boolean => URL.canParse(s)

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
		if (Object.prototype.hasOwnProperty.call(result, k)) {
			const existing = result[k]
			if (typeof existing === "string" || existing instanceof FileConstructor)
				result[k] = [existing, v]
			else existing.push(v)
		} else result[k] = v
	}
	return result
}
