import { attest } from "@arktype/attest"
import { declare, type } from "arktype"
import { suite, test } from "mocha"

suite("declared", () => {
	test("shallow", () => {
		const shallow = declare<number>().type("number")
		attest<number>(shallow.infer)
		attest(shallow.condition).equals(type("number").condition)
	})

	test("obj", () => {
		type Expected = { a: string; b?: number }
		const t = declare<Expected>().type({
			a: "string",
			"b?": "number"
		})
		attest<Expected>(t.infer)
	})

	test("tuple", () => {
		type Expected = [string, number]
		const t = declare<Expected>().type(["string", "number"])
		attest<Expected>(t.infer)
	})

	test("bad element", () => {
		attest(
			// @ts-expect-error
			declare<[string, number]>().type(["string", "boolean"])
		).type.errors(
			`Type 'string' is not assignable to type '{ declared: number; inferred: boolean; }'`
		)
	})

	test("too short", () => {
		// @ts-expect-error
		attest(declare<[string, number]>().type(["string"])).type.errors(
			`Source has 1 element(s) but target requires 2`
		)
	})

	test("too long", () => {
		attest(
			// @ts-expect-error
			declare<[string, number]>().type(["string", "number", "number"])
		).type.errors(`Source has 3 element(s) but target requires 2`)
	})

	test("tuple expression", () => {
		const t = declare<0 | 1>().type(["0", "|", "1"])
		attest<0 | 1>(t.infer)
	})

	test("regexp", () => {
		const t = declare<string>().type(/.*/)
		attest<string>(t.infer)
	})

	test("Inferred<t>", () => {
		const foo = type("'foo'")
		const t = declare<"foo">().type(foo)
		attest<"foo">(t.infer)
	})

	test("bad tuple expression", () => {
		attest(
			// @ts-expect-error
			declare<"foo" | "bar">().type(["'foo'", "|", "'baz'"])
		).type.errors(`{ declared: "foo" | "bar"; inferred: "foo" | "baz"; }`)
	})

	test("narrower", () => {
		// @ts-expect-error
		attest(() => declare<string>().type("'foo'")).type.errors(
			`Argument of type 'string' is not assignable to parameter of type '{ declared: string; inferred: "foo"; }'`
		)
	})

	test("wider", () => {
		attest(() =>
			declare<{ a: string }>().type({
				// @ts-expect-error
				a: "unknown"
			})
		).type.errors(
			`Type 'string' is not assignable to type '{ declared: string; inferred: unknown; }'`
		)
	})

	test("missing key", () => {
		attest(() =>
			// @ts-expect-error
			declare<{ a: string; b: number }>().type({
				a: "string"
			})
		).type.errors(
			`Property 'b' is missing in type '{ a: "string"; }' but required in type '{ a: "string"; "b?": unknown; }'.`
		)
	})

	test("missing optional key", () => {
		attest(() =>
			// @ts-expect-error
			declare<{ a: string; b?: number }>().type({
				a: "string"
			})
		).type.errors(
			`Property '"b?"' is missing in type '{ a: "string"; }' but required in type '{ a: "string"; "b?": unknown; }'.`
		)
	})

	test("extraneous key", () => {
		attest(() =>
			declare<{ a: string }>().type({
				a: "string",
				// @ts-expect-error
				b: "boolean"
			})
		).type.errors(
			`Object literal may only specify known properties, and 'b' does not exist in type '{ a: "string"; }'.`
		)
	})
})
