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

	it("string.numeric exponent", () => {
		attest(type("string.numeric")("5.7e-10")).equals("5.7e-10")
		attest(type("string.numeric.parse")("-1E+3")).equals(-1000)
		attest(type("string.numeric")("1e").toString()).snap(
			'must be a well-formed numeric string (was "1e")'
		)
	})

	it("string.numeric.parse rejects a string parsing to Infinity", () => {
		const parseNum = type("string.numeric.parse")
		attest(parseNum("-1e400").toString()).snap('must be finite (was "-1e400")')
		attest(parseNum("1e308")).equals(1e308)
		// the shortest string parsing to Infinity, and the longest too short to
		attest(parseNum("1e309").toString()).snap('must be finite (was "1e309")')
		attest(parseNum("9e99")).equals(9e99)
		attest(parseNum.in.toJsonSchema()).equals(
			type("string.numeric").toJsonSchema()
		)
	})

	// string.integer.parse reads digits, so an exponent isn't an integer string
	it("string.integer rejects exponents", () => {
		attest(type("string.integer")("1e3").toString()).snap(
			'must be a well-formed integer string (was "1e3")'
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
