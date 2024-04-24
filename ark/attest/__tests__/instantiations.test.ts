import { attest } from "@arktype/attest"
import { type } from "arktype"
import { describe, it } from "mocha"

describe("instantiations", () => {
	it("Can give me instantiations", () => {
		type("string")
		attest.instantiations([1923, "instantiations"])
	})
})
