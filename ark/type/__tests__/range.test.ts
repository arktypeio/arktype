import { attest, contextualize } from "@ark/attest"
import {
	intrinsic,
	rootSchema,
	writeInvalidLengthBoundMessage,
	writeInvalidOperandMessage,
	writeUnboundableMessage
} from "@ark/schema"
import {
	writeInvalidDateMessage,
	writeMalformedNumericLiteralMessage
} from "@ark/util"
import { scope, type } from "arktype"
import { writeDoubleRightBoundMessage } from "arktype/internal/parser/ast/bounds.ts"
import {
	writeMultipleLeftBoundsMessage,
	writeOpenRangeMessage,
	writeUnpairableComparatorMessage
} from "arktype/internal/parser/reduce/shared.ts"
import { writeInvalidLimitMessage } from "arktype/internal/parser/shift/operator/bounds.ts"

contextualize(() => {
	describe("string expressions", () => {
		it(">", () => {
			const T = type("number>0")
			attest<number>(T.infer)
			attest(T).type.toString.snap("Type<number, {}>")
			attest(T.json).snap({
				domain: "number",
				min: { exclusive: true, rule: 0 }
			})
		})

		it("<", () => {
			const T = type("number<10")
			attest<number>(T.infer)
			attest(T).type.toString.snap("Type<number, {}>")
			const Expected = rootSchema({
				domain: "number",
				max: { rule: 10, exclusive: true }
			})
			attest(T.json).equals(Expected.json)
		})

		it("<=", () => {
			const T = type("number<=-49")
			attest<number>(T.infer)
			attest(T).type.toString.snap("Type<number, {}>")
			const Expected = rootSchema({
				domain: "number",
				max: { rule: -49, exclusive: false }
			})
			attest(T.json).equals(Expected.json)
		})

		it("==", () => {
			const T = type("number==3211993")
			attest<number>(T.infer)
			attest(T).type.toString.snap("Type<number, {}>")
			const Expected = rootSchema({ unit: 3211993 })
			attest(T.json).equals(Expected.json)
		})

		it("== length", () => {
			const T = type({ code: "string==6" })

			attest(T({ code: "123456" })).snap({ code: "123456" })
			attest(T({ code: "foo" }).toString()).snap(
				"code must be exactly length 6 (was 3)"
			)
		})

		it("== length from narrowing a length range", () => {
			const T = type("1 <= string <= 2").and("string >= 2")
			attest(T.expression).snap("string == 2")
			attest(T.allows("ab")).equals(true)
			attest(T.allows("a")).equals(false)

			const Arr = type("string[] <= 2")
				.and("string[] >= 1")
				.and("string[] >= 2")
			attest(Arr.json).equals(type("string[] == 2").json)
		})

		it("<,<=", () => {
			const T = type("-5<number<=5")
			attest(T).type.toString.snap("Type<number, {}>")
			attest<number>(T.infer)
			const Expected = rootSchema({
				domain: "number",
				min: { rule: -5, exclusive: true },
				max: 5
			})
			attest(T.json).equals(Expected.json)
		})

		it("<=,<", () => {
			const T = type("-3.23<=number<4.654")
			attest(T).type.toString.snap("Type<number, {}>")
			attest<number>(T.infer)
			const Expected = rootSchema({
				domain: "number",
				min: { rule: -3.23 },
				max: { rule: 4.654, exclusive: true }
			})
			attest(T.json).equals(Expected.json)
		})

		it("whitespace following comparator", () => {
			const T = type("number > 3")
			attest(T).type.toString.snap("Type<number, {}>")
			attest<number>(T.infer)
			const Expected = rootSchema({
				domain: "number",
				min: { rule: 3, exclusive: true }
			})
			attest(T.json).equals(Expected.json)
		})

		it("single Date", () => {
			const T = type("Date<d'2023-01-12'")
			attest<Date>(T.infer)
			attest(T).type.toString.snap("Type<Date, {}>")
			attest(T.json).snap({ proto: "Date", before: "2023-01-11T23:59:59.999Z" })
		})

		it("Date equality", () => {
			const T = type("Date==d'2020-01-01'")
			attest<Date>(T.infer)
			attest(T).type.toString.snap("Type<Date, {}>")
			attest(T.json).snap({ unit: "2020-01-01T00:00:00.000Z" })
			attest(T.allows(new Date("2020-01-01"))).equals(true)
			attest(T.allows(new Date("2020-01-02"))).equals(false)
		})

		it("double Date", () => {
			const T = type("d'2001-10-10'< Date < d'2005-10-10'")
			attest<Date>(T.infer)
			attest(T.t).type.toString.snap("Date")
			attest(T.json).snap({
				proto: "Date",
				before: "2005-10-09T23:59:59.999Z",
				after: "2001-10-10T00:00:00.001Z"
			})
			attest(T.allows(new Date("2003-10-10"))).equals(true)
			attest(T.allows(new Date("2001-10-10"))).equals(false)
			attest(T.allows(new Date("2005-10-10"))).equals(false)
		})

		it("Date bound descriptions", () => {
			attest(type("Date >= d'2023-01-01'").description).snap(
				"a Date and 2023 or later"
			)
			attest(type("Date >= d'2023-01-01T00:00-05:00'").description).snap(
				"a Date and January 1, 2023, 5:00 AM UTC or later"
			)
			attest(type("Date >= d'2023-01-01T14:30Z'").description).snap(
				"a Date and January 1, 2023, 2:30 PM UTC or later"
			)
		})

		it("Date unit alias left bound", () => {
			const $ = scope({
				start: type.unit(new Date("2000-01-01T05:00Z")),
				// @ts-expect-error
				T: "start < Date < d'2001-01-01'"
			})
			attest($.export().T.json).snap({
				proto: "Date",
				before: "2000-12-31T23:59:59.999Z",
				after: "2000-01-01T05:00:00.001Z"
			})
		})

		it("dynamic Date", () => {
			const now = new Date()
			const T = type(`d'2000'< Date <=d'${now.toISOString()}'`)
			attest<Date>(T.infer)
			attest(T).type.toString.snap("Type<Date, {}>")
			attest(T.allows(new Date(now.valueOf() - 1000))).equals(true)
			attest(T.allows(now)).equals(true)
			attest(T.allows(new Date(now.valueOf() + 1000))).equals(false)
		})

		it("exclusive length normalized", () => {
			const T = type("string > 0")
			const Expected = type("string >= 1")

			attest(T.expression).equals(Expected.expression)
		})

		it("trivially satisfied length normalized", () => {
			const T = type("string >= 0")
			const Expected = type("string")

			attest(T.expression).equals(Expected.expression)
		})

		it("invalid left comparator", () => {
			// @ts-expect-error
			attest(() => type("3>number<5")).throwsAndHasTypeError(
				writeUnpairableComparatorMessage(">")
			)
		})

		it("invalid right double-bound comparator", () => {
			// @ts-expect-error
			attest(() => type("3<number==5")).throwsAndHasTypeError(
				writeUnpairableComparatorMessage("==")
			)
		})

		it("unpaired left", () => {
			// @ts-expect-error temporarily disabled type snapshot as it is returning ''
			attest(() => type("3<number")).throws(writeOpenRangeMessage(3, ">"))
		})

		it("unpaired left group", () => {
			// @ts-expect-error
			attest(() => type("(-1<=number)")).throws(writeOpenRangeMessage(-1, ">="))
		})

		it("double left", () => {
			// @ts-expect-error
			attest(() => type("3<5<8")).throwsAndHasTypeError(
				writeMultipleLeftBoundsMessage(3, ">", 5, ">")
			)
		})

		it("empty range", () => {
			attest(() => type("3<=number<2")).throws.snap(
				"ParseError: Intersection of < 2 and >= 3 results in an unsatisfiable type"
			)
		})

		it("double right bound", () => {
			// @ts-expect-error
			attest(() => type("number>0<=200")).type.errors(
				writeDoubleRightBoundMessage("number")
			)
		})

		it("negative-length", () => {
			attest(() => type("string < 0")).throws(
				writeInvalidLengthBoundMessage("maxLength", -1)
			)
		})

		it("non-integer length", () => {
			attest(() => type("string >= 2.5")).throws(
				writeInvalidLengthBoundMessage("minLength", 2.5)
			)
		})

		it("non-narrowed bounds", () => {
			const a = 5 as number
			const b = 7 as number
			const T = type(`${a}<number<${b}`)
			attest<number>(T.infer)
		})

		it("fails at runtime on malformed right", () => {
			attest(() => type("number<07")).throws(
				writeMalformedNumericLiteralMessage("07", "number")
			)
		})

		it("fails at runtime on malformed lower", () => {
			attest(() => type("3.0<number<5")).throws(
				writeMalformedNumericLiteralMessage("3.0", "number")
			)
		})

		it("number", () => {
			attest<number>(type("number==-3.14159").infer)
		})

		it("string", () => {
			attest<string>(type("string<=5").infer)
		})

		it("array", () => {
			attest<boolean[]>(type("87<=boolean[]<89").infer)
		})

		it("multiple bound kinds", () => {
			attest(() =>
				// @ts-expect-error
				type("(number | boolean[])>0")
			)
				.throws(writeUnboundableMessage("number | boolean[]"))
				.type.errors(writeUnboundableMessage("boolean[] | number"))
		})

		it("unknown", () => {
			// @ts-expect-error
			attest(() => type("unknown<10")).throwsAndHasTypeError(
				writeUnboundableMessage("unknown")
			)
		})

		it("unboundable", () => {
			// @ts-expect-error
			attest(() => type("object>10")).throwsAndHasTypeError(
				writeUnboundableMessage("object")
			)
		})

		it("morph", () => {
			// @ts-expect-error
			attest(() => type("string.trim > 2"))
				.throws.snap(
					"ParseError: MinLength operand must be a string or an array (was a morph)"
				)
				.type.errors(
					"To constrain the output of string.trim, pipe like myMorph.to('number > 0').\\nTo constrain the input, intersect like myMorph.and('number > 0')."
				)
		})

		it("same bound kind union", () => {
			const T = type("1<(number[]|object[])<10")
			attest<number[] | object[]>(T.infer)
			const Expected = type("1<number[]<10 | 1<object[]<10")
			attest(T.json).equals(Expected.json)
		})

		it("number with right Date bound", () => {
			attest(() =>
				// @ts-expect-error
				type("number<d'2001-01-01'")
			).throwsAndHasTypeError(
				writeInvalidLimitMessage("<", "d'2001-01-01'", "right")
			)
		})

		it("number with left Date bound", () => {
			// @ts-expect-error
			attest(() => type("d'2001-01-01'<number<2")).throwsAndHasTypeError(
				writeInvalidLimitMessage(">", "d'2001-01-01'", "left")
			)
		})
	})

	describe("chained", () => {
		it("atLeast", () => {
			const T = type("number").atLeast(5)
			const Expected = type("number>=5")
			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
		})

		it("invalid min operand", () => {
			// @ts-expect-error
			attest(() => type("string").atLeast(5))
				.throws(
					writeInvalidOperandMessage("min", intrinsic.number, intrinsic.string)
				)
				.type.errors("Property 'atLeast' does not exist")
		})

		it("moreThan", () => {
			const T = type("number").moreThan(5)
			const Expected = type("number>5")
			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
		})

		it("atMost", () => {
			const T = type("number").atMost(10)
			const Expected = type("number<=10")
			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
		})

		it("lessThan", () => {
			const T = type("number").lessThan(10)
			const Expected = type("number<10")
			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
		})

		it("invalid max operand", () => {
			// @ts-expect-error
			attest(() => type("string").lessThan(5))
				.throws(
					writeInvalidOperandMessage("max", intrinsic.number, intrinsic.string)
				)
				.type.errors("Property 'lessThan' does not exist")
		})

		it("atLeastLength", () => {
			const T = type("string").atLeastLength(5)
			const Expected = type("string>=5")
			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
		})

		it("moreThanLength", () => {
			const T = type("string[]").moreThanLength(5)
			const Expected = type("string[]>5")
			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
		})

		it("invalid minLength operand", () => {
			// @ts-expect-error
			attest(() => type("bigint").atLeastLength(5))
				.throws(
					writeInvalidOperandMessage(
						"minLength",
						intrinsic.lengthBoundable,
						intrinsic.bigint
					)
				)
				.type.errors("Property 'atLeastLength' does not exist")
		})

		it("atMostLength", () => {
			const T = type("string").atMostLength(10)
			const Expected = type("string<=10")
			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
		})

		it("lessThanLength", () => {
			const T = type("string[]").lessThanLength(10)
			const Expected = type("string[]<10")
			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
		})

		it("invalid maxLength operand", () => {
			// @ts-expect-error
			attest(() => type("null").lessThanLength(5))
				.throws(
					writeInvalidOperandMessage(
						"maxLength",
						intrinsic.lengthBoundable,
						intrinsic.null
					)
				)
				.type.errors("Property 'lessThanLength' does not exist")
		})

		it("atOrAfter", () => {
			const T = type("Date").atOrAfter(new Date("2022-01-01"))
			// widen the input to a string so both are non-narrowed
			const Expected = type(`Date>=d'${"2022-01-01" as string}'`)
			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
		})

		it("laterThan", () => {
			const T = type("Date").laterThan(new Date("2022-01-01"))
			const Expected = type(`Date>d'${"2022-01-01" as string}'`)
			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
		})

		it("string Date limits", () => {
			const T = type("Date")
				.atOrAfter("2022-01-01")
				.earlierThan("2023-01-01T00:00+01:00")
			attest(T.json).snap({
				proto: "Date",
				after: "2022-01-01T00:00:00.000Z",
				before: "2022-12-31T22:59:59.999Z"
			})
			const U = type("Date").laterThan("0").atOrBefore("1000000")
			attest(U.json).snap({
				proto: "Date",
				after: "1970-01-01T00:00:00.001Z",
				before: "1970-01-01T00:16:40.000Z"
			})
			attest(() => type("Date").atOrBefore("01/02/2022")).throws(
				writeInvalidDateMessage("01/02/2022")
			)
			attest(() => type("Date").laterThan("2022-01-01T00:00")).throws(
				writeInvalidDateMessage("2022-01-01T00:00")
			)
		})

		it("invalid after operand", () => {
			// @ts-expect-error
			attest(() => type("false").laterThan(new Date()))
				.throws(
					writeInvalidOperandMessage("after", intrinsic.Date, intrinsic.false)
				)
				.type.errors("Property 'laterThan' does not exist")
		})

		it("atOrBefore", () => {
			const T = type("Date").atOrBefore(5)
			const Expected = type("Date<=5")
			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
		})

		it("earlierThan", () => {
			const T = type("Date").earlierThan(5)
			const Expected = type("Date<5")
			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
		})

		it("invalid before operand", () => {
			attest(() =>
				// @ts-expect-error
				type("unknown").atOrBefore(new Date())
			)
				.throws(
					writeInvalidOperandMessage(
						"before",
						intrinsic.Date,
						intrinsic.unknown
					)
				)
				.type.errors("Property 'atOrBefore' does not exist")
		})
	})

	it("unit overlap", () => {
		const five = type("5 <= number < 10").and("0 < number <= 5")

		attest(five.expression).equals("5")
	})
})
