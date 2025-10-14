import { attest, contextualize } from "@ark/attest"
import { declare, type } from "arktype"
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
		).type.errors(`declared: "foo" | "bar"; inferred: "foo" | "baz"`)
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

	it("extraneous key", () => {
		attest(() =>
			declare<{ a: string }>().type({
				a: "string",
				// @ts-expect-error
				b: "boolean"
			})
		).type.errors(`'b' does not exist`)
	})

	it("completions", () => {
		attest(() =>
			declare<{ a: string; b?: number }>().type({
				// @ts-expect-error
				"": type.unknown
			})
		).completions({
			"": ["a", "b?"]
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
			"": ["nested"]
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
			(In: Expected) => {
				a: number
				b?: number
			}
		>(T.t).type.toString.snap("(In: Expected) => { a: number; b?: number }")
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

		attest<(In: { a: string; b?: number }) => Expected>(T.t).type.toString.snap(
			"(In: { a: string; b?: number }) => Expected"
		)
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
})
