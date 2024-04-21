import { attest } from "@arktype/attest"
import { type } from "arktype"
import { describe, it } from "mocha"

type makeComplexType<S extends string> = S extends `${infer head}${infer tail}`
	? head | tail | makeComplexType<tail>
	: S

describe("instantiations", () => {
	it("Can give me instantiations", () => {
		type("string")
		attest.instantiations([4766, "instantiations"])
	})
})
