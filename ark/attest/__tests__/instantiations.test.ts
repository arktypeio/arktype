import { attest, contextualize } from "@arktype/attest"
import { type } from "arktype"
import { it } from "mocha"

contextualize(() => {
	it("Inline instantiations", () => {
		type("string")
		attest.instantiations([1968, "instantiations"])
	})
})
