import {
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

// annotations name the keyword's strings in JSON Schema. Its pattern carries
// them too, so they're written wherever it's constrained further
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

export const stringInteger: stringInteger.module = keywordModule(
	{
		root: stringIntegerRoot,
		parse: () =>
			node("morph", {
				morphs: [stringIntegerRoot(), parseInteger],
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

declare namespace base64 {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string
		url: string
	}
}

const preformattedCapitalize = cached(() =>
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

export declare namespace capitalize {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: (In: string) => To<string>
		preformatted: string
	}
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

export { iso8601Matcher }

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
		.narrow(isEpochString)
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

const iso: Module<stringDate.iso.$> = keywordModule(
	{
		root: isoRoot,
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

export declare namespace ip {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string
		v4: string
		v6: string
	}
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
				meta: "safe JSON string parser",
				morphs: [intrinsic.string, parseJson],
				declaredOut: intrinsic.jsonData
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

export declare namespace stringNumeric {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string
		parse: (In: string) => To<number>
	}
}

const regex = () =>
	predicateStringNode(isRegexPattern, "string.regex", { format: "regex" })

const semverMatcher =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][\dA-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][\dA-Za-z-]*))*))?(?:\+([\dA-Za-z-]+(?:\.[\dA-Za-z-]+)*))?$/

const semver = () => regexStringNode(semverMatcher, "string.semver")

const preformattedTrim = cached(() =>
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

export declare namespace trim {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: (In: string) => To<string>
		preformatted: string
	}
}

const preformattedUpper = cached(() =>
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

declare namespace upper {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: (In: string) => To<string>
		preformatted: string
	}
}

const urlRoot = cached(() =>
	// URL.canParse and RFC 3986 differ only at the edges, e.g. a space in a path
	predicateStringNode(isParsableUrl, "string.url", { format: "uri" })
)

export const url: url.module = keywordModule(
	{
		root: urlRoot,
		parse: () =>
			node("morph", {
				declaredIn: urlRoot(),
				morphs: [intrinsic.string, parseUrl],
				declaredOut: node("proto", { proto: URL })
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

const uuidVersions = [1, 2, 3, 4, 5, 6, 7, 8] as const

// based on https://github.com/validatorjs/validator.js/blob/master/src/lib/isUUID.js
export const uuid: uuid.module = keywordModule(
	{
		root: [
			// one pattern rather than a union with the nil and max literals, which
			// as an index signature's key would make them required keys
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
		alpha: () => regexStringNode(/^[A-Za-z]*$/, "string.alpha"),
		alphanumeric: () => regexStringNode(/^[\dA-Za-z]*$/, "string.alphanumeric"),
		hex,
		base58: () => regexStringNode(/^[1-9A-HJ-NP-Za-km-z]+$/, "string.base58"),
		base64,
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
		base58: string
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
