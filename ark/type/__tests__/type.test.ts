import { attest, contextualize } from "@ark/attest"
import { TraversalError, type UnitNode } from "@ark/schema"
import { flatMorph } from "@ark/util"
import { Generic, keywords, scope, Type, type, type Ark } from "arktype"
import * as assert from "node:assert/strict"

contextualize(() => {
	it("root discriminates", () => {
		const t = type("string")
		const out = t("")
		if (out instanceof type.errors) out.throw()
		else attest<string>(out)
	})

	it("allows", () => {
		const t = type("number%2")
		const data: unknown = 4
		if (t.allows(data)) {
			// narrows correctly
			attest<number>(data)
		} else throw new Error()

		attest(t.allows(5)).equals(false)
	})

	it("allows doc example", () => {
		const numeric = type("number | bigint")
		const numerics = [0, "one", 2n].filter(numeric.allows)
		attest(numerics).snap([0, 2n])
	})

	it("extends doc example", () => {
		const n = type(Math.random() > 0.5 ? "boolean" : "string")
		attest(n.expression).satisfies("string | boolean")
		attest(n.t).type.toString.snap("string | boolean")
		const ez = n.ifExtends("boolean")
		attest(ez?.expression).satisfies("'boolean' | undefined")
		attest(ez?.t).type.toString.snap("boolean | undefined")
	})

	it("errors can be thrown", () => {
		const t = type("number")
		try {
			const result = t("invalid")
			if (result instanceof type.errors) result.throw()
		} catch (e) {
			attest(e).instanceOf(TraversalError)
			attest((e as TraversalError).arkErrors instanceof type.errors)
			return
		}
		throw new assert.AssertionError({ message: "Expected to throw" })
	})

	it("assert", () => {
		const t = type({ a: "string" })
		attest(t.assert({ a: "1" })).equals({ a: "1" })
		attest(() => t.assert({ a: 1 })).throws.snap(
			"TraversalError: a must be a string (was a number)"
		)
	})

	it("select", () => {
		const units = type("'red' | 'blue'").select("unit")

		attest<UnitNode[]>(units)
		attest(units).snap([{ unit: "blue" }, { unit: "red" }])
	})

	it("is treated as covariant", () => {
		type("1") satisfies Type<number>

		// @ts-expect-error
		attest(() => type("1") satisfies Type<string>).type.errors(
			"missing the following properties from type 'Type<string, {}>'"
		)

		// errors correctly if t is declared as its own type param
		const accept = <t extends string>(t: Type<t>) => t

		const t = type("1")

		// @ts-expect-error
		attest(() => accept(t)).type.errors(
			"Argument of type 'Type<1, {}>' is not assignable to parameter of type 'Type<string, {}>'"
		)
	})

	// the negative cases of these assignability tests
	// contribute a ton of instantiations and check time

	it("base signature obeys assignability rules", () => {
		type("'foo'[]") satisfies Type<string[]>

		// @ts-expect-error
		attest(() => type("number[]") satisfies Type<string[]>).type.errors(
			"Type 'number' is not assignable to type 'string'"
		)
		attest.instantiations([525767, "instantiations"])
	})

	it("args signature obeys assignability rules", () => {
		type("'foo'", "[]") satisfies Type<string[]>

		// @ts-expect-error
		attest(() => type("number", "[]") satisfies Type<string[]>).type.errors(
			"Type 'number' is not assignable to type 'string'"
		)
		attest.instantiations([524145, "instantiations"])
	})

	it("type.Any allows arbitrary scope", () => {
		const foo = scope({
			foo: "string"
		}).resolve("foo")

		foo satisfies type.Any<string>

		// @ts-expect-error (fails with default ambient type)
		attest((): Type<string> => foo).type.errors(
			"Type<string, { foo: string; }>' is not assignable to type 'Type<string, {}>'"
		)
	})

	it("distribute", () => {
		const t = type("===", 0, "1", "2", 3, "4", 5)

		const numbers = t.distribute(
			n =>
				n.ifExtends(type.number) ??
				type.raw(n.expression.slice(1, -1)).as<number>(),
			branches => type.raw(branches).as<number[]>()
		)

		attest(numbers.expression).snap("[1, 2, 4, 0, 3, 5]")
	})

	it("attached types", () => {
		const attachments: Record<keyof Ark.typeAttachments, string | object> =
			flatMorph({ ...type }, (k, v) =>
				v instanceof Type ? [k, v.expression]
				: v instanceof Generic ? [k, v.json]
				: []
			)

		attest(attachments).snap({
			bigint: "bigint",
			boolean: "boolean",
			false: "false",
			never: "never",
			null: "null",
			number: "number",
			object: "object",
			string: "string",
			symbol: "symbol",
			true: "true",
			unknown: "unknown",
			undefined: "undefined",
			arrayIndex: type.arrayIndex.expression,
			Key: "string | symbol",
			Record: keywords.Record.internal.json,
			Date: "Date",
			Array: "Array"
		})

		attest<number>(type.number.t)
	})

	it("ark attached", () => {
		attest<string>(type.keywords.number.integer.expression).snap("number % 1")
	})

	it("unit", () => {
		const t = type.unit(5)
		attest<5>(t.t)
		attest(t.expression).equals("5")
	})

	it("enumerated", () => {
		const t = type.enumerated(5, true, null)
		attest<5 | true | null>(t.t)
		attest(t.expression).snap("5 | null | true")
	})

	it("schema", () => {
		const t = type.schema({ domain: "string" })
		// uninferred for now
		attest<unknown>(t.t)
		attest(t.expression).equals("string")
	})

	it("ifEquals", () => {
		const t = type("string")
		attest(t.ifEquals("string")).equals(t)
		// subtype
		attest(t.ifEquals("'foo'")).equals(undefined)
		// supertype
		attest(t.ifEquals("string | number")).equals(undefined)
	})

	it("ifExtends", () => {
		const t = type("string")
		attest<type<string> | undefined>(t.ifExtends("string")).equals(t)
		// subtype
		attest<type<"foo"> | undefined>(t.ifExtends("'foo'")).equals(undefined)
		// supertype
		attest<type<string | number> | undefined>(
			t.ifExtends("string | number")
		).equals(t)
	})

	it("allows assignment to unparameterized Type", () => {
		const t = type({
			name: "string >= 2",
			email: "string.email"
		})

		t satisfies Type
	})

	it("allows morph assignment to unparameterized Type", () => {
		const t = type("string").pipe(s => s.length)

		t satisfies Type
	})

	it("assert callable as standalone function", () => {
		const { assert } = type("string")

		attest<(data: unknown) => string>(assert)
		attest(assert("foo")).equals("foo")
		attest(() => assert(5)).throws.snap(
			"TraversalError: must be a string (was a number)"
		)
	})

	it("toString()", () => {
		// represent a variety of structures to ensure it is correctly composed
		const t = type({
			"[string]": "number",
			a: "1",
			"b?": "2",
			c: ["0 < string < 5", "boolean?", "...", "number[]"],
			d: [
				["string", "=>", s => s.length],
				"0 < number % 2 < 100",
				"...",
				"bigint[]",
				"(/^a.*z$/ & string.lower)[]"
			]
		})
		attest(t.expression).snap(
			"{ [string]: number, a: 1, c: [string <= 4 & >= 1, boolean?, ...number[]], d: [(In: string) => Out<unknown>, number % 2 & < 100 & > 0, ...bigint[], (In: /^a.*z$/) => Out</^[a-z]*$/>[]], b?: 2 }"
		)
		attest(`${t}`).equals(`Type<${t.expression}>`)
	})

	it("valueOf", () => {
		//    🪦R.I.P. TS enums🪦
		//         2012-2025
		// Killed by --erasableSyntaxOnly

		// enum TsEnum {
		// 	numeric = 1,
		// 	symmetrical = "symmetrical",
		// 	asymmetrical = "lacirtemmysa"
		// }

		const EquivalentObject = {
			numeric: 1,
			symmetrical: "symmetrical",
			asymmetrical: "lacirtemmysa"
		} as const

		// TS reverse assigns numeric values
		// need to make sure we don't extract them at runtime

		// Object.assign avoids TS inferring this key (it wouldn't for an enum)
		Object.assign(EquivalentObject, {
			"1": "numeric"
		})

		const t = type.valueOf(EquivalentObject)

		const expected = type.enumerated(1, "symmetrical", "lacirtemmysa")

		attest<typeof expected>(t)
		attest(t.expression).equals(expected.expression)
	})
})
