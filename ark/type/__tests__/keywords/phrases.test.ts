import { attest, contextualize } from "@ark/attest"
import {
	en as schemaEn,
	rootSchema,
	writeKeywordExpected,
	type ArkError,
	type ArkErrors,
	type BaseNode
} from "@ark/schema"
import { ark, scope, type, type KeywordConfig } from "arktype"
import {
	keywordError,
	keywordPhrases,
	type KeywordPhraseAlias
} from "arktype/internal/keywords/phrases.ts"
import { regexStringNode } from "arktype/internal/keywords/string.ts"
import { en } from "arktype/locales/en"

const flatKeywords = (prefix: string, o: object): [string, type.Any][] =>
	Object.entries(o).flatMap(([k, v]): [string, type.Any][] => {
		const alias =
			k === "root" ? prefix
			: prefix ? `${prefix}.${k}`
			: k
		return (
			v?.internal?.kind ? [[alias, v]]
			: typeof v === "object" && v !== null ? flatKeywords(alias, v)
			: []
		)
	})

const keywordTypes = flatKeywords("", ark.export())

const nodesOf = (T: type.Any): BaseNode[] => [
	...new Set([T.internal, ...T.internal.references])
]

const nounOf = (alias: KeywordPhraseAlias) => {
	const phrase = keywordPhrases[alias]
	return typeof phrase === "string" ? phrase : phrase.noun
}

const leavesOf = (error: ArkError): ArkError[] =>
	error.code === "union" || error.code === "intersection" ?
		error.errors.flatMap(leavesOf)
	:	[error]

