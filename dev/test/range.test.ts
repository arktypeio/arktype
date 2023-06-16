import { suite, test } from "mocha"
import { type } from "../../src/main.js"
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
import { writeMalformedNumericLiteralMessage } from "../utils/src/numericLiterals.js"
import { attest } from "../attest/main.js"

suite("range", () => {
    suite("parse", () => {
        suite("single", () => {
            test(">", () => {
                const t = type("number>0")
                attest(t.infer).typed as number
                // attest(t.node).snap({
                //     number: { range: { min: { limit: 0, comparator: ">" } } }
                // })
            })
            test("<", () => {
                const t = type("number<10")
                attest(t.infer).typed as number
                // attest(t.node).snap({
                //     number: {
                //         range: { max: { limit: 10, comparator: "<" } }
                //     }
                // })
            })
            test("<=", () => {
                const t = type("number<=-49")
                attest(t.infer).typed as number
                // attest(t.node).snap({
                //     number: {
                //         range: { max: { limit: -49, comparator: "<=" } }
                //     }
                // })
            })
            test("==", () => {
                const t = type("number==3211993")
                attest(t.infer).typed as number
                // attest(t.node).snap({
                //     number: {
                //         range: {
                //             limit: 3211993,
                //             comparator: "=="
                //         }
                //     }
                // })
            })
        })
        suite("double", () => {
            test("<,<=", () => {
                const t = type("-5<number<=5")
                attest(t.infer).typed as number
                attest(t.root.condition).snap(
                    'typeof $arkRoot === "number" && ($arkRoot.length ?? Number($arkRoot)) > -5 && ($arkRoot.length ?? Number($arkRoot)) <= 5'
                )
                // attest(t.node).snap({
                //     number: {
                //         range: {
                //             min: { limit: -5, comparator: ">" },
                //             max: { limit: 5, comparator: "<=" }
                //         }
                //     }
                // })
            })
            test("<=,<", () => {
                const t = type("-3.23<=number<4.654")
                attest(t.infer).typed as number
                // attest(t.node).snap({
                //     number: {
                //         range: {
                //             min: { limit: -3.23, comparator: ">=" },
                //             max: { limit: 4.654, comparator: "<" }
                //         }
                //     }
                // })
            })
        })
        test("whitespace following comparator", () => {
            const t = type("number > 3")
            attest(t.infer).typed as number
            // attest(t.node).snap({
            //     number: {
            //         range: { min: { limit: 3, comparator: ">" } }
            //     }
            // })
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
                        "must be a number, string, Array, or Date"
                    )
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
