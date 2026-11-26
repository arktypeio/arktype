import {
	type ArkEnv,
	$ark,
	constraintInputOf,
	intrinsic,
	node,
	type Intersection,
	type JsonSchema,
	type Predicate
} from "@ark/schema"
import {
	cached,
	flatMorph,
	ipv4Matcher,
	ipv6Matcher,
	iso8601DateMatcher,
	iso8601Matcher,
	numericStringMatcher,
	uuidMatcher,
	wellFormedIntegerMatcher,
	type Json
} from "@ark/util"
import type { To } from "../attributes.ts"
import type { Module, Submodule } from "../module.ts"
import { keywordModule } from "../scope.ts"
import {
	capitalizeString,
	isEpochString,
	isJsonString,
	isLuhnValid,
	isParsableDate,
	isParsableUrl,
	isRegexPattern,
	lowercaseString,
	normalizationsByForm,
	parseBoolean,
	parseDate,
	parseEpoch,
	parseInteger,
	parseIsoDate,
	parseJson,
	parseNumeric,
	parsesFinite,
	parseUrl,
	trimString,
	uppercaseString
} from "./functions.ts"
import { keywordMeta, type KeywordPhraseAlias } from "./phrases.ts"

export { isLuhnValid } from "./functions.ts"

// non-trivial expressions should have an explanation or attribution

// the pattern carries the annotations, so they're written wherever it's constrained further
export const regexStringNode = (
	regex: RegExp,
	alias: KeywordPhraseAlias,
	annotations?: Pick<JsonSchema.String, "format" | "contentEncoding">
): Intersection.Node =>
	node("intersection", {
		domain: node("domain", { domain: "string" }),
		pattern: [
			node("pattern", {
				...constraintInputOf("pattern", regex),
				meta: { ...keywordMeta(alias), ...annotations }
			})
		],
		...(annotations && { meta: annotations })
	}) as never

// a string its keyword's predicate checks, written in JSON Schema as jsonSchema
const predicateStringNode = (
	predicate: Predicate,
	alias: KeywordPhraseAlias,
	jsonSchema?: JsonSchema,
	meta?: ArkEnv.meta
): Intersection.Node =>
	node("intersection", {
		domain: node("domain", { domain: "string" }),
		predicate: [
			node("predicate", {
				meta:
					jsonSchema ?
						{ ...keywordMeta(alias), jsonSchema }
					:	keywordMeta(alias),
				predicate
			})
		],
		...(meta && { meta })
	}) as never

const stringIntegerRoot = cached(() =>
	regexStringNode(wellFormedIntegerMatcher, "string.integer")
)

export const safeInteger = cached(() =>
	node("intersection", {
		domain: node("domain", { domain: "number" }),
		divisor: node("divisor", { rule: 1 }),
		min: node("min", { rule: Number.MIN_SAFE_INTEGER }),
		max: node("max", { rule: Number.MAX_SAFE_INTEGER })
	})
)

export const stringInteger: stringInteger.module = keywordModule(
	{
		root: stringIntegerRoot,
		parse: () =>
			node("morph", {
				morphs: [stringIntegerRoot(), parseInteger],
				declaredOut: safeInteger()
			})
	},
	{
		name: "string.integer"
	}
) as never

type stringInteger$ = {
	root: string
	parse: (In: string) => To<number>
}

export declare namespace stringInteger {
	export type module = Module<submodule>

	export type submodule = Submodule<stringInteger$>

	export type $ = stringInteger$
}

const hex = () => regexStringNode(/^[\dA-Fa-f]+$/, "string.hex")

const base64: base64.module = keywordModule(
	{
		root: () =>
			regexStringNode(
				/^(?:[\d+/A-Za-z]{4})*(?:[\d+/A-Za-z]{2}==|[\d+/A-Za-z]{3}=)?$/,
				"string.base64",
				{ contentEncoding: "base64" }
			),
		url: () =>
			regexStringNode(
				/^(?:[\w-]{4})*(?:[\w-]{2}(?:==|%3D%3D)?|[\w-]{3}(?:=|%3D)?)?$/,
				"string.base64.url",
				{ contentEncoding: "base64url" }
			)
	},
	{
		name: "string.base64"
	}
) as never

