import { attest, contextualize } from "@ark/attest"
import { declare, type, type Out } from "arktype"
import { writeUnresolvableMessage } from "@ark/schema"
import { incompleteArrayTokenMessage } from "arktype/internal/parser/shift/operator/operator.ts"

contextualize(() => {
	it("shallow", () => {
		const shallow = declare<number>().type("number")
		attest<number>(shallow.infer)
		attest(shallow.json).equals(type("number").json)
	})

	it("obj", () => {
		type Expected = { a: string; b?: number }
		const T = declare<Expected>().type({
			a: "string",
			"b?": "number"
		})
		attest<Expected>(T.infer)
		// name should be preserved
		attest(T.t).type.toString("Expected")
	})

	it("syntax error", () => {
		type Expected = { a: string; b?: number }
		attest(() =>
			declare<Expected>().type({
				// @ts-expect-error
				a: "string["
			})
		).throwsAndHasTypeError(incompleteArrayTokenMessage)
	})

	it("tuple", () => {
		type Expected = [string, number]
		const T = declare<Expected>().type(["string", "number"])
		attest<Expected>(T.infer)
	})

	it("bad element", () => {
		attest(
			// @ts-expect-error
			declare<[string, number]>().type(["string", "boolean"])
		).type.errors(`declared: number; inferred: boolean`)
	})

	it("too short", () => {
		// @ts-expect-error
		attest(declare<[string, number]>().type(["string"])).type.errors(
			`Source has 1 element(s) but target requires 2`
		)
	})

	it("too long", () => {
		attest(
			// @ts-expect-error
			declare<[string, number]>().type(["string", "number", "number"])
		).type.errors(`Source has 3 element(s) but target allows only 2`)
	})

	it("tuple expression", () => {
		const T = declare<0 | 1>().type(["0", "|", "1"])
		attest<0 | 1>(T.infer)
	})

	describe("spread tuple expression", () => {
		it("unit literals", () => {
			const T = declare<"a" | "b">().type("===", "a", "b")
			attest<"a" | "b">(T.t)
			attest(T.expression).snap(`"a" | "b"`)
		})

		it("many unit literals", () => {
			type Letter =
				| "a"
				| "b"
				| "c"
				| "d"
				| "e"
				| "f"
				| "g"
				| "h"
				| "i"
				| "j"
				| "k"
				| "l"
				| "m"
				| "n"
				| "o"
				| "p"
			const T = declare<Letter>().type(
				"===",
				"a",
				"b",
				"c",
				"d",
				"e",
				"f",
				"g",
				"h",
				"i",
				"j",
				"k",
				"l",
				"m",
				"n",
				"o",
				"p"
			)
			attest<Letter>(T.t).type.toString("Letter")
			attest(T("q").toString()).snap(
				`must be "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o" or "p"`
			)
		})

		it("unit literal mismatch", () => {
			attest(() =>
				// @ts-expect-error
				declare<"a" | "b">().type("===", "a", "c")
			).type.errors.snap(
				'Argument of type \'string\' is not assignable to parameter of type \'{ " brand": "ErrorType"; declared: "a" | "b"; inferred: "a" | "c"; }\'.'
			)
		})

		it("missing unit literal", () => {
			attest(() =>
				// @ts-expect-error
				declare<"a" | "b">().type("===", "a")
			).type.errors(`declared: "a" | "b"; inferred: "a"`)
		})

		it("infix", () => {
			const A = type({ kind: "'a'" })
			const B = type({ kind: "'b'" })
			const T = declare<{ kind: "a" } | { kind: "b" }>().type(A, "|", B)
			attest<{ kind: "a" } | { kind: "b" }>(T.t)
			attest(T.expression).equals(A.or(B).expression)
		})

		it("inline object literal infix", () => {
			type Expected =
				| { kind: "a"; count: number }
				| { kind: "b"; label: string }
			const T = declare<Expected>().type(
				{ kind: "'a'", count: "number" },
				"|",
				{ kind: "'b'", label: "string" }
			)
			attest<Expected>(T.t)
			attest(T({ kind: "a", count: 1 })).equals({ kind: "a", count: 1 })
			attest(T({ kind: "b", label: "hi" })).equals({ kind: "b", label: "hi" })
		})

		it("inline object literal infix mismatch", () => {
			type Expected =
				| { kind: "a"; count: number }
				| { kind: "b"; label: string }
			attest(() =>
				declare<Expected>().type(
					// @ts-expect-error
					{ kind: "'c'", count: "number" },
					"|",
					{ kind: "'b'", label: "string" }
				)
			).type.errors(
				`declared: Expected; inferred: { kind: "c"; count: number; } | { kind: "b"; label: string; }`
			)
		})

		it("inline object literal infix invalid syntax", () => {
			type Expected = { kind: "a" } | { kind: "b" }
			attest(() =>
				declare<Expected>().type(
					// @ts-expect-error
					{ kind: "notAKeyword" },
					"|",
					{ kind: "'b'" }
				)
			).throwsAndHasTypeError(writeUnresolvableMessage("notAKeyword"))
		})

		it("inline object literal predicate", () => {
			const T = declare<{ kind: "a" }>().type(
				{ kind: "'a'" },
				":",
				v => v.kind === "a"
			)
			attest<{ kind: "a" }>(T.t)
		})

		it("infix mismatch", () => {
			attest(() =>
				// @ts-expect-error
				declare<string | number>().type("string", "|", "boolean")
			).type.errors(`declared: string | number; inferred: string | boolean`)
		})

		it("prefix", () => {
			const T = declare<"a" | "b">().type("keyof", { a: "1", b: "1" })
			attest<"a" | "b">(T.t)
		})

		it("morph", () => {
			const T = declare<string, { side: "in" }>().type(
				"string",
				"=>",
				s => s.length
			)
			attest<(In: string) => Out<number>>(T.t)
		})

		it("morph out mismatch", () => {
			attest(() =>
				declare<string, { side: "out" }>().type(
					// @ts-expect-error
					"string",
					"=>",
					(s: string) => s.length
				)
			).type.errors("declared: string; inferred: number")
		})

		it("assignable", () => {
			const T = declare<string, { assignable: true }>().type("===", "a", "b")
			attest<"a" | "b">(T.t)
		})

		it("assignable infix", () => {
			const T = declare<string | number, { assignable: true }>().type(
				"'a'",
				"|",
				"1"
			)
			attest<"a" | 1>(T.t)
		})

		it("assignable mismatch", () => {
			attest(() =>
				declare<string, { assignable: true }>().type(
					// @ts-expect-error
					"string",
					"|",
					"number"
				)
			).type.errors("declared: string; inferred: string | number")
		})

		it("invalid operand", () => {
			attest(() =>
				// @ts-expect-error
				declare<string>().type("string", "|", "strng")
			).throwsAndHasTypeError(writeUnresolvableMessage("strng"))
		})

		it("invalid operator", () => {
			// @ts-expect-error
			attest(() => declare<string>().type("string", "|||"))
				.throws()
				.type.errors.snap(
					"Argument of type '\"|||\"' is not assignable to parameter of type 'ArgTwoOperator'."
				)
		})

		it("operand completions", () => {
			// @ts-expect-error
			attest(() => declare<string>().type("string", "|", "boo")).completions({
				boo: ["boolean"]
			})
		})

		it("missing generic argument", () => {
			// @ts-expect-error
			attest(() => declare().type("===", "a")).type.errors(
				"declare<ExternalType>() requires a generic argument"
			)
		})

		it("rejects a parameter string", () => {
			attest(() =>
				// @ts-expect-error
				declare<{ box: string }>().type("<t>", { box: "t" })
			).type.errors(`Argument of type '"<t>"' is not assignable`)
		})
	})

	it("regexp", () => {
		const T = declare<string>().type(/.*/)
		attest<string>(T.t)
		attest<string>(T.infer)
	})

	it("Inferred<t>", () => {
		const Foo = type("'foo'")
		const T = declare<"foo">().type(Foo)
		attest<"foo">(T.infer)
	})

	it("bad tuple expression", () => {
		attest(
			// @ts-expect-error
			declare<"foo" | "bar">().type(["'foo'", "|", "'baz'"])
		).type.errors(`declared: "bar" | "foo"; inferred: "baz" | "foo"`)
	})

	it("tuple literal against union declared type", () => {
		attest(() =>
			// @ts-expect-error
			type.declare<string | [number]>().type(["number"])
		).type.errors("declared: string | [number]; inferred: [number]")

		attest(() =>
			// @ts-expect-error
			type.declare<[string] | [number]>().type(["number"])
		).type.errors("declared: [string] | [number]; inferred: [number]")

		const assignable = type
			.declare<string | [number], { assignable: true }>()
			.type(["number"])
		attest<[number]>(assignable.t)
	})

	it("narrower", () => {
		// @ts-expect-error
		attest(() => declare<string>().type("'foo'")).type.errors(
			`declared: string; inferred: "foo"`
		)
	})

	it("narrower in object (from docs)", () => {
		type Expected = { a: string; b?: number }
		attest(() =>
			type.declare<Expected>().type({
				a: "string",
				// @ts-expect-error
				"b?": "1"
			})
		).type.errors(`declared: number; inferred: 1`)
	})

	it("wider", () => {
		attest(() =>
			declare<{ a: string }>().type({
				// @ts-expect-error
				a: "unknown"
			})
		).type.errors(`declared: string; inferred: unknown`)
	})

	it("missing key", () => {
		attest(() =>
			// @ts-expect-error
			declare<{ a: string; b: number }>().type({
				a: "string"
			})
		).type.errors("Property 'b' is missing")
	})

	it("missing optional key", () => {
		attest(() =>
			// @ts-expect-error
			declare<{ a: string; b?: number }>().type({
				a: "string"
			})
		).type.errors(`'"b?"' is missing`)
	})

	it("empty object optional", () => {
		type Expected = { f?: string }

		// @ts-expect-error
		attest(() => type.declare<Expected>().type({})).type.errors(
			`'"f?"' is missing`
		)
	})

	it("undefined as required value", () => {
		type Expected = { f: string | undefined }

		const T = declare<Expected>().type({ f: "string | undefined" })

		attest<Expected>(T.t)
	})

	it("undefined as optional value", () => {
		type Expected = { f?: string | undefined }

		const T = declare<Expected>().type({ "f?": "string | undefined" })

		attest<Expected>(T.t)
	})

	it("undefined as invalid optional value", () => {
		type Expected = { f?: string }

		attest(() =>
			// @ts-expect-error
			declare<Expected>().type({ "f?": "string | undefined" })
		).type.errors("declared: string; inferred: string | undefined")
	})

	it("extraneous key", () => {
		attest(() =>
			declare<{ a: string }>().type({
				a: "string",
				// @ts-expect-error
				b: "boolean"
			})
		).type.errors(`'b' does not exist`)
	})

	it("escaped meta keys", () => {
		type Expected = { "@": string; "+": number; "...": boolean }
		const T = declare<Expected>().type({
			"\\@": "string",
			"\\+": "number",
			"\\...": "boolean"
		})
		attest<Expected>(T.infer)
		attest(T.expression).snap("{ +: number, ...: boolean, @: string }")
	})

	it("unescaped meta key", () => {
		attest(() =>
			// @ts-expect-error
			declare<{ "@": string }>().type({ "@": "string" })
		).type.errors(`Property '"\\\\@"' is missing`)
	})

	it("optional escaped meta key", () => {
		type Expected = { "@"?: string }
		const T = declare<Expected>().type({ "\\@": "string?" })
		attest<Expected>(T.infer)
		attest(() =>
			declare<Expected>().type({
				// @ts-expect-error
				"\\@": "string"
			})
		).type.errors("not assignable to type 'OptionalPropertyDefinition'")
	})

	it("meta and undeclared key behavior", () => {
		type Expected = { name: string }
		const T = declare<Expected>().type({
			"@": "a user",
			"+": "reject",
			name: "string"
		})
		attest<Expected>(T.infer)
		attest(T.description).snap("a user")
		attest(T({ name: "x", extra: 1 }).toString()).snap("extra must be removed")
	})

	it("completions", () => {
		attest(() =>
			declare<{ a: string; b?: number }>().type({
				// @ts-expect-error
				"": type.unknown
			})
		).completions({
			"": ["+", "@", "a", "b?"]
		})
	})

	it("nested completions", () => {
		attest(() =>
			type
				.declare<{
					a: {
						nested: boolean[]
					}
				}>()
				.type({
					// @ts-expect-error
					a: { "": "boolean[]" }
				})
		).completions({
			"": ["+", "@", "nested"]
		})
	})

	it("missing generic argument", () => {
		// @ts-expect-error
		attest(() => declare().type({})).type.errors(
			"declare<ExternalType>() requires a generic argument"
		)
	})

	it("morph", () => {
		type Expected = { a: string; b?: number }
		attest(() =>
			declare<Expected>().type({
				// @ts-expect-error
				a: "string.numeric.parse",
				"b?": "number"
			})
		).type.errors("declared: string; inferred: (In: string) => To<number>")
	})

	it("morph in", () => {
		type Expected = { a: string; b?: number }
		const T = declare<Expected, { side: "in" }>().type({
			a: "string.numeric.parse",
			"b?": "number"
		})

		attest<
			(In: Expected) => Out<{
				a: number
				b?: number
			}>
		>(T.t).type.toString.snap(
			"(In: Expected) => Out<{ a: number; b?: number }>"
		)
		attest<Expected>(T.inferIn)
		attest<{ a: number; b?: number }>(T.infer)
		attest<{ a: number; b?: number }>(T.assert({ a: "5" })).equals({ a: 5 })
		const Nested = type({ inner: T })
		attest<{ inner: Expected }>(Nested.inferIn)
		attest<{ inner: { a: number; b?: number } }>(Nested.infer)
	})

	it("morph in mismatch", () => {
		type Expected = { a: number; b?: number }
		attest(() =>
			declare<Expected, { side: "in" }>().type({
				// @ts-expect-error
				a: "string.numeric.parse",
				"b?": "number"
			})
		).type.errors("declared: number; inferred: string")
	})

	it("morph out", () => {
		type Expected = { a: number; b?: number }
		const T = declare<Expected, { side: "out" }>().type({
			a: "string.numeric.parse",
			"b?": "number"
		})

		attest<(In: { a: string; b?: number }) => Out<Expected>>(
			T.t
		).type.toString.snap("(In: { a: string; b?: number }) => Out<Expected>")
	})

	it("morph out mismatch", () => {
		type Expected = { a: string; b?: number }
		attest(() =>
			declare<Expected, { side: "out" }>().type({
				// @ts-expect-error
				a: "string.numeric.parse",
				"b?": "number"
			})
		).type.errors("declared: string; inferred: number")
	})

	it("value-optional", () => {
		type Expected = { f?: string }

		const T = type.declare<Expected>().type({
			f: "string?"
		})

		attest<Expected>(T.t)
	})

	it("invalid value-optional", () => {
		type Expected = { f?: string }

		attest(() =>
			type.declare<Expected>().type({
				// @ts-expect-error
				f: "number?"
			})
		).type.errors("declared: string; inferred: number")
	})

	// https://github.com/arktypeio/arktype/issues/1537
	it("github undefined issue", () => {
		type Member = "a" | "b" | undefined // without undefined it works
		const memberValidator = type.declare<Member>().type(`"a" | "b" | undefined`)

		type Object = {
			m: Member
		}
		const objectValidator = type.declare<Object>().type({
			m: memberValidator
		})

		attest<Object>(objectValidator.t)
	})

	describe("index signature", () => {
		// Omit over an index signature keeps only the signature, e.g. on an
		// API type generated as `{ ... } & Record<string, unknown>`
		type Vendor = { name: string; tags?: string[] } & Record<string, unknown>
		type Expected = Omit<Vendor, "tags"> & { kind: "a" | "b" }

		it("checks a key outside its literal keys against the signature", () => {
			attest(() =>
				declare<Expected>().type({
					// @ts-expect-error
					name: "string",
					kind: "'a' | 'b'"
				})
			).type.errors("declared: unknown; inferred: string")
		})

		it("checks its literal keys", () => {
			attest(() =>
				declare<Expected>().type({
					name: "unknown",
					// @ts-expect-error
					kind: "'a'"
				})
			).type.errors(`declared: "a" | "b"; inferred: "a"`)
		})

		it("requires its literal keys", () => {
			attest(() =>
				// @ts-expect-error
				declare<Expected>().type({ name: "unknown" })
			).type.errors("Property 'kind' is missing")
		})
	})

	it("any", () => {
		const Root = declare<any>().type("unknown")
		attest<any>(Root.t)
		attest(() =>
			// @ts-expect-error
			declare<any>().type("string")
		).type.errors("declared: any; inferred: string")

		const T = declare<{ a: any }>().type({ a: "unknown" })
		attest<{ a: any }>(T.t)
		attest(() =>
			declare<{ a: any }>().type({
				// @ts-expect-error
				a: "string"
			})
		).type.errors("declared: any; inferred: string")
	})

	describe("assignable", () => {
		type Expected = {
			id: string
			name?: string | null
			tags?: string[]
			nested?: { x?: number }
		}

		it("infers the definition", () => {
			const T = declare<Expected, { assignable: true }>().type({
				id: "string",
				name: "string",
				nested: { x: "number" }
			})
			attest<{ id: string; name: string; nested: { x: number } }>(T.t)
		})

		it("optional key", () => {
			const T = declare<Expected, { assignable: true }>().type({
				id: "string",
				"name?": "string | null",
				tags: "string[]?"
			})
			attest<{ id: string; name?: string | null; tags?: string[] }>(T.t)
		})

		it("optional undefined", () => {
			type Expected = { a?: string }
			attest(() =>
				declare<Expected, { assignable: true }>().type({
					// @ts-expect-error
					a: "string | undefined"
				})
			).type.errors("declared: string; inferred: string | undefined")
		})

		it("required key written optional", () => {
			attest(() =>
				declare<Expected, { assignable: true }>().type({
					// @ts-expect-error
					"id?": "string"
				})
			).type.errors(`'"id?"' does not exist`)
		})

		it("wider", () => {
			attest(() =>
				declare<Expected, { assignable: true }>().type({
					// @ts-expect-error
					id: "string | number"
				})
			).type.errors("declared: string; inferred: string | number")
		})

		it("extraneous key", () => {
			attest(() =>
				declare<Expected, { assignable: true }>().type({
					id: "string",
					// @ts-expect-error
					extra: "string"
				})
			).type.errors(`'extra' does not exist`)
		})

		it("shallow", () => {
			const T = declare<string, { assignable: true }>().type("'foo'")
			attest<"foo">(T.t)
		})

		it("narrowed Type", () => {
			const Shape = type({ a: "string", b: "string" })
			const T = declare<{ a: string; b?: string }, { assignable: true }>().type(
				Shape.narrow(data => data.a !== data.b)
			)
			attest<{ a: string; b: string }>(T.t)
			attest(T({ a: "x", b: "x" }).toString()).snap(
				"must be valid according to an anonymous predicate"
			)
		})

		it("index signature", () => {
			type Vendor = { name: string; tags?: string[] } & Record<string, unknown>
			const T = declare<
				Omit<Vendor, "tags"> & { kind: "a" | "b" },
				{ assignable: true }
			>().type({ name: "string", kind: "'a'" })
			attest<{ name: string; kind: "a" }>(T.t)
		})

		it("object union member", () => {
			type U = { kind: "a"; a: string } | { kind: "b"; b: number }
			const A = declare<U, { assignable: true }>().type({
				kind: "'a'",
				a: "string"
			})
			attest<{ kind: "a"; a: string }>(A.t)

			const B = declare<U, { assignable: true }>().type({
				kind: "'b'",
				b: "number"
			})
			attest<{ kind: "b"; b: number }>(B.t)

			attest(() =>
				declare<U, { assignable: true }>().type({
					kind: "'a'",
					// @ts-expect-error
					a: "number"
				})
			).type.errors("not assignable to")

			attest(() =>
				declare<U, { assignable: true }>().type({
					kind: "'a'",
					a: "string",
					// @ts-expect-error
					extra: "boolean"
				})
			).type.errors("'extra' does not exist")
		})
	})

	describe("optional and variadic tuples", () => {
		it("optional element", () => {
			const StrOpt = declare<[string, number?]>().type(["string", "number?"])
			attest<[string, number?]>(StrOpt.infer)
			attest(StrOpt(["a"])).equals(["a"])
			attest(StrOpt(["a", 1])).equals(["a", 1])

			const TupleOpt = declare<[string, number?]>().type([
				"string",
				["number", "?"]
			])
			attest<[string, number?]>(TupleOpt.infer)

			attest(() =>
				// @ts-expect-error
				declare<[string, number?]>().type(["string", "boolean?"])
			).type.errors("declared: number; inferred: boolean")

			attest(() =>
				// @ts-expect-error
				declare<[string, number?]>().type(["string", "number"])
			).type.errors("not assignable to type 'OptionalPropertyDefinition'")

			attest(() =>
				// @ts-expect-error
				declare<[string, number?]>().type(["string"])
			).type.errors("Source has 1 element(s) but target requires 2")

			attest(() =>
				// @ts-expect-error
				declare<[string, number]>().type(["string", "number?"])
			).type.errors("declared: number; inferred: number | undefined")
		})

		it("variadic tuple", () => {
			const Rest = declare<[string, ...number[]]>().type([
				"string",
				"...",
				"number[]"
			])
			attest<[string, ...number[]]>(Rest.infer)
			attest(Rest(["a", 1, 2])).equals(["a", 1, 2])

			const OptRest = declare<[string, number?, ...boolean[]]>().type([
				"string",
				"number?",
				"...",
				"boolean[]"
			])
			attest<[string, number?, ...boolean[]]>(OptRest.infer)

			attest(() =>
				// @ts-expect-error
				declare<[string, ...number[]]>().type(["string", "...", "string[]"])
			).type.errors(
				"declared: [string, ...number[]]; inferred: [string, ...string[]]"
			)

			const ReadonlyRest = declare<readonly [string, ...number[]]>().type([
				"string",
				"...",
				"number[]"
			])
			attest<readonly [string, ...number[]]>(ReadonlyRest.infer)
			attest(ReadonlyRest(["a", 1, 2])).equals(["a", 1, 2])

			const ReadonlyOptRest = declare<
				readonly [string, number?, ...boolean[]]
			>().type(["string", "number?", "...", "boolean[]"])
			attest<readonly [string, number?, ...boolean[]]>(ReadonlyOptRest.infer)

			attest(() =>
				// @ts-expect-error
				declare<readonly [string, ...number[]]>().type([
					"string",
					"...",
					"string[]"
				])
			).type.errors(
				"declared: readonly [string, ...number[]]; inferred: [string, ...string[]]"
			)
		})

		it("assignable optional and variadic tuples", () => {
			const Exact = declare<[string, number?], { assignable: true }>().type([
				"string",
				"number"
			])
			attest<[string, number]>(Exact.t)

			const Short = declare<[string, number?], { assignable: true }>().type([
				"string"
			])
			attest<[string]>(Short.t)

			const NarrowVariadic = declare<
				[string, ...number[]],
				{ assignable: true }
			>().type(["'a'", "1"])
			attest<["a", 1]>(NarrowVariadic.t)

			const UnknownTuple = declare<unknown, { assignable: true }>().type([
				"string"
			])
			attest<[string]>(UnknownTuple.t)

			const UnknownObj = declare<unknown, { assignable: true }>().type({
				a: "string"
			})
			attest<{ a: string }>(UnknownObj.t)

			const AnyObj = declare<object, { assignable: true }>().type({
				a: "string"
			})
			attest<{ a: string }>(AnyObj.t)

			const AnyObjTuple = declare<object, { assignable: true }>().type([
				"string"
			])
			attest<[string]>(AnyObjTuple.t)
		})
	})

	describe("side: in with defaulted keys", () => {
		it("accepts defaulted keys for declared-optional input keys", () => {
			const StrDefault = declare<{ a?: number }, { side: "in" }>().type({
				a: "number = 1"
			})
			attest<{ a?: number }>(StrDefault.inferIn)
			attest<{ a: number }>(StrDefault.infer)
			attest(StrDefault({})).equals({ a: 1 })

			const TupleDefault = declare<{ a?: number }, { side: "in" }>().type({
				a: ["number", "=", 1]
			})
			attest<{ a?: number }>(TupleDefault.inferIn)
			attest<{ a: number }>(TupleDefault.infer)

			const MorphDefault = declare<{ a?: string }, { side: "in" }>().type({
				a: ["string.numeric.parse", "=", "1"]
			})
			attest<{ a?: string }>(MorphDefault.inferIn)
			attest<{ a: number }>(MorphDefault.infer)
			attest(MorphDefault({})).equals({ a: 1 })

			const OutRequiredDefault = declare<{ a: number }, { side: "out" }>().type(
				{
					a: "number = 1"
				}
			)
			attest<{ a?: number }>(OutRequiredDefault.inferIn)
			attest<{ a: number }>(OutRequiredDefault.infer)
		})

		it("rejects mismatched, wrong-side, or required-key defaulted defs", () => {
			attest(() =>
				declare<{ a?: number }, { side: "in" }>().type({
					// @ts-expect-error
					a: "string = 'hi'"
				})
			).type.errors("declared: number; inferred: string")

			attest(() =>
				declare<{ a?: number }, { side: "out" }>().type({
					// @ts-expect-error
					a: "number = 1"
				})
			).type.errors("'a' does not exist")

			attest(() =>
				declare<{ a?: number }>().type({
					// @ts-expect-error
					a: "number = 1"
				})
			).type.errors("'a' does not exist")

			attest(() =>
				declare<{ a: number }, { side: "in" }>().type({
					// @ts-expect-error
					a: "number = 1"
				})
			).type.errors("declared: number; inferred: number | undefined")

			attest(() =>
				declare<{ a: number }, { side: "in" }>().type({
					// @ts-expect-error
					a: ["number", "=", 1]
				})
			).type.errors("declared: number; inferred: number | undefined")

			attest(() =>
				declare<{ a: number }>().type({
					// @ts-expect-error
					a: "number?"
				})
			).type.errors("declared: number; inferred: number | undefined")

			attest(() =>
				declare<{ "@": number }, { side: "in" }>().type({
					// @ts-expect-error
					"\\@": "number = 1"
				})
			).type.errors("declared: number; inferred: number | undefined")
		})
	})
})
