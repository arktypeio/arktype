import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("string.numeric", () => {
		const NumericString = type("string.numeric")
		attest(NumericString("5")).equals("5")
		attest(NumericString("5.5")).equals("5.5")
		attest(NumericString("five").toString()).snap(
			'must be a well-formed numeric string (was "five")'
		)
	})

	it("string.numeric.parse", () => {
		const parseNum = type("string.numeric.parse")
		attest(parseNum("5")).equals(5)
		attest(parseNum("5.5")).equals(5.5)
		attest(parseNum("five").toString()).snap(
			'must be a well-formed numeric string (was "five")'
		)
	})

	it("string.integer", () => {
		const IntegerString = type("string.integer")
		attest(IntegerString("5")).equals("5")
		attest(IntegerString("5.5").toString()).snap(
			'must be a well-formed integer string (was "5.5")'
		)
		attest(IntegerString("five").toString()).snap(
			'must be a well-formed integer string (was "five")'
		)
		attest(IntegerString(5).toString()).snap("must be a string (was a number)")
		// unsafe integers are allowed within strings as long as they are not parsed
		attest(IntegerString("9007199254740992")).equals("9007199254740992")
	})

	it("string.integer.parse", () => {
		const parseInt = type("string.integer.parse")
		attest(parseInt("5")).equals(5)
		attest(parseInt("5.5").toString()).snap(
			'must be a well-formed integer string (was "5.5")'
		)
		attest(parseInt("five").toString()).snap(
			'must be a well-formed integer string (was "five")'
		)
		attest(parseInt(5).toString()).snap("must be a string (was a number)")
		attest(parseInt("9007199254740992").toString()).snap(
			'must be an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER (was "9007199254740992")'
		)
	})
})