contextualize(() => {
	it("aliases are configurable keywords", () => {
		attest<[KeywordPhraseAlias] extends [keyof KeywordConfig] ? true : false>(
			true
		)
		// @ts-expect-error
		attest(() => regexStringNode(/^a$/, "string.emial")).type.errors(
			"Argument of type '\"string.emial\"' is not assignable"
		)
		// @ts-expect-error
		attest(() => keywordError("string.url.prase")).type.errors(
			"Argument of type '\"string.url.prase\"' is not assignable"
		)
	})

	it("en has every phrase", () => {
		attest(schemaEn).is(en)
		attest(en.keywordPhrases).equals(keywordPhrases)
	})

	it("a scope resolved before arktype's keywords has their phrases", () => {
		const parseJson = rootSchema({
			in: "string",
			morphs: type("string.json.parse").internal.assertHasKind("morph").morphs
		})
		attest((parseJson("") as ArkErrors).toString()).snap(
			"must be a JSON string (was empty)"
		)
		const error = (parseJson("{") as ArkErrors)
			.issues[0] as ArkError<"predicate">
		attest(error.cause).instanceOf(SyntaxError)
		attest(error.message).equals(`must be a JSON string (${error.cause})`)
	})

	it("only own phrases are a keyword's", () => {
		for (const keyword of ["constructor", "toString", "__proto__"]) {
			attest(
				type("string")
					.narrow((s, ctx) =>
						ctx.reject({ code: "predicate", meta: { keyword } })
					)("x")
					.toString()
			).equals('must be valid according to an anonymous predicate (was "x")')
		}
	})

	it("nodes with keyword text carry the keyword", () => {
		const tagged = new Set<string>()
		for (const [, T] of keywordTypes) {
			for (const node of nodesOf(T)) {
				const keyword = node.meta.keyword
				if (keyword === undefined) continue
				tagged.add(keyword)
				const description =
					"errorContext" in node && node.errorContext ?
						writeKeywordExpected(node.errorContext as never, en)
					:	nounOf(keyword as KeywordPhraseAlias)
				// en renders each node's phrase as its description
				attest(description).equals(node.description)
			}
		}
		const raisedThroughCtx = Object.keys(keywordPhrases).filter(
			alias => !tagged.has(alias)
		)
		attest(raisedThroughCtx).snap([
			"string.date.parse",
			"string.integer.parse",
			"string.json.parse",
			"string.url.parse"
		])
	})

	it("keywords with no phrase stay equal to their structure", () => {
		attest(type("number.integer").internal.meta).equals({})
		attest(type("number.integer").equals("number % 1")).equals(true)
		attest(type("string.email").equals(type("string.email"))).equals(true)
	})

	it("a keyword error's phrase is its description in en", () => {
		const inputs = ["", "x", "(", "{", "1.5", "9007199254740993", -1, 1.5, 9e15]
		const $ = scope({})
		for (const [alias] of keywordTypes) {
			const T = $.type(alias as never) as type.Any
			for (const data of [...inputs, -9e15]) {
				const out = T(data)
				if (!(out instanceof type.errors)) continue
				for (const error of (out as ArkErrors).issues.flatMap(leavesOf)) {
					if (error.meta?.keyword === undefined) continue
					const expected = writeKeywordExpected(error as never, en)
					attest(expected).equals(error.description ?? error.expected)
				}
			}
		}
	})

	it("describing a keyword drops it", () => {
		const keywordOf = (T: type.Any) =>
			T.internal.select({ kind: "pattern", method: "assertFind" }).meta.keyword
		attest(keywordOf(type("string.email"))).equals("string.email")
		attest(keywordOf(type("string.email").describe("a mailbox"))).equals(
			undefined
		)
		attest(
			keywordOf(type("string.email").configure({ description: "a mailbox" }))
		).equals(undefined)
		attest(
			keywordOf(
				type("string.email").configure(meta => ({
					...meta,
					description: "a mailbox"
				}))
			)
		).equals(undefined)
		attest(
			keywordOf(type("string.email").configure({ title: "Email" }))
		).equals("string.email")
		attest(
			type("string.email")
				.describe("a mailbox")
				.internal.select({ kind: "pattern", method: "assertFind" }).meta
		).snap({ description: "a mailbox" })
		attest(type("string.email").describe("a mailbox")("x").toString()).snap(
			'must be a mailbox (was "x")'
		)
	})

	it("JSON Schema skips keyword", () => {
		attest(type("number.epoch").toJsonSchema()).snap({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "integer",
			description: "an integer representing a safe Unix timestamp",
			maximum: 8640000000000000,
			minimum: -8640000000000000
		})
		attest(
			type("string")
				.configure({ keyword: "string.alpha", title: "Name" })
				.toJsonSchema()
		).snap({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "string",
			title: "Name"
		})
	})

	describe("keyword morphs", () => {
		const errorOf = (T: type.Any, data: unknown) =>
			(T(data) as ArkErrors).issues[0] as ArkError<"predicate">

		const jsonOf = (T: type.Any, data: unknown) =>
			(T(data) as ArkErrors).toJSON()[0]

		it("integer.parse", () => {
			const error = errorOf(type("string.integer.parse"), "9007199254740993")
			attest(error.meta).snap({ keyword: "string.integer.parse" })
			attest(jsonOf(type("string.integer.parse"), "9007199254740993")).snap({
				data: "9007199254740993",
				path: [],
				code: "predicate",
				description:
					"an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER",
				meta: { keyword: "string.integer.parse" },
				propString: "",
				expected:
					"an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER",
				actual: '"9007199254740993"',
				problem:
					'must be an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER (was "9007199254740993")',
				message:
					'must be an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER (was "9007199254740993")'
			})
		})

		it("date.parse", () => {
			const error = errorOf(type({ d: "string.date.parse" }), { d: "x" })
			attest(error.meta).snap({ keyword: "string.date.parse" })
			attest(error.message).snap('d must be a parsable date (was "x")')
		})

		it("url.parse", () => {
			const error = errorOf(type("string.url.parse"), "x")
			attest(error.meta).snap({ keyword: "string.url.parse" })
			attest(error.cause).equals(undefined)
			attest(error.message).snap('must be a URL string (was "x")')
		})

		it("json", () => {
			const error = errorOf(type("string.json"), "{")
			attest(error.meta).snap({ keyword: "string.json" })
			attest(error.cause).instanceOf(SyntaxError)
			attest(error.expected).snap("a JSON string")
			attest(error.actual).snap('"{"')
			attest(error.problem).equals(`must be a JSON string (${error.cause})`)
		})

		it("json.parse", () => {
			const error = errorOf(type("string.json.parse"), "{")
			attest(error.meta).snap({ keyword: "string.json.parse" })
			attest(error.cause).instanceOf(SyntaxError)
			attest(error.actual).snap('"{"')
			attest(error.problem).equals(`must be a JSON string (${error.cause})`)
			const empty = errorOf(type("string.json.parse"), "")
			attest(empty.cause).equals(undefined)
			attest(jsonOf(type("string.json.parse"), "")).snap({
				data: "",
				path: [],
				code: "predicate",
				description: "a JSON string",
				meta: { keyword: "string.json.parse" },
				propString: "",
				expected: "a JSON string",
				actual: "empty",
				problem: "must be a JSON string (was empty)",
				message: "must be a JSON string (was empty)"
			})
		})

		it("regex", () => {
			const error = errorOf(type({ r: "string.regex" }), { r: "(" })
			attest(error.meta).snap({ keyword: "string.regex" })
			attest(error.cause).instanceOf(SyntaxError)
			attest(error.expected).snap("a regex pattern")
			attest(error.problem).equals(String(error.cause))
			attest(error.message).equals(`r ${error.cause}`)
		})

		it("per-code config outranks the phrase", () => {
			const $ = scope(
				{},
				{
					predicate: {
						problem: e => `isn't ${e.expected}`,
						actual: () => ""
					}
				}
			)
			attest($.type("string.json.parse")("")?.toString()).snap(
				"isn't a JSON string"
			)
			attest($.type("string.url.parse")("x").toString()).snap(
				"isn't a URL string"
			)
		})

		it("per-code config reads the keyword's description", () => {
			const $ = scope(
				{},
				{
					predicate: {
						expected: e => `<${e.description}>`,
						problem: e => `isn't ${e.expected}`
					}
				}
			)
			attest($.type("string.date.parse")("x").toString()).snap(
				"isn't <a parsable date>"
			)
			attest($.type("string.json.parse")("{")?.toString()).snap(
				"isn't <a JSON string>"
			)
			attest($.type("string.regex")("(").toString()).snap(
				"isn't <a regex pattern>"
			)
		})
	})
})
