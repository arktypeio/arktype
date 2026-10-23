import type { ArkError, ArkErrors, Locale } from "@ark/schema"
import { timeOf } from "@ark/util"
import { scope, type } from "arktype"
import { keywordPhrases } from "arktype/internal/keywords/phrases.ts"

class Foo {}

const sym = Symbol("s")

const isEven = (n: number) => n % 2 === 0

const fail = () => {
	throw new Error("kaputt")
}

const counts = [0, 1, 2]

const x = (n: number) => "x".repeat(n)

const items = (n: number) => Array.from({ length: n }, (_, i) => i)

// a value of each kind a keyword may reject
const keywordInputs: unknown[] = [
	"x",
	" x",
	"X",
	"",
	"{",
	"(",
	"9007199254740993",
	"1e400",
	1.5,
	9e20,
	5,
	new Map()
]

const keywordAliases = Object.keys(
	keywordPhrases
) as (keyof typeof keywordPhrases)[]

const isKeywordError = (error: ArkError, alias: string): boolean =>
	error.meta?.keyword === alias ||
	((error.code === "union" || error.code === "intersection") &&
		error.errors.some(child => isKeywordError(child, alias)))

// each failure the locale must render: a label and a type with data it rejects
export const fixturesOf = (jitless: boolean): [string, type.Any, unknown][] => {
	const $ = scope({}, { jitless })
	const fixtures: [string, type.Any, unknown][] = []
	const add = (label: string, T: type.Any, data: unknown) =>
		fixtures.push([label, T, data])
	for (const n of counts) {
		if (n > 0) {
			add(`string >= ${n}`, $.type(`string >= ${n}`), x(n - 1))
			add(`unknown[] >= ${n}`, $.type(`unknown[] >= ${n}`), items(n - 1))
			add(`number % ${n}`, $.type(`number % ${n}`), n + 1.5)
		}
		add(`string > ${n}`, $.type(`string > ${n}`), x(n))
		add(`string <= ${n}`, $.type(`string <= ${n}`), x(n + 1))
		add(`string == ${n}`, $.type(`string == ${n}`), x(n + 1))
		add(`unknown[] <= ${n}`, $.type(`unknown[] <= ${n}`), items(n + 1))
		add(`unknown[] == ${n}`, $.type(`unknown[] == ${n}`), items(n + 1))
		if (n < 2) {
			add(`number >= ${n}`, $.type(`number >= ${n}`), n - 1)
			add(`number > ${n}`, $.type(`number > ${n}`), n)
			add(`number <= ${n}`, $.type(`number <= ${n}`), n + 1)
			add(`number < ${n}`, $.type(`number < ${n}`), n)
		}
	}
	add("number % 5", $.type("number % 5"), 6.5)
	add("number >= 1.5", $.type("number >= 1.5"), 1.25)
	add("number < -1.5", $.type("number < -1.5"), -1.5)
	add("number != 0", $.type("number != 0"), 0)
	add("number != 1.5", $.type("number != 1.5"), 1.5)
	add("string != 2", $.type("string != 2"), x(2))
	add("unknown[] != 2", $.type("unknown[] != 2"), items(2))
	add("unknown[] == 1", $.type("unknown[] == 1"), [])
	add("unknown[] >= 2", $.type("unknown[] >= 2"), [])

	add("Date < 2000", $.type("Date < d'2000-01-01'"), new Date("2001-01-01"))
	add("Date <= 2000", $.type("Date <= d'2000-01-01'"), new Date("2001-05-03"))
	add(
		"Date >= May 3",
		$.type("Date >= d'2000-05-03'"),
		new Date("2000-05-02T23:00:00Z")
	)
	add(
		"Date > May 3, 12:30",
		$.type("Date > d'2000-05-03T12:30:00Z'"),
		new Date("1999-01-01")
	)
	add(
		"Date <= May 3, 12:30:05.123",
		$.type("Date <= d'2000-05-03T12:30:05.123Z'"),
		new Date("2000-12-31T09:05:00Z")
	)
	add("Date != May 3", $.type("Date != d'2000-05-03'"), new Date("2000-05-03"))
	add("May 3", $.type("d'2000-05-03'"), new Date("2000-05-04"))
	add(
		"enumerated Dates",
		$.type.enumerated(new Date("2000-05-03"), new Date("2000-05-04")),
		new Date("2000-05-05")
	)
	add(
		"narrowed Date",
		$.type("Date").narrow(() => false),
		new Date("2000-05-03")
	)

	add("string", $.type("string"), 5)
	add("number", $.type("number"), "x")
	add("number", $.type("number"), Number.NaN)
	add("number", $.type("number"), Infinity)
	add("bigint", $.type("bigint"), 1)
	add("symbol", $.type("symbol"), 1)
	add("object", $.type("object"), 1)
	add("boolean", $.type("boolean"), 1)
	add("null", $.type("null"), 1)
	add("undefined", $.type("undefined"), null)
	add("'a'", $.type("'a'"), "b")
	add("5", $.type("5"), 4)
	add("1.5", $.type("1.5"), 2.5)
	add("5n", $.type("5n"), 4n)
	add("true", $.type("true"), false)
	add("unit object", $.type.unit({}), {})
	add("unit symbol", $.type.unit(sym), 1)
	add("Date", $.type("Date"), 1)
	add("Date", $.type("Date"), new Date("!"))
	add("Date", $.type("Date"), Object.create(Date.prototype))
	add("Array", $.type("unknown[]"), {})
	add("Map", $.type("Map"), [])
	add("Set", $.type("Set"), new Map())
	add("RegExp", $.type("RegExp"), "a")
	add("Error", $.type("Error"), {})
	add("Promise", $.type("Promise"), 1)
	add("Uint8Array", $.type("TypedArray.Uint8"), [])
	add("instanceOf", $.type.instanceOf(Foo), new Date(0))
	add("/^a.*$/", $.type("/^a.*$/"), "b")
	add("/a/i", $.type(/a/i), "b")

	add("narrow named", $.type("number").narrow(isEven), 3)
	add(
		"narrow anonymous",
		$.type("number").narrow(() => false),
		1
	)
	add(
		"narrow mustBe",
		$.type("number").narrow((n, ctx) => n > 0 || ctx.mustBe("positiv")),
		-1
	)
	add(
		"pipe.try anonymous",
		$.type("string").pipe.try(() => fail()),
		"{"
	)
	add(
		"pipe.try named",
		$.type("string").pipe.try(function parse() {
			return fail()
		}),
		"{"
	)

	add("required string", $.type({ a: "string" }), {})
	add("required boolean", $.type({ a: "boolean" }), {})
	add("required never", $.type({ a: "never" }), {})
	add("required unknown", $.type({ a: "unknown" }), {})
	add(
		"required unknown | string",
		$.type({
			a: $.type("unknown")
				.narrow(() => true)
				.or("string")
		}),
		{}
	)
	add(
		"required string | number | Date",
		$.type({ a: "string | number | Date" }),
		{}
	)
	add("required units", $.type({ a: "'x' | 'y' | 1n | 1.5" }), {})
	add(
		"required described unit",
		$.type({ a: $.type("'x'").describe("ein x") }),
		{}
	)
	add("required instanceOf", $.type({ a: $.type.instanceOf(Foo) }), {})
	add(
		"required string.uuid | number",
		$.type({ a: "string.uuid | number" }),
		{}
	)
	add(
		"required string.email | string.uuid",
		$.type({ a: "string.email | string.uuid" }),
		{}
	)
	add(
		"required string.date.epoch.parse",
		$.type({ a: "string.date.epoch.parse" }),
		{}
	)
	add("required number.epoch", $.type({ a: "number.epoch" }), {})
	add(
		"required, two at one path",
		$.type({ a: "string" }).or({ a: "number", b: "string" }),
		{ b: "" }
	)
	add("required in a union", $.type({ a: "never" }).or({ b: "boolean" }), {})
	add(
		"required union in a union",
		$.type({ a: "1 | 2", b: "string" }).or({ a: "2 | 3", c: "number" }),
		{}
	)

	add("undeclared", $.type({ "+": "reject", a: "string" }), { a: "", b: 1 })
	add(
		"undeclared in a union",
		$.type({ "+": "reject", a: "string" }).or({ a: "string", b: "number" }),
		{ a: "", b: "y" }
	)

	const shapes = $.type({ kind: "'circle'", r: "number" }).or({
		kind: "'square'",
		s: "number"
	})
	add("discriminant", shapes, { kind: "triangle" })
	add("discriminant absent", shapes, {})
	add("discriminant described", shapes.describe("eine Form"), {
		kind: "triangle"
	})
	add(
		"discriminant described branches",
		$.type("string").or($.type("number").describe("eine Anzahl")),
		true
	)
	add(
		"discriminant numbers",
		$.type({ k: "1.5", a: "string" }).or({ k: "2.5", b: "number" }),
		{ k: 3.5 }
	)
	add(
		"discriminant bigints",
		$.type({ k: "1n", a: "string" }).or({ k: "2n", b: "number" }),
		{ k: 3n }
	)
	add("discriminant units", $.type("'a' | 'b' | 'c'"), "d")
	add(
		"discriminant domains",
		$.type("string | number | bigint").or({ a: "1" }),
		true
	)
	add(
		"discriminant in an outer union",
		// its own key keeps the string branch from merging into a
		$.type({ a: shapes }).or({ a: "string", "b?": "1" }),
		{ a: { kind: "triangle" } }
	)
	add("discriminant unreadable", shapes, 5)
	add(
		"discriminant beside a default",
		$.type({ id: "0", k1: "number" })
			.or({ id: "1", k2: "number" })
			.or({ name: "string" }),
		{ id: 5 }
	)
	add(
		"discriminant cases beside a default",
		$.type("'a' | 'b' | 'c'").or("string > 5"),
		"d"
	)

	add("union of paths", $.type({ a: "string" }).or({ b: "number" }), {})
	add(
		"union described",
		$.type({ a: "string" }).or({ b: "number" }).describe("ein a oder b"),
		{}
	)
	add("union boolean | null", $.type("boolean | null"), 1)
	add("union of lengths", $.type("(string >= 3) | (string <= 0)"), "a")
	add("union of array lengths", $.type("(unknown[] >= 3) | (unknown[] <= 0)"), [
		0
	])
	add("union of signs", $.type("(number < -10) | (number >= 0)"), -1)
	add("union of decimals", $.type("1.5 | 2.5 | 3.5"), 4)
	add(
		"union with an authored branch",
		$.type("string.email").or(
			$.type("string >= 5").describe("ein Benutzername")
		),
		"a"
	)
	add(
		"union with a narrow",
		$.type("string >= 5").or(
			$.type("string").narrow(function isUpper(s: string) {
				return s === s.toUpperCase()
			})
		),
		"ab"
	)
	add("union at an index", $.type("(string | number)[]"), [true])
	add("never", $.type("never"), 5)
	add("never at a path", $.type({ a: "never" }), { a: 1 })

	add("intersection", $.type("(number % 2) & (number > 10)"), 3)
	add(
		"intersection with an authored constraint",
		$.type("number % 2").and($.type("number > 10").describe("zweistellig")),
		3
	)

	add("path", $.type({ user: { address: { zip: "string" } } }), {
		user: { address: { zip: 5 } }
	})
	add("path at an index", $.type("string[]"), ["a", 1])
	add("path through an index", $.type({ a: "string[]" }), { a: [1] })
	add("path of a quoted key", $.type({ "a b": "string" }), { "a b": 1 })

	const titled = <t extends type.Any>(T: t) => T.configure({ title: "Name" })
	add("titled at the root", titled($.type("string")), 5)
	add("titled", $.type({ name: titled($.type("string")) }), { name: 5 })
	add("titled length", $.type({ name: titled($.type("string >= 3")) }), {
		name: "a"
	})
	add("titled required", $.type({ name: titled($.type("string")) }), {})
	add("titled at an index", titled($.type("string")).array(), ["a", 1])
	add(
		"titled through an index",
		$.type({ list: titled($.type("string")).array() }),
		{ list: [1] }
	)
	add(
		"titled, two constraints",
		$.type({
			n: $.type("(number % 2) & (number > 10)").configure({ title: "Anzahl" })
		}),
		{ n: 3 }
	)
	add(
		"titled, two constraints at an index",
		$.type("(number % 2) & (number > 10)")
			.configure({ title: "Anzahl" })
			.array(),
		[3]
	)
	add("titled enum", $.type({ s: titled($.type("'a' | 'b'")) }), { s: "c" })
	add(
		"titled discriminated enum",
		$.type({ s: titled($.type("'a' | 'b' | 'c'")) }),
		{
			s: "d"
		}
	)
	add("titled domains", $.type({ v: titled($.type("string | number")) }), {
		v: true
	})
	add(
		"titled union of paths",
		$.type({ a: titled($.type("string")) }).or({
			b: $.type("number").configure({ title: "Alter" })
		}),
		{}
	)

	add("described", $.type("string").describe("ein Benutzername"), 5)
	add(
		"configured expected",
		$.type("string").configure({ expected: "ein Name" }),
		5
	)
	add(
		"described length",
		$.type("string >= 3").describe("ein Benutzername"),
		"a"
	)
	add("described array length", $.type("unknown[] >= 2").describe("ein Paar"), [
		0
	])
	add(
		"actual suppressed",
		$.type("string >= 8").configure({ actual: () => "" }),
		"ez"
	)
	add(
		"configured actual of an empty value",
		$.type("string > 0").configure({ actual: "zu kurz" }),
		""
	)
	add(
		"actual suppressed array",
		$.type("unknown[] >= 2").configure({ actual: () => "" }),
		[0]
	)
	// descriptions stay English, so a writer that reads one writes English
	add(
		"configured writer reading the description",
		scope(
			{},
			{ jitless, min: { expected: ctx => `${ctx.description} (!)` } }
		).type("number > 5"),
		3
	)

	for (const alias of keywordAliases) {
		const T = $.type(alias as never) as type.Any
		const data = keywordInputs.find(data => {
			const result = T(data)
			return (
				result instanceof type.errors &&
				result.issues.some(error => isKeywordError(error, alias))
			)
		})
		if (data !== undefined) add(alias, T, data)
	}
	add("string.json.parse", $.type("string.json.parse"), "")
	add("number.epoch", $.type("number.epoch"), 1.5)
	add("number.epoch", $.type("number.epoch"), -9e20)
	return fixtures
}

