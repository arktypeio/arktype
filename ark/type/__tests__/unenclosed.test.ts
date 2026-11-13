import { attest, contextualize } from "@ark/attest"
import { writeUnresolvableMessage } from "@ark/schema"
import { writeMalformedNumericLiteralMessage } from "@ark/util"
import { scope, type } from "arktype"
import { foreignAliases } from "arktype/internal/parser/shift/operand/unresolvable.ts"

contextualize(() => {
	describe("identifier", () => {
		it("keyword", () => {
			attest<string>(type("string").infer)
		})

		it("alias", () => {
			const a = scope({ a: "string" }).type("a")
			attest<string>(a.infer)
		})

		it("unresolvable", () => {
			// @ts-expect-error
			attest(() => type("HUH")).throwsAndHasTypeError(
				writeUnresolvableMessage("HUH")
			)
		})

		it("unresolvable Object.prototype member", () => {
			// @ts-expect-error
			attest(() => type("toString")).throwsAndHasTypeError(
				writeUnresolvableMessage("toString")
			)
			// @ts-expect-error
			attest(() => type("string.toString")).throwsAndHasTypeError(
				writeUnresolvableMessage("string.toString")
			)
		})
	})

	describe("unresolvable hint", () => {
		it("a name from another library, at runtime and in the type error", () => {
			// @ts-expect-error
			attest(() => type("int")).throwsAndHasTypeError(
				"'int' is unresolvable. Did you mean 'number.integer'?"
			)
			// @ts-expect-error
			attest(() => type({ tags: "any[]" })).throwsAndHasTypeError(
				"'any' is unresolvable. Did you mean 'unknown.any'?"
			)
			// @ts-expect-error
			attest(() => type("string.datetime")).throwsAndHasTypeError(
				"'string.datetime' is unresolvable. Did you mean 'string.date.iso'?"
			)
		})

		it("every name from another library is unresolvable and suggests a definition that parses", () => {
			const unparsed = Object.entries(foreignAliases).flatMap(
				([name, suggested]) => {
					attest(() => type(name as never)).throws(
						`'${name}' is unresolvable. Did you mean '${suggested}'?`
					)
					try {
						type(suggested)
						return []
					} catch {
						return [suggested]
					}
				}
			)
			attest(unparsed).equals([])
		})

		it("an alias a typo is nearest to, where the type error suggests nothing", () => {
			const $ = scope({ user: { name: "string" } })
			// @ts-expect-error
			attest(() => $.type("usr[]"))
				.throws.snap("ParseError: 'usr' is unresolvable. Did you mean 'user'?")
				.type.errors.snap(
					"Argument of type '\"usr[]\"' is not assignable to parameter of type '\"'usr' is unresolvable​\"'."
				)
			// by case alone
			// @ts-expect-error
			attest(() => type("Uint8array")).throws.snap(
				"ParseError: 'Uint8array' is unresolvable. Did you mean 'Uint8Array'?"
			)
			// a swap of neighbors is one edit, which is all a name of four gets
			// @ts-expect-error
			attest(() => type("ture")).throws.snap(
				"ParseError: 'ture' is unresolvable. Did you mean 'true'?"
			)
		})

		it("a keyword in a submodule by its last name", () => {
			// @ts-expect-error
			attest(() => type("emial")).throws.snap(
				"ParseError: 'emial' is unresolvable. Did you mean 'string.email'?"
			)
			// @ts-expect-error
			attest(() => type("v4")).throws.snap(
				"ParseError: 'v4' is unresolvable. Did you mean 'string.ip.v4' or 'string.uuid.v4'?"
			)
		})

		it("a submodule's names for a name it lacks", () => {
			// @ts-expect-error
			attest(() => type("string.emial")).throws.snap(
				"ParseError: 'string.emial' is unresolvable. Did you mean 'string.email'?"
			)
			// @ts-expect-error
			attest(() => type("number.in")).throws.snap(
				"ParseError: 'number.in' is unresolvable. Did you mean 'number.integer'?"
			)
			// @ts-expect-error
			attest(() => type("string.date.time")).throws.snap(
				"ParseError: 'string.date.time' is unresolvable. 'string.date' has parse, iso, epoch."
			)
		})

		it("nothing for a malformed literal or a name near no alias", () => {
			// @ts-expect-error
			attest(() => type("12px")).throws.snap(
				"ParseError: '12px' is unresolvable"
			)
			// one edit from `Set`, which a name of two doesn't get
			// @ts-expect-error
			attest(() => type("St")).throws.snap("ParseError: 'St' is unresolvable")
			// @ts-expect-error
			attest(() => type("userId")).throws.snap(
				"ParseError: 'userId' is unresolvable"
			)
		})
	})

	describe("number", () => {
		it("positive whole", () => {
			const Four = type("4")
			attest<4>(Four.infer)
			attest(Four.json).snap({ unit: 4 })
		})

		it("positive decimal", () => {
			attest<3.14159>(type("3.14159").infer)
		})

		it("positive decimal with zero whole portion", () => {
			attest<0.5>(type("0.5").infer)
		})

		it("negative whole", () => {
			attest<-12>(type("-12").infer)
		})

		it("negative decimal", () => {
			attest<-1.618>(type("-1.618").infer)
		})

		it("negative decimal with zero whole portion", () => {
			attest<-0.001>(type("-0.001").infer)
		})

		it("zero", () => {
			attest<0>(type("0").infer)
		})

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

	describe("bigint", () => {
		it("positive", () => {
			const T = type("12345678910987654321n")
			// Is prime :D
			attest<12345678910987654321n>(T.infer)
			attest(T.json).snap({ unit: "12345678910987654321n" })
		})

		it("negative", () => {
			const T = type("-9801n")
			attest<-9801n>(T.infer)
			attest(T.json).snap({ unit: "-9801n" })
		})

		it("zero", () => {
			const T = type("0n")
			attest<0n>(T.infer)
			attest(T.json).snap({ unit: "0n" })
		})

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
				.throws(writeMalformedNumericLiteralMessage("007n", "bigint"))
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
