import { attest, contextualize } from "@ark/attest"
import {
	intrinsic,
	rootSchema,
	writeInvalidLengthBoundMessage,
	writeInvalidOperandMessage,
	writeUnboundableMessage
} from "@ark/schema"
import { writeMalformedNumericLiteralMessage } from "@ark/util"
import { scope, type } from "arktype"
import { writeDoubleRightBoundMessage } from "arktype/internal/parser/ast/bounds.ts"
import {
	writeMultipleLeftBoundsMessage,
	writeOpenRangeMessage,
	writeUnpairableComparatorMessage
} from "arktype/internal/parser/reduce/shared.ts"
import { writeMissingRightOperandMessage } from "arktype/internal/parser/shift/operand/unenclosed.ts"
import { writeInvalidLimitMessage } from "arktype/internal/parser/shift/operator/bounds.ts"
import { writeUnexpectedCharacterMessage } from "arktype/internal/parser/shift/operator/operator.ts"

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

		it("length named in actual when text replaces the bound's", () => {
			const Password = type("string >= 8").describe("a strong password")
			attest(Password("x").toString()).snap(
				"must be a strong password (was length 1)"
			)
			attest(Password("").toString()).snap("must be a strong password")
			const Pair = type("string[] == 2").configure({ expected: "a pair" })
			attest(Pair(["a"]).toString()).snap("must be a pair (was length 1)")
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

		it("range expression parses back", () => {
			const T = type("-5<number<=5")
			attest(T.expression).snap("-5 < number <= 5")
			attest(type.raw(T.expression).json).equals(T.json)
		})

		it("range around another refinement parses back", () => {
			const T = type("(1 <= number <= 5) % 2")
			attest(T.expression).snap("1 <= number % 2 <= 5")
			attest(type.raw(T.expression).json).equals(T.json)
		})

		it("range around intersected patterns parses back", () => {
			const T = type("1 <= (/a/ & /b/) <= 5")
			attest(T.expression).snap("1 <= (/a/ & /b/) <= 5")
			attest(type.raw(T.expression).json).equals(T.json)
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
				"a Date and January 1, 2023 or later"
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

		// https://github.com/arktypeio/arktype/issues/1213
		it("missing right operand", () => {
			// @ts-expect-error
			attest(() => type("number >=")).throwsAndHasTypeError(
				writeMissingRightOperandMessage(">=")
			)
		})

		it("missing operand after a left bound", () => {
			// @ts-expect-error
			attest(() => type("5 <")).throws(writeMissingRightOperandMessage("<"))
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
			attest(() => type("number>0<=200")).throwsAndHasTypeError(
				writeDoubleRightBoundMessage("number")
			)
			// @ts-expect-error
			attest(() => type("number < 5 < 6")).throwsAndHasTypeError(
				writeDoubleRightBoundMessage("number")
			)
			// @ts-expect-error
			attest(() => type("number != 3 == 4")).throwsAndHasTypeError(
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

	it("limit String writes with an exponent", () => {
		const T = type("number").moreThan(1e-7)
		attest(T.expression).snap("number > 0.0000001")
		attest(type.raw(T.expression).json).equals(T.json)
	})

	describe("!=", () => {
		it("number", () => {
			const T = type("number != 0")
			attest<number>(T.infer)
			attest(T).type.toString.snap("Type<number, {}>")
			attest(T.json).snap({ domain: "number", notEqual: [0] })
			attest(T.expression).snap("number != 0")
			attest(T(1)).equals(1)
			attest(T(0).toString()).snap("must be other than 0 (was 0)")
		})

		it("length", () => {
			const T = type("string != 3")
			attest<string>(T.infer)
			attest(T.json).snap({ domain: "string", notEqualLength: [3] })
			attest(T("ab")).equals("ab")
			attest(T("abc").toString()).snap("must be other than length 3 (was 3)")
		})

		it("array length", () => {
			const T = type("string[] != 2")
			attest<string[]>(T.infer)
			attest(T.expression).snap("string[] != 2")
			attest(T(["a", "b"]).toString()).snap(
				"must be other than length 2 (was 2)"
			)
		})

		it("zero length is non-empty", () => {
			attest(type("string != 0").json).equals(type("string > 0").json)
		})

		it("Date", () => {
			const T = type("Date != d'2000-05-03'")
			attest<Date>(T.infer)
			attest(T.expression).snap("Date != d'2000-05-03T00:00:00.000Z'")
			attest(T(new Date("2000-05-04"))).instanceOf(Date)
			attest(T(new Date("2000-05-03")).toString()).snap(
				"must be other than May 3, 2000 (was May 3, 2000)"
			)
		})

		it("numeric Date limit", () => {
			attest(type("Date != 0").json).equals(
				type("Date != d'1970-01-01T00:00:00.000Z'").json
			)
		})

		it("union of exclusive bounds at a value", () => {
			const T = type("number < 0 | number > 0")
			attest(T.json).equals(type("number != 0").json)
		})

		it("union of ranges meeting at a value", () => {
			const T = type("0 < number < 5 | 5 < number < 10")
			attest(T.expression).snap("0 < number < 10 & number != 5")
			attest(type("0 < number < 10 & number != 5").json).equals(T.json)
		})

		it("union of ranges excluding several values", () => {
			const T = type("number < 0 | 0 < number < 5 | number > 5")
			attest(T.json).equals(type("number != 0 & number != 5").json)
		})

		it("union of bounds at different values", () => {
			const T = type("number < 0 | number > 1")
			attest(T.expression).snap("number < 0 | number > 1")
		})

		it("union of overlapping bounds", () => {
			attest(type("number > 0 | number < 5").json).equals(type("number").json)
			attest(type("number > 0 | number < 5").equals(type.number)).equals(true)
		})

		it("union of adjacent length bounds", () => {
			attest(type("string >= 3 | string <= 2").json).equals(type("string").json)
		})

		it("union of length bounds at different lengths", () => {
			const T = type("string >= 5 | string <= 2")
			attest(T.expression).snap("string <= 2 | string >= 5")
		})

		it("union of touching Date bounds", () => {
			attest(type("Date >= d'2000-05-03' | Date < d'2000-05-03'").json).equals(
				type("Date").json
			)
		})

		it("union of overlapping bounds and a subtype", () => {
			attest(type("number > 0 | number < 5 | number.integer").json).equals(
				type("number").json
			)
		})

		it("union of Date bounds at a Date", () => {
			const T = type("Date < d'2000-05-03' | Date > d'2000-05-03'")
			attest(T.json).equals(type("Date != d'2000-05-03'").json)
		})

		it("union of bounds allowing NaN", () => {
			const nanable = { domain: "number", numberAllowsNaN: true } as const
			const T = rootSchema([
				{ domain: nanable, max: { rule: 0, exclusive: true } },
				{ domain: nanable, min: { rule: 0, exclusive: true } }
			])
			attest(T.branches.length).equals(2)
			attest(T.allows(Number.NaN)).equals(false)
		})

		it("union of overlapping Date bounds allowing invalid Dates", () => {
			const proto = { proto: Date, dateAllowsInvalid: true } as const
			const T = rootSchema([
				{ proto, after: new Date(0) },
				{ proto, before: new Date(5) }
			])
			attest(T.branches.length).equals(2)
			attest(T.allows(new Date("!"))).equals(false)
		})

		it("intersection with an excluding bound", () => {
			attest(type("number != 0 & number > 0").json).equals(
				type("number > 0").json
			)
		})

		it("intersection with an including bound", () => {
			const T = type("number != 0 & number > -1")
			attest(T.expression).snap("number > -1 & number != 0")
			attest(type.raw(T.expression).json).equals(T.json)
		})

		it("intersection with a bound at the value", () => {
			attest(type("number >= 0 & number != 0").json).equals(
				type("number > 0").json
			)
			attest(type("string <= 3 & string != 3").json).equals(
				type("string <= 2").json
			)
			attest(type("Date >= d'2000-05-03' & Date != d'2000-05-03'").json).equals(
				type("Date > d'2000-05-03'").json
			)
		})

		it("intersection with an excluding divisor", () => {
			attest(type("number % 2 & number != 1").json).equals(
				type("number % 2").json
			)
		})

		it("intersection with the value", () => {
			attest(() => type("number != 5 & number == 5")).throws.snap(
				"ParseError: Intersection of != 5 and 5 results in an unsatisfiable type"
			)
			attest(() => type("string == 3 & string != 3")).throws.snap(
				"ParseError: Intersection of == 3 and != 3 results in an unsatisfiable type"
			)
		})

		it("intersection with the same value", () => {
			attest(type("number != 5 & number != 5").json).equals(
				type("number != 5").json
			)
		})

		it("intersection with another value", () => {
			const T = type("number != 10 & number != 2")
			attest(T.json).snap({ domain: "number", notEqual: [2, 10] })
			attest(T.json).equals(type("number != 2 & number != 10").json)
			attest(T.expression).snap("number != 2 & number != 10")
		})

		it("subtype", () => {
			attest(type("number > 0").extends(type("number != 0"))).equals(true)
			attest(type("number").extends(type("number != 0"))).equals(false)
		})

		it("JSON Schema", () => {
			attest(type("0 <= number < 10 & number != 5").toJsonSchema()).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "number",
				exclusiveMaximum: 10,
				minimum: 0,
				not: { const: 5 }
			})
			attest(type("number != 2 & number != 5").toJsonSchema()).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "number",
				not: { enum: [2, 5] }
			})
		})

		it("length JSON Schema", () => {
			attest(type("string != 3").toJsonSchema()).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "string",
				not: { type: "string", minLength: 3, maxLength: 3 }
			})
			attest(type("unknown[] != 1 & unknown[] != 3").toJsonSchema()).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "array",
				not: {
					anyOf: [
						{ type: "array", minItems: 1, maxItems: 1 },
						{ type: "array", minItems: 3, maxItems: 3 }
					]
				}
			})
		})

		it("alias with !", () => {
			const $ = scope({ "a!b": "number", T: "a!b != 0" }).export()
			attest($.T.json).equals(type("number != 0").json)
		})

		it("left bound", () => {
			// @ts-expect-error
			attest(() => type("0 != number")).throwsAndHasTypeError(
				writeUnpairableComparatorMessage("!=")
			)
		})

		it("paired with a left bound", () => {
			// @ts-expect-error
			attest(() => type("3 < number != 5")).throwsAndHasTypeError(
				writeUnpairableComparatorMessage("!=")
			)
		})

		it("missing =", () => {
			// @ts-expect-error
			attest(() => type("(number)!0")).throwsAndHasTypeError(
				writeUnexpectedCharacterMessage("!")
			)
		})

		it("unboundable", () => {
			// @ts-expect-error
			attest(() => type("boolean != 0")).throwsAndHasTypeError(
				writeUnboundableMessage("boolean")
			)
		})

		it("Date limit on number", () => {
			// @ts-expect-error
			attest(() => type("number!=d'2001-01-01'")).throwsAndHasTypeError(
				writeInvalidLimitMessage("!=", "d'2001-01-01'", "right")
			)
		})

		it("non-literal limit", () => {
			// @ts-expect-error
			attest(() => type("number!=string")).throwsAndHasTypeError(
				writeInvalidLimitMessage("!=", "string", "right")
			)
		})
	})

	describe("range unions", () => {
		it("adjacent", () => {
			attest(type("1 < number < 10 | 10 <= number < 100").json).equals(
				type("1 < number < 100").json
			)
		})

		it("overlapping", () => {
			attest(type("0 < number < 10 | 5 < number < 20").json).equals(
				type("0 < number < 20").json
			)
		})

		it("wider gap", () => {
			const T = type("0 < number < 5 | 6 < number < 10")
			attest(T.expression).snap("6 < number < 10 | 0 < number < 5")
		})

		it("excluded value the other includes", () => {
			attest(
				type("0 <= number < 10 & number != 5 | 4 < number < 6").json
			).equals(type("0 <= number < 10").json)
		})

		it("excluded values neither includes", () => {
			attest(
				type("0 <= number < 10 & number != 5 | 6 < number < 20 & number != 15")
					.json
			).equals(type("0 <= number < 20 & number != 5 & number != 15").json)
		})

		it("half-line excluding a value", () => {
			attest(type("number < 0 | number >= 0 & number != 3").json).equals(
				type("number != 3").json
			)
		})

		it("adjacent lengths", () => {
			attest(type("2 <= string <= 4 | 5 <= string <= 8").json).equals(
				type("2 <= string <= 8").json
			)
		})

		it("exact lengths one apart", () => {
			attest(type("string == 3 | string == 4").json).equals(
				type("3 <= string <= 4").json
			)
		})

		it("exact lengths further apart", () => {
			const T = type("string == 3 | string == 6")
			attest(T.expression).snap("string == 3 | string == 6")
		})

		it("overlapping Dates", () => {
			attest(
				type(
					"d'2000-01-01' <= Date <= d'2000-02-01' | d'2000-01-15' <= Date <= d'2000-03-01'"
				).json
			).equals(type("d'2000-01-01' <= Date <= d'2000-03-01'").json)
		})

		it("unit at a bound", () => {
			attest(type("number < 5 | number == 5").json).equals(
				type("number <= 5").json
			)
		})

		it("unit at an excluded value", () => {
			attest(type("number != 5 | number == 5").json).equals(type("number").json)
		})

		it("unit the rest excludes", () => {
			const T = type("number.integer < 5 | 5.5")
			attest(T.expression).snap("number % 1 < 5 | 5.5")
		})

		it("keep differing descriptions", () => {
			const T = type("number < -1")
				.describe("below -1")
				.or(type("number > -1").describe("above -1"))
			attest(T.expression).snap("number > -1 | number < -1")
			attest(T(-1).toString()).snap("must be above -1 or below -1 (was -1)")
		})

		it("keep a described unit", () => {
			const T = type("number > 0").or(type("0").describe("zero"))
			attest(T.expression).snap("number > 0 | 0")
			attest(T(-1).toString()).snap("must be positive or zero (was -1)")
		})

		it("keep a shared constraint's differing description", () => {
			const T = rootSchema([
				{
					domain: { domain: "number", meta: "real" },
					max: { rule: -1, exclusive: true }
				},
				{ domain: "number", min: { rule: -1, exclusive: true } }
			])
			attest(T.expression).snap("number > -1 | number < -1")
			attest(T.traverse("x")?.toString()).snap(
				"must be a number or real (was a string)"
			)
		})

		it("merge a shared description", () => {
			const T = type("number < -1")
				.describe("x")
				.or(type("number > -1").describe("x"))
			attest(T.expression).snap("number != -1")
			attest(T(-1).toString()).snap("must be x (was -1)")
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
