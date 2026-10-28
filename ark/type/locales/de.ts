// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	actualAtPathOf,
	describeCause,
	describeMissing,
	distinctExpectedOf,
	groupByPath,
	labelOf,
	writeKeywordExpected
} from "@ark/schema/i18n"
import {
	domainOf,
	getBuiltinNameOfConstructor,
	isValidDate,
	timeOf,
	listPattern,
	objectKindOrDomainOf,
	printable,
	type ListType
} from "@ark/util"
import type { Locale } from "../locale.ts"

const listSeparatedBy = (middle: string) =>
	listPattern(
		{ two: " oder ", middle, end: " oder " },
		{ two: " und ", middle, end: " und " }
	)

const commaList = /* @__PURE__ */ listSeparatedBy(", ")

const semicolonList = /* @__PURE__ */ listSeparatedBy("; ")

// items with commas of their own, like 1,5, are separated by semicolons
const list = (items: readonly string[], type: ListType): string =>
	(items.some(item => item.includes(",")) ? semicolonList : commaList)(
		items,
		type
	)

const months = [
	"Januar",
	"Februar",
	"März",
	"April",
	"Mai",
	"Juni",
	"Juli",
	"August",
	"September",
	"Oktober",
	"November",
	"Dezember"
]

const number = (n: number | bigint): string => `${n}`.replace(".", ",")

const pad = (n: number, width: number) => `${n}`.padStart(width, "0")

// in UTC, omitting the time at midnight
const date = (d: Date): string => {
	const year = d.getUTCFullYear()
	const month = d.getUTCMonth()
	const day = d.getUTCDate()
	const hours = d.getUTCHours()
	const minutes = d.getUTCMinutes()
	const seconds = d.getUTCSeconds()
	const milliseconds = d.getUTCMilliseconds()
	if (!hours && !minutes && !seconds && !milliseconds)
		return `${day}. ${months[month]} ${year}`
	let time = `${pad(hours, 2)}:${pad(minutes, 2)}`
	if (seconds || milliseconds) time += `:${pad(seconds, 2)}`
	if (milliseconds) time += `,${pad(milliseconds, 3)}`
	return `${day}. ${months[month]} ${year}, ${time} UTC`
}

// a date is a nominative with its article
const theDate = (date: Date, locale: Locale.Info) => `der ${locale.date(date)}`

// Dates and numbers in the locale's form, other values as code
const print = (value: unknown, locale: Locale.Info): string =>
	value instanceof Date && isValidDate(value) ?
		theDate(value, locale)
	:	locale.verbatim(
			typeof value === "number" ? locale.number(value) : printable(value)
		)

// errors print an object by its kind, so its contents never reach a message
const printKind = (data: unknown, locale: Locale): string =>
	typeof data === "function" ? locale.nouns.Function
	: typeof data !== "object" || data === null ? print(data, locale)
	: locale.nouns[Array.isArray(data) ? "Array" : "object"]

const was = (actual: string) => actual && `, ist aber ${actual}`

const mustBe = (expected: string, actual: string) =>
	`muss ${expected} sein${was(actual)}`

// what a missing key or discriminant was
const absent = "nicht vorhanden"

// dative after "mit", accusative after "enthält"
const elements = (n: number, locale: Locale.Info, dative?: true) =>
	`${locale.number(n)} ${
		locale.plural(n) === "one" ? "Element"
		: dative ? "Elementen"
		: "Elemente"
	}`

const length = (
	n: number,
	data: string | readonly unknown[],
	locale: Locale.Info,
	bound = ""
) =>
	typeof data === "string" ?
		`${bound}${locale.number(n)} Zeichen lang`
	:	`ein Array mit ${bound}${elements(n, locale, true)}`

type LengthCode = "minLength" | "maxLength" | "exactLength"

const lengthBounds = {
	minLength: "mindestens",
	maxLength: "höchstens",
	exactLength: "genau"
} as const

// only a maxLength or exactLength can have a rule of 0
const lengthExpected: Locale.ExpectedWriter<LengthCode> = (e, locale) =>
	e.rule === 0 ?
		typeof e.data === "string" ?
			"leer"
		:	"ein leeres Array"
	:	length(e.rule, e.data, locale, `${lengthBounds[e.code]} `)