const describeData = (data: unknown): string =>
	typeof data === "string" ? JSON.stringify(data)
	: typeof data === "bigint" ? `${data}n`
	: data instanceof Date ?
		timeOf(data) === undefined ? "Object.create(Date.prototype)"
		: Number.isNaN(data.getTime()) ? "Invalid Date"
		: data.toISOString()
	: typeof data === "symbol" ? String(data)
	: (
		Array.isArray(data) ||
		(typeof data === "object" &&
			data !== null &&
			Object.getPrototypeOf(data) === Object.prototype)
	) ?
		JSON.stringify(data, (k, v) => (typeof v === "bigint" ? `${v}n` : v))
	: typeof data === "object" && data !== null ? data.constructor.name
	: String(data)

// JSON.parse's message varies between Node versions
const jsonParseErrorOf = (data: unknown): string | undefined => {
	if (typeof data !== "string") return
	try {
		JSON.parse(data)
	} catch (e) {
		return String(e)
	}
}

/**
 * each fixture's summary in a locale, keyed by its label and data, with
 * the error JSON.parse throws for the data as ⟨SyntaxError⟩
 */
export const matrixOf = (
	locale: Locale,
	jitless = false
): Record<string, string> => {
	const matrix: Record<string, string> = {}
	for (const [label, T, data] of fixturesOf(jitless)) {
		const result = T(data)
		if (!(result instanceof type.errors))
			throw new Error(`${label} accepted ${describeData(data)}`)
		const key = `${label} ← ${describeData(data)}`
		if (key in matrix) throw new Error(`${key} is repeated`)
		const summary = (result as ArkErrors).toLocaleString(locale)
		const jsonParseError = jsonParseErrorOf(data)
		matrix[key] =
			jsonParseError ?
				summary.replace(jsonParseError, "⟨SyntaxError⟩")
			:	summary
	}
	return matrix
}
