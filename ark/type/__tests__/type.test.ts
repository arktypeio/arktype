import { attest, contextualize } from "@arktype/attest"
import { type } from "arktype"
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
			attest(result instanceof type.errors && result.throw())
		} catch (e) {
			attest(e instanceof type.errors).equals(true)
			return
		}
		throw new AssertionError({ message: "Expected to throw" })
	})
})
