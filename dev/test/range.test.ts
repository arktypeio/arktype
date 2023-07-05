import { attest } from "@arktype/attest"
import { writeMalformedNumericLiteralMessage } from "@arktype/utils"
import { node, type } from "arktype"
import { suite, test } from "mocha"
import { writeIncompatibleRangeMessage } from "../../src/nodes/primitive/range.js"
import {
    writeDoubleRightBoundMessage,
    writeUnboundableMessage
} from "../../src/parse/ast/bound.js"
import {
    writeMultipleLeftBoundsMessage,
    writeOpenRangeMessage,
    writeUnpairableComparatorMessage
} from "../../src/parse/string/reduce/shared.js"
import {
    singleEqualsMessage,
    writeInvalidLimitMessage
} from "../../src/parse/string/shift/operator/bounds.js"

export const expectedBoundsCondition = (...range: any) =>
    node({ basis: "number", range }).condition

export const expectedDateBoundsCondition = (...range: any) =>
    node({ basis: Date, range }).condition

suite("range", () => {
    suite("parse", () => {
        suite("single", () => {
            test(">", () => {
                const t = type("number>0")
                attest(t.infer).typed as number
                attest(t.allows(-1)).equals(false)
                attest(t.allows(0)).equals(false)
                attest(t.allows(1)).equals(true)
            })
            test("<", () => {
                const t = type("number<10")
                attest(t.infer).typed as number
                attest(t.condition).equals(
                    expectedBoundsCondition({ comparator: "<", limit: 10 })
                )
            })
            test("<=", () => {
                const t = type("number<=-49")
                attest(t.infer).typed as number
                attest(t.condition).equals(
                    expectedBoundsCondition({ comparator: "<=", limit: -49 })
                )
            })
            test("==", () => {
                const t = type("number==3211993")
                attest(t.infer).typed as number
                attest(t.condition).equals(
                    expectedBoundsCondition({
                        comparator: "==",
                        limit: 3211993
                    })
                )
            })
        })
        suite("double", () => {
            test("<,<=", () => {
                const t = type("-5<number<=5")
                attest(t.infer).typed as number
                attest(t.allows(-6)).equals(false)
                attest(t.allows(-5)).equals(false)
                attest(t.allows(-4)).equals(true)
                attest(t.allows(4)).equals(true)
                attest(t.allows(5)).equals(true)
                attest(t.allows(5.01)).equals(false)
                attest(t.condition).equals(
                    expectedBoundsCondition(
                        {
                            comparator: ">",
                            limit: -5
                        },
                        {
                            comparator: "<=",
                            limit: 5
                        }
                    )
                )
            })
            test("<=,<", () => {
                const t = type("-3.23<=number<4.654")
                attest(t.infer).typed as number
                attest(t.condition).equals(
                    expectedBoundsCondition(
                        {
                            comparator: ">=",
                            limit: -3.23
                        },
                        {
                            comparator: "<",
                            limit: 4.654
                        }
                    )
                )
            })
        })
        test("whitespace following comparator", () => {
            const t = type("number > 3")
            attest(t.infer).typed as number
            attest(t.condition).equals(
                expectedBoundsCondition({ comparator: ">", limit: 3 })
            )
        })
        suite("intersection", () => {
            suite("equality range", () => {
                test("equal", () => {
                    attest(type("number==2&number==2").condition).equals(
                        type("number==2").condition
                    )
                })
                test("disjoint", () => {
                    attest(() => type("number==2&number==3")).throws(
                        "Intersection of exactly 2 and exactly 3 results in an unsatisfiable type"
                    )
                })
                test("right equality range", () => {
                    attest(type("number<4&number==2").condition).equals(
                        type("number==2").condition
                    )
                })
                test("left equality range", () => {
                    attest(type("number==3&number>=3").condition).equals(
                        type("number==3").condition
                    )
                })
            })
            test("overlapping", () => {
                const expected = type("2<=number<3").condition
                attest(type("number>=2&number<3").condition).equals(expected)
                attest(type("2<=number<4&1<=number<3").condition).equals(
                    expected
                )
            })
            test("single value overlap", () => {
                attest(type("0<=number<=0").condition).equals(
                    type("number==0").condition
                )
                attest(type("0<number<=1&1<=number<2").condition).equals(
                    type("number==1").condition
                )
            })
            test("non-overlapping", () => {
                attest(() => type("number>3&number<=3")).throws(
                    "Intersection of more than 3 and at most 3 results in an unsatisfiable type"
                )
                attest(() => type("-2<number<-1&1<number<2")).throws(
                    "Intersection of the range bounded by more than -2 and less than -1 and the range bounded by more than 1 and less than 2 results in an unsatisfiable type"
                )
            })
            test("greater min is stricter", () => {
                const expected = type("number>=3").condition
                attest(type("number>=3&number>2").condition).equals(expected)
                attest(type("number>2&number>=3").condition).equals(expected)
            })
            test("lesser max is stricter", () => {
                const expected = type("number<=3").condition
                attest(type("number<=3&number<4").condition).equals(expected)
                attest(type("number<4&number<=3").condition).equals(expected)
            })
            test("exclusive wins if limits equal", () => {
                const expected = type("number<3").condition
                attest(type("number<3&number<=3").condition).equals(expected)
                attest(type("number<=3&number<3").condition).equals(expected)
            })
        })

        suite("parse errors", () => {
            test("single equals", () => {
                // @ts-expect-error
                attest(() => type("string=5")).throwsAndHasTypeError(
                    singleEqualsMessage
                )
            })
            test("invalid left comparator", () => {
                // @ts-expect-error
                attest(() => type("3>number<5")).throwsAndHasTypeError(
                    writeUnpairableComparatorMessage(">")
                )
            })
            test("invalid right double-bound comparator", () => {
                // @ts-expect-error
                attest(() => type("3<number==5")).throwsAndHasTypeError(
                    writeUnpairableComparatorMessage("==")
                )
            })
            test("unpaired left", () => {
                // @ts-expect-error temporarily disabled type snapshot as it is returning ''
                attest(() => type("3<number")).throws(
                    writeOpenRangeMessage("3", ">")
                )
            })
            test("unpaired left group", () => {
                // @ts-expect-error
                attest(() => type("(-1<=number)")).throws(
                    writeOpenRangeMessage("-1", ">=")
                )
            })
            test("double left", () => {
                // @ts-expect-error
                attest(() => type("3<5<8")).throwsAndHasTypeError(
                    writeMultipleLeftBoundsMessage("3", ">", "5", ">")
                )
            })
            test("empty range", () => {
                attest(() => type("3<=number<2")).throws(
                    "Intersection of at least 3 and less than 2 results in an unsatisfiable type"
                )
            })
            test("double right bound", () => {
                // @ts-expect-error
                attest(() => type("number>0<=200")).types.errors(
                    writeDoubleRightBoundMessage("number")
                )
            })
            test("non-narrowed bounds", () => {
                const a = 5 as number
                const b = 7 as number
                attest(type(`${a}<number<${b}`).infer).typed as number
            })
            test("fails at runtime on malformed right", () => {
                attest(() => type("number<07")).throws(
                    writeMalformedNumericLiteralMessage("07", "number")
                )
            })
            test("fails at runtime on malformed lower", () => {
                attest(() => type("3.0<number<5")).throws(
                    writeMalformedNumericLiteralMessage("3.0", "number")
                )
            })
        })
        suite("semantic errors", () => {
            test("number", () => {
                attest(type("number==-3.14159").infer).typed as number
            })
            test("string", () => {
                attest(type("string<=5").infer).typed as string
            })
            test("array", () => {
                attest(type("87<=boolean[]<89").infer).typed as boolean[]
            })
            test("multiple boundable categories", () => {
                const t = type("(string|boolean[]|number)>0")
                attest(t.infer).typed as string | boolean[] | number
                const expected = type("string>0|boolean[]>0|number>0")
                attest(t.condition).equals(expected.condition)
            })

            suite("errors", () => {
                test("unknown", () => {
                    // @ts-expect-error
                    attest(() => type("unknown<10")).throwsAndHasTypeError(
                        writeUnboundableMessage("unknown")
                    )
                })
                test("unboundable", () => {
                    // @ts-expect-error
                    attest(() => type("object>10")).throwsAndHasTypeError(
                        writeUnboundableMessage("object")
                    )
                })
                test("overlapping", () => {
                    // @ts-expect-error
                    attest(() => type("1<(number|object)<10"))
                        .throws(writeUnboundableMessage("object"))
                        // At compile time we don't have access to the specific branch that failed so we
                        // summarize the expression
                        .types.errors(
                            writeUnboundableMessage("number | object")
                        )
                })
                suite("invalid literal bound type", () => {
                    test("number with right Date bound", () => {
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
                            .types.errors(
                                writeInvalidLimitMessage(
                                    "<",
                                    "d'2001/01/01'",
                                    "right"
                                )
                            )
                    })
                    test("number with left Date bound", () => {
                        //@ts-expect-error
                        attest(() => type("d'2001/01/01'<number<2"))
                            .throws(
                                writeIncompatibleRangeMessage("date", "numeric")
                            )
                            .types.errors(
                                writeInvalidLimitMessage(
                                    "<",
                                    "d'2001/01/01'",
                                    "left"
                                )
                            )
                    })
                    test("Date with right number bound", () => {
                        // @ts-expect-error
                        attest(() => type("Date<2")).throwsAndHasTypeError(
                            writeInvalidLimitMessage("<", "2", "right")
                        )
                    })
                    test("Date with left number bound", () => {
                        attest(() =>
                            // @ts-expect-error
                            type("0<Date<d'1999/9/8'")
                        )
                            .throws(
                                writeIncompatibleRangeMessage("numeric", "date")
                            )
                            .types.errors(
                                writeInvalidLimitMessage("<", "0", "left")
                            )
                    })
                })
            })
        })
    })

    suite("dates", () => {
        test("single", () => {
            const t = type("Date<d'2023/1/12'")
            attest(t.infer).typed as Date
            attest(t.condition).equals(
                expectedDateBoundsCondition({
                    comparator: "<",
                    limit: new Date("2023/1/12")
                })
            )
        })
        test("equality", () => {
            const t = type("Date==d'2020-1-1'")
            attest(t.infer).typed as Date
            attest(t.condition).equals(
                expectedDateBoundsCondition({
                    comparator: "==",
                    limit: new Date("2020-1-1")
                })
            )
            attest(t.allows(new Date("2020/01/01"))).equals(true)
            attest(t.allows(new Date("2020/01/02"))).equals(false)
        })
        test("double", () => {
            const t = type("d'2001/10/10'<Date<d'2005/10/10'")
            attest(t.infer).typed as Date
            attest(t.condition).equals(
                expectedDateBoundsCondition(
                    {
                        comparator: ">",
                        limit: new Date("2001/10/10")
                    },
                    {
                        comparator: "<",
                        limit: new Date("2005/10/10")
                    }
                )
            )
            attest(t.allows(new Date("2003/10/10"))).equals(true)
            attest(t.allows(new Date("2001/10/10"))).equals(false)
            attest(t.allows(new Date("2005/10/10"))).equals(false)
        })
        test("dynamic", () => {
            const now = new Date()
            const t = type(`d'2000'<Date<=d'${now.toISOString()}'`)
            attest(t.infer).typed as Date
            attest(t.allows(new Date(now.valueOf() - 1000))).equals(true)
            attest(t.allows(now)).equals(true)
            attest(t.allows(new Date(now.valueOf() + 1000))).equals(false)
        })
        test("non-overlapping intersection", () => {
            attest(
                () => type("Date>d'2000/01/01'&Date<=d'2000/01/01'").condition
            ).throws(
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