// an empty value is described by expected text alone if it is too short
const lengthActual: Locale.ActualWriter<LengthCode> = (data, e, locale) =>
	data.length ? length(data.length, data, locale)
	: e.code === "minLength" ? ""
	: "leer"

// a value that must be nonempty is negated, and a nonempty array is counted by what it contains
const lengthProblem: Locale.ProblemWriter<LengthCode> = (e, locale) => {
	if (e.code === "minLength" && e.rule === 1)
		return `darf nicht leer sein${was(e.actual)}`
	if (typeof e.data === "string")
		return mustBe(lengthExpected(e, locale), e.actual)
	const rule =
		e.rule === 0 ?
			"muss leer sein"
		:	`muss ${lengthBounds[e.code]} ${elements(e.rule, locale)} enthalten`
	return e.data.length && e.actual === lengthActual(e.data, e, locale) ?
			`${rule}, enthält aber ${elements(e.data.length, locale)}`
		:	`${rule}${was(e.actual)}`
}

const lengthWriters = {
	expected: lengthExpected,
	actual: lengthActual,
	problem: lengthProblem
}

// a path like [0] or ["a b"] needs a noun to be a subject
const subjectOf = (
	propString: string,
	label: string | undefined,
	locale: Locale.Info
) =>
	label === undefined ?
		propString[0] === "[" ?
			`Wert an ${locale.verbatim(propString)}`
		:	locale.verbatim(propString)
	: /\[\d/.test(propString) ?
		`„${locale.verbatim(label)}“ an ${locale.verbatim(propString)}`
	:	`„${locale.verbatim(label)}“`

const bound: Locale.ExpectedWriter<"min" | "max"> = (e, locale) =>
	e.rule === 0 && e.exclusive ?
		e.code === "min" ?
			"positiv"
		:	"negativ"
	: e.code === "min" ?
		`${e.exclusive ? "größer als" : "mindestens"} ${locale.number(e.rule)}`
	:	`${e.exclusive ? "kleiner als" : "höchstens"} ${locale.number(e.rule)}`

// "muss nicht" means "need not", so an inclusive bound of 0 is negated by "darf"
const boundProblem: Locale.ProblemWriter<"min" | "max"> = (e, locale) =>
	e.rule === 0 && !e.exclusive ?
		`darf nicht ${e.code === "min" ? "negativ" : "positiv"} sein${was(e.actual)}`
	:	mustBe(bound(e, locale), e.actual)

const dateWriters = (relation: string) => {
	const expected: Locale.ExpectedWriter<"before" | "after"> = (e, locale) =>
		`${relation} ${theDate(e.rule, locale)}`
	return {
		expected,
		actual: (data, e, locale) => print(data, locale),
		problem: (e, locale) => mustBe(expected(e, locale), e.actual)
	} satisfies Locale.CodeWriters<"before" | "after">
}

const divisorOf = (rule: number, locale: Locale.Info) =>
	rule === 1 ? "eine ganze Zahl"
	: rule === 2 ? "gerade"
	: `ein Vielfaches von ${locale.number(rule)}`

const predicateOf: Locale.ExpectedWriter<"predicate"> = (e, locale) => {
	const name = (e.predicate ?? e.morph)?.name
	return `gemäß ${name ? locale.verbatim(name) : "einem anonymen Prädikat"} gültig`
}

// false and true are named as one, as a union of them is
const casesOf: Locale.ExpectedWriter<"discriminant"> = (e, locale) =>
	e.discriminantKind === "domain" ?
		locale.list(
			e.cases.map(domain => locale.nouns[domain]),
			"or"
		)
	: e.cases.length === 2 && e.cases.every(value => typeof value === "boolean") ?
		locale.nouns.boolean
	:	locale.list(
			e.cases.map(value => print(value, locale)),
			"or"
		)

const describeProto = (proto: Function, locale: Locale) => {
	const builtinName = getBuiltinNameOfConstructor(proto)
	return builtinName ?
			locale.nouns[builtinName]
		:	`eine Instanz von ${locale.verbatim(proto.name)}`
}

// a JSON keyword's error carries the SyntaxError JSON.parse threw as its cause
const jsonProblem: Locale.ProblemWriter = (e, locale) =>
	e.code === "predicate" && e.cause !== undefined ?
		`muss eine JSON-Zeichenkette sein (${describeCause(e.cause)})`
	:	locale.problem(e, locale)

const epoch = "ein gültiger Unix-Zeitstempel als ganze Zahl"

const keywordPhrases = {
	"FormData.parsed": "ein Objekt mit geparsten Formulardaten",
	"number.epoch": {
		noun: epoch,
		expected: (e, locale) =>
			e.code === "domain" ? "ein Unix-Zeitstempel als Zahl"
			: e.code === "divisor" ? "ein Unix-Zeitstempel als ganze Zahl"
			: e.code === "min" ? `ein Unix-Zeitstempel ab ${locale.number(e.rule)}`
			: e.code === "max" ? `ein Unix-Zeitstempel bis ${locale.number(e.rule)}`
			: epoch
	},
	"object.json": "ein einfaches Objekt oder Array",
	"string.alpha": "rein alphabetisch",
	"string.alphanumeric": "rein alphanumerisch",
	"string.base58": "Base58-kodiert",
	"string.base64": "Base64-kodiert",
	"string.base64.url": "Base64url-kodiert",
	"string.capitalize.preformatted": "großgeschrieben",
	"string.creditCard": "eine Kreditkartennummer",
	"string.date": "ein parsbares Datum",
	"string.date.epoch":
		"ein gültiger Unix-Zeitstempel als ganzzahlige Zeichenkette",
	"string.date.iso": "ein Datum nach ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)",
	"string.date.parse": "ein parsbares Datum",
	"string.digits": "eine Ziffernfolge (0-9)",
	"string.email": "eine E-Mail-Adresse",
	"string.hex": "rein hexadezimal",
	"string.integer": "eine wohlgeformte ganzzahlige Zeichenkette",
	"string.integer.parse":
		"eine ganze Zahl im Bereich Number.MIN_SAFE_INTEGER bis Number.MAX_SAFE_INTEGER",
	"string.ip": "eine IP-Adresse",
	"string.ip.v4": "eine IPv4-Adresse",
	"string.ip.v6": "eine IPv6-Adresse",
	"string.json": { noun: "eine JSON-Zeichenkette", problem: jsonProblem },
	"string.json.parse": {
		noun: "eine JSON-Zeichenkette",
		actual: (data, e, locale) => (data === "" ? "leer" : print(data, locale)),
		problem: jsonProblem
	},
	"string.lower.preformatted": "kleingeschrieben",
	"string.normalize.NFC.preformatted": "NFC-normalisiert",
	"string.normalize.NFD.preformatted": "NFD-normalisiert",
	"string.normalize.NFKC.preformatted": "NFKC-normalisiert",
	"string.normalize.NFKD.preformatted": "NFKD-normalisiert",
	"string.numeric": "eine wohlgeformte numerische Zeichenkette",
	"string.numeric.parse": "endlich",
	"string.regex": {
		noun: "ein Regex-Muster",
		problem: (e, locale) =>
			e.code === "predicate" && e.cause !== undefined ?
				`muss ein Regex-Muster sein (${describeCause(e.cause)})`
			:	locale.problem(e, locale)
	},
	"string.semver": "eine semantische Version (siehe https://semver.org/)",
	"string.trim.preformatted": "ohne Leerraum am Anfang und Ende",
	"string.upper.preformatted": "durchgehend großgeschrieben",
	"string.url": "eine URL",
	"string.url.parse": "eine URL",
	"string.uuid": "eine UUID",
	"string.uuid.v1": "eine UUIDv1",
	"string.uuid.v2": "eine UUIDv2",
	"string.uuid.v3": "eine UUIDv3",
	"string.uuid.v4": "eine UUIDv4",
	"string.uuid.v5": "eine UUIDv5",
	"string.uuid.v6": "eine UUIDv6",
	"string.uuid.v7": "eine UUIDv7",
	"string.uuid.v8": "eine UUIDv8"
} satisfies Locale.Complete["keywordPhrases"]

export const de: Locale.Complete = {
	tag: "de",
	list,
	plural: n => (n === 1 ? "one" : "other"),
	number,
	date,
	verbatim: text => text,
	cite: text => `ein Wert gemäß der Beschreibung „${text}“`,
	// a domain is named by its noun whatever its meta, as en names it
	basis: (basis, locale) => {
		if (basis.code === "domain") return locale.nouns[basis.domain]
		return (
			writeKeywordExpected(basis, locale) ??
			(basis.code === "morph" || basis.meta.description !== undefined ?
				locale.cite(basis.meta.description!)
			: basis.code === "unit" ? print(basis.unit, locale)
			: describeProto(basis.proto, locale))
		)
	},
	nouns: {
		bigint: "ein BigInt",
		boolean: "ein Wahrheitswert",
		null: "null",
		number: "eine Zahl",
		object: "ein Objekt",
		string: "eine Zeichenkette",
		symbol: "ein Symbol",
		undefined: "undefined",
		Array: "ein Array",
		Function: "eine Funktion",
		Date: "ein Date-Objekt",
		RegExp: "ein RegExp-Objekt",
		Error: "ein Error-Objekt",
		Map: "eine Map",
		Set: "ein Set",
		String: "ein String-Objekt",
		Number: "ein Number-Objekt",
		Boolean: "ein Boolean-Objekt",
		Promise: "ein Promise",
		WeakMap: "eine WeakMap",
		WeakSet: "ein WeakSet",
		ArrayBuffer: "eine ArrayBuffer-Instanz",
		Blob: "eine Blob-Instanz",
		File: "eine File-Instanz",
		FormData: "eine FormData-Instanz",
		Headers: "eine Headers-Instanz",
		Request: "eine Request-Instanz",
		Response: "eine Response-Instanz",
		URL: "eine URL-Instanz",
		Int8Array: "ein Int8Array",
		Uint8Array: "ein Uint8Array",
		Uint8ClampedArray: "ein Uint8ClampedArray",
		Int16Array: "ein Int16Array",
		Uint16Array: "ein Uint16Array",
		Int32Array: "ein Int32Array",
		Uint32Array: "ein Uint32Array",
		Float32Array: "ein Float32Array",
		Float64Array: "ein Float64Array",
		BigInt64Array: "ein BigInt64Array",
		BigUint64Array: "ein BigUint64Array",
		unknown: "ein beliebiger Wert",
		never: "never"
	},
	keywordPhrases,
	actual: (data, e, locale) => printKind(data, locale),
	problem: e => mustBe(e.expected, e.actual),
	message: (e, locale) =>
		e.path.length === 0 ?
			e.problem
		:	`${subjectOf(e.propString, labelOf(e), locale)} ${e.problem}`,
	domain: {
		expected: (e, locale) => locale.nouns[e.domain],
		actual: (data, e, locale) =>
			typeof data === "number" && !Number.isFinite(data) ?
				`${data}`
			:	locale.nouns[domainOf(data)],
		problem: (e, locale) => mustBe(locale.nouns[e.domain], e.actual)
	},
	unit: {
		expected: (e, locale) => print(e.unit, locale),
		actual: (data, e, locale) =>
			data instanceof Date && isValidDate(data) ?
				theDate(data, locale)
			:	printKind(data, locale),
		problem: (e, locale) => {
			const unit = print(e.unit, locale)
			return unit === e.actual ?
					`muss referenzgleich mit ${unit} sein (wird zum selben Wert serialisiert)`
				:	mustBe(unit, e.actual)
		}
	},
	proto: {
		expected: (e, locale) => describeProto(e.proto, locale),
		actual: (data, e, locale) =>
			!(data instanceof Date) || isValidDate(data) ?
				locale.nouns[objectKindOrDomainOf(data)]
			: timeOf(data) === undefined ? locale.nouns.object
			: "ein ungültiges Date-Objekt",
		problem: (e, locale) => mustBe(describeProto(e.proto, locale), e.actual)
	},
	union: {
		expected: (e, locale) => {
			const groups = groupByPath(e, locale)
			if (groups.length === 0) return locale.nouns.never
			return locale.list(
				groups.map(group => {
					const subject =
						group.propString &&
						`${subjectOf(group.propString, group.label, locale)} `
					const expected = locale.list(group.expected, "or")
					const actual = group.actual ?? printKind(group.data, locale)
					// a missing key reads as its own error does
					if (actual === absent)
						return `${subject}fehlt (muss ${expected} sein)`
					// beside other paths, a comma would blur where each one's text ends
					return groups.length === 1 ?
							`${subject}${mustBe(expected, actual)}`
						:	`${subject}muss ${expected} sein${actual && ` (ist ${actual})`}`
				}),
				"or"
			)
		},
		actual: (data, e, locale) => actualAtPathOf(e) ?? printKind(data, locale),
		problem: e => (e.errors.length ? e.expected : mustBe(e.expected, e.actual)),
		message: (e, locale) =>
			e.errors.length === 0 ? locale.message(e, locale) : e.problem
	},
	intersection: {
		expected: e =>
			distinctExpectedOf(e.errors).length > 1 ?
				`  ◦ ${distinctExpectedOf(e.errors).join("\n  ◦ ")}`
			:	e.errors[0].expected,
		problem: e =>
			distinctExpectedOf(e.errors).length > 1 ?
				`(${e.actual}) muss alles Folgende sein:\n${e.expected}`
			:	mustBe(e.expected, e.actual)
	},
	min: { expected: bound, problem: boundProblem },
	max: { expected: bound, problem: boundProblem },
	minLength: lengthWriters,
	maxLength: lengthWriters,
	exactLength: lengthWriters,
	divisor: {
		expected: (e, locale) => divisorOf(e.rule, locale),
		problem: (e, locale) => mustBe(divisorOf(e.rule, locale), e.actual)
	},
	pattern: {
		expected: (e, locale) => `passend zum Muster ${locale.verbatim(e.rule)}`,
		problem: (e, locale) =>
			`muss dem Muster ${locale.verbatim(e.rule)} entsprechen${was(e.actual)}`
	},
	before: dateWriters("spätestens"),
	after: dateWriters("frühestens"),
	notEqual: {
		// "ungleich" takes a dative
		expected: (e, locale) =>
			`ungleich ${print(e.rule, locale).replace(/^der /, "dem ")}`,
		actual: (data, e, locale) => print(data, locale),
		problem: e => mustBe(e.expected, e.actual)
	},
	notEqualLength: {
		expected: (e, locale) =>
			typeof e.data === "string" ?
				`nicht ${length(e.rule, e.data, locale)}`
			:	`kein Array mit ${elements(e.rule, locale, true)}`,
		actual: (data, e, locale) => length(data.length, data, locale),
		// "muss nicht" means "need not"
		problem: (e, locale) =>
			`darf nicht ${
				typeof e.data === "string" ?
					`${length(e.rule, e.data, locale)} sein`
				:	`${elements(e.rule, locale)} enthalten`
			}${was(e.actual)}`
	},
	predicate: {
		expected: predicateOf,
		actual: (data, e, locale) =>
			e.morph ?
				`wegen eines Fehlers abgebrochen:\n    ${describeCause(e.cause)}`
			:	printKind(data, locale),
		problem: (e, locale) => {
			if (!e.morph) return mustBe(predicateOf(e, locale), e.actual)
			const name = e.morph.name && `von ${locale.verbatim(e.morph.name)} `
			return `konnte ${name}nicht verarbeitet werden:\n    ${describeCause(e.cause)}`
		}
	},
	required: {
		expected: (e, locale) => describeMissing(e.missing, locale),
		actual: absent,
		problem: (e, locale) =>
			e.missing.code === "intersection" ?
				"fehlt"
			:	`fehlt (muss ${describeMissing(e.missing, locale)} sein)`
	},
	undeclared: {
		expected: "entfernt",
		actual: "",
		problem: "ist nicht erlaubt"
	},
	discriminant: {
		expected: casesOf,
		actual: (data, e, locale) =>
			e.absent ? absent
			: e.discriminantKind === "domain" ? locale.nouns[domainOf(data)]
			: printKind(data, locale),
		problem: (e, locale) =>
			e.absent ?
				`fehlt (muss ${casesOf(e, locale)} sein)`
			:	mustBe(casesOf(e, locale), e.actual)
	}
}
