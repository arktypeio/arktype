import {
	ArkErrors,
	intrinsic,
	node,
	rootSchema,
	type Intersection,
	type JsonSchema,
	type Morph,
	type mutableNormalizedRootOfKind,
	type Traversal
} from "@ark/schema"
import {
	cached,
	flatMorph,
	numericStringMatcher,
	wellFormedIntegerMatcher,
	type Json
} from "@ark/util"
import type { To } from "../attributes.ts"
import type { Module, Submodule } from "../module.ts"
import { keywordModule } from "../scope.ts"
import { number } from "./number.ts"

// non-trivial expressions should have an explanation or attribution

export const regexStringNode = (
	regex: RegExp,
	description: string,
	jsonSchemaFormat?: JsonSchema.Format
): Intersection.Node => {
	const schema: mutableNormalizedRootOfKind<"intersection"> = {
		domain: "string",
		pattern: {
			rule: regex.source,
			flags: regex.flags,
			meta: description
		}
	}

	if (jsonSchemaFormat) schema.meta = { format: jsonSchemaFormat }

	return node("intersection", schema) as never
}

const stringIntegerRoot = cached(() =>
	regexStringNode(wellFormedIntegerMatcher, "a well-formed integer string")
)

export const stringInteger: stringInteger.module = keywordModule(
	{
		root: stringIntegerRoot,
		parse: () =>
			rootSchema({
				in: stringIntegerRoot(),
				morphs: (s: string, ctx: Traversal) => {
					const parsed = Number.parseInt(s)
					return Number.isSafeInteger(parsed) ? parsed : (
							ctx.error(
								"an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER"
							)
						)
				},
				declaredOut: intrinsic.integer
			})
	},
	{
		name: "string.integer"
	}
) as never

export declare namespace stringInteger {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string
		parse: (In: string) => To<number>
	}
}

const hex = () => regexStringNode(/^[\dA-Fa-f]+$/, "hex characters only")

const base64: base64.module = keywordModule(
	{
		root: () =>
			regexStringNode(
				/^(?:[\d+/A-Za-z]{4})*(?:[\d+/A-Za-z]{2}==|[\d+/A-Za-z]{3}=)?$/,
				"base64-encoded"
			),
		url: () =>
			regexStringNode(
				/^(?:[\w-]{4})*(?:[\w-]{2}(?:==|%3D%3D)?|[\w-]{3}(?:=|%3D)?)?$/,
				"base64url-encoded"
			)
	},
	{
		name: "string.base64"
	}
) as never

declare namespace base64 {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string
		url: string
	}
}

const preformattedCapitalize = cached(() =>
	regexStringNode(/^[A-Z].*$/, "capitalized")
)

export const capitalize: capitalize.module = keywordModule(
	{
		root: () =>
			rootSchema({
				in: "string",
				morphs: (s: string) => s.charAt(0).toUpperCase() + s.slice(1),
				declaredOut: preformattedCapitalize()
			}),
		preformatted: preformattedCapitalize
	},
	{
		name: "string.capitalize"
	}
) as never

export declare namespace capitalize {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: (In: string) => To<string>
		preformatted: string
	}
}

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

// https://github.com/validatorjs/validator.js/blob/master/src/lib/isCreditCard.js
const creditCardMatcher: RegExp =
	/^(?:4\d{12}(?:\d{3,6})?|5[1-5]\d{14}|(222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)\d{12}|6(?:011|5\d\d)\d{12,15}|3[47]\d{13}|3(?:0[0-5]|[68]\d)\d{11}|(?:2131|1800|35\d{3})\d{11}|6[27]\d{14}|^(81\d{14,17}))$/

export const creditCard = cached(() =>
	rootSchema({
		domain: "string",
		pattern: {
			meta: "a credit card number",
			rule: creditCardMatcher.source
		},
		predicate: {
			meta: "a credit card number",
			predicate: isLuhnValid
		}
	})
)

type DayDelimiter = "." | "/" | "-"

const dayDelimiterMatcher = /^[./-]$/

type DayPart = DayPatterns[PartKey]

type PartKey = keyof DayPatterns

type DayPatterns = {
	y: "yy" | "yyyy"
	m: "mm" | "m"
	d: "dd" | "d"
}

