// Add a message when validation fails but mustBe and was serialize to the same value
//issue #622
/**
 * Especially relevant for "===" check for symbols with the same name or objects with
 * the same structure. Not sure if there are other cases where this would come up,
 *  but worth considering.
 */
import { attest } from "@arktype/attest"
import { type } from "arktype"
import { describe } from "mocha"

describe("Serializes to same value but not reference equal", () => {
	it("object", () => {
		const a = type("===", {})
		attest(a({}).toString()).snap("objects must be reference equal")
	})
	// it("symbol", () => {
	// 	const a = type("===", Symbol("symbol"))
	// 	attest(a(Symbol("symbol")).toString()).snap(
	// 		"must be Symbol(symbol) (was Symbol(symbol1))"
	// 	)
	// 	const b = Symbol("symbol")
	// 	const b1 = type("===", b)
	// 	attest(b1(Symbol("symbol"))).snap()
	// })
})
