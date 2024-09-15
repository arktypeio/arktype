import { attest, contextualize } from "@ark/attest"
import { flatMorph } from "@ark/util"
import { ark, Generic, scope, Type, type, type Ark } from "arktype"
import { AssertionError } from "node:assert"

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

	it("errors can be thrown", () => {
		const t = type("number")
		try {
			const result = t("invalid")
			if (result instanceof type.errors) result.throw()
		} catch (e) {
			attest(e).instanceOf(AggregateError)
			attest((e as AggregateError).errors instanceof type.errors)
			return
		}
		throw new AssertionError({ message: "Expected to throw" })
	})

	it("assert", () => {
		const t = type({ a: "string" })
		attest(t.assert({ a: "1" })).equals({ a: "1" })
		attest(() => t.assert({ a: 1 })).throws.snap(
			"AggregateError: a must be a string (was a number)"
		)
	})

	it("is treated as contravariant", () => {
		const ok: Type<number> = type("1")

		// currently treated as bivariant here, should be error
		const shouldBeError: Type<string> = type("1")

		// errors correctly if t is declared as its own type param
		const accept = <t extends string>(t: Type<t>) => t

		// @ts-expect-error
		attest(() => accept(type("1"))).type.errors(
			"Argument of type 'Type<1, {}>' is not assignable to parameter of type 'Type<string, {}>'"
		)
	})

	it("type.Any allows arbitrary scope", () => {
		const foo = scope({
			foo: "string"
		}).resolve("foo")

		const t: type.Any<string> = foo

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
			Key: "string | symbol",
			Record: ark.Record.internal.json
		})

		attest<number>(type.number.t)
	})

	it("ark attached", () => {
		attest<string>(type.ark.number.integer.expression).snap("number % 1")
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
})
