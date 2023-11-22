import { attest } from "@arktype/attest"
import type { BoundInner } from "@arktype/schema"
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
	writeInvalidLimitMessage,
	writeLimitMismatchMessage,
	writeUnboundableMessage
} from "../parser/string/shift/operator/bounds.js"

export const expectedBoundsCondition = (...bounds: BoundInner[]) => ""
// node("number", ...bounds).json

export const expectedDateBoundsCondition = (...bounds: BoundInner[]) => ""
// node(Date, ...bounds).json

describe("bounds", () => {
	describe("parse", () => {
		describe("single", () => {
			it(">", () => {
				const t = type("number>0")
				attest<number>(t.infer)
				attest(t.allows(-1)).equals(false)
				attest(t.allows(0)).equals(false)
				attest(t.allows(1)).equals(true)
			})
			// 	it("<", () => {
			// 		const t = type("number<10")
			// 		attest<number>(t.infer)
			// 		attest(t.json).equals(
			// 			expectedBoundsCondition({
			// 				limitKind: "max",
			// 				exclusive: true,
			// 				limit: 10
			// 			})
			// 		)
			// 	})
			// 	it("<=", () => {
			// 		const t = type("number<=-49")
			// 		attest<number>(t.infer)
			// 		attest(t.json).equals(
			// 			expectedBoundsCondition({
			// 				limitKind: "max",
			// 				exclusive: false,
			// 				limit: -49
			// 			})
			// 		)
			// 	})
			// 	it("==", () => {
			// 		const t = type("number==3211993")
			// 		attest<number>(t.infer)
			// 		attest(t.json).equals(
			// 			expectedBoundsCondition(
			// 				{
			// 					limitKind: "min",
			// 					exclusive: false,
			// 					limit: 3211993
			// 				},
			// 				{
			// 					limitKind: "max",
			// 					exclusive: false,
			// 					limit: 3211993
			// 				}
			// 			)
			// 		)
			// 	})
			// })
			// describe("double", () => {
			// 	it("<,<=", () => {
			// 		const t = type("-5<number<=5")
			// 		attest<number>(t.infer)
			// 		attest(t.allows(-6)).equals(false)
			// 		attest(t.allows(-5)).equals(false)
			// 		attest(t.allows(-4)).equals(true)
			// 		attest(t.allows(4)).equals(true)
			// 		attest(t.allows(5)).equals(true)
			// 		attest(t.allows(5.01)).equals(false)
			// 		attest(t.json).equals(
			// 			expectedBoundsCondition(
			// 				{
			// 					limitKind: "min",
			// 					exclusive: true,
			// 					limit: -5
			// 				},
			// 				{
			// 					limitKind: "max",
			// 					exclusive: false,
			// 					limit: 5
			// 				}
			// 			)
			// 		)
			// 	})
			// 	it("<=,<", () => {
			// 		const t = type("-3.23<=number<4.654")
			// 		attest<number>(t.infer)
			// 		attest(t.json).equals(
			// 			expectedBoundsCondition(
			// 				{
			// 					limitKind: "min",
			// 					exclusive: false,
			// 					limit: -3.23
			// 				},
			// 				{
			// 					limitKind: "max",
			// 					exclusive: true,
			// 					limit: 4.654
			// 				}
			// 			)
			// 		)
			// 	})
			// })
			// it("whitespace following comparator", () => {
			// 	const t = type("number > 3")
			// 	attest<number>(t.infer)
			// 	attest(t.json).equals(
			// 		expectedBoundsCondition({ limitKind: "min", exclusive: true, limit: 3 })
			// 	)
		})
		describe("intersection", () => {
			describe("equality range", () => {
				it("equal", () => {
					attest(type("number==2&number==2").json).equals(
						type("number==2").json
					)
				})
				it("disjoint", () => {
					attest(() => type("number==2&number==3")).throws(
						"Intersection of exactly 2 and exactly 3 results in an unsatisfiable type"
					)
				})
				it("right equality range", () => {
					attest(type("number<4&number==2").json).equals(type("number==2").json)
				})
				it("left equality range", () => {
					attest(type("number==3&number>=3").json).equals(
						type("number==3").json
					)
				})
			})
			it("overlapping", () => {
				const expected = type("2<=number<3").json
				attest(type("number>=2&number<3").json).equals(expected)
				attest(type("2<=number<4&1<=number<3").json).equals(expected)
			})
			it("single value overlap", () => {
				attest(type("0<=number<=0").json).equals(type("number==0").json)
				attest(type("0<number<=1&1<=number<2").json).equals(
					type("number==1").json
				)
			})
			it("non-overlapping", () => {
				attest(() => type("number>3&number<=3")).throws(
					"Intersection of more than 3 and at most 3 results in an unsatisfiable type"
				)
				attest(() => type("-2<number<-1&1<number<2")).throws(
					"Intersection of the range bounded by more than -2 and less than -1 and the range bounded by more than 1 and less than 2 results in an unsatisfiable type"
				)
			})
			it("greater min is stricter", () => {
				const expected = type("number>=3").json
				attest(type("number>=3&number>2").json).equals(expected)
				attest(type("number>2&number>=3").json).equals(expected)
			})
			it("lesser max is stricter", () => {
				const expected = type("number<=3").json
				attest(type("number<=3&number<4").json).equals(expected)
				attest(type("number<4&number<=3").json).equals(expected)
			})
			it("exclusive wins if limits equal", () => {
				const expected = type("number<3").json
				attest(type("number<3&number<=3").json).equals(expected)
				attest(type("number<=3&number<3").json).equals(expected)
			})
		})

		describe("parse errors", () => {
			it("single equals", () => {
				// @ts-expect-error
				attest(() => type("string=5")).throwsAndHasTypeError(
					singleEqualsMessage
				)
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
				attest(() => type("(-1<=number)")).throws(
					writeOpenRangeMessage(-1, ">=")
				)
			})
			it("double left", () => {
				// @ts-expect-error
				attest(() => type("3<5<8")).throwsAndHasTypeError(
					writeMultipleLeftBoundsMessage(3, ">", 5, ">")
				)
			})
			it("empty range", () => {
				attest(() => type("3<=number<2")).throws(
					"Intersection of at least 3 and less than 2 results in an unsatisfiable type"
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
		})
		describe("semantic", () => {
			it("number", () => {
				attest<number>(type("number==-3.14159").infer)
			})
			it("string", () => {
				attest<string>(type("string<=5").infer)
			})
			it("array", () => {
				attest<boolean[]>(type("87<=boolean[]<89").infer)
			})
			it("multiple boundable categories", () => {
				const t = type("(string|boolean[]|number)>0")
				attest<string | boolean[] | number>(t.infer)
				const expected = type("string>0|boolean[]>0|number>0")
				attest(t.json).equals(expected.json)
			})

			describe("errors", () => {
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
				it("overlapping", () => {
					// @ts-expect-error
					attest(() => type("1<(number|object)<10"))
						.throws(writeUnboundableMessage("object"))
						// At compile time we don't have access to the specific branch that failed so we
						// summarize the expression
						.type.errors(writeUnboundableMessage("number | object"))
				})
				describe("invalid literal bound type", () => {
					it("number with right Date bound", () => {
						attest(() =>
							//@ts-expect-error
							type("number<d'2001/01/01'")
						)
							.throws(
								writeInvalidLimitMessage(
									"<",
									"Mon Jan 01 2001 00:00:00 GMT-0500 (Eastern Standard Time)",
									"right"
								)
							)
							.type.errors(
								writeInvalidLimitMessage("<", "d'2001/01/01'", "right")
							)
					})
					it("number with left Date bound", () => {
						//@ts-expect-error
						attest(() => type("d'2001/01/01'<number<2"))
							.throws(writeLimitMismatchMessage("a number", "2001/01/01"))
							.type.errors(
								writeInvalidLimitMessage("<", "d'2001/01/01'", "left")
							)
					})
				})
			})
		})
	})

	describe("dates", () => {
		// it("single", () => {
		// 	const t = type("Date<d'2023/1/12'")
		// 	attest<Date>(t.infer)
		// 	attest(t.json).equals(
		// 		// TODO: Dates?
		// 		expectedDateBoundsCondition({
		// 			limitKind: "max",
		// 			exclusive: true,
		// 			limit: new Date("2023/1/12").valueOf()
		// 		})
		// 	)
		// })
		// it("equality", () => {
		// 	const t = type("Date==d'2020-1-1'")
		// 	attest<Date>(t.infer)
		// 	attest(t.json).equals(
		// 		expectedDateBoundsCondition(
		// 			{
		// 				limitKind: "min",
		// 				exclusive: false,
		// 				limit: new Date("2020-1-1").valueOf()
		// 			},
		// 			{
		// 				limitKind: "max",
		// 				exclusive: false,
		// 				limit: new Date("2020-1-1").valueOf()
		// 			}
		// 		)
		// 	)
		// 	attest(t.allows(new Date("2020/01/01"))).equals(true)
		// 	attest(t.allows(new Date("2020/01/02"))).equals(false)
		// })
		// it("double", () => {
		// 	const t = type("d'2001/10/10'<Date<d'2005/10/10'")
		// 	attest<Date>(t.infer)
		// 	attest(t.json).equals(
		// 		expectedDateBoundsCondition(
		// 			{
		// 				limitKind: "min",
		// 				exclusive: true,
		// 				limit: new Date("2001/10/10").valueOf()
		// 			},
		// 			{
		// 				limitKind: "max",
		// 				exclusive: true,
		// 				limit: new Date("2005/10/10").valueOf()
		// 			}
		// 		)
		// 	)
		// 	attest(t.allows(new Date("2003/10/10"))).equals(true)
		// 	attest(t.allows(new Date("2001/10/10"))).equals(false)
		// 	attest(t.allows(new Date("2005/10/10"))).equals(false)
		// })
		it("dynamic", () => {
			const now = new Date()
			const t = type(`d'2000'<Date<=d'${now.toISOString()}'`)
			attest<Date>(t.infer)
			attest(t.allows(new Date(now.valueOf() - 1000))).equals(true)
			attest(t.allows(now)).equals(true)
			attest(t.allows(new Date(now.valueOf() + 1000))).equals(false)
		})
		it("non-overlapping intersection", () => {
			attest(() => type("Date>d'2000/01/01'&Date<=d'2000/01/01'").json).throws(
				"Intersection of after 2000-01-01T05:00:00.000Z and at or before 2000-01-01T05:00:00.000Z results in an unsatisfiable type"
			)
			attest(() =>
				type(
					"d'1990/01/01'<Date<d'1992/02/02'&d'1993/01/01'<Date<d'2000/01/01'"
				)
			).throws(
				"Intersection of the range bounded by after 1990-01-01T05:00:00.000Z and before 1992-02-02T05:00:00.000Z and the range bounded by after 1993-01-01T05:00:00.000Z and before 2000-01-01T05:00:00.000Z results in an unsatisfiable type"
			)
		})
	})
})
