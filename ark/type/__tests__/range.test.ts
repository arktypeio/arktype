import { attest, contextualize } from "@ark/attest"
import {
	intrinsic,
	rootSchema,
	writeInvalidLengthBoundMessage,
	writeInvalidOperandMessage,
	writeUnboundableMessage
} from "@ark/schema"
import { writeMalformedNumericLiteralMessage } from "@ark/util"
import { type } from "arktype"
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
			const T = type("Date<d'2023/1/12'")
			attest<Date>(T.infer)
			attest(T).type.toString.snap("Type<Date, {}>")
			attest(T.json).snap({ proto: "Date", before: "2023-01-12T04:59:59.999Z" })
		})

		it("Date equality", () => {
			const T = type("Date==d'2020-1-1'")
			attest<Date>(T.infer)
			attest(T).type.toString.snap("Type<Date, {}>")
			attest(T.json).snap({ unit: "2020-01-01T05:00:00.000Z" })
			attest(T.allows(new Date("2020/01/01"))).equals(true)
			attest(T.allows(new Date("2020/01/02"))).equals(false)
		})

		it("double Date", () => {
			const T = type("d'2001/10/10'< Date < d'2005/10/10'")
			attest<Date>(T.infer)
			attest(T.t).type.toString.snap("Date")
			attest(T.json).snap({
				proto: "Date",
				before: "2005-10-10T03:59:59.999Z",
				after: "2001-10-10T04:00:00.001Z"
			})
			attest(T.allows(new Date("2003/10/10"))).equals(true)
			attest(T.allows(new Date("2001/10/10"))).equals(false)
			attest(T.allows(new Date("2005/10/10"))).equals(false)
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

		it("File > (minSize exclusive)", () => {
			const T = type("File > 5MB")
			attest<File>(T.infer)
			attest(T).type.toString.snap("Type<File, {}>")
			attest(T.json).snap({
				proto: "File",
				minSize: { rule: 5000000, exclusive: true }
			})

			const smallFile = new File(["x".repeat(5000000)], "exact.txt")
			const validFile = new File(["x".repeat(5000001)], "valid.txt")

			attest(T(smallFile).toString()).snap(
				"must be more than 5MB (was 5000000 bytes)"
			)
			attest(T(validFile)).equals(validFile)
		})

		it("File >= (minSize inclusive)", () => {
			const T = type("File >= 5MB")
			attest<File>(T.infer)
			attest(T).type.toString.snap("Type<File, {}>")
			attest(T.json).snap({ proto: "File", minSize: 5000000 })

			const smallFile = new File(["x".repeat(1000000)], "small.txt")
			const validFile = new File(["x".repeat(5000000)], "valid.txt")

			attest(T(smallFile).toString()).snap(
				"must be at least 5MB (was 1000000 bytes)"
			)
			attest(T(validFile)).equals(validFile)
		})

		it("File < (maxSize exclusive)", () => {
			const T = type("File < 10MB")
			attest<File>(T.infer)
			attest(T).type.toString.snap("Type<File, {}>")
			attest(T.json).snap({
				proto: "File",
				maxSize: { rule: 10000000, exclusive: true }
			})

			const validFile = new File(["x".repeat(5000000)], "valid.txt")
			const exactFile = new File(["x".repeat(10000000)], "exact.txt")
			const largeFile = new File(["x".repeat(15000000)], "large.txt")

			attest(T(validFile)).equals(validFile)
			attest(T(exactFile).toString()).snap(
				"must be less than 10MB (was 10000000 bytes)"
			)
			attest(T(largeFile).toString()).snap(
				"must be less than 10MB (was 15000000 bytes)"
			)
		})

		it("File <= (maxSize inclusive)", () => {
			const T = type("File <= 10MB")
			attest<File>(T.infer)
			attest(T).type.toString.snap("Type<File, {}>")
			attest(T.json).snap({ proto: "File", maxSize: 10000000 })

			const validFile = new File(["x".repeat(10000000)], "valid.txt")
			const tooLargeFile = new File(["x".repeat(20000000)], "large.txt")

			attest(T(validFile)).equals(validFile)
			attest(T(tooLargeFile).toString()).snap(
				"must be at most 10MB (was 20000000 bytes)"
			)
		})

		it("File == (exact size)", () => {
			const T = type("File == 5MB")
			attest<File>(T.infer)
			attest(T).type.toString.snap("Type<File, {}>")

			const exactFile = new File(["x".repeat(5000000)], "exact.txt")
			const smallFile = new File(["x".repeat(4999999)], "small.txt")
			const largeFile = new File(["x".repeat(5000001)], "large.txt")

			attest(T(exactFile)).equals(exactFile)
			attest(T(smallFile).toString()).snap(
				"must be at least 5MB (was 4999999 bytes)"
			)
			attest(T(largeFile).toString()).snap(
				"must be at most 5MB (was 5000001 bytes)"
			)
		})

		it("File range with mixed bounds", () => {
			const T = type("1MB < File <= 10MB")
			attest<File>(T.infer)
			attest(T).type.toString.snap("Type<File, {}>")
			attest(T.json).snap({
				proto: "File",
				maxSize: 10000000,
				minSize: { rule: 1000000, exclusive: true }
			})

			const tooSmall = new File(["x".repeat(1000000)], "exact1MB.txt")
			const validSmall = new File(["x".repeat(1000001)], "valid1.txt")
			const validLarge = new File(["x".repeat(10000000)], "valid2.txt")
			const tooLarge = new File(["x".repeat(10000001)], "large.txt")

			attest(T(tooSmall).toString()).snap(
				"must be more than 1MB (was 1000000 bytes)"
			)
			attest(T(validSmall)).equals(validSmall)
			attest(T(validLarge)).equals(validLarge)
			attest(T(tooLarge).toString()).snap(
				"must be at most 10MB (was 10000001 bytes)"
			)
		})

		it("File range inclusive both sides", () => {
			const T = type("5KB <= File <= 20KB")
			attest<File>(T.infer)
			attest(T).type.toString.snap("Type<File, {}>")
			attest(T.json).snap({
				proto: "File",
				maxSize: 20000,
				minSize: 5000
			})

			const tooSmall = new File(["x".repeat(4999)], "small.txt")
			const validMin = new File(["x".repeat(5000)], "min.txt")
			const validMax = new File(["x".repeat(20000)], "max.txt")
			const tooLarge = new File(["x".repeat(20001)], "large.txt")

			attest(T(tooSmall).toString()).snap(
				"must be at least 5KB (was 4999 bytes)"
			)
			attest(T(validMin)).equals(validMin)
			attest(T(validMax)).equals(validMax)
			attest(T(tooLarge).toString()).snap(
				"must be at most 20KB (was 20001 bytes)"
			)
		})

		it("File with bytes unit", () => {
			const T = type("File >= 100B")
			attest<File>(T.infer)
			attest(T).type.toString.snap("Type<File, {}>")

			const validFile = new File(["x".repeat(100)], "valid.txt")
			const smallFile = new File(["x".repeat(50)], "small.txt")

			attest(T(validFile)).equals(validFile)
			attest(T(smallFile).toString()).snap(
				"must be at least 100 bytes (was 50 bytes)"
			)
		})

		it("size units resolve to SI byte counts", () => {
			// a size literal collapses to its canonical byte count, so equivalent
			// literals produce identical (deduplicated) constraints
			attest(type("File >= 10KB").json).snap({ proto: "File", minSize: 10000 })
			attest(type("File <= 1GB").json).snap({
				proto: "File",
				maxSize: 1000000000
			})
			attest(type("File >= 5TB").json).snap({
				proto: "File",
				minSize: 5000000000000
			})
			attest(type("File >= 5MB").equals(type("File >= 5000KB"))).equals(true)
			attest(type("File >= 5MB").equals(type("File >= 5000000"))).equals(true)
		})

		it("File with plain number (bytes)", () => {
			const T = type("File >= 1000")
			attest<File>(T.infer)
			attest(T).type.toString.snap("Type<File, {}>")
			attest(T.json).snap({ proto: "File", minSize: 1000 })

			const validFile = new File(["x".repeat(1000)], "valid.txt")
			const smallFile = new File(["x".repeat(500)], "small.txt")

			attest(T(validFile)).equals(validFile)
			// canonical byte count renders as the most compact unit
			attest(T(smallFile).toString()).snap(
				"must be at least 1KB (was 500 bytes)"
			)
		})

		it("File > 0 rejects empty files (formerly reduced away)", () => {
			const T = type("File > 0")
			attest<File>(T.infer)
			attest(T.json).snap({
				proto: "File",
				minSize: { rule: 0, exclusive: true }
			})

			const emptyFile = new File([], "empty.txt")
			const nonEmptyFile = new File(["x"], "data.txt")

			attest(T(emptyFile).toString()).snap(
				"must be positive size (was 0 bytes)"
			)
			attest(T(nonEmptyFile)).equals(nonEmptyFile)
		})

		it("fractional size literal rounds to exact bytes", () => {
			// 1.005 * 1000 === 1004.9999999999999 in IEEE-754; the bound must still
			// accept a file of exactly 1005 bytes
			const T = type("File <= 1.005KB")
			attest(T.json).snap({ proto: "File", maxSize: 1005 })
			attest(T(new File(["x".repeat(1005)], "f.txt")) instanceof File).equals(
				true
			)
		})

		it("File size bound must be a non-negative integer", () => {
			attest(() => type("File > -1")).throws.snap(
				"ParseError: minSize bound must be a non-negative integer (was -1)"
			)
			attest(() => type("File < 1.5")).throws.snap(
				"ParseError: maxSize bound must be a non-negative integer (was 1.5)"
			)
		})

		it("File with quoted string bound errors", () => {
			// @ts-expect-error a quoted string is not a valid size limit
			attest(() => type('File < "10MB"')).throws.snap(
				'ParseError: Comparator < must be followed by a corresponding literal (was  "10MB")'
			)
		})

		it("comparator whitespace is ignored", () => {
			const T = type("File >= 5MB")
			const TWithSpace = type("File >=5MB")
			attest(T.expression).equals(TWithSpace.expression)
		})

		it("File with Date bound should error", () => {
			// @ts-expect-error a date literal is not a valid size limit
			attest(() => type("File > d'2023/01/01'")).throws.snap(
				"ParseError: Comparator > must be followed by a corresponding literal (was  d'2023/01/01')"
			)
		})

		it("File empty range", () => {
			attest(() => type("10MB <= File < 5MB")).throws.snap(
				"ParseError: Intersection of < 5MB and >= 10MB results in an unsatisfiable type"
			)
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
			).throwsAndHasTypeError(writeUnboundableMessage("number | boolean[]"))
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
				type("number<d'2001/01/01'")
			).throwsAndHasTypeError(
				writeInvalidLimitMessage("<", "d'2001/01/01'", "right")
			)
		})

		it("number with left Date bound", () => {
			// @ts-expect-error
			attest(() => type("d'2001/01/01'<number<2")).throwsAndHasTypeError(
				writeInvalidLimitMessage(">", "d'2001/01/01'", "left")
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
