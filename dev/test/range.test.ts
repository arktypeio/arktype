import { suite, test } from "mocha"
import { node, type } from "../../src/main.js"
import type { Range } from "../../src/nodes/primitive/range.js"
import { rangeNode } from "../../src/nodes/primitive/range.js"
import {
    writeDoubleRightBoundMessage,
    writeUnboundableMessage
} from "../../src/parse/ast/bound.js"
import {
    writeMultipleLeftBoundsMessage,
    writeOpenRangeMessage,
    writeUnpairableComparatorMessage
} from "../../src/parse/string/reduce/shared.js"
import { singleEqualsMessage } from "../../src/parse/string/shift/operator/bounds.js"
import { attest } from "../attest/main.js"
import { writeMalformedNumericLiteralMessage } from "../utils/src/numericLiterals.js"

export const expectedBoundsCondition = (...range: Range) =>
    node({ basis: "number", range }).condition
export const expectedDateBoundsCondition = (...range: Range) =>
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
                        "Intersection of ==2 and ==3 results in an unsatisfiable type"
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
                    "Intersection of >3 and <=3 results in an unsatisfiable type"
                )
                attest(() => type("-2<number<-1&1<number<2")).throws(
                    "Intersection of the range bounded by >-2 and <-1 and the range bounded by >1 and <2 results in an unsatisfiable type"
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
                    "Intersection of >=3 and <2 results in an unsatisfiable type"
                )
            })
            test("double right bound", () => {
                // @ts-expect-error
                attest(() => type("number>0<=200")).types.errors(
                    writeDoubleRightBoundMessage("'number'")
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
                    attest(() =>
                        // @ts-expect-error
                        type("1<(number|object)<10")
                    ).throwsAndHasTypeError(
                        "Error: Bounded expression object must be bounded by a number, string or Array"
                    )
                })
            })
        })
        suite("date range", () => {
            suite("parse", () => {
                suite("single", () => {
                    test(">", () => {
                        const t = type("Date>d'2001/5/5'")
                        attest(t.infer).typed as Date
                    })
                    test("<", () => {
                        const t = type("Date<d'2023/1/12'")
                        attest(t.infer).typed as Date
                        attest(t.condition).equals(
                            expectedDateBoundsCondition({
                                comparator: "<",
                                limit: new Date("2023/1/12")
                            })
                        )
                    })
                    test("<=", () => {
                        const t = type("Date<=d'2021/1/12'")
                        attest(t.infer).typed as Date
                        attest(t.condition).equals(
                            expectedDateBoundsCondition({
                                comparator: "<=",
                                limit: new Date("2021/1/12")
                            })
                        )
                    })
                    test("==", () => {
                        const t = type("Date==d'2020-1-1'")
                        attest(t.infer).typed as Date
                        attest(t.condition).equals(
                            expectedDateBoundsCondition({
                                comparator: "==",
                                limit: new Date("2020-1-1")
                            })
                        )
                    })
                })
                suite("double", () => {
                    test("<,<=", () => {
                        const t = type("d'2020/1/1'<Date<=d'2024/1/1'")
                        attest(t.infer).typed as Date
                        attest(t.condition).equals(
                            expectedBoundsCondition(
                                {
                                    comparator: ">",
                                    limit: new Date("2020/1/1")
                                },
                                {
                                    comparator: "<=",
                                    limit: new Date("2024/1/1")
                                }
                            )
                        )
                    })
                })
            })
        })
        // Reenable
        //         suite("date", () => {
        //             test("single bound", () => {
        //                 const t = type(`Date>${d("1/1/2019")}`)
        //                 attest(t(new Date("1/1/2020")).data).snap("Wed Jan 01 2020")

        //                 attest(t(new Date("1/1/2018")).problems?.summary).snap(
        //                     "Must be more than Tue Jan 01 2019 (was Mon Jan 01 2018)"
        //                 )

        //                 attest(t(new Date("10/24/1996").valueOf()).problems.summary)
        //                     .snap(`{"value":846140400000} must be...
        // • a Date
        // • more than 1546329600000`)
        //             })
        //             test("equality", () => {
        //                 const t = type(`Date == ${d("1/1/1")}`)
        //                 attest(t(new Date("1/1/1")).data).snap("Mon Jan 01 2001")

        //                 attest(t(new Date("1/1/2")).problems?.summary).snap(
        //                     "Must be exactly Mon Jan 01 2001 (was Tue Jan 01 2002)"
        //                 )
        //             })

        //             test("double bounded", () => {
        //                 const t = type(`${d("1/1/2018")}<Date<${d("1/1/2019")}`)

        //                 attest(t(new Date("1/2/2018")).data).snap("Tue Jan 02 2018")
        //                 attest(t(new Date("1/1/2020")).problems?.summary).snap(
        //                     "Must be less than Tue Jan 01 2019 (was Wed Jan 01 2020)"
        //                 )
        //             })
        //         })
    })
})
