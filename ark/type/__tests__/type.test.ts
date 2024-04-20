import { attest, contextualize } from "@arktype/attest"
import { ArkError, type } from "arktype"
import { AssertionError } from "node:assert"

contextualize(() => {
	it("root discriminates", () => {
		const t = type("string")
		const out = t("")
		if (out instanceof type.error) {
			out.throw()
		} else {
			attest<string>(out)
		}
	})

	it("allows", () => {
		const t = type("number%2")
		const data: unknown = 4
		if (t.allows(data)) {
			// narrows correctly
			attest<number>(data)
		} else {
			throw new Error()
		}
		attest(t.allows(5)).equals(false)
	})

	// TODO: ?
	it("errors can be thrown", () => {
		const t = type("number")
		try {
			const result = t("invalid")
			attest(result instanceof type.error && result.throw())
		} catch (e) {
			attest(e instanceof ArkError).equals(true)
			return
		}
		throw new AssertionError({ message: "Expected to throw" })
	})
})
