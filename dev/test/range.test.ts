import { describe, it } from "mocha"
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
import {
    getEpochs,
    writeMalformedNumericLiteralMessage
} from "../../src/utils/numericLiterals.js"
import { attest } from "../attest/main.js"

describe("range", () => {
    describe("parse", () => {
        describe("single", () => {
            it(">", () => {
                const t = type("number>0")
                attest(t.infer).typed as number
                // attest(t.node).snap({
                //     number: { range: { min: { limit: 0, comparator: ">" } } }
                // })
            })
            it("<", () => {
                const t = type("number<10")
                attest(t.infer).typed as number
                // attest(t.node).snap({
                //     number: {
                //         range: { max: { limit: 10, comparator: "<" } }
                //     }
                // })
            })
            it("<=", () => {
                const t = type("number<=-49")
                attest(t.infer).typed as number
                // attest(t.node).snap({
                //     number: {
                //         range: { max: { limit: -49, comparator: "<=" } }
                //     }
                // })
            })
            it("==", () => {
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
        describe("double", () => {
            it("<,<=", () => {
                const t = type("-5<number<=5")
                attest(t.infer).typed as number
                attest(t.root.key).snap()
                // attest(t.node).snap({
                //     number: {
                //         range: {
                //             min: { limit: -5, comparator: ">" },
                //             max: { limit: 5, comparator: "<=" }
                //         }
                //     }
                // })
            })
            it("<=,<", () => {
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
        it("whitespace following comparator", () => {
            const t = type("number > 3")
            attest(t.infer).typed as number
            // attest(t.node).snap({
            //     number: {
            //         range: { min: { limit: 3, comparator: ">" } }
            //     }
            // })
        })
        // describe("intersection", () => {
        //     describe("equality range", () => {
        //         it("equal", () => {
        //             attest(type("number==2&number==2").node).snap({
        //                 number: { range: { comparator: "==", limit: 2 } }
        //             })
        //         })
        //         it("unequal", () => {
        //             attest(() => type("number==2&number==3").node).throws.snap(
        //                 "Error: Intersection of the range of exactly 2 and the range of exactly 3 results in an unsatisfiable type"
        //             )
        //         })
        //         it("right equality range", () => {
        //             attest(type("number<4&number==2").node).snap({
        //                 number: { range: { comparator: "==", limit: 2 } }
        //             })
        //         })
        //         it("left equality range", () => {
        //             attest(type("number==3&number>=3").node).snap({
        //                 number: { range: { comparator: "==", limit: 3 } }
        //             })
        //         })
        //     })

        //     it("overlapping", () => {
        //         const expected: ResolvedNode = {
        //             number: {
        //                 range: {
        //                     min: { limit: 2, comparator: ">=" },
        //                     max: { limit: 3, comparator: "<" }
        //                 }
        //             }
        //         }
        //         attest(type("2<=number<3").node).equals(expected)
        //         attest(type("number>=2&number<3").node).equals(expected)
        //         attest(type("2<=number<4&1<=number<3").node).equals(expected)
        //     })
        //     it("single value overlap", () => {
        //         attest(type("0<number<=1&1<=number<2").node).equals({
        //             number: {
        //                 range: {
        //                     min: {
        //                         limit: 1,
        //                         comparator: ">="
        //                     },
        //                     max: {
        //                         limit: 1,
        //                         comparator: "<="
        //                     }
        //                 }
        //             }
        //         })
        //     })
        //     it("non-overlapping", () => {
        //         attest(() => type("number>3&number<=3").node).throws.snap(
        //             "Error: Intersection of >3 and <=3 results in an unsatisfiable type"
        //         )
        //         attest(() => type("-2<number<-1&1<number<2")).throws.snap(
        //             "Error: Intersection of the range bounded by >-2 and <-1 and the range bounded by >1 and <2 results in an unsatisfiable type"
        //         )
        //     })
        //     it("greater min is stricter", () => {
        //         const expected: ResolvedNode = {
        //             number: { range: { min: { limit: 3, comparator: ">=" } } }
        //         }
        //         attest(type("number>=3&number>2").node).equals(expected)
        //         attest(type("number>2&number>=3").node).equals(expected)
        //     })
        //     it("lesser max is stricter", () => {
        //         const expected: ResolvedNode = {
        //             number: { range: { max: { limit: 3, comparator: "<=" } } }
        //         }
        //         attest(type("number<=3&number<4").node).equals(expected)
        //         attest(type("number<4&number<=3").node).equals(expected)
        //     })
        //     it("exclusive included if limits equal", () => {
        //         const expected: ResolvedNode = {
        //             number: { range: { max: { limit: 3, comparator: "<" } } }
        //         }
        //         attest(type("number<3&number<=3").node).equals(expected)
        //         attest(type("number<=3&number<3").node).equals(expected)
        //     })
        // })
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
                attest(() => type("3<number")).throws(
                    writeOpenRangeMessage("3", ">")
                )
            })
            it("unpaired left group", () => {
                // @ts-expect-error
                attest(() => type("(-1<=number)")).throws(
                    writeOpenRangeMessage("-1", ">=")
                )
            })
            it("double left", () => {
                // @ts-expect-error
                attest(() => type("3<5<8")).throwsAndHasTypeError(
                    writeMultipleLeftBoundsMessage("3", ">", "5", ">")
                )
            })
            it("empty range", () => {
                attest(() => type("3<=number<2")).throws.snap(
                    "Error: the range bounded by >=3 and <2 is empty"
                )
            })
            it("double right bound", () => {
                // @ts-expect-error
                attest(() => type("number>0<=200")).types.errors(
                    writeDoubleRightBoundMessage("'number'")
                )
            })
            it("non-narrowed bounds", () => {
                const a = 5 as number
                const b = 7 as number
                attest(type(`${a}<number<${b}`).infer).typed as number
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
        describe("semantic errors", () => {
            it("number", () => {
                attest(type("number==-3.14159").infer).typed as number
            })
            it("string", () => {
                attest(type("string<=5").infer).typed as string
            })
            it("array", () => {
                attest(type("87<=boolean[]<89").infer).typed as boolean[]
            })

            describe("errors", () => {
                it("unboundable", () => {
                    // @ts-expect-error
                    attest(() => type("unknown<10")).throwsAndHasTypeError(
                        writeUnboundableMessage("'unknown'")
                    )
                })
                it("any", () => {
                    // @ts-expect-error
                    attest(() => type("any>10")).throwsAndHasTypeError(
                        writeUnboundableMessage("'any'")
                    )
                })
                it("overlapping", () => {
                    attest(() =>
                        // @ts-expect-error
                        type("1<(number|boolean)<10")
                    ).throwsAndHasTypeError("must be a number, string or array")
                })
            })
        })
        describe("Bounded Date", () => {
            it("Date", () => {
                const t = type(`Date>${getEpochs("1/1/2019")}`)
                attest(t(new Date("1/1/2020")).data).snap("Wed Jan 01 2020")

                attest(t(new Date("1/1/2018")).problems?.summary).snap(
                    "Must be more than Tue Jan 01 2019 (was Mon Jan 01 2018)"
                )

                attest(t(new Date("10/24/1996").valueOf()).problems.summary)
                    .snap(`{"value":846140400000} must be...
• a Date
• more than 1546329600000`)
            })
            it("equality", () => {
                const t = type(`Date == ${getEpochs("1/1/1")}`)
                attest(t(new Date("1/1/1")).data).snap("Mon Jan 01 2001")

                attest(t(new Date("1/1/2")).problems?.summary).snap(
                    "Must be exactly Mon Jan 01 2001 (was Tue Jan 01 2002)"
                )
            })

            it("double bounded", () => {
                const t = type(
                    `${getEpochs("1/1/2018")}<Date<${getEpochs("1/1/2019")}`
                )

                attest(t(new Date("1/2/2018")).data).snap("Tue Jan 02 2018")
                attest(t(new Date("1/1/2020")).problems?.summary).snap(
                    "Must be less than Tue Jan 01 2019 (was Wed Jan 01 2020)"
                )
            })
        })
    })
})
