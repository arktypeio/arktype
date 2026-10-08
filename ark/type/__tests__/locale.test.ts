import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	describeMissing,
	en,
	type ActualContext,
	type ArkError,
	type ArkErrors,
	type ExpectedContext,
	type Locale,
	type MessageContext,
	type MessageWriter,
	type ProblemContext
} from "@ark/schema"
import { listPattern, type Domain } from "@ark/util"
import { scope, type } from "arktype"

// errors described by their own nodes, which union and intersection errors list
const leavesOf = (error: ArkError): ArkError[] =>
	error.hasCode("union") || error.hasCode("intersection") ?
		error.errors.flatMap(leavesOf)
	:	[error]

const enExpected = (error: ArkError) => {
	const expected = en[error.code].expected
	return typeof expected === "string" ? expected : expected(error as never, en)
}

const enActual = (error: ArkError) => {
	const actual = en[error.code].actual ?? en.actual
	return typeof actual === "string" ? actual : (
			actual(error.data as never, error as never, en)
		)
}

class Foo {}

const isEven = (n: number) => n % 2 === 0

contextualize(() => {
	describe("en", () => {
		it("is the resolved locale", () => {
			attest($ark.defaultConfig.locale).is(en)
			attest($ark.resolvedConfig.locale).is(en)
			attest(scope({}).type("string").internal.$.resolvedConfig.locale).is(en)
		})

		it("has the writers each kind writes itself", () => {
			const slotsByCode: Record<string, string[]> = {}
			for (const [k, v] of Object.entries(en)) {
				if (typeof v === "object" && k !== "nouns" && k !== "keywordPhrases")
					slotsByCode[k] = Object.keys(v)
			}
			attest(slotsByCode).snap({
				min: ["expected"],
				max: ["expected"],
				minLength: ["expected", "actual"],
				maxLength: ["expected", "actual"],
				exactLength: ["expected", "actual"],
				after: ["expected", "actual"],
				before: ["expected", "actual"],
				domain: ["expected", "actual"],
				unit: ["expected", "problem"],
				proto: ["expected", "actual"],
				union: ["expected", "problem", "message"],
				intersection: ["expected", "problem"],
				divisor: ["expected"],
				pattern: ["expected"],
				predicate: ["expected", "actual"],
				required: ["expected", "actual"],
				undeclared: ["expected", "actual"],
				discriminant: ["expected", "actual"]
			})
		})

		it("data", () => {
			attest(en.tag).equals("en")
			attest(en.nouns.number).equals("a number")
			attest(en.nouns.Date).equals("a Date")
			attest(en.nouns.unknown).equals("present")
			attest(en.nouns.never).equals("never")
			attest(en.list(["a", "b", "c"], "or")).equals("a, b or c")
			attest(en.list(["a", "b", "c"], "and")).equals("a, b and c")
			attest(en.list(["false", "true"], "and")).equals("false and true")
			attest(en.list(["a", "a", "b"], "and")).equals("a, a and b")
			attest(en.list([], "and")).equals("")
			attest(en.list(["false", "true"], "or")).equals("false or true")
			attest(en.list(["a", "a", "b"], "or")).equals("a, a or b")
			attest(en.list([], "or")).equals("")
			attest(en.plural(1)).equals("one")
			attest(en.plural(0)).equals("other")
			attest(en.number(0.5)).equals("0.5")
			attest(en.number(5n)).equals("5")
			attest(en.date(new Date("2000-01-01"))).equals("2000")
			attest(en.cite("a username")).equals("a username")
		})

		it("a leaf error's expected and actual text come from its fields", () => {
			const codes = new Set<string>()
			const o = {}
			const sym = Symbol("parity")
			for (const jitless of [false, true]) {
				const $ = scope({}, { jitless })
				const node = scope(
					{ node: { next: "node | null", v: "string" } },
					{ jitless }
				).export().node
				const corpus: [type.Any, unknown][] = [
					[$.type("string"), 5],
					[$.type("number"), "x"],
					[$.type("bigint"), 1],
					[$.type("symbol"), 1],
					[$.type("object"), 1],
					[$.type("'a'"), "b"],
					[$.type("5"), 4],
					[$.type("5n"), 4n],
					[$.type("true"), false],
					[$.type("null"), 1],
					[$.type("undefined"), 1],
					[$.type.unit(Foo), {}],
					[$.type("Date"), 1],
					[$.type("Date"), new Date("!")],
					[$.type("unknown[]"), {}],
					[$.type("Map"), {}],
					[$.type.instanceOf(Foo), {}],
					[$.type("number > 0"), 0],
					[$.type("number >= 0"), -1],
					[$.type("number < 0"), 0],
					[$.type("number <= 0"), 1],
					[$.type("number > 5"), 5],
					[$.type("number >= 5.5"), 5],
					[$.type("number < 5"), 5],
					[$.type("number <= -5"), 5],
					[$.type("string > 0"), ""],
					[$.type("string >= 3"), ""],
					[$.type("unknown[] >= 2"), []],
					[$.type("string <= 3"), "abcd"],
					[$.type("unknown[] <= 1"), [1, 2]],
					[$.type("string == 3"), "ab"],
					[$.type("unknown[] == 0"), [1]],
					[$.type("number % 1"), 1.5],
					[$.type("number % 2"), 1],
					[$.type("number % 3"), 1],
					[$.type("/^a.*$/"), "b"],
					[$.type(/a/i), "b"],
					[$.type("Date < d'2000-01-01'"), new Date("2001-01-01")],
					[$.type("Date > d'2000-01-01T12:30:00Z'"), new Date("1999-01-01")],
					[$.type("number").narrow(() => false), 1],
					[$.type("number").narrow(isEven), 1],
					[$.type("string").pipe.try(s => JSON.parse(s)), "{"],
					[
						$.type("string").pipe.try(function parse(s: string) {
							return JSON.parse(s)
						}),
						"{"
					],
					[$.type("string | number[]"), [true]],
					[$.type({ a: "string", b: "number > 0" }), { a: 1, b: 0 }],
					[$.type("(number % 2) & (number > 3)"), 1],
					[$.type("(string >= 2) | (string <= 0)"), "a"],
					[$.type({ a: "string" }), {}],
					[$.type({ a: "string | number" }), {}],
					[$.type({ a: "never" }), {}],
					[$.type({ a: "unknown" }), {}],
					[
						$.type({
							a: $.type("unknown")
								.narrow(() => true)
								.or("string")
						}),
						{}
					],
					[$.type({ a: "boolean" }), {}],
					[$.type({ a: "boolean | null" }), {}],
					[$.type({ a: "'x' | 'y' | 1n | 1.5" }), {}],
					[$.type({ a: $.type.unit(o) }), {}],
					[$.type({ a: $.type.unit(sym) }), {}],
					[$.type({ a: $.type("'x'").describe("an x") }), {}],
					[$.type({ a: $.type("false").describe("no").or("true") }), {}],
					[$.type({ a: $.type("number").describe("a count") }), {}],
					[$.type({ a: $.type("Date").describe("a day") }), {}],
					[$.type({ a: $.type("string").pipe(s => s.length) }), {}],
					[
						$.type({
							a: $.type("string")
								.describe("text")
								.pipe(s => s.length)
						}),
						{}
					],
					[$.type({ a: "string > 3" }), {}],
					[$.type({ a: "string[]" }), {}],
					[$.type({ a: "Date < d'2000-01-01'" }), {}],
					[$.type({ a: $.type.instanceOf(Foo) }), {}],
					[$.type({ a: "string.uuid | number" }), {}],
					[$.type({ a: "string.date.epoch.parse" }), {}],
					[node, { v: "x" }],
					[$.type({ "+": "reject", a: "string" }), { a: "", b: 1 }],
					[
						$.type({ kind: "'a'", x: "string" }).or({
							kind: "'b'",
							y: "number"
						}),
						{ kind: "c" }
					],
					[
						$.type({ kind: "'a'", x: "string" }).or({
							kind: "'b'",
							y: "number"
						}),
						{}
					],
					[
						$.type({ k: "1n", a: "string" }).or({ k: "2n", b: "number" }),
						{ k: 3n }
					],
					[
						$.type({ k: "1.5", a: "string" }).or({ k: "2.5", b: "number" }),
						{ k: 3.5 }
					],
					[$.type("'a' | 'b' | 'c'"), "d"],
					[
						$.type({ k: "true", a: "string" })
							.or({ k: "false", b: "string" })
							.or({ k: "'x'", c: "string" }),
						{ k: 5 }
					],
					[$.type.enumerated(o, sym, 1, Infinity, -Infinity), 2],
					[$.type("string | number | bigint").or({ a: "1" }), true],
					[$.type("string | number | bigint").or({ a: "1" }), sym]
				]
				for (const [T, data] of corpus) {
					for (const error of (T(data) as ArkErrors).issues.flatMap(leavesOf)) {
						codes.add(error.code)
						attest(enExpected(error)).equals(error.expected)
						attest(enActual(error)).equals(error.actual)
						if (error.hasCode("required"))
							attest(error.expected).equals(error.missingValueDescription)
						else if (error.description !== undefined)
							attest(error.expected).equals(error.description)
					}
				}
			}
			attest([...codes].sort()).snap([
				"after",
				"before",
				"discriminant",
				"divisor",
				"domain",
				"exactLength",
				"max",
				"maxLength",
				"min",
				"minLength",
				"pattern",
				"predicate",
				"proto",
				"required",
				"undeclared",
				"unit"
			])
		})

		it("describes a missing value through the locale", () => {
			const missingOf = (T: type.Any) => {
				const error = (T({}) as ArkErrors).issues[0]
				return error.hasCode("required") ? error.missing : undefined!
			}
			const plain: Locale = {
				...en,
				list: listPattern(
					{ two: " or ", middle: ", ", end: ", or " },
					{ two: " and ", middle: ", ", end: ", and " }
				),
				nouns: { ...en.nouns, boolean: "a boolean", never: "nothing" },
				expectedNoun: noun => `<${noun}>`
			}
			const describe = (T: type.Any) => describeMissing(missingOf(T), plain)
			attest(describe(type({ a: "boolean" }))).snap("<a boolean>")
			attest(describe(type({ a: "never" }))).snap("<nothing>")
			attest(describe(type({ a: "unknown" }))).snap("<present>")
			attest(describe(type({ a: "string | number | bigint" }))).snap(
				"<a bigint>, <a number>, or <a string>"
			)
			attest(
				describe(
					type({
						a: type("unknown")
							.narrow(() => true)
							.or("string")
					})
				)
			).snap("<a string> or <present>")
			attest(
				describe(type({ a: type("'x'").describe("an x").or("'y'") }))
			).snap('an x or "y"')
			const $ = scope({ a: "string | number", b: { x: "a | boolean" } })
			attest(describe($.export().b)).snap(
				"<a number>, <a string>, false, or true"
			)
		})
	})

	describe("writers", () => {
		it("receive the locale", () => {
			const locales: Locale.Info[] = []
			const T = type("string").configure({
				expected: (ctx, locale) => {
					locales.push(locale)
					return `${locale.tag} ${ctx.description}`
				},
				actual: (data, ctx, locale) => {
					locales.push(locale)
					return `${locale.tag} ${ctx.code} ${data}`
				},
				problem: (ctx, locale) => {
					locales.push(locale)
					return `${locale.tag} ${ctx.expected} (${ctx.actual})`
				},
				message: (ctx, locale) => {
					locales.push(locale)
					return `${locale.tag}: ${ctx.problem}`
				}
			})
			attest(T(5).toString()).snap("en: en en a string (en domain 5)")
			attest(locales.length).equals(4)
			for (const locale of locales) attest(locale).is(en)
		})

		it("expected receives the error", () => {
			const T = type({
				a: type("number").configure({
					expected: ctx => `a number at ${ctx.propString} (not ${ctx.data})`
				})
			})
			attest(T({ a: "x" }).toString()).snap(
				"a must be a number at a (not x) (was a string)"
			)
		})

		it("contexts narrow by code", () => {
			const $ = scope(
				{ short: "string >= 2" },
				{
					minLength: {
						problem: (ctx, locale) =>
							`needs ${ctx.rule} ${locale.plural(ctx.rule) === "one" ? "character" : "characters"}`
					}
				}
			)
			attest($.export().short("a").toString()).snap("needs 2 characters")
			const T = type("string >= 2").configure({
				message: ctx =>
					ctx.code === "minLength" ?
						`${ctx.meta?.title ?? "value"} >= ${ctx.rule}`
					:	ctx.problem
			})
			attest(T("a").toString()).snap("value >= 2")
		})

		it("configure codes that aren't node kinds", () => {
			const $ = scope(
				{},
				{
					undeclared: {
						message: ctx => `${ctx.propString} isn't allowed (was ${ctx.data})`
					},
					discriminant: {
						expected: (ctx, locale) =>
							ctx.discriminantKind === "domain" ?
								locale.list(ctx.cases, "and")
							:	locale.list(
									ctx.cases.map(unit => `<${String(unit)}>`),
									"or"
								)
					}
				}
			)
			attest($.type({ "+": "reject" })({ b: 1 }).toString()).snap(
				"b isn't allowed (was 1)"
			)
			attest($.type("'a' | 'b' | 'c'")("d").toString()).snap(
				'must be <a>, <b> or <c> (was "d")'
			)
			attest(
				$.type("string | number | bigint").or({ a: "1" })(true).toString()
			).snap("must be bigint, number, string and object (was boolean)")
		})

		it("a locale writer narrows discriminant cases", () => {
			const expected: Locale.ExpectedWriter<"discriminant"> = (e, locale) => {
				if (e.discriminantKind === "domain") {
					attest<readonly Domain[]>(e.cases)
					return locale.list(
						e.cases.map(domain => locale.nouns[domain]),
						"or"
					)
				}
				attest<readonly unknown[]>(e.cases)
				return locale.list(
					e.cases.map(unit => String(unit)),
					"or"
				)
			}
			const errorOf = (T: type.Any, data: unknown) =>
				(T(data) as ArkErrors).issues[0] as never
			attest(
				expected(
					errorOf(type("string | number | bigint").or({ a: "1" }), true),
					en
				)
			).snap("a bigint, a number, a string or an object")
			attest(expected(errorOf(type("1 | 2 | 3"), 4), en)).snap("1, 2 or 3")
		})

		it("a shared writer narrows to the new contexts", () => {
			const message: MessageWriter = e =>
				e.code === "required" ?
					`${e.valueMeta.title ?? e.propString} is missing`
				: e.code === "undeclared" ? `${e.propString} isn't allowed`
				: e.code === "discriminant" ?
					`${e.propString} isn't one of ${e.cases.length}${e.absent ? " (absent)" : ""}`
				:	e.problem
			const $ = scope(
				{},
				{
					required: { message },
					undeclared: { message },
					discriminant: { message }
				}
			)
			const T = $.type({
				"+": "reject",
				name: type("string").configure({ title: "Name" })
			})
			attest(T({ b: 1 }).toString()).snap(`Name is missing
b isn't allowed`)
			const U = $.type({ k: "'a'", x: "string" }).or({ k: "'b'", y: "number" })
			attest(U({}).toString()).snap("k isn't one of 2 (absent)")
		})

		it("meta may be absent", () => {
			const $ = scope(
				{},
				{ predicate: { message: ctx => `${ctx.meta?.title}: ${ctx.problem}` } }
			)
			attest(
				$.type("number")
					.narrow((n, ctx) => n > 0 || ctx.mustBe("positive"))(-1)
					.toString()
			).snap("undefined: must be positive (was -1)")
			attest(
				(ctx: MessageContext) =>
					// @ts-expect-error
					ctx.meta.title
			).type.errors("'ctx.meta' is possibly 'undefined'")
			attest(
				(ctx: ExpectedContext) =>
					// @ts-expect-error
					ctx.meta.title
			).type.errors("'ctx.meta' is possibly 'undefined'")
			attest(
				(ctx: ActualContext) =>
					// @ts-expect-error
					ctx.meta.title
			).type.errors("'ctx.meta' is possibly 'undefined'")
			attest(
				(ctx: ProblemContext<"predicate">) =>
					// @ts-expect-error
					ctx.meta.title
			).type.errors("'ctx.meta' is possibly 'undefined'")
		})

		it("contexts omit the slots they could reach", () => {
			attest((ctx: ExpectedContext) =>
				// @ts-expect-error
				ctx.actual()
			).type.errors("Property 'actual' does not exist")
			attest((ctx: ActualContext) =>
				// @ts-expect-error
				ctx.expected()
			).type.errors("Property 'expected' does not exist")
			attest((ctx: ActualContext) =>
				// @ts-expect-error
				ctx.description()
			).type.errors("Property 'description' does not exist")
			attest((ctx: ProblemContext) =>
				// @ts-expect-error
				ctx.problem()
			).type.errors("Property 'problem' does not exist")
			attest((ctx: MessageContext) =>
				// @ts-expect-error
				ctx.toJSON()
			).type.errors("Property 'toJSON' does not exist")
			attest((e: Locale.ExpectedContext) =>
				// @ts-expect-error
				e.description()
			).type.errors("Property 'description' does not exist")
		})

		it("see what every locale has", () => {
			// a locale of any noun is the Info a writer receives
			const toInfo = (locale: Locale<{ readonly ins: string }>): Locale.Info =>
				locale
			attest(toInfo(en as never)).is(en)
			attest((locale: Locale.Info) =>
				// @ts-expect-error
				locale.expectedNoun("a")
			).type.errors("Property 'expectedNoun' does not exist")
		})

		it("a locale is complete", () => {
			const { min: _, ...partial } = en
			// @ts-expect-error
			attest((): Locale => partial).type.errors("Property 'min' is missing")
		})
	})
})
