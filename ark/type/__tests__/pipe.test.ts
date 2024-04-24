import { attest, contextualize } from "@arktype/attest"
import type { Out } from "@arktype/schema"
import { type, type Type } from "arktype"

contextualize(() => {
	it("transform out", () => {
		// const parsedPositive = type("parse.number").pipe((n) =>
		// 	n.constrain("min", 1)
		// )
		// attest<Type<(In: string) => number.atLeast<1>, {}>>(parsedPositive)
		// attest(parsedPositive("5")).equals(5)
		// attest(parsedPositive(5).toString()).snap("sometng")
		// attest(parsedPositive("-5").toString()).snap("sometng")
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
		const validUser = { name: "David", age: 30 }
		attest(parsedUser(JSON.stringify(validUser))).equals(validUser)
		const missingKey = { name: "David" }
		attest(parsedUser(JSON.stringify(missingKey)).toString()).snap("sometng")
	})
})
