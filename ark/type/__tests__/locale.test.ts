import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	en,
	type ActualContext,
	type ArkError,
	type ArkErrors,
	type ExpectedContext,
	type Locale,
	type MessageContext,
	type ProblemContext
} from "@ark/schema"
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

class Foo {}

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
				predicate: ["expected"],
				required: ["expected", "actual"]
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

		it("expected text from each leaf error's fields is its description", () => {
			const codes = new Set<string>()
			for (const jitless of [false, true]) {
				const $ = scope({}, { jitless })
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
					[$.type("string | number[]"), [true]],
					[$.type({ a: "string", b: "number > 0" }), { a: 1, b: 0 }],
					[$.type("(number % 2) & (number > 3)"), 1],
					[$.type("(string >= 2) | (string <= 0)"), "a"]
				]
				for (const [T, data] of corpus) {
					for (const error of (T(data) as ArkErrors).issues.flatMap(leavesOf)) {
						if (error.description === undefined) continue
						codes.add(error.code)
						attest(enExpected(error)).equals(error.description)
					}
				}
			}
			attest([...codes].sort()).snap([
				"after",
				"before",
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
				"unit"
			])
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