type base64$ = {
	root: string
	url: string
}

declare namespace base64 {
	export type module = Module<submodule>

	export type submodule = Submodule<base64$>

	export type $ = base64$
}

const stringBooleanRoot = cached(() =>
	node("union", {
		branches: [node("unit", { unit: "false" }), node("unit", { unit: "true" })]
	})
)

export const stringBoolean: stringBoolean.module = keywordModule(
	{
		root: stringBooleanRoot,
		parse: () =>
			node("morph", {
				morphs: [stringBooleanRoot(), parseBoolean],
				declaredOut: intrinsic.boolean
			})
	},
	{
		name: "string.boolean"
	}
) as never

type stringBoolean$ = {
	root: "true" | "false"
	parse: (In: "true" | "false") => To<boolean>
}

export declare namespace stringBoolean {
	export type module = Module<submodule>

	export type submodule = Submodule<stringBoolean$>

	export type $ = stringBoolean$
}

export const preformattedCapitalize = cached(() =>
	regexStringNode(/^(?:[^a-z][\S\s]*)?$/, "string.capitalize.preformatted")
)

export const capitalize: capitalize.module = keywordModule(
	{
		root: () =>
			node("morph", {
				morphs: [intrinsic.string, capitalizeString],
				declaredOut: preformattedCapitalize()
			}),
		preformatted: preformattedCapitalize
	},
	{
		name: "string.capitalize"
	}
) as never

type capitalize$ = {
	root: (In: string) => To<string>
	preformatted: string
}

export declare namespace capitalize {
	export type module = Module<submodule>

	export type submodule = Submodule<capitalize$>

	export type $ = capitalize$
}

// https://github.com/validatorjs/validator.js/blob/master/src/lib/isCreditCard.js
const creditCardMatcher: RegExp =
	/^(?:4\d{12}(?:\d{3,6})?|(?:5[1-5]|6[27])\d{14}|(?:222[1-9]|22[3-9]\d|2[3-6]\d\d|27[01]\d|2720)\d{12}|6(?:011|5\d\d)\d{12,15}|3[47]\d{13}|3(?:0[0-5]|[68]\d)\d{11}|(?:2131|1800|35\d{3})\d{11}|81\d{14,17})$/

