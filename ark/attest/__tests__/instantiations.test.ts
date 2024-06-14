import { attest, contextualize } from "@arktype/attest"
import { type } from "arktype"
import { it } from "mocha"

contextualize(() => {
	it("inline", () => {
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
	it("fails on instantiations above threshold", () => {
		attest(() => {
			const user = type({
				foo: "0|1|2|3|4|5|6"
			})
			attest.instantiations([1, "instantiations"])
		}).throws("exceeded baseline by")
	})
})