type fragment<part extends DayPart, delimiter extends DayDelimiter> =
	| `${delimiter}${part}`
	| ""

export type DayPattern<delimiter extends DayDelimiter = DayDelimiter> =
	delimiter extends unknown ?
		{
			[k1 in keyof DayPatterns]: {
				[k2 in Exclude<keyof DayPatterns, k1>]: `${DayPatterns[k1]}${fragment<
					DayPatterns[k2],
					delimiter
				>}${fragment<
					DayPatterns[Exclude<keyof DayPatterns, k1 | k2>],
					delimiter
				>}`
			}[Exclude<keyof DayPatterns, k1>]
		}[keyof DayPatterns]
	:	never

export type DateFormat = "iso" | DayPattern

export type DateOptions = {
	format?: DateFormat
}

// ISO 8601 date/time modernized from https://github.com/validatorjs/validator.js/blob/master/src/lib/isISO8601.js
// Based on https://tc39.es/ecma262/#sec-date-time-string-format, the T
// delimiter for date/time is mandatory. Regex from validator.js strict matcher:
export const iso8601Matcher =
	/^([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-3])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))(T((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([,.]\d+(?!:))?)?(\17[0-5]\d([,.]\d+)?)?([Zz]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/

type ParsedDayParts = {
	y?: string
	m?: string
	d?: string
}

const isValidDateInstance = (date: Date) => !Number.isNaN(+date)

const writeFormattedExpected = (format: DateFormat) =>
	`a ${format}-formatted date`

export const tryParseDatePattern = (
	data: string,
	opts?: DateOptions
): Date | string => {
	if (!opts?.format) {
		const result = new Date(data)
		return isValidDateInstance(result) ? result : "a valid date"
	}
	if (opts.format === "iso") {
		return iso8601Matcher.test(data) ?
				new Date(data)
			:	writeFormattedExpected("iso")
	}
	const dataParts = data.split(dayDelimiterMatcher)
	// will be the first delimiter matched, if there is one
	const delimiter: string | undefined = data[dataParts[0].length]
	const formatParts = delimiter ? opts.format.split(delimiter) : [opts.format]

	if (dataParts.length !== formatParts.length)
		return writeFormattedExpected(opts.format)

	const parsedParts: ParsedDayParts = {}
	for (let i = 0; i < formatParts.length; i++) {
		if (
			dataParts[i].length !== formatParts[i].length &&
			// if format is "m" or "d", data is allowed to be 1 or 2 characters
			!(formatParts[i].length === 1 && dataParts[i].length === 2)
		)
			return writeFormattedExpected(opts.format)

		parsedParts[formatParts[i][0] as PartKey] = dataParts[i]
	}

	const date = new Date(`${parsedParts.m}/${parsedParts.d}/${parsedParts.y}`)

	if (`${date.getDate()}` === parsedParts.d) return date

	return writeFormattedExpected(opts.format)
}

const isParsableDate = (s: string) => !Number.isNaN(new Date(s).valueOf())

const parsableDate = cached(() =>
	rootSchema({
		domain: "string",
		predicate: {
			meta: "a parsable date",
			predicate: isParsableDate
		}
	}).assertHasKind("intersection")
)

const epochRoot = cached(() =>
	stringInteger.root.internal
		.narrow((s, ctx) => {
			// this is safe since it has already
			// been validated as an integer string
			const n = Number.parseInt(s)
			const out = number.epoch(n)
			if (out instanceof ArkErrors) {
				ctx.errors.merge(out)
				return false
			}
			return true
		})
		.configure(
			{
				description: "an integer string representing a safe Unix timestamp"
			},
			"self"
		)
		.assertHasKind("intersection")
)

const epoch: Module<stringDate.epoch.$> = keywordModule(
	{
		root: epochRoot,
		parse: () =>
			rootSchema({
				in: epochRoot(),
				// parse as a number so the string is treated as milliseconds
				// rather than passed to the Date string parser
				morphs: (s: string) => new Date(Number.parseInt(s)),
				declaredOut: intrinsic.Date
			})
	},
	{
		name: "string.date.epoch"
	}
) as never

const isoRoot = cached(() =>
	regexStringNode(
		iso8601Matcher,
		"an ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ) date"
	).internal.assertHasKind("intersection")
)

const iso: Module<stringDate.iso.$> = keywordModule(
	{
		root: isoRoot,
		parse: () =>
			rootSchema({
				in: isoRoot(),
				morphs: (s: string) => new Date(s),
				declaredOut: intrinsic.Date
			})
	},
	{
		name: "string.date.iso"
	}
) as never

export const stringDate: stringDate.module = keywordModule(
	{
		root: parsableDate,
		parse: () =>
			rootSchema({
				declaredIn: parsableDate(),
				in: "string",
				morphs: (s: string, ctx: Traversal) => {
					const date = new Date(s)
					if (Number.isNaN(date.valueOf())) return ctx.error("a parsable date")
					return date
				},
				declaredOut: intrinsic.Date
			}),
		iso,
		epoch
	},
	{
		name: "string.date"
	}
) as never

export declare namespace stringDate {
	export type module = Module<stringDate.submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string
		parse: (In: string) => To<Date>
		iso: iso.submodule
		epoch: epoch.submodule
	}

	export namespace iso {
		export type submodule = Submodule<$>

		export type $ = {
			root: string
			parse: (In: string) => To<Date>
		}
	}

	export namespace epoch {
		export type submodule = Submodule<$>

		export type $ = {
			root: string
			parse: (In: string) => To<Date>
		}
	}
}

const email = () =>
	regexStringNode(
		// considered https://colinhacks.com/essays/reasonable-email-regex but it includes a lookahead
		// which breaks some integrations e.g. fast-check

		// regex based on:
		// https://www.regular-expressions.info/email.html
		/^[\w%+.-]+@[\d.A-Za-z-]+\.[A-Za-z]{2,}$/,
		"an email address",
		"email"
	)

// based on https://github.com/validatorjs/validator.js/blob/master/src/lib/isIP.js
const ipv4Segment = "(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])"
const ipv4Address = `(${ipv4Segment}[.]){3}${ipv4Segment}`
const ipv4Matcher = new RegExp(`^${ipv4Address}$`)

const ipv6Segment = "(?:[0-9a-fA-F]{1,4})"
const ipv6Matcher = new RegExp(
	"^(" +
		`(?:${ipv6Segment}:){7}(?:${ipv6Segment}|:)|` +
		`(?:${ipv6Segment}:){6}(?:${ipv4Address}|:${ipv6Segment}|:)|` +
		`(?:${ipv6Segment}:){5}(?::${ipv4Address}|(:${ipv6Segment}){1,2}|:)|` +
		`(?:${ipv6Segment}:){4}(?:(:${ipv6Segment}){0,1}:${ipv4Address}|(:${ipv6Segment}){1,3}|:)|` +
		`(?:${ipv6Segment}:){3}(?:(:${ipv6Segment}){0,2}:${ipv4Address}|(:${ipv6Segment}){1,4}|:)|` +
		`(?:${ipv6Segment}:){2}(?:(:${ipv6Segment}){0,3}:${ipv4Address}|(:${ipv6Segment}){1,5}|:)|` +
		`(?:${ipv6Segment}:){1}(?:(:${ipv6Segment}){0,4}:${ipv4Address}|(:${ipv6Segment}){1,6}|:)|` +
		`(?::((?::${ipv6Segment}){0,5}:${ipv4Address}|(?::${ipv6Segment}){1,7}|:))` +
		")(%[0-9a-zA-Z.]{1,})?$"
)

export const ip: ip.module = keywordModule(
	{
		root: ["v4 | v6", "@", "an IP address"],
		v4: () => regexStringNode(ipv4Matcher, "an IPv4 address", "ipv4"),
		v6: () => regexStringNode(ipv6Matcher, "an IPv6 address", "ipv6")
	},
	{
		name: "string.ip"
	}
) as never

export declare namespace ip {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string
		v4: string
		v6: string
	}
}

const jsonStringDescription = "a JSON string"

export const writeJsonSyntaxErrorProblem = (error: unknown): string => {
	if (!(error instanceof SyntaxError)) throw error
	return `must be ${jsonStringDescription} (${error})`
}

const jsonRoot = () =>
	rootSchema({
		meta: jsonStringDescription,
		domain: "string",
		predicate: {
			meta: jsonStringDescription,
			predicate: (s: string, ctx) => {
				try {
					JSON.parse(s)
					return true
				} catch (e) {
					return ctx.reject({
						code: "predicate",
						expected: jsonStringDescription,
						problem: writeJsonSyntaxErrorProblem(e)
					})
				}
			}
		}
	})

const parseJson: Morph<string> = (s: string, ctx: Traversal) => {
	if (s.length === 0) {
		return ctx.error({
			code: "predicate",
			expected: jsonStringDescription,
			actual: "empty"
		})
	}
	try {
		return JSON.parse(s)
	} catch (e) {
		return ctx.error({
			code: "predicate",
			expected: jsonStringDescription,
			problem: writeJsonSyntaxErrorProblem(e)
		})
	}
}

export const json: stringJson.module = keywordModule(
	{
		root: jsonRoot,
		parse: () =>
			rootSchema({
				meta: "safe JSON string parser",
				in: "string",
				morphs: parseJson,
				declaredOut: intrinsic.jsonObject
			})
	},
	{
		name: "string.json"
	}
) as never

export declare namespace stringJson {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string
		parse: (In: string) => To<Json>
	}
}