export const creditCard = cached(() =>
	node("intersection", {
		domain: node("domain", { domain: "string" }),
		pattern: [
			node("pattern", {
				meta: keywordMeta("string.creditCard"),
				rule: creditCardMatcher.source
			})
		],
		predicate: [
			node("predicate", {
				meta: keywordMeta("string.creditCard"),
				predicate: isLuhnValid
			})
		]
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

export { iso8601DateMatcher, iso8601Matcher }

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

const parsableDate = cached(() =>
	predicateStringNode(isParsableDate, "string.date", { format: "date-time" })
)

const epochRoot = cached(() =>
	stringInteger.root.internal
		.rawConstrain("predicate", {
			meta: keywordMeta("string.date.epoch"),
			predicate: isEpochString
		})
		.configure(keywordMeta("string.date.epoch"), "self")
		.assertIs("intersection")
)

const epoch: Module<stringDate.epoch.$> = keywordModule(
	{
		root: epochRoot,
		parse: () =>
			node("morph", {
				morphs: [epochRoot(), parseEpoch],
				declaredOut: intrinsic.Date
			})
	},
	{
		name: "string.date.epoch"
	}
) as never

const isoRoot = cached(() =>
	regexStringNode(iso8601Matcher, "string.date.iso", {
		format: "date-time"
	}).internal.assertIs("intersection")
)

const isoDate = cached(() =>
	regexStringNode(iso8601DateMatcher, "string.date.iso.date", {
		format: "date"
	})
)

const iso: Module<stringDate.iso.$> = keywordModule(
	{
		root: isoRoot,
		date: isoDate,
		parse: () =>
			node("morph", {
				morphs: [isoRoot(), parseIsoDate],
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
			node("morph", {
				declaredIn: parsableDate(),
				morphs: [intrinsic.string, parseDate],
				declaredOut: intrinsic.Date
			}),
		iso,
		epoch
	},
	{
		name: "string.date"
	}
) as never

type stringDateIso$ = {
	root: string
	date: string
	parse: (In: string) => To<Date>
}

type stringDateEpoch$ = {
	root: string
	parse: (In: string) => To<Date>
}

type stringDate$ = {
	root: string
	parse: (In: string) => To<Date>
	iso: Submodule<stringDateIso$>
	epoch: Submodule<stringDateEpoch$>
}

export declare namespace stringDate {
	export type module = Module<stringDate.submodule>

	export type submodule = Submodule<stringDate$>

	export type $ = stringDate$

	export namespace iso {
		export type submodule = Submodule<stringDateIso$>

		export type $ = stringDateIso$
	}

	export namespace epoch {
		export type submodule = Submodule<stringDateEpoch$>

		export type $ = stringDateEpoch$
	}
}

const email = () =>
	regexStringNode(
		// lookahead-free (RE2 & fast-check safe) dot-atom local part and RFC 1123 domain labels:
		// rejects leading/trailing/consecutive dots and leading/trailing domain hyphens while
		// allowing apostrophes (RFC 5322 atext) and punycode labels (xn--)
		/^[\w%'+-]+(?:\.[\w%'+-]+)*@[\dA-Za-z](?:[\dA-Za-z-]*[\dA-Za-z])?(?:\.[\dA-Za-z](?:[\dA-Za-z-]*[\dA-Za-z])?)*\.[A-Za-z]{2,}$/,
		"string.email",
		{ format: "email" }
	)

export const ip: ip.module = keywordModule(
	{
		root: ["v4 | v6", "@", keywordMeta("string.ip")],
		v4: () => regexStringNode(ipv4Matcher, "string.ip.v4", { format: "ipv4" }),
		v6: () => regexStringNode(ipv6Matcher, "string.ip.v6", { format: "ipv6" })
	},
	{
		name: "string.ip"
	}
) as never

type ip$ = {
	root: string
	v4: string
	v6: string
}

export declare namespace ip {
	export type module = Module<submodule>

	export type submodule = Submodule<ip$>

	export type $ = ip$
}

const jsonRoot = () =>
	predicateStringNode(
		isJsonString,
		"string.json",
		{ type: "string", contentMediaType: "application/json" },
		keywordMeta("string.json")
	)

export const json: stringJson.module = keywordModule(
	{
		root: jsonRoot,
		parse: () =>
			node("morph", {
				meta: keywordMeta("string.json.parse"),
				morphs: [intrinsic.string, parseJson],
				declaredOut: intrinsic.jsonData
			})
	},
	{
		name: "string.json"
	}
) as never

type stringJson$ = {
	root: string
	parse: (In: string) => To<Json>
}

export declare namespace stringJson {
	export type module = Module<submodule>

	export type submodule = Submodule<stringJson$>

	export type $ = stringJson$
}

export const preformattedLower = cached(() =>
	regexStringNode(/^[^A-Z]*$/, "string.lower.preformatted")
)

const lower: lower.module = keywordModule(
	{
		root: () =>
			node("morph", {
				morphs: [intrinsic.string, lowercaseString],
				declaredOut: preformattedLower()
			}),
		preformatted: preformattedLower
	},
	{
		name: "string.lower"
	}
) as never

type lower$ = {
	root: (In: string) => To<string>
	preformatted: string
}

export declare namespace lower {
	export type module = Module<submodule>

	export type submodule = Submodule<lower$>

	export type $ = lower$
}

export const normalizedForms = ["NFC", "NFD", "NFKC", "NFKD"] as const

export type NormalizedForm = (typeof normalizedForms)[number]

export const preformattedNodes = flatMorph(
	normalizedForms,
	(i, form) =>
		[
			form,
			cached(() =>
				node("intersection", {
					domain: node("domain", { domain: "string" }),
					predicate: [
						node("predicate", {
							meta: keywordMeta(`string.normalize.${form}.preformatted`),
							predicate: normalizationsByForm[form].predicate
						})
					],
					meta: keywordMeta(`string.normalize.${form}.preformatted`)
				})
			)
		] as const
)

const normalizeNodes = flatMorph(
	normalizedForms,
	(i, form) =>
		[
			form,
			() =>
				node("morph", {
					morphs: [intrinsic.string, normalizationsByForm[form].morphs],
					declaredOut: preformattedNodes[form]()
				})
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

type normalizeForm$ = {
	root: (In: string) => To<string>
	preformatted: string
}

type normalize$ = {
	root: (In: string) => To<string>
	NFC: Submodule<normalizeForm$>
	NFD: Submodule<normalizeForm$>
	NFKC: Submodule<normalizeForm$>
	NFKD: Submodule<normalizeForm$>
}

export declare namespace normalize {
	export type module = Module<submodule>

	export type submodule = Submodule<normalize$>

	export type $ = normalize$

	export namespace NFC {
		export type submodule = Submodule<normalizeForm$>

		export type $ = normalizeForm$
	}

	export namespace NFD {
		export type submodule = Submodule<normalizeForm$>

		export type $ = normalizeForm$
	}

	export namespace NFKC {
		export type submodule = Submodule<normalizeForm$>

		export type $ = normalizeForm$
	}

	export namespace NFKD {
		export type submodule = Submodule<normalizeForm$>

		export type $ = normalizeForm$
	}
}

const numericRoot = cached(() =>
	regexStringNode(numericStringMatcher, "string.numeric")
)

export const stringNumeric: stringNumeric.module = keywordModule(
	{
		root: numericRoot,
		parse: () => {
			const root = numericRoot()
			// so its output is a number as number is configured
			const input =
				$ark.cfg!.numberAllowsInfinity ?
					root
				:	node("intersection", {
						...root.inner,
						predicate: [
							node("predicate", {
								predicate: parsesFinite,
								// JSON Schema can't say it, so the pattern stands for it
								meta: {
									...keywordMeta("string.numeric.parse"),
									jsonSchema: {}
								}
							})
						]
					})
			return node("morph", {
				morphs: [input, parseNumeric],
				declaredOut: intrinsic.number
			})
		}
	},
	{
		name: "string.numeric"
	}
) as never

type stringNumeric$ = {
	root: string
	parse: (In: string) => To<number>
}

export declare namespace stringNumeric {
	export type module = Module<submodule>

	export type submodule = Submodule<stringNumeric$>

	export type $ = stringNumeric$
}

const regex = () =>
	predicateStringNode(isRegexPattern, "string.regex", { format: "regex" })

const semverMatcher =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][\dA-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][\dA-Za-z-]*))*))?(?:\+([\dA-Za-z-]+(?:\.[\dA-Za-z-]+)*))?$/

const semver = () => regexStringNode(semverMatcher, "string.semver")

export const preformattedTrim = cached(() =>
	regexStringNode(
		// no leading or trailing whitespace
		/^\S[\S\s]*\S$|^\S?$/,
		"string.trim.preformatted"
	)
)

const trim: trim.module = keywordModule(
	{
		root: () =>
			node("morph", {
				morphs: [intrinsic.string, trimString],
				declaredOut: preformattedTrim()
			}),
		preformatted: preformattedTrim
	},
	{
		name: "string.trim"
	}
) as never

type trim$ = {
	root: (In: string) => To<string>
	preformatted: string
}

export declare namespace trim {
	export type module = Module<submodule>

	export type submodule = Submodule<trim$>

	export type $ = trim$
}

export const preformattedUpper = cached(() =>
	regexStringNode(/^[^a-z]*$/, "string.upper.preformatted")
)

const upper: upper.module = keywordModule(
	{
		root: () =>
			node("morph", {
				morphs: [intrinsic.string, uppercaseString],
				declaredOut: preformattedUpper()
			}),
		preformatted: preformattedUpper
	},
	{
		name: "string.upper"
	}
) as never

type upper$ = {
	root: (In: string) => To<string>
	preformatted: string
}

declare namespace upper {
	export type module = Module<submodule>

	export type submodule = Submodule<upper$>

	export type $ = upper$
}

const urlRoot = cached(() =>
	// URL.canParse and RFC 3986 differ only at the edges, e.g. a space in a path
	predicateStringNode(isParsableUrl, "string.url", { format: "uri" })
)

// http(s), cased without the i flag, which JSON Schema's pattern can't write
const httpUrlMatcher = /^[Hh][Tt]{2}[Pp][Ss]?:\/\//

// a URL a browser opens as a page, unlike mailto:, javascript: or ftp:
const httpUrl = cached(() =>
	node("intersection", {
		domain: node("domain", { domain: "string" }),
		pattern: [
			node("pattern", {
				meta: keywordMeta("string.url.http"),
				rule: httpUrlMatcher.source
			})
		],
		predicate: [
			node("predicate", {
				meta: {
					...keywordMeta("string.url.http"),
					jsonSchema: { format: "uri" }
				},
				predicate: isParsableUrl
			})
		]
	})
)

export const urlProto = cached(() => node("proto", { proto: URL }))

export const url: url.module = keywordModule(
	{
		root: urlRoot,
		http: httpUrl,
		parse: () =>
			node("morph", {
				declaredIn: urlRoot(),
				morphs: [intrinsic.string, parseUrl],
				declaredOut: urlProto()
			})
	},
	{
		name: "string.url"
	}
) as never

type url$ = {
	root: string
	http: string
	parse: (In: string) => To<URL>
}

export declare namespace url {
	export type module = Module<submodule>

	export type submodule = Submodule<url$>

	export type $ = url$
}

const uuidVersions = [1, 2, 3, 4, 5, 6, 7, 8] as const

// based on https://github.com/validatorjs/validator.js/blob/master/src/lib/isUUID.js
export const uuid: uuid.module = keywordModule(
	{
		root: [
			// one pattern: a union with the literals would make them required keys of an index signature
			uuidMatcher,
			"@",
			{ ...keywordMeta("string.uuid"), format: "uuid" }
		],
		...flatMorph(uuidVersions, (i, version) => [
			`v${version}`,
			() =>
				regexStringNode(
					new RegExp(
						`^[\\dA-Fa-f]{8}-[\\dA-Fa-f]{4}-${version}[\\dA-Fa-f]{3}-[89ABab][\\dA-Fa-f]{3}-[\\dA-Fa-f]{12}$`
					),
					`string.uuid.v${version}`,
					{ format: "uuid" }
				)
		])
	},
	{
		name: "string.uuid"
	}
) as never

type uuid$ = {
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

export declare namespace uuid {
	export type module = Module<submodule>

	export type submodule = Submodule<uuid$>

	export type $ = uuid$

	export namespace $ {
		export type flat = {}
	}
}

export const string: string.module = keywordModule(
	{
		root: () => intrinsic.string,
		alpha: () => regexStringNode(/^[A-Za-z]*$/, "string.alpha"),
		alphanumeric: () => regexStringNode(/^[\dA-Za-z]*$/, "string.alphanumeric"),
		hex,
		base58: () => regexStringNode(/^[1-9A-HJ-NP-Za-km-z]+$/, "string.base58"),
		base64,
		boolean: stringBoolean,
		capitalize,
		creditCard,
		date: stringDate,
		digits: () => regexStringNode(/^\d*$/, "string.digits"),
		email,
		integer: stringInteger,
		ip,
		json,
		lower,
		normalize,
		// unanchored: any one character that isn't whitespace
		nonblank: () => regexStringNode(/\S/, "string.nonblank"),
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

type string$ = {
	root: string
	alpha: string
	alphanumeric: string
	hex: string
	base58: string
	base64: Submodule<base64$>
	boolean: Submodule<stringBoolean$>
	capitalize: Submodule<capitalize$>
	creditCard: string
	date: Submodule<stringDate$>
	digits: string
	email: string
	integer: Submodule<stringInteger$>
	ip: Submodule<ip$>
	json: Submodule<stringJson$>
	lower: Submodule<lower$>
	normalize: Submodule<normalize$>
	nonblank: string
	numeric: Submodule<stringNumeric$>
	regex: string
	semver: string
	trim: Submodule<trim$>
	upper: Submodule<upper$>
	url: Submodule<url$>
	uuid: Submodule<uuid$>
}

export declare namespace string {
	export type module = Module<string.submodule>

	export type submodule = Submodule<string$>

	export type $ = string$
}
