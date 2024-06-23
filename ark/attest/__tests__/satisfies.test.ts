import { attest } from "../assert/attest.js"
import { contextualize } from "../utils.js"

contextualize(() => {
	it("can assert types", () => {
		attest({ foo: "bar" }).satisfies({ foo: "string" })

		attest(() => {
			attest({ foo: "bar" }).satisfies({ foo: "number" })
		}).throws("foo must be a number (was string)")
	})
})
