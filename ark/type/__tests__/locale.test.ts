import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	copiedErrorMessage,
	describeMissing,
	flatMessagesByPath,
	messageIn,
	TraversalError,
	writeInvalidLocaleMessage,
	type ArkError,
	type ArkErrors,
	type DomainCase,
	type Locale,
	type MessageContext,
	type MessageWriter,
	writeGlobalOnlyConfigMessage
} from "@ark/schema"
import { flatMorph, omit } from "@ark/util"
import {
	ark,
	configure,
	match,
	scope,
	type,
	type Locale as ArkLocale
} from "arktype"
import { listPattern } from "arktype/i18n"
import { en } from "arktype/locales/en"
import { AsyncLocalStorage } from "node:async_hooks"
import { fixturesOf, matrixOf } from "./locales/matrix.ts"
import { reconfigure, withConfig } from "./locales/withConfig.ts"

// errors described by their own nodes, which union and intersection errors list
const leavesOf = (error: ArkError): ArkError[] =>
	error.code === "union" || error.code === "intersection" ?
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

const o = {}

// text a fixture authors itself rather than reading from the locale
const isAuthored = (label: string, error: ArkError) =>
	label === "narrow mustBe" ||
	label === "configured writer reading the description" ||
	["keyword", "description", "expected", "actual"].some(
		k => error.meta && k in error.meta
	)

const mark = (label: string) => `⟦${label}⟧`

const marks = (o: object): Record<string, string> =>
	Object.fromEntries(Object.keys(o).map(k => [k, mark(k)]))

const xxMessage: Locale.MessageWriter = e =>
	`${mark("message")} ${e.expected} ${e.actual}`

// a marker for every entry, so any other text in its output is arktype's
const xx: Locale = {
	...(flatMorph(en, (k, v) =>
		typeof v === "object" && k !== "nouns" && k !== "keywordPhrases" ?
			[k, { expected: mark(k), message: xxMessage }]
		:	[]
	) as {} as Locale.Writers),
	union: {
		expected: e =>
			e.errors
				.map(child => `${child.propString} ${child.expected} ${child.actual}`)
				.join(mark("or")),
		message: xxMessage
	},
	intersection: {
		expected: e => e.errors.map(child => child.expected).join(mark("and")),
		message: xxMessage
	},
	required: {
		expected: (e, locale) => describeMissing(e.missing, locale),
		actual: mark("actual"),
		message: xxMessage
	},
	tag: "xx",
	list: (items, type) => items.join(mark(type)),
	plural: () => "other",
	number: () => mark("number"),
	date: () => mark("date"),
	verbatim: text => text,
	cite: text => `${mark("cite")} ${text}`,
	basis: basis => mark(basis.code),
	nouns: marks(en.nouns) as Locale["nouns"],
	keywordPhrases: marks(en.keywordPhrases),
	actual: () => mark("actual"),
	message: xxMessage,
	line: e =>
		`${e.propString} ${mark(e.custom ? "custom line" : "line")} ${e.message}`
}

