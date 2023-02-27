import { describe, it } from "mocha"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import type { ResolvedNode } from "../src/nodes/node.ts"
import {
    writeMultipleLeftBoundsMessage,
    writeOpenRangeMessage,
    writeUnpairableComparatorMessage
} from "../src/parse/string/reduce/shared.ts"
import { singleEqualsMessage } from "../src/parse/string/shift/operator/bounds.ts"

describe("range", () => {
    describe("parse", () => {
        describe("single", () => {
            it(">", () => {
                const t = type("number>0")
                attest(t.infer).typed as number
                attest(t.node).snap({
                    number: { range: { min: { limit: 0, comparator: ">" } } }
                })
            })
            it("<", () => {
                const t = type("number<10")
                attest(t.infer).typed as number
                attest(t.node).snap({
                    number: {
                        range: { max: { limit: 10, comparator: "<" } }
                    }
                })
            })
            it("<=", () => {
                const t = type("number<=-49")
                attest(t.infer).typed as number
                attest(t.node).snap({
                    number: {
                        range: { max: { limit: -49, comparator: "<=" } }
                    }
                })
            })
            it("==", () => {
                const t = type("number==3211993")
                attest(t.infer).typed as number
                attest(t.node).snap({
                    number: {
                        range: {
                            limit: 3211993,
                            comparator: "=="
                        }
                    }
                })
            })
        })
        describe("double", () => {
            it("<,<=", () => {
                const t = type("-5<number<=5")
                attest(t.infer).typed as number
                attest(t.node).snap({
                    number: {
                        range: {
                            min: { limit: -5, comparator: ">" },
                            max: { limit: 5, comparator: "<=" }
                        }
                    }
                })
            })
            it("<=,<", () => {
                const t = type("-3.23<=number<4.654")
                attest(t.infer).typed as number
                attest(t.node).snap({
                    number: {
                        range: {
                            min: { limit: -3.23, comparator: ">=" },
                            max: { limit: 4.654, comparator: "<" }
                        }
                    }
                })
            })
        })
        it("whitespace following comparator", () => {
            const t = type("number > 3")
            attest(t.infer).typed as number
            attest(t.node).snap({
                number: {
                    range: { min: { limit: 3, comparator: ">" } }
                }
            })
        })
        describe("intersection", () => {
            describe("equality range", () => {
                it("equal", () => {
                    attest(type("number==2&number==2").node).snap({
                        number: { range: { comparator: "==", limit: 2 } }
                    })
                })
                it("unequal", () => {
                    attest(() => type("number==2&number==3").node).throws.snap(
                        "Error: Intersection of the range of exactly 2 and the range of exactly 3 results in an unsatisfiable type"
                    )
                })
                it("right equality range", () => {
                    attest(type("number<4&number==2").node).snap({
                        number: { range: { comparator: "==", limit: 2 } }
                    })
                })
                it("left equality range", () => {
                    attest(type("number==3&number>=3").node).snap({
                        number: { range: { comparator: "==", limit: 3 } }
                    })
                })
            })

            it("overlapping", () => {
                const expected: ResolvedNode = {
                    number: {
                        range: {
                            min: { limit: 2, comparator: ">=" },
                            max: { limit: 3, comparator: "<" }
                        }
                    }
                }
                attest(type("2<=number<3").node).equals(expected)
                attest(type("number>=2&number<3").node).equals(expected)
                attest(type("2<=number<4&1<=number<3").node).equals(expected)
            })
            it("single value overlap", () => {
                attest(type("0<number<=1&1<=number<2").node).equals({
                    number: {
                        range: {
                            min: {
                                limit: 1,
                                comparator: ">="
                            },
                            max: {
                                limit: 1,
                                comparator: "<="
                            }
                        }
                    }
                })
            })
            it("non-overlapping", () => {
                attest(() => type("number>3&number<=3").node).throws.snap(
                    "Error: Intersection of >3 and <=3 results in an unsatisfiable type"
                )
                attest(() => type("-2<number<-1&1<number<2")).throws.snap(
                    "Error: Intersection of the range bounded by >-2 and <-1 and the range bounded by >1 and <2 results in an unsatisfiable type"
                )
            })
            it("greater min is stricter", () => {
                const expected: ResolvedNode = {
                    number: { range: { min: { limit: 3, comparator: ">=" } } }
                }
                attest(type("number>=3&number>2").node).equals(expected)
                attest(type("number>2&number>=3").node).equals(expected)
            })
            it("lesser max is stricter", () => {
                const expected: ResolvedNode = {
                    number: { range: { max: { limit: 3, comparator: "<=" } } }
                }
                attest(type("number<=3&number<4").node).equals(expected)
                attest(type("number<4&number<=3").node).equals(expected)
            })
            it("exclusive included if limits equal", () => {
                const expected: ResolvedNode = {
                    number: { range: { max: { limit: 3, comparator: "<" } } }
                }
                attest(type("number<3&number<=3").node).equals(expected)
                attest(type("number<=3&number<3").node).equals(expected)
            })
        })
        describe("errors", () => {
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
                attest(() => type("3<=number<2").node).throws.snap(
                    "Error: the range bounded by >=3 and <2 is empty"
                )
            })
        })
    })
})