const preformattedLower = cached(() =>
	regexStringNode(/^[a-z]*$/, "only lowercase letters")
)

const lower: lower.module = keywordModule(
	{
		root: () =>
			rootSchema({
				in: "string",
				morphs: (s: string) => s.toLowerCase(),
				declaredOut: preformattedLower()
			}),
		preformatted: preformattedLower
	},
	{
		name: "string.lower"
	}
) as never

export declare namespace lower {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: (In: string) => To<string>
		preformatted: string
	}
}

export const normalizedForms = ["NFC", "NFD", "NFKC", "NFKD"] as const

export type NormalizedForm = (typeof normalizedForms)[number]

const preformattedNodes = flatMorph(
	normalizedForms,
	(i, form) =>
		[
			form,
			cached(() =>
				rootSchema({
					domain: "string",
					predicate: (s: string) => s.normalize(form) === s,
					meta: `${form}-normalized unicode`
				})
			)
		] as const
)

const normalizeNodes = flatMorph(
	normalizedForms,
	(i, form) =>
		[
			form,
			cached(() =>
				rootSchema({
					in: "string",
					morphs: (s: string) => s.normalize(form),
					declaredOut: preformattedNodes[form]()
				})
			)
		] as const
)

export const NFC: Module<normalize.NFC.$> = keywordModule(
	{
		root: normalizeNodes.NFC,
		preformatted: preformattedNodes.NFC
	},
	{
		name: "string.normalize.NFC"
	}
) as never

