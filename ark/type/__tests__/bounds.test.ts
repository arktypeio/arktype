import { attest, contextualize } from "@arktype/attest"
import {
	internalKeywords,
	keywordNodes,
	rawRoot,
	writeInvalidOperandMessage,
	writeUnboundableMessage
} from "@arktype/schema"
import { writeMalformedNumericLiteralMessage } from "@arktype/util"
import { type } from "arktype"
import { writeDoubleRightBoundMessage } from "../parser/semantic/bounds.js"
import {
	writeMultipleLeftBoundsMessage,
	writeOpenRangeMessage,
	writeUnpairableComparatorMessage
} from "../parser/string/reduce/shared.js"
import {
	singleEqualsMessage,
	writeInvalidLimitMessage
} from "../parser/string/shift/operator/bounds.js"

contextualize(
	"string expressions",
	() => {
		it(">", () => {
			const t = type("number>0")
			attest<number>(t.infer)
			attest(t).type.toString.snap("Type<moreThan<0>, {}>")
			attest(t.json).snap({
				domain: "number",
				min: { exclusive: true, rule: 0 }
			})
		})

		it("<", () => {
			const t = type("number<10")
			attest<number>(t.infer)
			attest(t).type.toString.snap("Type<lessThan<10>, {}>")
			const expected = rawRoot({
				domain: "number",
				max: { rule: 10, exclusive: true }
			})
			attest(t.json).equals(expected.json)
		})

		it("<=", () => {
			const t = type("number<=-49")
			attest<number>(t.infer)
			attest(t).type.toString.snap("Type<atMost<-49>, {}>")
			const expected = rawRoot({
				domain: "number",
				max: { rule: -49, exclusive: false }
			})
			attest(t.json).equals(expected.json)
		})

		it("==", () => {
			const t = type("number==3211993")
			attest<3211993>(t.infer)
			attest(t).type.toString.snap("Type<3211993, {}>")
			const expected = rawRoot({ unit: 3211993 })
			attest(t.json).equals(expected.json)
		})

		it("<,<=", () => {
			const t = type("-5<number<=5")
			attest(t).type.toString.snap("Type<is<MoreThan<-5> & AtMost<5>>, {}>")
			attest<number>(t.infer)
			const expected = rawRoot({
				domain: "number",
				min: { rule: -5, exclusive: true },
				max: 5
			})
			attest(t.json).equals(expected.json)
		})

		it("<=,<", () => {
			const t = type("-3.23<=number<4.654")
			attest(t).type.toString.snap(
				"Type<is<AtLeast<-3.23> & LessThan<4.654>>, {}>"
			)
			attest<number>(t.infer)
			const expected = rawRoot({
				domain: "number",
				min: { rule: -3.23 },
				max: { rule: 4.654, exclusive: true }
			})
			attest(t.json).equals(expected.json)
		})

		it("whitespace following comparator", () => {
			const t = type("number > 3")
			attest(t).type.toString.snap("Type<moreThan<3>, {}>")
			attest<number>(t.infer)
			const expected = rawRoot({
				domain: "number",
				min: { rule: 3, exclusive: true }
			})
			attest(t.json).equals(expected.json)
		})

		it("single Date", () => {
			const t = type("Date<d'2023/1/12'")
			attest<Date>(t.infer)
			attest(t).type.toString.snap('Type<before<"2023/1/12">, {}>')
			attest(t.json).snap({
				proto: "Date",
				before: { exclusive: true, rule: "2023-01-12T05:00:00.000Z" }
			})
		})

		it("Date equality", () => {
			const t = type("Date==d'2020-1-1'")
			attest<Date>(t.infer)
			attest(t).type.toString.snap('Type<literal<"2020-1-1">, {}>')
			attest(t.json).snap({ unit: "2020-01-01T05:00:00.000Z" })
			attest(t.allows(new Date("2020/01/01"))).equals(true)
			attest(t.allows(new Date("2020/01/02"))).equals(false)
		})

		it("double Date", () => {
			const t = type("d'2001/10/10'<Date<d'2005/10/10'")
			attest<Date>(t.infer)
			attest(t).type.toString.snap(
				'Type<is<After<"2001/10/10"> & Before<"2005/10/10">>, {}>'
			)
			attest(t.json).snap({
				proto: "Date",
				before: { exclusive: true, rule: "2005-10-10T04:00:00.000Z" },
				after: { exclusive: true, rule: "2001-10-10T04:00:00.000Z" }
			})
			attest(t.allows(new Date("2003/10/10"))).equals(true)
			attest(t.allows(new Date("2001/10/10"))).equals(false)
			attest(t.allows(new Date("2005/10/10"))).equals(false)
		})

		it("dynamic Date", () => {
			const now = new Date()
			const t = type(`d'2000'<Date<=d'${now.toISOString()}'`)
			attest<Date>(t.infer)
			attest(t).type.toString.snap(
				'Type<is<After<"2000"> & AtOrBefore<string>>, {}>'
			)
			attest(t.allows(new Date(now.valueOf() - 1000))).equals(true)
			attest(t.allows(now)).equals(true)
			attest(t.allows(new Date(now.valueOf() + 1000))).equals(false)
		})

		it("single equals", () => {
			// @ts-expect-error
			attest(() => type("string=5")).throwsAndHasTypeError(singleEqualsMessage)
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
				"ParseError: Intersection of <2 and >=3 results in an unsatisfiable type"
			)
		})

		it("double right bound", () => {
			// @ts-expect-error
			attest(() => type("number>0<=200")).type.errors(
				writeDoubleRightBoundMessage("number")
			)
		})

		it("non-narrowed bounds", () => {
			const a = 5 as number
			const b = 7 as number
			const t = type(`${a}<number<${b}`)
			attest<number>(t.infer)
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
			attest<-3.14159>(type("number==-3.14159").infer)
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
				type("(number | string | boolean[])>0")
			).throwsAndHasTypeError(
				writeUnboundableMessage("number | string | boolean[]")
			)
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

		it("same bound kind union", () => {
			const t = type("1<(number[]|object[])<10")
			attest<number[] | object[]>(t.infer)
			const expected = type("1<number[]<10 | 1<object[]<10")
			attest(t.json).equals(expected.json)
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
	},
	"constrain",
	() => {
		it("min", () => {
			const t = type("number").constrain("min", 5)
			const expected = type("number>=5")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("max", () => {
			const t = type("number").constrain("max", 10)
			const expected = type("number<=10")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("minLength", () => {
			const t = type("string").constrain("minLength", 5)
			const expected = type("string>=5")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("maxLength", () => {
			const t = type("string").constrain("maxLength", 10)
			const expected = type("string<=10")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("after", () => {
			const t = type("Date").constrain("after", new Date("2022-01-01"))
			// widen the input to a string so both are non-narrowed
			const expected = type(`Date>=d'${"2022-01-01" as string}'`)
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("before", () => {
			const t = type("Date").constrain("before", 5)
			const expected = type("Date<=5")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("exclusive", () => {
			const t = type("number").constrain("min", {
				rule: 1337,
				exclusive: true
			})
			const expected = type("number>1337")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})
	},
	"chained",
	() => {
		it("atLeast", () => {
			const t = type("number").atLeast(5)
			const expected = type("number>=5")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("invalid min operand", () => {
			// @ts-expect-error
			attest(() => type("string").atLeast(5)).throwsAndHasTypeError(
				writeInvalidOperandMessage(
					"min",
					keywordNodes.number,
					keywordNodes.string
				)
			)
		})

		it("moreThan", () => {
			const t = type("number").moreThan(5)
			const expected = type("number>5")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("atMost", () => {
			const t = type("number").atMost(10)
			const expected = type("number<=10")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("lessThan", () => {
			const t = type("number").lessThan(10)
			const expected = type("number<10")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("invalid max operand", () => {
			// @ts-expect-error
			attest(() => type("string").lessThan(5)).throwsAndHasTypeError(
				writeInvalidOperandMessage(
					"max",
					keywordNodes.number,
					keywordNodes.string
				)
			)
		})

		it("atLeastLength", () => {
			const t = type("string").atLeastLength(5)
			const expected = type("string>=5")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("moreThanLength", () => {
			const t = type("string[]").moreThanLength(5)
			const expected = type("string[]>5")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("invalid minLength operand", () => {
			// @ts-expect-error
			attest(() => type("bigint").atLeastLength(5)).throwsAndHasTypeError(
				writeInvalidOperandMessage(
					"minLength",
					internalKeywords.lengthBoundable,
					keywordNodes.bigint
				)
			)
		})

		it("atMostLength", () => {
			const t = type("string").atMostLength(10)
			const expected = type("string<=10")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("lessThanLength", () => {
			const t = type("string[]").lessThanLength(10)
			const expected = type("string[]<10")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("invalid maxLength operand", () => {
			// @ts-expect-error
			attest(() => type("null").lessThanLength(5)).throwsAndHasTypeError(
				writeInvalidOperandMessage(
					"maxLength",
					internalKeywords.lengthBoundable,
					keywordNodes.null
				)
			)
		})

		it("atOrAfter", () => {
			const t = type("Date").atOrAfter(new Date("2022-01-01"))
			// widen the input to a string so both are non-narrowed
			const expected = type(`Date>=d'${"2022-01-01" as string}'`)
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("laterThan", () => {
			const t = type("Date").laterThan(new Date("2022-01-01"))
			const expected = type(`Date>d'${"2022-01-01" as string}'`)
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("invalid after operand", () => {
			// @ts-expect-error
			attest(() => type("false").laterThan(new Date())).throwsAndHasTypeError(
				writeInvalidOperandMessage(
					"after",
					keywordNodes.Date,
					keywordNodes.false
				)
			)
		})

		it("atOrBefore", () => {
			const t = type("Date").atOrBefore(5)
			const expected = type("Date<=5")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("earlierThan", () => {
			const t = type("Date").earlierThan(5)
			const expected = type("Date<5")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("invalid before operand", () => {
			attest(() =>
				// @ts-expect-error
				type("unknown").atOrBefore(new Date())
			).throwsAndHasTypeError(
				writeInvalidOperandMessage(
					"before",
					keywordNodes.Date,
					keywordNodes.unknown
				)
			)
		})
	}
)
