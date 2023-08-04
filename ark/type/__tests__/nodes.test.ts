import { attest } from "@arktype/attest"
import { node } from "arktype"
import { suite, test } from "mocha"

suite("nodes", () => {
	// TODO: add tests for other node kinds if we keep this design
	test("cached", () => {
		attest(node({ basis: "string" })).is(node({ basis: "string" }))
	})
})
