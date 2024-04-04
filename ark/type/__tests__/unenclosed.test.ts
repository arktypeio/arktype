import { attest } from "@arktype/attest"
import { writeUnresolvableMessage } from "@arktype/schema"
import { writeMalformedNumericLiteralMessage } from "@arktype/util"
import { scope, type } from "arktype"

describe("parse unenclosed", () => {
	describe("identifier", () => {
		it("keyword", () => {
			attest<string>(type("string").infer)
		})
		it("alias", () => {
			const a = scope({ a: "string" }).type("a")
			attest<string>(a.infer)
		})
		describe("errors", () => {
			it("unresolvable", () => {
				// @ts-expect-error
				attest(() => type("HUH")).throwsAndHasTypeError(
					writeUnresolvableMessage("HUH")
				)
			})
		})
	})
	describe("number", () => {
		describe("positive", () => {
			it("whole", () => {
				const four = type("4")
				attest<4>(four.infer)
				// attest(four.node).snap({ number: { value: 4 } })
			})
			it("decimal", () => {
				attest<3.14159>(type("3.14159").infer)
			})
			it("decimal with zero whole portion", () => {
				attest<0.5>(type("0.5").infer)
			})
		})
		describe("negative", () => {
			it("whole", () => {
				attest<-12>(type("-12").infer)
			})
			it("decimal", () => {
				attest<-1.618>(type("-1.618").infer)
			})
			it("decimal with zero whole portion", () => {
				attest<-0.001>(type("-0.001").infer)
			})
		})
		it("zero", () => {
			attest<0>(type("0").infer)
		})
		describe("errors", () => {
			it("multiple decimals", () => {
				// @ts-expect-error
				attest(() => type("127.0.0.1")).throwsAndHasTypeError(
					writeUnresolvableMessage("127.0.0.1")
				)
			})
			it("with alpha", () => {
				// @ts-expect-error
				attest(() => type("13three7")).throwsAndHasTypeError(
					writeUnresolvableMessage("13three7")
				)
			})
			it("leading zeroes", () => {
				// @ts-expect-error
				attest(() => type("010")).throwsAndHasTypeError(
					writeMalformedNumericLiteralMessage("010", "number")
				)
			})
			it("trailing zeroes", () => {
				// @ts-expect-error
				attest(() => type("4.0")).throws(
					writeMalformedNumericLiteralMessage("4.0", "number")
				)
			})
			it("negative zero", () => {
				// @ts-expect-error
				attest(() => type("-0")).throws(
					writeMalformedNumericLiteralMessage("-0", "number")
				)
			})
		})
	})
	describe("bigint", () => {
		it("positive", () => {
			const t = type("12345678910987654321n")
			// Is prime :D
			attest<12345678910987654321n>(t.infer)
			attest(t.json).snap({ unit: "12345678910987654321n" })
		})
		it("negative", () => {
			const t = type("-9801n")
			attest<-9801n>(t.infer)
			attest(t.json).snap({ unit: "-9801n" })
		})
		it("zero", () => {
			const t = type("0n")
			attest<0n>(t.infer)
			attest(t.json).snap({ unit: "0n" })
		})
		describe("errors", () => {
			it("decimal", () => {
				// @ts-expect-error
				attest(() => type("999.1n")).throwsAndHasTypeError(
					writeUnresolvableMessage("999.1n")
				)
			})

			it("leading zeroes", () => {
				// TS currently doesn't try to infer this as bigint even
				// though it matches our rules for a "malformed" integer.
				// @ts-expect-error
				attest(() => type("007n"))
					.throws(
						writeMalformedNumericLiteralMessage("007n", "bigint")
					)
					.type.errors(writeUnresolvableMessage("007n"))
			})
			it("negative zero", () => {
				// @ts-expect-error
				attest(() => type("-0n")).throwsAndHasTypeError(
					writeMalformedNumericLiteralMessage("-0n", "bigint")
				)
			})
		})
	})
})
