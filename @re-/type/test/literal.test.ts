import { assert } from "@re-/assert"
import { type } from "../src/index.js"

describe("number", () => {
    describe("type", () => {
        it("whole", () => {
            assert(type(4).type).typed as 4
        })
        it("decimal", () => {
            assert(type(1.234).type).typed as 1.234
        })
        it("negative", () => {
            assert(type(-5.7).type).typed as -5.7
        })
    })
    describe("validation", () => {
        it("whole", () => {
            const eight = type(8)
            assert(eight.validate(8).error).is(undefined)
            assert(eight.validate(8).error).is(undefined)
            assert(eight.validate(8.000001).error?.message).snap(
                "8.000001 is not assignable to 8."
            )
            assert(eight.validate("8").error?.message).snap(
                `"8" is not assignable to 8.`
            )
        })
        it("decimal", () => {
            const goldenRatio = type(1.618)
            assert(goldenRatio.validate(1.618).error?.message).is(undefined)
            assert(goldenRatio.validate(2).error?.message).snap(
                "2 is not assignable to 1.618."
            )
            assert(goldenRatio.validate("1.618").error?.message).snap(
                `"1.618" is not assignable to 1.618.`
            )
        })
        it("negative", () => {
            const unLeet = type(-13.37)
            assert(unLeet.validate(-13.37).error).is(undefined)
            assert(unLeet.validate(-14).error?.message).snap(
                "-14 is not assignable to -13.37."
            )
            assert(unLeet.validate("-13.37").error?.message).snap(
                `"-13.37" is not assignable to -13.37.`
            )
        })
    })
    describe("generation", () => {
        it("whole", () => {
            assert(type(31).create()).is(31)
        })
        it("decimal", () => {
            assert(type(31.31).create()).is(31.31)
        })
        it("negative", () => {
            assert(type(-31.31).create()).is(-31.31)
        })
    })
})
describe("bigint", () => {
    describe("type", () => {
        // For now, using type.toString() since SWC is confused by bigint cast like "as -1n"
        it("positive", () => {
            assert(type(999999999999999n).type).type.toString(
                "999999999999999n"
            )
        })
        it("negative", () => {
            assert(type(-1n).type).type.toString("-1n")
        })
    })
    describe("validation", () => {
        it("positive", () => {
            assert(
                // Is prime :D
                type(12345678910987654321n).validate(12345678910987654321n)
                    .error
            ).is(undefined)
        })
        it("negative", () => {
            assert(
                type(-18446744073709551616n).validate(-BigInt(2 ** 64)).error
            ).is(undefined)
        })
        describe("errors", () => {
            it("wrong value", () => {
                assert(type(999n).validate(1000n).error?.message).snap(
                    `1000n is not assignable to 999n.`
                )
            })
            it("non-bigint", () => {
                assert(type(0n).validate(0).error?.message).snap(
                    `0 is not assignable to 0n.`
                )
            })
        })
    })
    describe("generation", () => {
        it("positive", () => {
            assert(type(1n).create()).is(1n)
        })
        it("negative", () => {
            assert(type(-1n).create()).is(-1n)
        })
    })
})
describe("boolean", () => {
    describe("true", () => {
        const t = type(true)
        it("type", () => {
            assert(t.type).typed as true
        })
        it("generation", () => {
            assert(t.create()).is(true)
        })
        it("validation", () => {
            assert(t.validate(true).error).is(undefined)
            assert(t.validate(false).error?.message).snap(
                `false is not assignable to true.`
            )
        })
    })
    describe("false", () => {
        const f = type(false)
        it("type", () => {
            assert(f.type).typed as false
        })
        it("generation", () => {
            assert(f.create()).is(false)
        })
        it("validation", () => {
            assert(f.validate(false).error).is(undefined)
            assert(f.validate(true).error?.message).snap(
                `true is not assignable to false.`
            )
        })
    })
})
describe("undefined", () => {
    const u = type(undefined)
    it("type", () => {
        assert(u.type).typed as undefined
    })
    it("generation", () => {
        assert(u.create()).is(undefined)
    })
    it("validation", () => {
        assert(u.validate(undefined).error).is(undefined)
        assert(u.validate(null).error?.message).snap(
            `null is not assignable to undefined.`
        )
    })
})
describe("null", () => {
    const n = type(null)
    it("type", () => {
        assert(n.type).typed as null
    })
    it("generation", () => {
        assert(n.create()).is(null)
    })
    it("validation", () => {
        assert(n.validate(null).error).is(undefined)
        assert(n.validate(undefined).error?.message).snap(
            `undefined is not assignable to null.`
        )
    })
})