contextualize(() => {
	describe("en", () => {
		it("data", () => {
			attest(en.list(["a", "b", "c"], "or")).equals("a, b or c")
			attest(en.list(["a", "b", "c"], "and")).equals("a, b and c")
			attest(en.list([], "and")).equals("")
			attest(en.list([], "or")).equals("")
			attest(en.plural(1)).equals("one")
			attest(en.plural(0)).equals("other")
			attest(en.number(0.5)).equals("0.5")
			attest(en.number(5n)).equals("5")
			attest(en.date(new Date("2000-01-01"))).equals("January 1, 2000")
			attest(en.cite("a username")).equals("a username")
		})

		it("a leaf error's expected and actual text come from its fields", () => {
			const codes = new Set<string>()
			for (const [label, T, data] of fixturesOf(false)) {
				for (const error of (T(data) as ArkErrors).issues.flatMap(leavesOf)) {
					if (isAuthored(label, error)) continue
					codes.add(error.code)
					attest(enExpected(error)).equals(error.expected)
					attest(enActual(error)).equals(error.actual)
					if (error.code === "required")
						attest(error.expected).equals(error.missingValueDescription)
					else if (error.description !== undefined)
						attest(error.expected).equals(error.description)
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
				"notEqual",
				"notEqualLength",
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
				return error.code === "required" ? error.missing : undefined!
			}
			const plain: Locale = {
				...en,
				list: listPattern(
					{ two: " or ", middle: ", ", end: ", or " },
					{ two: " and ", middle: ", ", end: ", and " }
				),
				nouns: flatMorph(
					{ ...en.nouns, boolean: "a boolean", never: "nothing" },
					(id, noun) => [id, `<${noun}>`]
				)
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
				message: (ctx, locale) => {
					locales.push(locale)
					return `${locale.tag}: ${ctx.expected} (${ctx.actual})`
				}
			})
			attest(T(5).toString()).snap("en: en a string (en domain 5)")
			attest(locales.length).equals(3)
			for (const locale of locales) attest(locale).is(en)
		})

		it("are called once per error in a locale without its code's expected", () => {
			const calls: string[] = []
			const T = type("number >= 5").configure({
				actual: n => (calls.push("actual"), `${n}`),
				message: ctx => (calls.push("message"), `${ctx.expected} ${ctx.actual}`)
			})
			const errors = T(1) as ArkErrors
			attest(
				errors.toLocaleString({ ...xx, min: omit(xx.min, { expected: 1 }) })
			).snap("at least 5 1")
			attest(calls).equals(["actual", "message"])
		})

		it("expected receives the error", () => {
			const T = type({
				a: type("number").configure({
					expected: ctx => `a number at ${ctx.propString} (not ${ctx.data})`
				})
			})
			attest(T({ a: "x" }).toString()).snap("a must be a number at a (not x)")
		})

		it("contexts narrow by code", () => {
			const $ = scope(
				{ short: "string >= 2" },
				{
					minLength: {
						message: (ctx, locale) =>
							`needs ${ctx.rule} ${locale.plural(ctx.rule) === "one" ? "character" : "characters"}`
					}
				}
			)
			attest($.export().short("a").toString()).snap("needs 2 characters")
			const T = type("string >= 2").configure({
				message: ctx =>
					ctx.code === "minLength" ?
						`${ctx.meta?.title ?? "value"} >= ${ctx.rule}`
					:	ctx.expected
			})
			attest(T("a").toString()).snap("value >= 2")
		})

		it("configure codes that aren't node kinds", () => {
			const $ = scope(
				{},
				{
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
			attest($.type("'a' | 'b' | 'c'")("d").toString()).snap(
				"must be <a>, <b> or <c>"
			)
			attest(
				$.type("string | number | bigint").or({ a: "1" })(true).toString()
			).snap("must be bigint, number, string and object")
		})

		it("a locale writer narrows discriminant cases", () => {
			const expected: Locale.ExpectedWriter<"discriminant"> = (e, locale) => {
				if (e.discriminantKind === "domain") {
					attest<readonly DomainCase[]>(e.cases)
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
				e.code === "required" ? `${e.valueMeta.title ?? "A value"} is missing`
				: e.code === "undeclared" ?
					`Unknown key ${String(e.path[e.path.length - 1])}`
				: e.code === "discriminant" ?
					`Not one of ${e.cases.length}${e.absent ? " (absent)" : ""}`
				:	e.expected
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
			attest(T({ b: 1 }).toString()).snap(`name: Name is missing
b: Unknown key b`)
			const U = $.type({ k: "'a'", x: "string" }).or({ k: "'b'", y: "number" })
			attest(U({}).toString()).snap("k: Not one of 2 (absent)")
		})

		it("meta may be absent", () => {
			const $ = scope(
				{},
				{ predicate: { message: ctx => `${ctx.meta?.title}: ${ctx.expected}` } }
			)
			attest(
				$.type("number")
					.narrow((n, ctx) => n > 0 || ctx.mustBe("positive"))(-1)
					.toString()
			).snap("undefined: positive")
			attest(
				(ctx: MessageContext) =>
					// @ts-expect-error
					ctx.meta.title
			).type.errors("'ctx.meta' is possibly 'undefined'")
		})

		it("see what every locale has", () => {
			attest((locale: Locale.Info) =>
				// @ts-expect-error
				locale.cite("a")
			).type.errors("Property 'cite' does not exist")
		})

		it("arktype's Locale names its writers and contexts", () => {
			const rule = (e: ArkLocale.ExpectedContext<"min">) => e.rule
			const min: ArkLocale.CodeWriters<"min"> = {
				expected: (e, locale) => `> ${locale.number(rule(e))}`,
				message: xxMessage
			}
			const phrases: ArkLocale.Data["keywordPhrases"] = {
				"string.email": { noun: "an email address" }
			}
			attest<number>(rule({ rule: 1 } as never))
			const locale: Locale = { ...xx, min, keywordPhrases: phrases }
			attest((type("number > 1")(0) as ArkErrors).toLocaleString(locale)).snap(
				"⟦message⟧ > ⟦number⟧ ⟦actual⟧"
			)
			attest(type("string.email")("x").toLocaleString(locale)).snap(
				"⟦message⟧ an email address ⟦actual⟧"
			)
		})

		it("a locale is complete", () => {
			const { min: _, ...partial } = en
			// @ts-expect-error
			attest((): Locale => partial).type.errors("Property 'min' is missing")
			attest(
				(): Locale => ({
					...en,
					// @ts-expect-error
					required: {
						expected: (e, locale) => describeMissing(e.missing, locale),
						message: xxMessage
					}
				})
			).type.errors("Property 'actual' is missing")
			const { line: __, ...lineless } = en
			// @ts-expect-error
			attest((): Locale => lineless).type.errors("Property 'line' is missing")
		})

		it("a locale has no problem", () => {
			attest(
				(): Locale => ({
					...en,
					// @ts-expect-error
					min: { problem: xxMessage, message: xxMessage }
				})
			).type.errors("'problem' does not exist")
		})

		it("a locale's line follows a path with its message, marked custom or not", () => {
			const T = type({
				a: "string",
				b: type("string").configure({ message: "Enter b" }),
				c: type("string").narrow((s, ctx) => ctx.reject({ message: "Enter c" }))
			})
			const errors = T({ a: 1, b: 2, c: "" }) as ArkErrors
			attest(errors.toLocaleString(xx))
				.snap(`a ⟦line⟧ ⟦message⟧ ⟦domain⟧ ⟦actual⟧
b ⟦custom line⟧ Enter b
c ⟦custom line⟧ Enter c`)
			// its line isn't written at the root
			attest(
				type("string")
					.configure({ message: "Enter text" })(5)
					.toLocaleString(xx)
			).snap("Enter text")
		})
	})

	describe("binding", () => {
		it("toLocaleString renders in a locale", () => {
			const errors = type({ k: "string" })({ k: 5 }) as ArkErrors
			const error = errors.issues[0]
			attest(errors.toLocaleString(xx)).snap(
				"k ⟦line⟧ ⟦message⟧ ⟦domain⟧ ⟦actual⟧"
			)
			attest(messageIn(error, xx)).snap("k ⟦line⟧ ⟦message⟧ ⟦domain⟧ ⟦actual⟧")
			attest(errors.summary).snap("k must be a string")
			attest(errors.toLocaleString()).equals(errors.summary)
			// Array.prototype.toLocaleString passes each element its tag
			attest([errors].toLocaleString("de")).equals(errors.summary)
		})

		it("messageIn throws for a copy of an error", () => {
			const error = (type({ k: "string" })({ k: 5 }) as ArkErrors).issues[0]
			const copies = [
				{ ...error },
				structuredClone(error),
				new Proxy(error, {})
			]
			for (const copy of copies)
				attest(() => messageIn(copy, xx)).throws(copiedErrorMessage)
		})

		it("toLocaleString and messageIn write a morph's returned errors as its summary", () => {
			const A = scope(
				{ inner: { a: "string" } },
				{ domain: { message: ctx => `A's ${ctx.expected}` } }
			).export()
			const B = scope(
				{ outer: ["unknown", "=>", (d: unknown) => A.inner(d)] },
				{ domain: { message: ctx => `B's ${ctx.expected}` } }
			).export()
			const out = B.outer({ a: 1 }) as ArkErrors
			attest([
				out.summary,
				out.toLocaleString(en),
				messageIn(out.issues[0], en)
			]).snap(["a: B's a string", "a: B's a string", "a: B's a string"])
		})

		it("toLocaleString reaches union and intersection children", () => {
			const union = type("(string >= 3) | (string <= 0)")("a") as ArkErrors
			attest(union.toLocaleString(xx)).snap(
				"⟦message⟧  ⟦exactLength⟧ ⟦actual⟧⟦or⟧ ⟦minLength⟧ ⟦actual⟧ ⟦actual⟧"
			)
			const intersection = type("(number % 2) & (number > 3)")(1) as ArkErrors
			attest(intersection.toLocaleString(xx)).snap(`⟦message⟧ ⟦divisor⟧ ⟦actual⟧
⟦message⟧ ⟦min⟧ ⟦actual⟧`)
		})

		it("static", () => {
			withConfig({ locale: xx }, () => {
				attest($ark.cfg!.locale).is(xx)
				const errors = scope({}).type("string")(5) as ArkErrors
				attest(errors.toString()).snap("⟦message⟧ ⟦domain⟧ ⟦actual⟧")
				attest(errors.toLocaleString(en)).snap("must be a string")
				// including errors from Types parsed before it was configured
				attest(type("string")(5).toString()).snap("⟦message⟧ ⟦domain⟧ ⟦actual⟧")
			})
		})

		it("a function", () => {
			let locale: Locale | undefined
			let calls = 0
			withConfig(
				{
					locale: () => {
						calls++
						return locale
					}
				},
				() => {
					attest($ark.cfg!.locale).is(en)
					const errorsOf = () =>
						type("(string >= 3) | (string <= 0)")("a") as ArkErrors
					const errors = errorsOf()
					attest(errors.toString()).snap(
						"must be exactly length 0 or at least length 3"
					)
					locale = xx
					calls = 0
					// errors keep the locale their first read selected
					attest(errors.toString()).snap(
						"must be exactly length 0 or at least length 3"
					)
					attest(calls).equals(0)
					const localized = errorsOf()
					attest(localized.toString()).snap(
						"⟦message⟧  ⟦exactLength⟧ ⟦actual⟧⟦or⟧ ⟦minLength⟧ ⟦actual⟧ ⟦actual⟧"
					)
					// once for the errors, which their children share
					attest(calls).equals(1)
					attest(localized.toLocaleString(en)).snap(
						"must be exactly length 0 or at least length 3"
					)
					attest(calls).equals(1)
				}
			)
		})

		it("a locale configured later replaces a function", () => {
			withConfig({ locale: () => xx }, () => {
				const summaryOf = () => type("string")(5).toString()
				attest(summaryOf()).snap("⟦message⟧ ⟦domain⟧ ⟦actual⟧")
				reconfigure({ locale: en })
				attest(summaryOf()).snap("must be a string")
				reconfigure({ locale: xx })
				attest(summaryOf()).snap("⟦message⟧ ⟦domain⟧ ⟦actual⟧")
				reconfigure({ locale: () => xx })
				reconfigure({ locale: undefined } as never)
				attest(summaryOf()).snap("must be a string")
			})
		})

		it("a read in another locale adds no keys to an error", () => {
			const T = type({ a: type("number").describe("a count") })
			const error = (T({ a: "x" }) as ArkErrors).issues[0]
			const keys = Object.keys(error)
			attest(messageIn(error, xx)).snap(
				"a ⟦line⟧ ⟦message⟧ ⟦cite⟧ a count ⟦actual⟧"
			)
			attest(Object.keys(error)).equals(keys)
		})

		it("a function selects one locale for each errors", () => {
			let calls = 0
			withConfig({ locale: () => (calls++ % 2 ? en : xx) }, () => {
				const T = type({ a: "string", b: "number", c: "boolean" })
				const errors = T({}) as ArkErrors
				const read = (f: () => unknown, selections = 0) => {
					calls = 0
					const result = f()
					attest(calls).equals(selections)
					return result
				}
				attest(read(() => errors.summary, 1))
					.snap(`a ⟦line⟧ ⟦message⟧ ⟦domain⟧ ⟦actual⟧
b ⟦line⟧ ⟦message⟧ ⟦domain⟧ ⟦actual⟧
c ⟦line⟧ ⟦message⟧ ⟦boolean⟧ ⟦actual⟧`)
				attest(
					read(() => errors.toJSON().map(issue => (issue as any).message))
				).snap([
					"⟦message⟧ ⟦domain⟧ ⟦actual⟧",
					"⟦message⟧ ⟦domain⟧ ⟦actual⟧",
					"⟦message⟧ ⟦boolean⟧ ⟦actual⟧"
				])
				attest(read(() => errors.issues[0].actual)).snap("⟦actual⟧")
				attest(read(() => flatMessagesByPath(errors))).snap({
					a: ["⟦message⟧ ⟦domain⟧ ⟦actual⟧"],
					b: ["⟦message⟧ ⟦domain⟧ ⟦actual⟧"],
					c: ["⟦message⟧ ⟦boolean⟧ ⟦actual⟧"]
				})
				attest(
					read(() => {
						try {
							T.assert({})
						} catch (e) {
							return (e as TraversalError).message
						}
					}, 1)
				).snap(`a ⟦line⟧ ⟦message⟧ ⟦domain⟧ ⟦actual⟧
b ⟦line⟧ ⟦message⟧ ⟦domain⟧ ⟦actual⟧
c ⟦line⟧ ⟦message⟧ ⟦boolean⟧ ⟦actual⟧`)
			})
		})

		it("a function that throws renders in en", () => {
			withConfig(
				{
					locale: () => {
						throw new Error("no request")
					}
				},
				() => {
					attest(type("string")(5).toString()).snap("must be a string")
					let thrown: unknown
					try {
						type("string").assert(5)
					} catch (e) {
						thrown = e
					}
					attest(thrown).instanceOf(TraversalError)
					attest((thrown as TraversalError).message).snap("must be a string")
				}
			)
		})

		it("interleaved requests each render in their own locale", async () => {
			const store = new AsyncLocalStorage<Locale>()
			// fixes the global config, as withConfig does, so there's one to restore
			void type.$.internal.cfg
			const originalConfig = { ...$ark.config }
			const originalResolvedConfig = $ark.cfg!
			reconfigure({ locale: () => store.getStore() })
			try {
				const T = type({ k: "string" })
				const read = async (ms: number) => {
					const errors = T({ k: 5 }) as ArkErrors
					await new Promise(resolve => setTimeout(resolve, ms))
					return errors.toString()
				}
				attest(
					await Promise.all([
						store.run(xx, () => read(20)),
						read(10),
						store.run(xx, () => read(0))
					])
				).snap([
					"k ⟦line⟧ ⟦message⟧ ⟦domain⟧ ⟦actual⟧",
					"k must be a string",
					"k ⟦line⟧ ⟦message⟧ ⟦domain⟧ ⟦actual⟧"
				])
			} finally {
				$ark.config = originalConfig
				reconfigure({})
				$ark.cfg = originalResolvedConfig
			}
		})

		it("user writers outrank every locale", () => {
			withConfig({ min: { expected: "positive!" } }, () => {
				const errorsOf = () =>
					scope(
						{},
						{
							domain: {
								message: (e, locale) => `${locale.tag}: ${e.expected}`
							}
						}
					).type({
						k: "string",
						j: type("number > 0").configure({ actual: "configured" })
					})({ k: 5, j: 0 }) as ArkErrors
				const rendered = errorsOf().toLocaleString(xx)
				attest(rendered).snap(`k ⟦custom line⟧ xx: ⟦domain⟧
j ⟦line⟧ ⟦message⟧ ⟦cite⟧ positive! configured`)
				attest(withConfig({ locale: xx }, () => errorsOf().toString())).equals(
					rendered
				)
				attest(
					withConfig({ locale: () => xx }, () => errorsOf().toString())
				).equals(rendered)
			})
		})

		it("cites authored text", () => {
			const $ = scope({}, { domain: { description: () => "a big one" } })
			const rendered = (T: type.Any, data: unknown) =>
				(T(data) as ArkErrors).toLocaleString(xx)
			attest(rendered(type("number").describe("a count"), "x")).snap(
				"⟦message⟧ ⟦cite⟧ a count ⟦actual⟧"
			)
			attest(
				rendered(
					type("number").narrow((n, ctx) => n > 0 || ctx.mustBe("positive")),
					-1
				)
			).snap("⟦message⟧ ⟦cite⟧ positive ⟦actual⟧")
			attest(
				rendered(type("number").configure({ expected: "a count" }), "x")
			).snap("⟦message⟧ ⟦cite⟧ a count ⟦actual⟧")
			attest(rendered($.type("bigint"), 1)).snap(
				"⟦message⟧ ⟦cite⟧ a big one ⟦actual⟧"
			)
			// a node's description is its own scope's, whichever scope validates
			const $min = scope({}, { min: { description: n => `over ${n.rule}` } })
			attest(rendered(type({ k: $min.type("number > 7") }), { k: 1 })).snap(
				"k ⟦line⟧ ⟦message⟧ ⟦cite⟧ over 7 ⟦actual⟧"
			)
			attest(rendered($min.type({ k: type("number > 7") }), { k: 1 })).snap(
				"k ⟦line⟧ ⟦message⟧ ⟦min⟧ ⟦actual⟧"
			)
			// a keyword's phrase is the locale's own text
			attest(rendered(type("string.email"), "x")).snap(
				"⟦message⟧ ⟦string.email⟧ ⟦actual⟧"
			)
			// a missing value's description is authored by its meta or scope
			const $basis = scope(
				{},
				{
					unit: { description: n => `unit ${String(n.unit)}` },
					proto: { description: () => "a moment" }
				}
			)
			const Missing = $basis.type({ a: "'x'", b: "Date", c: "1 | 2" })
			attest(rendered(Missing, {}))
				.snap(`a ⟦line⟧ ⟦message⟧ ⟦cite⟧ unit x ⟦actual⟧
b ⟦line⟧ ⟦message⟧ ⟦cite⟧ a moment ⟦actual⟧
c ⟦line⟧ ⟦message⟧ ⟦cite⟧ unit 1⟦or⟧⟦cite⟧ unit 2 ⟦actual⟧`)
			attest((Missing({}) as ArkErrors).toLocaleString({ ...en })).equals(
				(Missing({}) as ArkErrors).summary
			)
			// a phrase the locale lacks shows the keyword's English
			attest(
				type("string.email")("x").toLocaleString({ ...xx, keywordPhrases: {} })
			).snap("⟦message⟧ ⟦cite⟧ an email address ⟦actual⟧")
		})

		it("a code's own message frames only its locale's expected text", () => {
			const locale: Locale = {
				...xx,
				unit: { expected: mark("unit"), message: mark("unit.message") }
			}
			attest(type("'a'")("b").toLocaleString(locale)).snap("⟦unit.message⟧")
			attest(type("'a'").describe("an a")("b").toLocaleString(locale)).snap(
				"⟦message⟧ ⟦cite⟧ an a ⟦actual⟧"
			)
			attest(
				type("'a'").configure({ expected: "an a" })("b").toLocaleString(locale)
			).snap("⟦message⟧ ⟦cite⟧ an a ⟦actual⟧")
			const $ = scope({}, { unit: { expected: "an a" } })
			attest($.type("'a'")("b").toLocaleString(locale)).snap(
				"⟦message⟧ ⟦cite⟧ an a ⟦actual⟧"
			)
			// a keyword's phrase is not its code's expected text
			const patterned: Locale = {
				...xx,
				pattern: { expected: mark("pattern"), message: mark("pattern.message") }
			}
			attest(type("/^a/")("b").toLocaleString(patterned)).snap(
				"⟦pattern.message⟧"
			)
			attest(type("string.email")("b").toLocaleString(patterned)).snap(
				"⟦message⟧ ⟦string.email⟧ ⟦actual⟧"
			)
		})

		it("an untyped locale renders what it lacks through en", () => {
			const partial = {
				tag: "partial",
				domain: {
					expected: (e: Locale.ExpectedContext<"domain">, locale: Locale) =>
						locale.nouns[e.domain]
				},
				min: { message: () => "<min>" },
				nouns: { string: "<string>" }
			} as {} as Locale
			const def = {
				k: "string",
				j: "number > 0",
				l: "boolean",
				m: "bigint"
			} as const
			const data = { k: 5, j: 0, m: 5 }
			const rendered = (type(def)(data) as ArkErrors).toLocaleString(partial)
			attest(rendered).snap(`k must be <string>
j <min>
l must be boolean (was missing)
m must be a bigint`)
			attest(
				withConfig({ locale: partial }, () =>
					scope({}).type(def)(data).toString()
				)
			).equals(rendered)
			attest(
				withConfig({ locale: () => partial }, () => type(def)(data).toString())
			).equals(rendered)
		})

		it("a locale's own message reads what the data was, which en's leaves out", () => {
			const errors = type({ k: "string", n: "number" })({ k: 5, n: "5" })
			const own = {
				tag: "own",
				domain: { expected: (e: Locale.ExpectedContext<"domain">) => e.domain },
				message: (e: { expected: string; actual: string }) =>
					`${e.expected}! (${e.actual})`
			} as {} as Locale
			const inherited = { tag: "inherited", domain: own.domain } as {} as Locale
			attest([
				(errors as ArkErrors).toLocaleString(own),
				(errors as ArkErrors).toLocaleString(inherited)
			]).snap([
				'k string! (5)\nn number! ("5")',
				"k must be string\nn must be number"
			])
		})

		it("a slot configured as undefined renders through the locale", () => {
			const config = { domain: { expected: undefined } } as never
			const errors = scope({}, config).type("number")("x") as ArkErrors
			attest(errors.toLocaleString(xx)).snap("⟦message⟧ ⟦domain⟧ ⟦actual⟧")
		})

		it("configure rejects a locale that is neither an object nor a function", () => {
			attest(() => configure({ locale: "de" as never })).throws(
				writeInvalidLocaleMessage("de")
			)
		})

		it("checks keyword phrase aliases", () => {
			attest(() =>
				configure({
					// @ts-expect-error
					locale: { ...xx, keywordPhrases: { "string.emial": mark("email") } }
				})
			).type.errors("'\"string.emial\"' does not exist")
		})

		it("is global-only", () => {
			// @ts-expect-error
			attest(() => scope({}, { locale: xx })).type.errors(
				"'locale' does not exist in type"
			)
			attest(() => scope({}, { locale: xx } as never)).throws(
				writeGlobalOnlyConfigMessage("locale")
			)
		})

		it("renders default-value ParseErrors in English", () => {
			const def = { k: ["number", "=", "x"] } as never
			withConfig({ locale: xx }, () =>
				attest(() => scope({}).type(def)).throws.snap(
					"ParseError: Default for k must be a number"
				)
			)
		})

		it("a spread of en renders every fixture as en does", () => {
			attest(matrixOf({ ...en })).equals(matrixOf(en))
		})

		it("a locale without a code's expected reads it whole in en", () => {
			const { expected: _, ...union } = xx.union
			const locale: Locale = { ...xx, union }
			const errors = type({ a: "string" }).or({ b: "number" })({}) as ArkErrors
			attest(withConfig({ locale }, () => errors.issues[0].expected)).snap(
				"a must be a string or b must be a number"
			)
			attest(errors.toLocaleString(locale)).snap(
				"⟦message⟧ a must be a string or b must be a number ⟦actual⟧"
			)
			// an untyped locale without the code at all
			const { union: __, ...untyped } = xx
			attest(errors.toLocaleString(untyped as {} as Locale)).snap(
				"a must be a string or b must be a number"
			)
		})

		it("a spread of en lists a missing true, false and more as given", () => {
			const T = type({
				a: match
					.case("true", () => 1)
					.case("false", () => 2)
					.case("'x'", () => 3)
					.default("reject")
			})
			const errors = T({}) as ArkErrors
			attest(errors.summary).snap('a must be true, false or "x" (was missing)')
			attest(errors.toLocaleString({ ...en })).snap(
				'a must be true, false or "x" (was missing)'
			)
		})
	})

	describe("leaks", () => {
		const keywordsOf = (prefix: string, o: object): type.Any[] =>
			Object.entries(o).flatMap(([k, v]): type.Any[] => {
				const alias =
					k === "root" ? prefix
					: prefix ? `${prefix}.${k}`
					: k
				return (
					v?.internal?.kind ? [v]
					: typeof v === "object" && v !== null ? keywordsOf(alias, v)
					: []
				)
			})

		// every code and its variants, keyed by j and k
		const leakCorpusOf = (): [type.Any, unknown][] => {
			const $ = scope({})
			return [
				[$.type("string"), 5],
				[$.type("'a'"), "b"],
				[$.type.unit(o), {}],
				[$.type("'a' | 'b' | 1"), "c"],
				[$.type("Date"), {}],
				[$.type("Date"), new Date("!")],
				[$.type.instanceOf(Foo), {}],
				[$.type("number > 0"), 0],
				[$.type("number <= 0"), 1],
				[$.type("string >= 3"), ""],
				[$.type("unknown[] <= 1"), [1, 2]],
				[$.type("string == 3"), "ab"],
				[$.type("Date > d'2000-01-01'"), new Date(0)],
				[$.type("Date < d'2000-01-01'"), new Date("2001-01-01")],
				[$.type("number % 2"), 1],
				[$.type("/^a/"), "b"],
				[$.type("number").narrow(isEven), 1],
				[$.type("number").narrow(() => false), 1],
				[$.type("number").narrow((n, ctx) => ctx.reject({})), 1],
				[$.type("string").pipe.try(s => JSON.parse(s)), "{"],
				[$.type("(string >= 3) | (string <= 0)"), "a"],
				[$.type("(number % 2) & (number > 3)"), 1],
				[$.type({ k: "string" }), {}],
				[$.type({ k: "boolean" }), {}],
				[$.type({ k: "never" }), {}],
				[$.type({ k: "unknown" }), {}],
				[$.type({ k: "string | number | Date" }), {}],
				[$.type({ k: "string.date.parse" }), {}],
				[$.type({ k: "string" }).or({ j: "number" }), {}],
				[$.type({ "+": "reject", k: "string" }), { k: "", j: 1 }],
				[
					$.type({ k: "'a'", j: "string" }).or({ k: "'b'", j: "number" }),
					{ k: "c" }
				],
				[$.type({ k: "'a'", j: "string" }).or({ k: "'b'", j: "number" }), {}],
				[$.type("string | number | bigint").or({ k: "1" }), true],
				// a node another scope described in English
				[
					scope({}, { min: { description: () => mark("min") } }).type({
						k: type("number > 8")
					}),
					{ k: 1 }
				]
			]
		}

		it("a locale's text replaces all of arktype's", () => {
			const codes = new Set<string>()
			const leaked: string[] = []
			const check = (text: string) => {
				// besides markers, only paths through j and k remain
				const rest = text.replace(/⟦[^⟦⟧]*⟧/g, "").replace(/\b[jk]\b/g, "")
				if (/[a-z]/i.test(rest)) leaked.push(text)
			}
			const checkErrors = (errors: readonly ArkError[]) => {
				for (const error of errors) {
					codes.add(error.code)
					check(error.expected)
					check(error.actual)
					check(error.message)
					if (error.code === "union" || error.code === "intersection")
						checkErrors(error.errors)
				}
			}
			const checkResult = (result: unknown) => {
				if (!(result instanceof type.errors)) return
				check(result.summary)
				checkErrors(result.issues)
			}
			const inputs = [
				5,
				1.5,
				9e15,
				null,
				{},
				[],
				"x",
				"",
				"{",
				"(",
				"9007199254740993"
			]
			withConfig({ locale: () => xx }, () => {
				for (const [T, data] of leakCorpusOf()) checkResult(T(data))
				for (const T of keywordsOf("", ark.export()))
					for (const data of inputs) checkResult(T(data))
			})
			attest(leaked).equals([])
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
				"union",
				"unit"
			])
		})
	})
})
