import { describe, it } from "mocha"
import type { TypeNode } from "../api.ts"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { writeImplicitNeverMessage } from "../src/parse/string/ast.ts"
import {
    writeMultipleLeftBoundsMessage,
    writeOpenRangeMessage,
    writeUnpairableComparatorMessage
} from "../src/parse/string/reduce/shared.ts"
import { singleEqualsMessage } from "../src/parse/string/shift/operator/bounds.ts"

describe("bound", () => {
    describe("parse", () => {
        describe("single", () => {
            it(">", () => {
                const t = type("number>0")
                attest(t.infer).typed as number
                attest(t.node).snap({
                    number: { range: { min: { limit: 0, exclusive: true } } }
                })
            })
            it("<", () => {
                const t = type("number<10")
                attest(t.infer).typed as number
                attest(t.node).snap({
                    number: {
                        range: { max: { limit: 10, exclusive: true } }
                    }
                })
            })
            it("<=", () => {
                const t = type("number<=-49")
                attest(t.infer).typed as number
                attest(t.node).snap({
                    number: {
                        range: { max: { limit: -49 } }
                    }
                })
            })
            it("==", () => {
                const t = type("number==3211993")
                attest(t.infer).typed as number
                attest(t.node).snap({
                    number: {
                        range: {
                            min: { limit: 3211993 },
                            max: { limit: 3211993 }
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
                            min: { limit: -5, exclusive: true },
                            max: { limit: 5 }
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
                            min: { limit: -3.23 },
                            max: { limit: 4.654, exclusive: true }
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
                    range: { min: { limit: 3, exclusive: true } }
                }
            })
        })
        describe("intersection", () => {
            it("overlapping", () => {
                const expected: TypeNode = {
                    number: {
                        range: {
                            min: { limit: 2 },
                            max: { limit: 3, exclusive: true }
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
                                limit: 1
                            },
                            max: {
                                limit: 1
                            }
                        }
                    }
                })
            })
            it("non-overlapping", () => {
                attest(() => type("number>3&number<=3").node).throws(
                    writeImplicitNeverMessage("")
                )
                attest(() => type("-2<number<-1&1<number<2")).throws(
                    writeImplicitNeverMessage("")
                )
            })
            it("greater min is stricter", () => {
                const expected: TypeNode = {
                    number: { range: { min: { limit: 3 } } }
                }
                attest(type("number>=3&number>2").node).equals(expected)
                attest(type("number>2&number>=3").node).equals(expected)
            })
            it("lesser max is stricter", () => {
                const expected: TypeNode = {
                    number: { range: { max: { limit: 3 } } }
                }
                attest(type("number<=3&number<4").node).equals(expected)
                attest(type("number<4&number<=3").node).equals(expected)
            })
            it("exclusive included if limits equal", () => {
                const expected: TypeNode = {
                    number: { range: { max: { limit: 3, exclusive: true } } }
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
                // @ts-expect-error
                attest(() => type("3<number")).throwsAndHasTypeError(
                    writeOpenRangeMessage(3, "<")
                )
            })
            it("double left", () => {
                // @ts-expect-error
                attest(() => type("3<5<8")).throwsAndHasTypeError(
                    writeMultipleLeftBoundsMessage(3, "<", 5, "<")
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