export const NFD: Module<normalize.NFD.$> = keywordModule(
	{
		root: normalizeNodes.NFD,
		preformatted: preformattedNodes.NFD
	},
	{
		name: "string.normalize.NFD"
	}
) as never

export const NFKC: Module<normalize.NFKC.$> = keywordModule(
	{
		root: normalizeNodes.NFKC,
		preformatted: preformattedNodes.NFKC
	},
	{
		name: "string.normalize.NFKC"
	}
) as never

export const NFKD: Module<normalize.NFKD.$> = keywordModule(
	{
		root: normalizeNodes.NFKD,
		preformatted: preformattedNodes.NFKD
	},
	{
		name: "string.normalize.NFKD"
	}
) as never

export const normalize: normalize.module = keywordModule(
	{
		root: "NFC",
		NFC,
		NFD,
		NFKC,
		NFKD
	},
	{
		name: "string.normalize"
	}
) as never

export declare namespace normalize {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: (In: string) => To<string>
		NFC: NFC.submodule
		NFD: NFD.submodule
		NFKC: NFKC.submodule
		NFKD: NFKD.submodule
	}

	export namespace NFC {
		export type submodule = Submodule<$>

		export type $ = {
			root: (In: string) => To<string>
			preformatted: string
		}
	}

	export namespace NFD {
		export type submodule = Submodule<$>

		export type $ = {
			root: (In: string) => To<string>
			preformatted: string
		}
	}

	export namespace NFKC {
		export type submodule = Submodule<$>

		export type $ = {
			root: (In: string) => To<string>
			preformatted: string
		}
	}

	export namespace NFKD {
		export type submodule = Submodule<$>

		export type $ = {
			root: (In: string) => To<string>
			preformatted: string
		}
	}
}

