import { attest, contextualize } from "@arktype/attest"
import { type } from "arktype"
import { it } from "mocha"

contextualize(() => {
	it("Inline instantiations", () => {
		const user = type({
			kind: "'admin'",
			"powers?": "string[]"
		})
			.or({
				kind: "'superadmin'",
				"superpowers?": "string[]"
			})
			.or({
				kind: "'pleb'"
			})
		attest.instantiations([7574, "instantiations"])
	})
})
