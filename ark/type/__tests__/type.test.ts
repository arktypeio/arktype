import { attest, contextualize } from "@ark/attest"
import { scope, type, type Type } from "arktype"
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
			"AggregateError: a must be a string (was number)"
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

	it("Type.Any allows arbitrary scope", () => {
		const foo = scope({
			foo: "string"
		}).resolve("foo")

		const t: Type.Any<string> = foo

		// @ts-expect-error (fails with default ambient type)
		attest((): Type<string> => foo).type.errors(
			"Type<string, { foo: string; }>' is not assignable to type 'Type<string, {}>'"
		)
	})
})
