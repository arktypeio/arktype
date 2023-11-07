import { attest } from "@arktype/attest"
import { writeMalformedNumericLiteralMessage } from "@arktype/util"
import { scope, type } from "arktype"
import { suite, test } from "mocha"
import { writeUnresolvableMessage } from "../parser/string/shift/operand/unenclosed.js"

suite("parse unenclosed", () => {
	suite("identifier", () => {
		test("keyword", () => {
			attest<string>(type("string").infer)
		})
		test("alias", () => {
			const a = scope({ a: "string" }).type("a")
			attest<string>(a.infer)
		})
		suite("errors", () => {
			test("unresolvable", () => {
				// @ts-expect-error
				attest(() => type("HUH")).throwsAndHasTypeError(
					writeUnresolvableMessage("HUH")
				)
			})
		})
	})
	suite("number", () => {
		suite("positive", () => {
			test("whole", () => {
				const four = type("4")
				attest<4>(four.infer)
				// attest(four.node).snap({ number: { value: 4 } })
			})
			test("decimal", () => {
				attest<3.14159>(type("3.14159").infer)
			})
			test("decimal with zero whole portion", () => {
				attest<0.5>(type("0.5").infer)
			})
		})
		suite("negative", () => {
			test("whole", () => {
				attest<-12>(type("-12").infer)
			})
			test("decimal", () => {
				attest<-1.618>(type("-1.618").infer)
			})
			test("decimal with zero whole portion", () => {
				attest<-0.001>(type("-0.001").infer)
			})
		})
		test("zero", () => {
			attest<0>(type("0").infer)
		})
		suite("errors", () => {
			test("multiple decimals", () => {
				// @ts-expect-error
				attest(() => type("127.0.0.1")).throwsAndHasTypeError(
					writeUnresolvableMessage("127.0.0.1")
				)
			})
			test("with alpha", () => {
				// @ts-expect-error
				attest(() => type("13three7")).throwsAndHasTypeError(
					writeUnresolvableMessage("13three7")
				)
			})
			test("leading zeroes", () => {
				// @ts-expect-error
				attest(() => type("010")).throwsAndHasTypeError(
					writeMalformedNumericLiteralMessage("010", "number")
				)
			})
			test("trailing zeroes", () => {
				// @ts-expect-error
				attest(() => type("4.0")).throws(
					writeMalformedNumericLiteralMessage("4.0", "number")
				)
			})
			test("negative zero", () => {
				// @ts-expect-error
				attest(() => type("-0")).throws(
					writeMalformedNumericLiteralMessage("-0", "number")
				)
			})
		})
	})
	suite("bigint", () => {
		test("positive", () => {
			// Is prime :D
			attest<12345678910987654321n>(type("12345678910987654321n").infer)
		})
		test("negative", () => {
			attest<-9801n>(type("-9801n").infer)
		})
		test("zero", () => {
			attest<0n>(type("0n").infer)
		})
		suite("errors", () => {
			test("decimal", () => {
				// @ts-expect-error
				attest(() => type("999.1n")).throwsAndHasTypeError(
					writeUnresolvableMessage("999.1n")
				)
			})

			test("leading zeroes", () => {
				// TS currently doesn't try to infer this as bigint even
				// though it matches our rules for a "malformed" integer.
				// @ts-expect-error
				attest(() => type("007n"))
					.throws(writeMalformedNumericLiteralMessage("007n", "bigint"))
					.type.errors(writeUnresolvableMessage("007n"))
			})
			test("negative zero", () => {
				// @ts-expect-error
				attest(() => type("-0n")).throwsAndHasTypeError(
					writeMalformedNumericLiteralMessage("-0n", "bigint")
				)
			})
		})
	})
})
