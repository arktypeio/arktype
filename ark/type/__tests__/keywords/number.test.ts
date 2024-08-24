import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("integer", () => {
		const integer = type("number.integer")
		attest(integer(123)).equals(123)
		attest(integer("123").toString()).snap("must be a number (was a string)")
		attest(integer(12.12).toString()).snap("must be an integer (was 12.12)")
	})

	it("epoch", () => {
		const epoch = type("number.epoch")

		// valid
		attest(epoch(1621530000)).equals(1621530000)
		attest(epoch(8640000000000000)).equals(8640000000000000)
		attest(epoch(-8640000000000000)).equals(-8640000000000000)

		// invalid
		attest(epoch("foo").toString()).snap(
			"must be a number representing a Unix timestamp (was a string)"
		)
		attest(epoch(1.5).toString()).snap(
			"must be an integer representing a Unix timestamp (was 1.5)"
		)
		attest(epoch(-8640000000000001).toString()).snap(
			"must be a Unix timestamp after -8640000000000000 (was -8640000000000001)"
		)
		attest(epoch(8640000000000001).toString()).snap(
			"must be a Unix timestamp before 8640000000000000 (was 8640000000000001)"
		)
	})
})
