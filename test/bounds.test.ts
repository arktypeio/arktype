import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import type { Node } from "../exports.js"
import { type } from "../exports.js"
import {
    buildMultipleLeftBoundsMessage,
    buildOpenRangeMessage,
    buildUnpairableComparatorMessage
} from "../src/parse/reduce/shared.js"
import { singleEqualsMessage } from "../src/parse/shift/operator/bounds.js"

describe("bound", () => {
    describe("parse", () => {
        test("whitespace following comparator", () => {
            const t = type("number > 3")
            attest(t.infer).typed as number
            attest(t.root).snap({
                number: { bounds: { min: { limit: 3, exclusive: true } } },
                string: { bounds: { min: { limit: 3, exclusive: true } } },
                object: {
                    subtype: "Array",
                    bounds: { min: { limit: 3, exclusive: true } }
                }
            })
        })
        describe("single", () => {
            test(">", () => {
                const t = type("number>0")
                attest(t.infer).typed as number
                attest(t.root).snap({
                    number: { bounds: { min: { limit: 0, exclusive: true } } },
                    string: { bounds: { min: { limit: 0, exclusive: true } } },
                    object: {
                        subtype: "Array",
                        bounds: { min: { limit: 0, exclusive: true } }
                    }
                })
            })
            test("<", () => {
                const t = type("number<10")
                attest(t.infer).typed as number
                attest(t.root).snap({
                    number: { bounds: { max: { limit: 10, exclusive: true } } },
                    string: { bounds: { max: { limit: 10, exclusive: true } } },
                    object: {
                        subtype: "Array",
                        bounds: { max: { limit: 10, exclusive: true } }
                    }
                })
            })
            test("<=", () => {
                const t = type("number<=-49")
                attest(t.infer).typed as number
                attest(t.root).snap({
                    number: { bounds: { max: { limit: -49 } } },
                    string: { bounds: { max: { limit: -49 } } },
                    object: {
                        subtype: "Array",
                        bounds: { max: { limit: -49 } }
                    }
                })
            })
            test("==", () => {
                const t = type("number==3211993")
                attest(t.infer).typed as number
                attest(t.root).snap({
                    number: {
                        bounds: {
                            min: { limit: 3211993 },
                            max: { limit: 3211993 }
                        }
                    },
                    string: {
                        bounds: {
                            min: { limit: 3211993 },
                            max: { limit: 3211993 }
                        }
                    },
                    object: {
                        subtype: "Array",
                        bounds: {
                            min: { limit: 3211993 },
                            max: { limit: 3211993 }
                        }
                    }
                })
            })
        })
        describe("double", () => {
            test("<,<=", () => {
                const t = type("-5<number<=5")
                attest(t.infer).typed as number
                attest(t.root).snap({
                    number: {
                        bounds: {
                            min: { limit: -5, exclusive: true },
                            max: { limit: 5 }
                        }
                    },
                    string: {
                        bounds: {
                            min: { limit: -5, exclusive: true },
                            max: { limit: 5 }
                        }
                    },
                    object: {
                        subtype: "Array",
                        bounds: {
                            min: { limit: -5, exclusive: true },
                            max: { limit: 5 }
                        }
                    }
                })
            })
            test("<=,<", () => {
                const t = type("-3.23<=number<4.654")
                attest(t.infer).typed as number
                attest(t.root).snap({
                    number: {
                        bounds: {
                            min: { limit: -3.23 },
                            max: { limit: 4.654, exclusive: true }
                        }
                    },
                    string: {
                        bounds: {
                            min: { limit: -3.23 },
                            max: { limit: 4.654, exclusive: true }
                        }
                    },
                    object: {
                        subtype: "Array",
                        bounds: {
                            min: { limit: -3.23 },
                            max: { limit: 4.654, exclusive: true }
                        }
                    }
                })
            })
        })
        test("whitespace following comparator", () => {
            const t = type("number > 3")
            attest(t.infer).typed as number
            attest(t.root).snap({
                number: { bounds: { min: { limit: 3, exclusive: true } } },
                string: { bounds: { min: { limit: 3, exclusive: true } } },
                object: {
                    subtype: "Array",
                    bounds: { min: { limit: 3, exclusive: true } }
                }
            })
        })
        describe("intersection", () => {
            test("overlapping", () => {
                const expected: Node = {
                    number: {
                        bounds: {
                            min: { limit: 2 },
                            max: { limit: 3, exclusive: true }
                        }
                    }
                }
                attest(type("2<=number<3").root).equals(expected)
                attest(type("number>=2&number<3").root).equals(expected)
                attest(type("2<=number<4&1<=number<3").root).equals(expected)
            })
            test("single value overlap", () => {
                attest(type("0<number<=1&1<=number<2").root).equals({
                    number: {
                        bounds: {
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
            test("non-overlapping", () => {
                const expected: Node = {
                    number: []
                }
                attest(type("number>3&number<=3").root).equals(expected)
                attest(type("-2<number<-1&1<number<2").root).equals(expected)
            })
            test("greater min is stricter", () => {
                const expected: Node = {
                    number: { bounds: { min: { limit: 3 } } }
                }
                attest(type("number>=3&number>2").root).equals(expected)
                attest(type("number>2&number>=3").root).equals(expected)
            })
            test("lesser max is stricter", () => {
                const expected: Node = {
                    number: { bounds: { max: { limit: 3 } } }
                }
                attest(type("number<=3&number<4").root).equals(expected)
                attest(type("number<4&number<=3").root).equals(expected)
            })
            test("exclusive included if limits equal", () => {
                const expected: Node = {
                    number: { bounds: { max: { limit: 3, exclusive: true } } }
                }
                attest(type("number<3&number<=3").root).equals(expected)
                attest(type("number<=3&number<3").root).equals(expected)
            })
        })
        describe("errors", () => {
            test("single equals", () => {
                // @ts-expect-error
                attest(() => type("string=5")).throwsAndHasTypeError(
                    singleEqualsMessage
                )
            })
            test("invalid left comparator", () => {
                // @ts-expect-error
                attest(() => type("3>number<5")).throwsAndHasTypeError(
                    buildUnpairableComparatorMessage(">")
                )
            })
            test("invalid right double-bound comparator", () => {
                // @ts-expect-error
                attest(() => type("3<number==5")).throwsAndHasTypeError(
                    buildUnpairableComparatorMessage("==")
                )
            })
            test("unpaired left", () => {
                // @ts-expect-error
                attest(() => type("3<number")).throwsAndHasTypeError(
                    buildOpenRangeMessage(3, "<")
                )
            })
            test("double left", () => {
                // @ts-expect-error
                attest(() => type("3<5<8")).throwsAndHasTypeError(
                    buildMultipleLeftBoundsMessage(3, "<", 5, "<")
                )
            })
            // TODO this should be never?
            test("empty range", () => {
                attest(() => type("3<=number<2").root).throws.snap(
                    "Error: the range bounded by >=3 and <2 is empty"
                )
            })
        })
    })
})
