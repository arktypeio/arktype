import { attest, contextualize } from "@arktype/attest"
import type { Out, number } from "@arktype/schema"
import { type Type, type } from "arktype"

contextualize(() => {
	it("transform out", () => {
		const parsedPositive = type("parse.number").pipe((n) =>
			n.constrain("min", 1)
		)
		attest<Type<(In: string) => number.atLeast<1>, {}>>(parsedPositive)
		attest(parsedPositive("5").errors).equals(undefined)
		attest(parsedPositive(5).errors?.summary).snap("sometng")
		attest(parsedPositive("-5").errors?.summary).snap("sometng")
	})
	it("from morph", () => {
		const parsedUser = type("string")
			.morph((s) => JSON.parse(s))
			.pipe({
				name: "string",
				age: "number"
			})
		attest<
			Type<
				(In: string) => Out<{
					name: string
					age: number
				}>
			>
		>(parsedUser)
		attest(
			parsedUser(JSON.stringify({ name: "David", age: 30 })).errors
		).equals(undefined)
		attest(parsedUser(JSON.stringify({ name: "David" })).errors?.summary).snap(
			"sometng"
		)
	})
})