const numericRoot = cached(() =>
	regexStringNode(numericStringMatcher, "a well-formed numeric string")
)

export const stringNumeric: stringNumeric.module = keywordModule(
	{
		root: numericRoot,
		parse: () =>
			rootSchema({
				in: numericRoot(),
				morphs: (s: string) => Number.parseFloat(s),
				declaredOut: intrinsic.number
			})
	},
	{
		name: "string.numeric"
	}
) as never

export declare namespace stringNumeric {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string
		parse: (In: string) => To<number>
	}
}

const regexPatternDescription = "a regex pattern"
const regex = () =>
	rootSchema({
		domain: "string",
		predicate: {
			meta: regexPatternDescription,
			predicate: (s: string, ctx) => {
				try {
					new RegExp(s)
					return true
				} catch (e) {
					return ctx.reject({
						code: "predicate",
						expected: regexPatternDescription,
						problem: String(e)
					})
				}
			}
		},
		meta: { format: "regex" }
	})

const semverMatcher =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][\dA-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][\dA-Za-z-]*))*))?(?:\+([\dA-Za-z-]+(?:\.[\dA-Za-z-]+)*))?$/

const semver = () =>
	regexStringNode(semverMatcher, "a semantic version (see https://semver.org/)")

const preformattedTrim = cached(() =>
	regexStringNode(
		// no leading or trailing whitespace
		/^\S.*\S$|^\S?$/,
		"trimmed"
	)
)

const trim: trim.module = keywordModule(
	{
		root: () =>
			rootSchema({
				in: "string",
				morphs: (s: string) => s.trim(),
				declaredOut: preformattedTrim()
			}),
		preformatted: preformattedTrim
	},
	{
		name: "string.trim"
	}
) as never

export declare namespace trim {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: (In: string) => To<string>
		preformatted: string
	}
}

const preformattedUpper = cached(() =>
	regexStringNode(/^[A-Z]*$/, "only uppercase letters")
)

const upper: upper.module = keywordModule(
	{
		root: () =>
			rootSchema({
				in: "string",
				morphs: (s: string) => s.toUpperCase(),
				declaredOut: preformattedUpper()
			}),
		preformatted: preformattedUpper
	},
	{
		name: "string.upper"
	}
) as never

declare namespace upper {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: (In: string) => To<string>
		preformatted: string
	}
}

const isParsableUrl = (s: string) => URL.canParse(s)

const urlRoot = cached(() =>
	rootSchema({
		domain: "string",
		predicate: {
			meta: "a URL string",
			predicate: isParsableUrl
		},
		// URL.canParse allows a subset of the RFC-3986 URI spec
		// since there is no other serializable validation, best include a format
		meta: { format: "uri" }
	})
)

export const url: url.module = keywordModule(
	{
		root: urlRoot,
		parse: () =>
			rootSchema({
				declaredIn: urlRoot(),
				in: "string",
				morphs: (s: string, ctx: Traversal) => {
					try {
						return new URL(s)
					} catch {
						return ctx.error("a URL string")
					}
				},
				declaredOut: rootSchema(URL)
			})
	},
	{
		name: "string.url"
	}
) as never

export declare namespace url {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string
		parse: (In: string) => To<URL>
	}
}

