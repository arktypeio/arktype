import { attest, contextualize } from "@ark/attest"
import {
	writeInvalidKeysMessage,
	writeNonStructuralOperandMessage
} from "@ark/schema"
import { keywords, scope, type } from "arktype"

contextualize(() => {
	it("parsed", () => {
		const types = scope({
			from: {
				foo: "1",
				"bar?": "1",
				baz: "1",
				"quux?": "1"
			},
			actual: "Pick<from, 'foo' | 'bar'>",
			expected: {
				foo: "1",
				"bar?": "1"
			}
		}).export()

		attest<typeof types.expected.t>(types.actual.t)
		attest(types.actual.expression).equals(types.expected.expression)
	})

	it("chained", () => {
		const User = type({
			name: "string",
			"age?": "number",
			isAdmin: "boolean"
		})

		const BasicUser = User.pick("name", "age")

		const Expected = type({
			name: "string",
			"age?": "number"
		})

		attest<typeof Expected.t>(BasicUser.t)

		attest(BasicUser.expression).equals(Expected.expression)
	})

	it("invoked", () => {
		const T = keywords.Pick({ a: "string", b: "number" }, "'a'").or("string[]")

		attest<{ a: string } | string[]>(T.t)
		attest(T.expression).snap("{ a: string } | string[]")
	})

	it("invalid key", () => {
		const User = type({
			name: "string"
		})

		// @ts-expect-error
		attest(() => User.pick("length"))
			.throws(writeInvalidKeysMessage(User.expression, ["length"]))
			.type.errors.snap(
				'Argument of type \'"length"\' is not assignable to parameter of type \'"name" | cast<"name">\'.'
			)
	})

	it("drops sequence constraints when picking or omitting props from an array intersection", () => {
		const ArrWithProps = type
			.raw(["string", "number"])
			.and({ a: "string", b: "number" }) as any
		const Picked = ArrWithProps.pick("a")
		attest(Picked.expression).snap("{ a: string }")
		attest(Picked({ a: "hi" })).equals({ a: "hi" })
		attest(Picked({}).toString()).snap("a must be a string (was missing)")

		const Omitted = ArrWithProps.omit("b")
		attest(Omitted.expression).snap("{ a: string }")
		attest(Omitted({ a: "hi" })).equals({ a: "hi" })
	})

	it("non-structure", () => {
		// @ts-expect-error
		attest(() => type("string").pick("length"))
			.throws(writeNonStructuralOperandMessage("pick", "string"))
			.type.errors("Property 'pick' does not exist")
	})
})