// based on https://github.com/validatorjs/validator.js/blob/master/src/lib/isUUID.js
export const uuid: uuid.module = keywordModule(
	{
		// the meta tuple expression ensures the error message does not delegate
		// to the individual branches, which are too detailed
		root: [
			"versioned | nil | max",
			"@",
			{ description: "a UUID", format: "uuid" }
		],
		"#nil": "'00000000-0000-0000-0000-000000000000'",
		"#max": "'ffffffff-ffff-ffff-ffff-ffffffffffff'",
		"#versioned":
			/^[\dA-Fa-f]{8}-[\dA-Fa-f]{4}-[1-8][\dA-Fa-f]{3}-[89ABab][\dA-Fa-f]{3}-[\dA-Fa-f]{12}$/,
		v1: () =>
			regexStringNode(
				/^[\dA-Fa-f]{8}-[\dA-Fa-f]{4}-1[\dA-Fa-f]{3}-[89ABab][\dA-Fa-f]{3}-[\dA-Fa-f]{12}$/,
				"a UUIDv1"
			),
		v2: () =>
			regexStringNode(
				/^[\dA-Fa-f]{8}-[\dA-Fa-f]{4}-2[\dA-Fa-f]{3}-[89ABab][\dA-Fa-f]{3}-[\dA-Fa-f]{12}$/,
				"a UUIDv2"
			),
		v3: () =>
			regexStringNode(
				/^[\dA-Fa-f]{8}-[\dA-Fa-f]{4}-3[\dA-Fa-f]{3}-[89ABab][\dA-Fa-f]{3}-[\dA-Fa-f]{12}$/,
				"a UUIDv3"
			),
		v4: () =>
			regexStringNode(
				/^[\dA-Fa-f]{8}-[\dA-Fa-f]{4}-4[\dA-Fa-f]{3}-[89ABab][\dA-Fa-f]{3}-[\dA-Fa-f]{12}$/,
				"a UUIDv4"
			),
		v5: () =>
			regexStringNode(
				/^[\dA-Fa-f]{8}-[\dA-Fa-f]{4}-5[\dA-Fa-f]{3}-[89ABab][\dA-Fa-f]{3}-[\dA-Fa-f]{12}$/,
				"a UUIDv5"
			),
		v6: () =>
			regexStringNode(
				/^[\dA-Fa-f]{8}-[\dA-Fa-f]{4}-6[\dA-Fa-f]{3}-[89ABab][\dA-Fa-f]{3}-[\dA-Fa-f]{12}$/,
				"a UUIDv6"
			),
		v7: () =>
			regexStringNode(
				/^[\dA-Fa-f]{8}-[\dA-Fa-f]{4}-7[\dA-Fa-f]{3}-[89ABab][\dA-Fa-f]{3}-[\dA-Fa-f]{12}$/,
				"a UUIDv7"
			),
		v8: () =>
			regexStringNode(
				/^[\dA-Fa-f]{8}-[\dA-Fa-f]{4}-8[\dA-Fa-f]{3}-[89ABab][\dA-Fa-f]{3}-[\dA-Fa-f]{12}$/,
				"a UUIDv8"
			)
	},
	{
		name: "string.uuid"
	}
) as never

export declare namespace uuid {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string
		v1: string
		v2: string
		v3: string
		v4: string
		v5: string
		v6: string
		v7: string
		v8: string
	}

	export namespace $ {
		export type flat = {}
	}
}

export const string: string.module = keywordModule(
	{
		root: () => intrinsic.string,
		alpha: () => regexStringNode(/^[A-Za-z]*$/, "only letters"),
		alphanumeric: () =>
			regexStringNode(/^[\dA-Za-z]*$/, "only letters and digits 0-9"),
		hex,
		base64,
		capitalize,
		creditCard,
		date: stringDate,
		digits: () => regexStringNode(/^\d*$/, "only digits 0-9"),
		email,
		integer: stringInteger,
		ip,
		json,
		lower,
		normalize,
		numeric: stringNumeric,
		regex,
		semver,
		trim,
		upper,
		url,
		uuid
	},
	{
		name: "string"
	}
) as never

export declare namespace string {
	export type module = Module<string.submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string
		alpha: string
		alphanumeric: string
		hex: string
		base64: base64.submodule
		capitalize: capitalize.submodule
		creditCard: string
		date: stringDate.submodule
		digits: string
		email: string
		integer: stringInteger.submodule
		ip: ip.submodule
		json: stringJson.submodule
		lower: lower.submodule
		normalize: normalize.submodule
		numeric: stringNumeric.submodule
		regex: string
		semver: string
		trim: trim.submodule
		upper: upper.submodule
		url: url.submodule
		uuid: uuid.submodule
	}
}
